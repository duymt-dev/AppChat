// Hook đo từng lời gọi model của một run (TIP-019b §1–2): trước lời gọi — huỷ / workspace mở / ví > 0 / chụp giá / biên nhận / nhận chỗ
// của gốc; sau lời gọi — ghi kết quả, quyết toán usage đã biết, nhả chỗ (cách ly gốc khi không rõ kết quả); trước mỗi tool — kiểm lại gốc
// + ví. Lỗi ném ra mang `code` mà engine hiểu: BUDGET / CANCELLED → dừng sạch; USAGE_UNKNOWN / CREDIT_EXHAUSTED → run lỗi có lý do.
import type { AttemptInfo, AttemptOutcome } from '@appchat/ai';
import type { CreditMeter } from '../../billing/services/credit-meter';
import type { MeteredDb } from './metered-db';
import { recordLlmUsage } from '../../kernel/metrics/ai';
import { admitAttempt, assertRootOpen, releaseAttempt } from './root-budget';
import { openAttempt, recordOutcome } from './usage-receipts';
import { settleReceipt } from './usage-settlement';
import type { RunRow } from './run.store';

export type { MeteredDb } from './metered-db';

type Meter = Pick<CreditMeter, 'assertBalance' | 'price' | 'usage'>;

const stop = (code: string, message: string) => Object.assign(new Error(message), { code });
/** Lỗi nhận chỗ của gốc → mã engine. */
function mapAdmit(err: unknown): never {
  const f = (err as { fields?: Record<string, string> })?.fields ?? {};
  if (f.budget) throw stop('BUDGET', 'Hết ngân sách credit của lượt');
  if (f.run === 'cancelled') throw stop('CANCELLED', 'Run đã huỷ');
  if (f.usage === 'unknown') throw stop('USAGE_UNKNOWN', 'Có lời gọi model chưa rõ kết quả trong cây run');
  throw err;
}

export interface AttemptHookDeps {
  db: MeteredDb;
  meter: Meter;
  ws: string;
  run: RunRow;
  source: string;
  now: () => Date;
  signal: AbortSignal;
  beforeEach?: () => Promise<void>;
}

export function attemptHooks(d: AttemptHookDeps) {
  const open = new Map<string, string>();
  const key = (a: AttemptInfo) => `${a.stepIdx}:${a.candidate}`;
  const root = d.run.rootRunId;
  return {
    beforeAttempt: async (a: AttemptInfo) => {
      await d.beforeEach?.();
      await d.meter.assertBalance(d.ws);
      const price = await d.meter.price(a.provider, a.model);
      // Lần gọi đã có kết quả (chạy lại sau sự cố) → lô kế; lần gọi đang bay / không rõ của tiến trình trước → không gửi lại.
      for (let batch = 0; batch < 8; batch++) {
        const r = await openAttempt(d.db, { runId: d.run.id, rootRunId: root, kind: 'chat', logicalStep: a.stepIdx, candidate: a.candidate, batch }, { provider: a.provider, model: a.model, price, source: d.source }, d.now());
        if (!r.existing) {
          try {
            await admitAttempt(d.db, { rootRunId: root, runId: d.run.id, attemptId: r.id, now: d.now, signal: d.signal });
          } catch (err) {
            await recordOutcome(d.db, r.id, { kind: 'rejected', error: 'not_admitted', latencyMs: 0 }, d.now());
            mapAdmit(err);
          }
          open.set(key(a), r.id);
          return;
        }
        if (r.status === 'dispatched' || r.status === 'unknown') {
          await recordOutcome(d.db, r.id, { kind: 'unknown', error: 'interrupted', latencyMs: 0 }, d.now());
          await d.db.$executeRaw`UPDATE ai_root_budget SET quarantined = true, updated_at = ${d.now()} WHERE root_run_id = ${root}::uuid`;
          throw stop('USAGE_UNKNOWN', 'Lời gọi model trước đó bị gián đoạn, chưa rõ kết quả — không gửi lại');
        }
        if (r.status === 'usage_known') await settleReceipt({ db: d.db, wallet: d.meter.usage, workspaceId: d.ws, now: d.now }, r.id, { source: d.source });
      }
      throw stop('USAGE_UNKNOWN', 'Quá số lần gọi lại một bước');
    },
    afterAttempt: async (a: AttemptInfo, o: AttemptOutcome): Promise<{ credits: number }> => {
      const id = open.get(key(a));
      if (!id) return { credits: 0 };
      open.delete(key(a));
      await recordOutcome(d.db, id, o, d.now());
      if (o.kind !== 'usage') {
        await releaseAttempt(d.db, root, id, d.now(), o.kind === 'unknown');
        return { credits: 0 };
      }
      try {
        const s = await settleReceipt({ db: d.db, wallet: d.meter.usage, workspaceId: d.ws, now: d.now }, id, { source: d.source });
        recordLlmUsage({ provider: a.provider, model: a.model, purpose: d.source, tokensIn: o.tokensIn, tokensOut: o.tokensOut, latencyMs: o.latencyMs, credits: s.credits });
        await releaseAttempt(d.db, root, id, d.now());
        return { credits: s.credits };
      } catch (err) {
        // Ví không đủ: đã ghi usage chưa thu → nhả chỗ (ngân sách `observed` chặn tiếp). Lỗi khác (chưa rõ ví đã trừ) → cách ly gốc,
        // khôi phục đối soát theo ref sổ rồi mới mở lại.
        await releaseAttempt(d.db, root, id, d.now(), (err as { code?: string })?.code !== 'CREDIT_EXHAUSTED');
        throw err;
      }
    },
    beforeTool: async () => {
      await assertRootOpen(d.db, root, d.run.id).catch(mapAdmit);
      await d.meter.assertBalance(d.ws);
    },
  };
}

// Embedding có đo dùng chung (TIP-019b §3.2–3.3) cho `kb.search`, ngữ cảnh trả lời của agent và nạp kho. Mỗi lô là một lần gọi thật:
// biên nhận ghi TRƯỚC khi gửi (giá chụp), nhận chỗ của gốc (một lời gọi / gốc, còn ngân sách, không cách ly), sau lời gọi ghi usage và
// quyết toán theo nhóm (`<run>:query_embed|ingest:<bước>` — làm tròn một lần theo tổng các lô). Gọi NGOÀI transaction tenant. Lỗi
// ngân sách / huỷ / ví / usage không rõ luôn ném ra — người gọi không được nuốt rồi chạy tiếp không đo.
import type { EmbedHooks, EmbedResult, Embedder } from '@appchat/ai';
import type { CreditMeter } from '../../billing/services/credit-meter';
import type { MeteredDb } from './metered-db';
import { admitAttempt, releaseAttempt } from './root-budget';
import { openAttempt, recordOutcome, type UsageKind } from './usage-receipts';
import { settleReceipt } from './usage-settlement';

export type EmbedMeter = Pick<CreditMeter, 'assertBalance' | 'price' | 'usage'>;

export interface MeteredEmbedTarget {
  ws: string;
  runId: string;
  rootRunId: string;
  kind: Exclude<UsageKind, 'chat' | 'rerank'>;
  /** Bước logic của nhóm (lần embed thứ mấy trong run / lần nạp của nguồn) — gọi lại cùng bước dùng lại biên nhận. */
  logicalStep: number;
  source: string;
}

export interface MeteredEmbedDeps {
  db: MeteredDb;
  embedder: Embedder;
  meter: EmbedMeter;
  now: () => Date;
  signal?: AbortSignal;
}

/** Lỗi phải dừng lượt (không được nuốt để chạy tiếp không đo). */
export const isMeteringStop = (e: unknown): boolean => ['BUDGET', 'CANCELLED', 'CREDIT_EXHAUSTED', 'USAGE_UNKNOWN', 'INVALID_STATE', 'CONFLICT'].includes(String((e as { code?: string })?.code ?? ''));

/** Ứng viên lưu = lượt × 16 + ứng viên: chạy lại (nạp kho sau sự cố) là lượt mới với biên nhận mới, không gửi lại biên nhận cũ. */
const PASS = 16;

function hooksFor(d: MeteredEmbedDeps, t: MeteredEmbedTarget, pass: number): EmbedHooks {
  const open = new Map<string, string>();
  const key = (a: { candidate: number; batch: number }) => `${a.candidate}:${a.batch}`;
  return {
    before: async (a) => {
      await d.meter.assertBalance(t.ws);
      const price = await d.meter.price(a.provider, a.model);
      const r = await openAttempt(d.db, { runId: t.runId, rootRunId: t.rootRunId, kind: t.kind, logicalStep: t.logicalStep, candidate: pass * PASS + a.candidate, batch: a.batch }, { provider: a.provider, model: a.model, price, source: t.source }, d.now());
      if (r.existing) throw Object.assign(new Error('Lô embedding này đã gửi trước đó — không gửi lại'), { code: 'USAGE_UNKNOWN' });
      try {
        await admitAttempt(d.db, { rootRunId: t.rootRunId, runId: t.runId, attemptId: r.id, now: d.now, ...(d.signal ? { signal: d.signal } : {}) });
      } catch (err) {
        await recordOutcome(d.db, r.id, { kind: 'rejected', error: 'not_admitted', latencyMs: 0 }, d.now());
        throw err;
      }
      open.set(key(a), r.id);
    },
    after: async (a, o) => {
      const id = open.get(key(a));
      if (!id) return;
      open.delete(key(a));
      await recordOutcome(d.db, id, o, d.now());
      if (o.kind !== 'usage') return releaseAttempt(d.db, t.rootRunId, id, d.now(), o.kind === 'unknown');
      try {
        await settleReceipt({ db: d.db, wallet: d.meter.usage, workspaceId: t.ws, now: d.now }, id, { source: t.source });
        await releaseAttempt(d.db, t.rootRunId, id, d.now());
      } catch (err) {
        await releaseAttempt(d.db, t.rootRunId, id, d.now(), (err as { code?: string })?.code !== 'CREDIT_EXHAUSTED');
        throw err;
      }
    },
  };
}

/** Embed có đo: mỗi lô một biên nhận dưới gốc `rootRunId`. Không có ví theo ref (test đơn vị) → embed thường. */
export async function meteredEmbed(d: MeteredEmbedDeps, t: MeteredEmbedTarget, values: string[]): Promise<EmbedResult> {
  if (!d.meter.usage) return d.embedder.embed(values, d.signal);
  // Lượt trước để lại lần gọi đang bay / không rõ → không gửi lại mù (cách ly gốc); usage đã biết của lượt trước được quyết toán.
  const prior = await d.db.aiUsageReceipt.findMany({ where: { runId: t.runId, logicalStep: t.logicalStep, groupId: `${t.runId}:${t.kind}:${t.logicalStep}` }, select: { id: true, candidate: true, status: true } });
  if (prior.some((r) => r.status === 'dispatched' || r.status === 'unknown')) {
    await d.db.$executeRaw`UPDATE ai_root_budget SET quarantined = true, updated_at = ${d.now()} WHERE root_run_id = ${t.rootRunId}::uuid`;
    throw Object.assign(new Error('Lô embedding trước đó chưa rõ kết quả — không gửi lại'), { code: 'USAGE_UNKNOWN' });
  }
  for (const r of prior) if (r.status === 'usage_known') await settleReceipt({ db: d.db, wallet: d.meter.usage, workspaceId: t.ws, now: d.now }, r.id, { source: t.source }).catch((e) => { if ((e as { code?: string })?.code !== 'CREDIT_EXHAUSTED') throw e; });
  const pass = prior.length ? Math.floor(Math.max(...prior.map((r) => r.candidate)) / PASS) + 1 : 0;
  return d.embedder.embed(values, d.signal, hooksFor(d, t, pass));
}

/** Giành bước logic mới cho embedding truy vấn trong run (INSERT nhóm ON CONFLICT — hai lời gọi song song không chung nhóm). */
export async function claimEmbedStep(db: MeteredDb, runId: string, rootRunId: string, kind: MeteredEmbedTarget['kind'], now: Date): Promise<number> {
  for (let step = await db.aiUsageGroup.count({ where: { runId, kind } }); ; step++) {
    const n = await db.$executeRaw`
      INSERT INTO ai_usage_group (id, run_id, root_run_id, kind, logical_step, created_at)
      VALUES (${`${runId}:${kind}:${step}`}, ${runId}::uuid, ${rootRunId}::uuid, ${kind}, ${step}, ${now}) ON CONFLICT DO NOTHING`;
    if (n === 1) return step;
  }
}

/** Embed một câu hỏi tìm kiếm (gọi ngoài transaction). */
export type QueryEmbed = (query: string) => Promise<EmbedResult>;

/** Embed câu hỏi có đo dưới run `runId` (mỗi lần một nhóm `query_embed` mới); thiếu ví theo ref / bảng tenant → embed thường. */
export function queryEmbedder(d: { db: MeteredDb | null; embedder: Embedder; meter: EmbedMeter | null; now: () => Date; signal?: AbortSignal }, t: { ws: string; runId: string; rootRunId: string; source: string }): QueryEmbed {
  return async (query) => {
    if (!d.db || !d.meter?.usage) return d.embedder.embed([query], d.signal);
    const step = await claimEmbedStep(d.db, t.runId, t.rootRunId, 'query_embed', d.now());
    return meteredEmbed({ db: d.db, embedder: d.embedder, meter: d.meter, now: d.now, ...(d.signal ? { signal: d.signal } : {}) }, { ...t, kind: 'query_embed', logicalStep: step }, [query]);
  };
}

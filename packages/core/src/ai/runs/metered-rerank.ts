// Rerank có đo (TIP-020e §3.3, 019b): biên nhận ghi TRƯỚC khi gửi dưới gốc của lượt (nhóm `<run>:rerank:<bước>`), nhận chỗ của gốc, sau
// lời gọi ghi kết quả. `RerankResult` của AI SDK không có usage → chỉ đơn vị nhà cung cấp báo. CHƯA CÓ ĐƠN GIÁ CHO ĐƠN VỊ RERANK (DC-303):
// `model_price` chỉ có per-1k token → route rerank không được kích hoạt (config-validation chặn) và ở đây thiếu giá là DỪNG CỨNG trước khi
// gửi (không coi là miễn phí). Khi Chủ nhà cấp provider + giá, pricebook thêm đơn vị rồi mới quyết toán thật.
import type { RerankAttempt, RerankAttemptOutcome, RerankHooks } from '@appchat/ai';
import { AppError } from '@appchat/shared';
import type { CreditMeter } from '../../billing/services/credit-meter';
import type { MeteredDb } from './metered-db';
import { admitAttempt, releaseAttempt } from './root-budget';
import { openAttempt, recordOutcome } from './usage-receipts';

export interface RerankMeterTarget {
  ws: string;
  runId: string;
  rootRunId: string;
  logicalStep: number;
  source: string;
}

/** Đơn giá rerank chưa có (DC-303) — lỗi dừng, không phải "miễn phí". */
export const rerankPriceMissing = () => new AppError('VALIDATION_FAILED', 400, { rerank: 'price_unit_missing' }, 'Chưa có đơn giá cho đơn vị rerank');

/**
 * Hook đo một lần gọi rerank. `unitPrice` = đơn giá Credit cho MỘT đơn vị rerank (pricebook chưa có cột — luôn null cho tới khi Chủ nhà
 * cấp giá) → null: ném lỗi trước khi gửi. Có giá: biên nhận theo giá chụp, usage ghi như token vào (`tokensIn = units × 1000` với giá per-1k
 * = unitPrice) để dùng chung quyết toán làm tròn một lần theo nhóm.
 */
export function rerankHooks(d: { db: MeteredDb; meter: Pick<CreditMeter, 'assertBalance'>; unitPrice: number | null; now: () => Date; signal?: AbortSignal }, t: RerankMeterTarget): RerankHooks {
  let receipt: string | null = null;
  return {
    async before(a: RerankAttempt) {
      if (d.unitPrice === null) throw rerankPriceMissing();
      await d.meter.assertBalance(t.ws);
      const r = await openAttempt(d.db, { runId: t.runId, rootRunId: t.rootRunId, kind: 'rerank', logicalStep: t.logicalStep, candidate: 0 }, { provider: a.provider, model: a.model, price: { per1kIn: d.unitPrice, per1kOut: 0 }, source: t.source }, d.now());
      if (r.existing) throw Object.assign(new Error('Lần rerank này đã gửi trước đó — không gửi lại'), { code: 'USAGE_UNKNOWN' });
      try {
        await admitAttempt(d.db, { rootRunId: t.rootRunId, runId: t.runId, attemptId: r.id, now: d.now, ...(d.signal ? { signal: d.signal } : {}) });
      } catch (err) {
        await recordOutcome(d.db, r.id, { kind: 'rejected', error: 'not_admitted', latencyMs: 0 }, d.now());
        throw err;
      }
      receipt = r.id;
    },
    async after(_a: RerankAttempt, o: RerankAttemptOutcome) {
      if (!receipt) return;
      const id = receipt;
      receipt = null;
      await recordOutcome(d.db, id, o.kind === 'usage' ? { kind: 'usage', tokensIn: o.units * 1000, tokensOut: 0, latencyMs: o.latencyMs } : o, d.now());
      await releaseAttempt(d.db, t.rootRunId, id, d.now(), o.kind === 'unknown');
    },
  };
}

// Rerank qua AI SDK `rerank()` (TIP-020e §3, agent-gateway §0): ứng viên route `rerank` ưu tiên cao nhất — MỘT lần gọi, `maxRetries: 0`,
// không chuyển route ẩn (lời gọi có thể đã tính tiền). ≤ 40 tài liệu, hạn 3 giây. Chỉ nhận hoán vị đủ của tập đã gửi; sai / thiếu → kết
// quả `invalid_result` (người gọi giữ RRF). `RerankResult` không có usage → đơn vị lấy từ `providerMetadata` của nhà cung cấp.
import { rerank } from 'ai';
import { classifyAttemptError } from '../gateway/attempts';
import type { ModelSource } from '../gateway/types';
import { COMPATIBLE_NS } from './compatible-reranker';
import { RERANK_MAX_DOCS, RERANK_TIMEOUT_MS, validOrder, type RerankAttempt, type RerankHooks, type RerankOutcome, type Reranker } from './types';

const unitsOf = (meta: unknown): number | null => {
  const v = (meta as Record<string, { billed_units?: unknown } | undefined> | undefined)?.[COMPATIBLE_NS]?.billed_units;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
};

export class AiSdkReranker implements Reranker {
  constructor(private readonly models: ModelSource) {}

  async route(): Promise<RerankAttempt | null> {
    const [top] = await this.models.candidates('standard', 'rerank', { tools: false });
    return top ? { provider: top.provider, model: top.model } : null;
  }

  async rerank(query: string, documents: string[], o: { signal?: AbortSignal; timeoutMs?: number; hooks?: RerankHooks } = {}): Promise<RerankOutcome> {
    if (documents.length > RERANK_MAX_DOCS) throw new RangeError(`rerank nhận tối đa ${RERANK_MAX_DOCS} tài liệu`);
    const [c] = await this.models.candidates('standard', 'rerank', { tools: false });
    if (!c) return { kind: 'not_configured' };
    if (!documents.length) return { kind: 'invalid_result' };
    const a = { provider: c.provider, model: c.model };
    await o.hooks?.before(a);
    const ctl = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      ctl.abort();
    }, o.timeoutMs ?? RERANK_TIMEOUT_MS);
    const onAbort = () => ctl.abort();
    o.signal?.addEventListener('abort', onAbort, { once: true });
    const t0 = Date.now();
    try {
      const r = await rerank({ model: c.handle as never, query, documents, topN: documents.length, maxRetries: 0, abortSignal: ctl.signal });
      const units = unitsOf(r.providerMetadata);
      await o.hooks?.after(a, units === null ? { kind: 'unknown', error: 'no_usage', latencyMs: Date.now() - t0 } : { kind: 'usage', units, latencyMs: Date.now() - t0 });
      if (units === null) return { kind: 'unknown_usage' };
      const order = r.ranking.map((x) => x.originalIndex);
      if (!validOrder(order, documents.length)) return { kind: 'invalid_result' };
      return { kind: 'ok', order, scores: r.ranking.map((x) => x.score), provider: c.provider, model: c.model, units };
    } catch (err) {
      if (o.signal?.aborted) throw err;
      // SDK tự kiểm chỉ số (InvalidResponseDataError) — nhà cung cấp đã trả lời: usage không rõ, kết quả không dùng.
      const invalid = /InvalidResponseData/.test((err as { name?: string })?.name ?? '');
      const k = timedOut ? { kind: 'unknown' as const, error: 'timeout' } : invalid ? { kind: 'unknown' as const, error: 'invalid_result' } : classifyAttemptError(err, false, false);
      await o.hooks?.after(a, { kind: k.kind, error: k.error, latencyMs: Date.now() - t0 });
      if (timedOut) return { kind: 'timeout' };
      if (invalid) return { kind: 'invalid_result' };
      return { kind: 'provider_error', error: k.error };
    } finally {
      clearTimeout(timer);
      o.signal?.removeEventListener('abort', onAbort);
    }
  }
}

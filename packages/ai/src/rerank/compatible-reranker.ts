// Reranking model cho provider `openai_compatible` (TIP-020e §3.2): `POST {base}/rerank` theo schema Cohere / Jina (`model, query, documents,
// top_n` → `results[{index, relevance_score}]`) bằng fetch — không thêm thư viện; hạn giờ do người gọi truyền `abortSignal`. Đơn vị tính
// tiền nhà cung cấp trả (`meta.billed_units.search_units` | `usage.total_tokens`) đặt dưới `providerMetadata['openai-compatible']
// .billed_units`; vắng → null (người gọi coi là chưa rõ usage, không miễn phí). Chỉ dựng khi provider khai `capabilities.rerank`
// (spike 2026-11-14: 9router trả 404 cho `/rerank` → chưa bật).
import type { RerankingModelV4 } from '@ai-sdk/provider';

export const COMPATIBLE_NS = 'openai-compatible';

export interface CompatibleRerankConfig {
  provider: string;
  baseUrl: string;
  apiKey: string;
  headers?: Record<string, string> | null;
  fetch?: typeof fetch;
}

type Body = { results?: { index?: unknown; relevance_score?: unknown }[]; meta?: { billed_units?: { search_units?: unknown } }; usage?: { total_tokens?: unknown } };

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);

/** Lỗi HTTP mang `statusCode` để phân loại như lời gọi AI SDK (attempts.ts) — không chép thân phản hồi (có thể chứa dữ liệu). */
const httpError = (status: number) => Object.assign(new Error(`rerank HTTP ${status}`), { statusCode: status });

export function compatibleReranker(c: CompatibleRerankConfig, modelId: string): RerankingModelV4 {
  return {
    specificationVersion: 'v4',
    provider: c.provider,
    modelId,
    async doRerank(o) {
      if (o.documents.type !== 'text') throw httpError(400);
      const res = await (c.fetch ?? fetch)(`${c.baseUrl.replace(/\/+$/, '')}/rerank`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${c.apiKey}`, ...(c.headers ?? {}) },
        body: JSON.stringify({ model: modelId, query: o.query, documents: o.documents.values, top_n: o.topN ?? o.documents.values.length }),
        ...(o.abortSignal ? { signal: o.abortSignal } : {}),
      });
      if (!res.ok) throw httpError(res.status);
      const body = (await res.json()) as Body;
      const ranking = (body.results ?? []).map((r) => ({ index: Number(r.index), relevanceScore: Number(r.relevance_score) }));
      const units = num(body.meta?.billed_units?.search_units) ?? num(body.usage?.total_tokens);
      return { ranking, providerMetadata: { [COMPATIBLE_NS]: { billed_units: units } }, response: { modelId } };
    },
  };
}

// Giai đoạn rerank của tìm kiếm kho (TIP-020e §3.4, rag §6): ứng viên = hợp nhất vector top20 + từ khoá top20 đã khử trùng (≤ 40, ĐÃ qua
// restriction 020c), nội dung che PII trước khi gửi. Chỉ áp thứ tự trả về trên ĐÚNG tập id đã gửi — không bao giờ thêm / mở rộng id. Kết quả
// không hợp lệ / quá hạn / thiếu usage / provider lỗi → giữ thứ tự RRF + lý do riêng. Lỗi Credit / ngân sách / quyền / usage không rõ ở hook
// đo (019b) → ném ra, dừng lượt (không nuốt). Điểm rerank không thay ngưỡng `min_score` (grounded giữ luật rag §7). Gọi NGOÀI transaction.
import { PiiMasker, RERANK_MAX_DOCS, type RerankHooks, type RerankStatus, type Reranker } from '@appchat/ai';

export interface StageInput {
  query: string;
  /** Thứ tự RRF (id) đã khử trùng, ≤ 40. */
  fused: string[];
  /** Nội dung theo id (đọc trong restriction). */
  content: Map<string, string>;
  limit: number;
}

export interface StageOutput {
  ids: string[];
  rerank: RerankStatus;
}

/** Cổng bật rerank: chỉ khi route có reranker và có hook đo (đơn giá đã duyệt — DC-303). Không có → `not_configured`, RRF. */
export async function rerankStage(reranker: Reranker | null, hooks: RerankHooks | null, i: StageInput, signal?: AbortSignal): Promise<StageOutput> {
  const rrf = (rerank: RerankStatus): StageOutput => ({ ids: i.fused.slice(0, i.limit), rerank });
  if (!reranker || !hooks) return rrf('not_configured');
  const ids = i.fused.filter((id) => i.content.has(id)).slice(0, RERANK_MAX_DOCS);
  if (ids.length < 2) return rrf('not_configured');
  const pii = new PiiMasker();
  const docs = ids.map((id) => pii.mask(i.content.get(id)!));
  const out = await reranker.rerank(pii.mask(i.query), docs, { hooks, ...(signal ? { signal } : {}) });
  if (out.kind !== 'ok') return rrf(out.kind);
  // Phòng thủ kép: hoán vị đủ đã kiểm ở reranker — ở đây chỉ map chỉ số về id của chính tập đã gửi.
  const seen = new Set<number>();
  const ordered: string[] = [];
  for (const k of out.order) {
    if (!Number.isInteger(k) || k < 0 || k >= ids.length || seen.has(k)) return rrf('invalid_result');
    seen.add(k);
    ordered.push(ids[k]!);
  }
  if (ordered.length !== ids.length) return rrf('invalid_result');
  return { ids: ordered.slice(0, i.limit), rerank: 'applied' };
}

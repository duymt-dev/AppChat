// Rerank (TIP-020e §3, rag §6, DC-303): kết quả là union rõ ràng — không bao giờ "rerank thành công" giả. `ok` chỉ khi nhà cung cấp trả
// đủ một thứ tự hoán vị hợp lệ trên đúng tập ứng viên đã gửi; mọi trường hợp khác người gọi giữ thứ tự RRF kèm lý do riêng.
// Ngân sách / ví / quyền không nằm trong union — core ném lỗi dừng lượt (019b), không nuốt.

/** Trần ứng viên gửi rerank: vector top20 ∪ từ khoá top20 đã khử trùng. */
export const RERANK_MAX_DOCS = 40;
export const RERANK_TIMEOUT_MS = 3_000;

export type RerankOutcome =
  /** `order`: chỉ số ứng viên theo thứ tự mới (hoán vị đủ của [0, n)); `units`: đơn vị tính tiền nhà cung cấp trả. */
  | { kind: 'ok'; order: number[]; scores: number[]; provider: string; model: string; units: number }
  /** Không có route `rerank` dùng được (chưa cấu hình / chưa có đơn giá — DC-303). */
  | { kind: 'not_configured' }
  /** Provider của route không có reranking model thật (không ép LanguageModel). */
  | { kind: 'unsupported' }
  | { kind: 'timeout' }
  /** Chỉ số giả / trùng / ngoài khoảng / thiếu. */
  | { kind: 'invalid_result' }
  /** Nhà cung cấp trả lời nhưng không báo đơn vị tính tiền — không coi là miễn phí. */
  | { kind: 'unknown_usage' }
  | { kind: 'provider_error'; error: string };

/** Lý do công khai cho kết quả tìm kiếm (`applied` = đã rerank). */
export type RerankStatus = Exclude<RerankOutcome['kind'], 'ok'> | 'applied';

/** Một lần gọi rerank đo được (019b): `before` ghi biên nhận + nhận chỗ của gốc TRƯỚC khi gửi; `after` ghi kết quả. */
export interface RerankAttempt {
  provider: string;
  model: string;
}

export type RerankAttemptOutcome =
  | { kind: 'usage'; units: number; latencyMs: number }
  | { kind: 'rejected'; error: string; latencyMs: number }
  | { kind: 'unknown'; error: string; latencyMs: number };

export interface RerankHooks {
  before(a: RerankAttempt): Promise<void>;
  after(a: RerankAttempt, o: RerankAttemptOutcome): Promise<void>;
}

export interface Reranker {
  /** Route rerank hiện hành (chỉ đọc cấu hình) — null = chưa cấu hình. */
  route(): Promise<RerankAttempt | null>;
  rerank(query: string, documents: string[], o?: { signal?: AbortSignal; timeoutMs?: number; hooks?: RerankHooks }): Promise<RerankOutcome>;
}

/** Provider không có reranking model (5 SDK đã cài không có; `openai_compatible` chỉ khi khai `capabilities.rerank`). */
export class RerankUnsupportedError extends Error {
  readonly code = 'RERANK_UNSUPPORTED';
  constructor(provider: string) {
    super(`provider ${provider} không có reranking model`);
  }
}

/** Hoán vị đủ của [0, n): mọi chỉ số nguyên trong khoảng, không trùng, đủ n phần tử. */
export function validOrder(order: readonly number[], n: number): boolean {
  if (order.length !== n) return false;
  const seen = new Set<number>();
  for (const i of order) {
    if (!Number.isInteger(i) || i < 0 || i >= n || seen.has(i)) return false;
    seen.add(i);
  }
  return true;
}

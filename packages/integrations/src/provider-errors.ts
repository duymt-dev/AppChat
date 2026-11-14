// Lỗi provider đã làm sạch (TIP-012b §1.4): chỉ mã ổn định, không mang thông điệp / body / bí mật của provider. Adapter ném lỗi này
// thay vì Error thô; core ánh xạ sang HTTP (`invalid_payload` → 400) hoặc trạng thái kết nối — không bao giờ trả nguyên văn provider.
export const PROVIDER_ERROR_CODES = ['auth_failed', 'invalid_payload', 'rate_limited', 'timeout', 'unsupported', 'provider_unavailable'] as const;
export type ProviderErrorCode = (typeof PROVIDER_ERROR_CODES)[number];

export class ProviderError extends Error {
  /** `field` = tên trường hỏng (không phải giá trị) — đủ để chẩn đoán mà không lộ dữ liệu khách. */
  constructor(
    readonly code: ProviderErrorCode,
    readonly field?: string,
    /** `rate_limited`: số giây provider yêu cầu chờ (Retry-After) — người gọi lùi lịch, không thử ngay. */
    readonly retryAfterS?: number,
  ) {
    super(field ? `${code}:${field}` : code);
    this.name = 'ProviderError';
  }
}

export const isProviderError = (e: unknown): e is ProviderError => e instanceof ProviderError;

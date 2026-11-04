// Một chỗ ném lỗi (standards/api/response-envelope.md §4): service / handler ném AppError, filter toàn cục chuyển thành envelope.
// `fields` map tên trường → MÃ lỗi (client dịch bằng i18n), không phải câu chữ.
import type { ApiError, ErrorCode } from './api/envelope';

export const HTTP_STATUS_OF: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  SCOPE_FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  CONTACT_OWNED: 409,
  IDEMPOTENCY_REPLAY: 200,
  RATE_LIMITED: 429,
  PLAN_LIMIT_REACHED: 402,
  CREDIT_EXHAUSTED: 402,
  ACTION_NOT_FOUND: 404,
  PREVIEW_REQUIRED: 422,
  APPROVAL_REQUIRED: 202,
  INVALID_STATE: 409,
  QUOTE_NEEDS_APPROVAL: 409,
  QUOTE_ALREADY_CONVERTED: 409,
  OTP_INVALID: 422,
  SIGN_LINK_INVALID: 410,
  WORKSPACE_UNAVAILABLE: 503,
  INVALID_TRANSITION: 409,
  STALE_VERSION: 409,
  UNDO_EXPIRED: 409,
  UNDO_NOT_SUPPORTED: 409,
  HAS_DEPENDENCIES: 409,
  SLOT_TAKEN: 409,
  NOT_IMPLEMENTED: 501,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly httpStatus: number;

  constructor(
    readonly code: ErrorCode,
    httpStatus?: number,
    readonly fields?: Record<string, string>,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AppError';
    this.httpStatus = httpStatus ?? HTTP_STATUS_OF[code];
  }

  toApiError(): ApiError {
    return { code: this.code, message: this.message, ...(this.fields ? { fields: this.fields } : {}) };
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;

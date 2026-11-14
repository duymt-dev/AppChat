// API envelope (Blueprint §4.1, standards/api/response-envelope.md).
export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'SCOPE_FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'CONTACT_OWNED',
  'ATTACHMENT_NOT_PREPARED',
  'IDEMPOTENCY_REPLAY',
  'RATE_LIMITED',
  'PLAN_LIMIT_REACHED',
  'CREDIT_EXHAUSTED',
  'ACTION_NOT_FOUND',
  'PREVIEW_REQUIRED',
  'APPROVAL_REQUIRED',
  'INVALID_STATE',
  'QUOTE_NEEDS_APPROVAL',
  'QUOTE_ALREADY_CONVERTED',
  'OTP_INVALID',
  'FIELD_FORBIDDEN',
  'SIGN_LINK_INVALID',
  'WORKSPACE_UNAVAILABLE',
  'INVALID_TRANSITION',
  'STALE_VERSION',
  'UNDO_EXPIRED',
  'UNDO_NOT_SUPPORTED',
  // TIP-034c §3.3: log này hoàn tác bằng action riêng (fields: undo_action, parent_action_log_id) — không có gì bị hoàn tác.
  'UNDO_REQUIRES_ACTION',
  // TIP-034c §3.1: thao tác hàng loạt còn đang chạy / đang huỷ — chưa hoàn tác được.
  'OPERATION_BUSY',
  'HAS_DEPENDENCIES',
  'SLOT_TAKEN',
  // TIP-032d §2.1: thiếu tiến trình kiểm cấu trúc cô lập — không kiểm trong tiến trình chính, tệp không được gắn.
  'VALIDATION_ISOLATION_UNAVAILABLE',
  'NOT_IMPLEMENTED',
  'INTERNAL',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiError {
  code: ErrorCode;
  message: string;
  fields?: Record<string, string>;
}

export interface DataEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ListEnvelope<T> {
  data: T[];
  next_cursor: string | null;
}

export interface ErrorEnvelope {
  error: ApiError;
}

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly error: ApiError,
  ) {
    super(error.message);
    this.name = 'ApiRequestError';
  }
}

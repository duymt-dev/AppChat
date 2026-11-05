// API envelope (Blueprint §4.1, standards/api/response-envelope.md).
export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'SCOPE_FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'CONTACT_OWNED',
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
  'HAS_DEPENDENCIES',
  'SLOT_TAKEN',
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

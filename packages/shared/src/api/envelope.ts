// API envelope (Blueprint §4.1, standards/api/response-envelope.md).
export const ERROR_CODES = [
  'VALIDATION_FAILED', 'UNAUTHENTICATED', 'FORBIDDEN', 'SCOPE_FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'CONTACT_OWNED',
  'IDEMPOTENCY_REPLAY', 'RATE_LIMITED', 'PLAN_LIMIT_REACHED', 'CREDIT_EXHAUSTED', 'ACTION_NOT_FOUND',
  'PREVIEW_REQUIRED', 'APPROVAL_REQUIRED', 'INTERNAL',
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

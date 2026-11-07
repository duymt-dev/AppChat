// Filter toàn cục (response-envelope §4): AppError / lỗi DB / HttpException của Nest → `{ error: { code, message, fields? } }`.
// Lỗi lạ → 500 INTERNAL, stack chỉ vào log (không trả client).
import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { ServerResponse } from 'node:http';
import { AppError, type ApiError, type ErrorCode } from '@appchat/shared';
import { TenantContextError, WorkspaceNotFoundError, WorkspaceUnavailableError } from '@appchat/db';
import type { AppLogger } from '@appchat/core';

const NEST_CODE: Record<number, ErrorCode> = { 400: 'VALIDATION_FAILED', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 429: 'RATE_LIMITED' };

export function toEnvelope(err: unknown): { status: number; body: { error: ApiError } } {
  if (err instanceof AppError) return { status: err.httpStatus, body: { error: err.toApiError() } };
  if (err instanceof WorkspaceUnavailableError) {
    return { status: err.httpStatus, body: { error: { code: 'WORKSPACE_UNAVAILABLE', message: err.dbStatus } } };
  }
  if (err instanceof WorkspaceNotFoundError) return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'workspace' } } };
  if (err instanceof TenantContextError) return { status: 403, body: { error: { code: 'FORBIDDEN', message: 'tenant context' } } };
  if (err instanceof HttpException) {
    const status = err.getStatus();
    return { status, body: { error: { code: NEST_CODE[status] ?? 'INTERNAL', message: err.message } } };
  }
  return { status: 500, body: { error: { code: 'INTERNAL', message: 'Internal error' } } };
}

@Catch()
export class EnvelopeErrorFilter implements ExceptionFilter {
  constructor(private readonly log: AppLogger) {}

  catch(err: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<ServerResponse>();
    const { status, body } = toEnvelope(err);
    if (status >= 500) this.log.error({ err, code: body.error.code }, 'request failed');
    else this.log.info({ code: body.error.code, status }, 'request rejected');
    res.statusCode = status;
    // RATE_LIMITED kèm Retry-After (ops §3.2).
    const retry = body.error.code === 'RATE_LIMITED' ? body.error.fields?.retry_after : undefined;
    if (retry) res.setHeader('retry-after', retry);
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
  }
}

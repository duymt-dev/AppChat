// Tiện ích HTTP của identity: cookie refresh (Blueprint §4.2), IP client, bearer, zod body → 422.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AppError } from '@appchat/shared';
import type { z } from 'zod';

export const REFRESH_COOKIE = 'rt';
const COOKIE_PATH = '/api/v1/auth';

export function readCookie(req: IncomingMessage, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

/** HttpOnly; SameSite=Lax; Path=/api/v1/auth; Secure trừ khi COOKIE_SECURE=false (dev http). */
export function setRefreshCookie(res: ServerResponse, token: string, expiresAt: Date, secure: boolean): void {
  const attrs = [`${REFRESH_COOKIE}=${encodeURIComponent(token)}`, `Path=${COOKIE_PATH}`, `Expires=${expiresAt.toUTCString()}`, 'HttpOnly', 'SameSite=Lax'];
  if (secure) attrs.push('Secure');
  res.setHeader('set-cookie', attrs.join('; '));
}

export function clearRefreshCookie(res: ServerResponse, secure: boolean): void {
  const attrs = [`${REFRESH_COOKIE}=`, `Path=${COOKIE_PATH}`, 'Expires=Thu, 01 Jan 1970 00:00:00 GMT', 'HttpOnly', 'SameSite=Lax'];
  if (secure) attrs.push('Secure');
  res.setHeader('set-cookie', attrs.join('; '));
}

/** Sau nginx: lấy IP đầu của X-Forwarded-For (nginx ghi đè header này — Blueprint §11). */
export function clientIp(req: IncomingMessage): string | undefined {
  const xf = req.headers['x-forwarded-for'];
  const first = (Array.isArray(xf) ? xf[0] : xf)?.split(',')[0]?.trim();
  return first || req.socket.remoteAddress || undefined;
}

export function bearer(req: IncomingMessage): string | undefined {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7).trim() : undefined;
}

export function parseBody<S extends z.ZodType>(schema: S, raw: unknown): z.infer<S> {
  const r = schema.safeParse(raw ?? {});
  if (!r.success) {
    const fields: Record<string, string> = {};
    for (const i of r.error.issues) fields[i.path.join('.') || '_'] ??= i.code;
    throw new AppError('VALIDATION_FAILED', 422, fields);
  }
  return r.data;
}

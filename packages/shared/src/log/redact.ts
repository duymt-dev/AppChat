// Khoá cần che trong log backend (standards/ops/observability-security.md §1.4). Logger dùng làm `redact.paths` của pino.
export const REDACT_KEYS = [
  'phone',
  'email',
  'password',
  'otp',
  'token',
  'access_token',
  'refresh_token',
  'api_key',
  'secret',
  'credentials',
  'credentials_enc',
  'authorization',
  'cookie',
] as const;

export const REDACT_CENSOR = '[redacted]';

/** Đường dẫn pino: khoá ở gốc, lồng 1–2 cấp, và header của req / res. */
export function redactPaths(keys: readonly string[] = REDACT_KEYS): string[] {
  const paths = keys.flatMap((k) => [k, `*.${k}`, `*.*.${k}`]);
  return [...paths, 'req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'];
}

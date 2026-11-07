// Giới hạn tốc độ chung của API (TIP-045b annex B, ops §3.2) — middleware chạy trước controller cho mọi route `/v1`:
// - `POST /v1/actions/*` → 120 / phút / user; route đọc có Bearer hợp lệ → 600 / phút / user (khoá theo user của token, đổi workspace
//   không đặt lại bộ đếm);
// - trang công khai `/v1/public/*` (xem báo giá / hợp đồng / ký) → 30 / phút / IP.
// OTP / widget / ký giữ luật riêng chặt hơn ở domain. Bỏ qua: OPTIONS, `/v1/health`, `/metrics`, `/hooks/*` (webhook có chữ ký), `/widget.js`.
// IP lấy từ X-Forwarded-For CHỈ khi kết nối đến từ proxy tin cậy (`TRUST_PROXY`, mặc định 127.0.0.1 / ::1 — nginx cùng máy); còn lại dùng
// địa chỉ socket (header giả mạo không đổi được khoá). Redis lỗi → 503 cho đường ghi / công khai (không tắt giới hạn), đường đọc đi tiếp.
import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { API_RATE_RULES, type AccessTokens, type AppLogger, type RateRule, type SlidingRateLimiter } from '@appchat/core';
import { AppError } from '@appchat/shared';

const SKIP = /^\/(?:v1\/health(?:\/|$)|metrics(?:\/|$)|hooks\/|widget\.js)/;
const PUBLIC = /^\/v1\/public\//;
const ACTION = /^\/v1\/actions\//;

export function trustedProxies(env: Record<string, string | undefined>): Set<string> {
  const list = (env.TRUST_PROXY ?? '127.0.0.1,::1,::ffff:127.0.0.1').split(',').map((s) => s.trim()).filter(Boolean);
  return new Set(list);
}

/** IP người gọi: X-Forwarded-For (phần tử cuối do proxy tin cậy thêm) chỉ khi socket là proxy tin cậy. */
export function clientAddress(req: IncomingMessage, trusted: ReadonlySet<string>): string {
  const peer = req.socket.remoteAddress ?? 'unknown';
  if (!trusted.has(peer)) return peer;
  const xf = req.headers['x-forwarded-for'];
  const hops = (Array.isArray(xf) ? xf.join(',') : (xf ?? '')).split(',').map((s) => s.trim()).filter(Boolean);
  // nginx `proxy_add_x_forwarded_for` nối IP thật vào CUỐI — phần tử cuối không phải proxy tin cậy là client.
  for (let i = hops.length - 1; i >= 0; i--) if (!trusted.has(hops[i]!)) return hops[i]!;
  return peer;
}

const hashed = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 24);

export type ApiRateRules = Record<keyof typeof API_RATE_RULES, RateRule>;

export interface RateLimitDeps {
  limiter: SlidingRateLimiter;
  rules?: ApiRateRules;
  tokens: AccessTokens;
  now: () => number;
  trusted: ReadonlySet<string>;
  log: AppLogger;
}

function send(res: ServerResponse, e: AppError): void {
  res.statusCode = e.httpStatus;
  const retry = e.fields?.retry_after;
  if (retry) res.setHeader('retry-after', retry);
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: { code: e.code, message: e.message, ...(e.fields ? { fields: e.fields } : {}) } }));
}

export function apiRateLimit(d: RateLimitDeps) {
  const rules = d.rules ?? API_RATE_RULES;
  return (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const path = req.url ?? '';
    if (req.method === 'OPTIONS' || SKIP.test(path) || !path.startsWith('/v1/')) return next();
    let rule: RateRule;
    let subject: string;
    let strict: boolean;
    if (PUBLIC.test(path)) {
      rule = rules.public;
      subject = hashed(clientAddress(req, d.trusted));
      strict = true;
    } else {
      const h = req.headers.authorization;
      const claims = h?.startsWith('Bearer ') ? d.tokens.verify(h.slice(7).trim(), d.now()) : null;
      // Chưa đăng nhập: route xác thực có luật OTP riêng; route khác sẽ trả 401 ở controller — không đếm để không mở kênh khoá người khác.
      if (!claims) return next();
      const write = req.method === 'POST' && ACTION.test(path);
      rule = write ? rules.action : rules.read;
      subject = claims.sub;
      strict = write;
    }
    d.limiter.hit(rule, subject).then(
      () => next(),
      (err: unknown) => {
        if (err instanceof AppError) return send(res, err);
        d.log.warn({ err, rule: rule.name }, 'rate limiter unavailable');
        if (strict) return send(res, new AppError('INTERNAL', 503, { rate_limit: 'unavailable' }, 'Rate limiter unavailable'));
        next();
      },
    );
  };
}

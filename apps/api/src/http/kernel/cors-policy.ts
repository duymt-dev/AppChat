// CORS + header bảo mật (TIP-045b annex B, ops §3): chỉ origin app khai trong env (`APP_PUBLIC_URL`, thêm `CORS_ORIGINS` cách dấu phẩy)
// được gọi API kèm credentials — so khớp chính xác scheme + host + port, không wildcard. Origin lạ: không trả header CORS (trình duyệt
// chặn), preflight → 403. Widget website khách KHÔNG gọi REST: chỉ tải `/widget.js` (công khai, `*` không credentials) và socket `/widget`
// (kiểm origin theo cấu hình widget từng workspace ở VisitorService). Webhook `/hooks/*` là server → server, không cần CORS.
// Thiếu Origin (server-to-server, curl) không bị coi là xác thực — mọi route vẫn kiểm token.
import type { IncomingMessage, ServerResponse } from 'node:http';
import helmet from 'helmet';

export function allowedOrigins(env: Record<string, string | undefined>): Set<string> {
  const raw = [env.APP_PUBLIC_URL ?? '', ...(env.CORS_ORIGINS ?? '').split(',')];
  const out = new Set<string>();
  for (const r of raw) {
    const s = r.trim();
    if (!s) continue;
    try {
      const u = new URL(s);
      if (u.protocol === 'http:' || u.protocol === 'https:') out.add(u.origin);
    } catch {
      // Giá trị sai bị bỏ qua (không mở rộng thành wildcard).
    }
  }
  return out;
}

const ALLOW_HEADERS = 'authorization, content-type, idempotency-key, x-workspace-id, x-request-id, x-action-source';
const EXPOSE_HEADERS = 'x-request-id, retry-after, content-disposition';

/** Route công khai cho mọi origin không credentials (script widget nhúng). */
const OPEN = /^\/widget\.js(?:\?|$)/;

export function corsMiddleware(origins: ReadonlySet<string>) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const origin = req.headers.origin;
    const path = req.url ?? '';
    if (origin && OPEN.test(path)) {
      res.setHeader('access-control-allow-origin', '*');
    } else if (origin && origins.has(origin)) {
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('access-control-allow-credentials', 'true');
      res.setHeader('access-control-expose-headers', EXPOSE_HEADERS);
    }
    res.setHeader('vary', 'Origin');
    if (req.method === 'OPTIONS' && req.headers['access-control-request-method']) {
      if (!origin || !(origins.has(origin) || OPEN.test(path))) {
        res.statusCode = 403;
        res.end();
        return;
      }
      res.setHeader('access-control-allow-methods', 'GET, POST, PUT, PATCH, DELETE');
      res.setHeader('access-control-allow-headers', ALLOW_HEADERS);
      res.setHeader('access-control-max-age', '600');
      res.statusCode = 204;
      res.end();
      return;
    }
    next();
  };
}

/** Origin socket (`/ws` của app): phải thuộc danh sách app khi có Origin. Namespace `/widget` kiểm theo cấu hình widget riêng. */
export function wsOriginAllowed(origins: ReadonlySet<string>, origin: string | undefined): boolean {
  return !origin || origins.has(origin);
}

/**
 * Header bảo mật qua helmet: API chỉ trả JSON / tệp tải về → CSP `default-src 'none'`, cấm nhúng khung (trừ PDF xem trước cùng app —
 * `frame-ancestors` = origin app), nosniff, HSTS khi production, không lộ `x-powered-by`. `/widget.js` cần nạp chéo origin →
 * Cross-Origin-Resource-Policy `cross-origin`.
 */
export function securityHeaders(origins: ReadonlySet<string>, production: boolean) {
  const app = [...origins];
  const strict = helmet({
    contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: app.length ? app : ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'same-site' },
    crossOriginEmbedderPolicy: false,
    frameguard: false,
    hsts: production ? { maxAge: 15_552_000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'no-referrer' },
  });
  const open = helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' }, crossOriginEmbedderPolicy: false, frameguard: false, hsts: false });
  return (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void): void => {
    (OPEN.test(req.url ?? '') ? open : strict)(req, res, next);
  };
}

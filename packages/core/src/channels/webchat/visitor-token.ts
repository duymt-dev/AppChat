// `visitor_token` của khách web (Blueprint §4.6 namespace `/widget`: JWT riêng, 30 ngày). HS256, khoá dẫn xuất từ APP_ENC_KEY với
// nhãn riêng — không dùng thay access token của người dùng (khác khoá, khác `typ`). Claims: khách web + tài khoản + workspace.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const VISITOR_TTL_SEC = 30 * 24 * 3600;

export interface VisitorClaims {
  typ: 'visitor';
  /** id `webchat_visitor`. */
  sub: string;
  /** `channel_account_id` webchat. */
  acc: string;
  ws: string;
  iat: number;
  exp: number;
}

const enc = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');

export class VisitorTokens {
  private readonly key: Buffer;

  constructor(encKey: Buffer) {
    this.key = createHmac('sha256', encKey).update('appchat:webchat-visitor:v1').digest();
  }

  private sign(data: string): Buffer {
    return createHmac('sha256', this.key).update(data).digest();
  }

  issue(c: { visitorId: string; accountId: string; ws: string }, nowMs: number): string {
    const iat = Math.floor(nowMs / 1000);
    const head = enc({ alg: 'HS256', typ: 'JWT' });
    const body = enc({ typ: 'visitor', sub: c.visitorId, acc: c.accountId, ws: c.ws, iat, exp: iat + VISITOR_TTL_SEC } satisfies VisitorClaims);
    return `${head}.${body}.${this.sign(`${head}.${body}`).toString('base64url')}`;
  }

  /** null = sai chữ ký / hết hạn / không phải token khách web. */
  verify(token: string, nowMs: number): VisitorClaims | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, b, s] = parts as [string, string, string];
    const want = this.sign(`${h}.${b}`);
    const got = Buffer.from(s, 'base64url');
    if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
    try {
      const c = JSON.parse(Buffer.from(b, 'base64url').toString('utf8')) as VisitorClaims;
      if (c.typ !== 'visitor' || typeof c.sub !== 'string' || typeof c.acc !== 'string' || typeof c.exp !== 'number' || c.exp * 1000 <= nowMs) return null;
      return c;
    } catch {
      return null;
    }
  }
}

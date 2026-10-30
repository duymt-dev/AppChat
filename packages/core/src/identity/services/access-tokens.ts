// Access JWT HS256 15 phút (Blueprint §4.1, §9) bằng node:crypto. `kid` chọn khoá → xoay khoá: thêm khoá mới làm `current`,
// giữ khoá cũ trong `keys` tới khi token cũ hết hạn.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const ACCESS_TTL_SEC = 15 * 60;

export interface AccessClaims {
  sub: string;
  iat: number;
  exp: number;
}

export interface JwtKeys {
  current: string;
  keys: Record<string, string>;
}

const enc = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
const sign = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest();

export class AccessTokens {
  constructor(private readonly k: JwtKeys) {
    for (const [kid, s] of Object.entries(k.keys)) if (Buffer.byteLength(s) < 32) throw new Error(`JWT key ${kid} < 32 byte`);
    if (!k.keys[k.current]) throw new Error('JWT current kid không có trong keys');
  }

  issue(userId: string, nowMs: number): { token: string; expiresAt: Date } {
    const iat = Math.floor(nowMs / 1000);
    const head = enc({ alg: 'HS256', typ: 'JWT', kid: this.k.current });
    const body = enc({ sub: userId, iat, exp: iat + ACCESS_TTL_SEC } satisfies AccessClaims);
    const sig = sign(this.k.keys[this.k.current]!, `${head}.${body}`).toString('base64url');
    return { token: `${head}.${body}.${sig}`, expiresAt: new Date((iat + ACCESS_TTL_SEC) * 1000) };
  }

  /** null = sai chữ ký / hết hạn / định dạng lạ (gọi chỗ ném UNAUTHENTICATED). */
  verify(token: string, nowMs: number): AccessClaims | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, b, s] = parts as [string, string, string];
    let head: { alg?: string; kid?: string };
    let claims: AccessClaims;
    try {
      head = JSON.parse(Buffer.from(h, 'base64url').toString('utf8')) as typeof head;
      claims = JSON.parse(Buffer.from(b, 'base64url').toString('utf8')) as AccessClaims;
    } catch {
      return null;
    }
    const secret = head.alg === 'HS256' && head.kid ? this.k.keys[head.kid] : undefined;
    if (!secret) return null;
    const want = sign(secret, `${h}.${b}`);
    const got = Buffer.from(s, 'base64url');
    if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
    if (typeof claims.sub !== 'string' || typeof claims.exp !== 'number' || claims.exp * 1000 <= nowMs) return null;
    return claims;
  }
}

/** `JWT_SECRET` (khoá hiện tại, kid "k1") + `JWT_SECRETS_OLD` ("k0:secret,…") cho token cũ khi xoay. */
export function jwtKeysFromEnv(current: string, old?: string, currentKid = 'k1'): JwtKeys {
  const keys: Record<string, string> = { [currentKid]: current };
  for (const pair of (old ?? '').split(',').filter(Boolean)) {
    const i = pair.indexOf(':');
    if (i > 0) keys[pair.slice(0, i)] = pair.slice(i + 1);
  }
  return { current: currentKid, keys };
}

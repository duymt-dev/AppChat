// TIP-004 (unit): argon2id PHC, JWT HS256 + xoay khoá, rate limiter, env identity, slug / chuẩn hoá email.
import { describe, expect, it } from 'vitest';
import { AccessTokens, RateLimiter, hashPassword, jwtKeysFromEnv, normalizeEmail, readIdentityEnv, sha256, verifyPassword, type CounterStore } from '../src';

describe('mật khẩu argon2id', () => {
  it('hash PHC + verify đúng / sai; hash rỗng → false (vẫn tốn thời gian argon2)', async () => {
    const h = await hashPassword('mat-khau-123');
    expect(h).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/);
    expect(await hashPassword('mat-khau-123')).not.toBe(h); // salt ngẫu nhiên
    expect(await verifyPassword('mat-khau-123', h)).toBe(true);
    expect(await verifyPassword('mat-khau-124', h)).toBe(false);
    expect(await verifyPassword('x', null)).toBe(false);
    expect(await verifyPassword('x', 'bcrypt$...')).toBe(false);
  });
});

describe('access JWT', () => {
  const now = Date.parse('2026-10-30T08:00:00Z');
  const keys = jwtKeysFromEnv('a'.repeat(32), 'k0:' + 'b'.repeat(32), 'k1');

  it('ký / kiểm; hết hạn 15 phút; sửa payload / chữ ký → null', () => {
    const t = new AccessTokens(keys);
    const { token, expiresAt } = t.issue('u1', now);
    expect(expiresAt.toISOString()).toBe('2026-10-30T08:15:00.000Z');
    expect(t.verify(token, now + 60_000)).toMatchObject({ sub: 'u1' });
    expect(t.verify(token, now + 15 * 60_000)).toBeNull();
    const [h, b, s] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'admin', iat: 0, exp: 9e9 })).toString('base64url');
    expect(t.verify(`${h}.${forged}.${s}`, now)).toBeNull();
    expect(t.verify(`${h}.${b}.${s!.slice(0, -2)}xx`, now)).toBeNull();
    expect(t.verify('abc', now)).toBeNull();
  });

  it('xoay khoá: token ký bằng kid cũ vẫn hợp lệ khi kid cũ còn trong keys; alg none → null', () => {
    const old = new AccessTokens({ current: 'k0', keys: { k0: 'b'.repeat(32) } });
    const tok = old.issue('u2', now).token;
    expect(new AccessTokens(keys).verify(tok, now)).toMatchObject({ sub: 'u2' });
    expect(new AccessTokens({ current: 'k1', keys: { k1: 'a'.repeat(32) } }).verify(tok, now)).toBeNull();
    const none = `${Buffer.from(JSON.stringify({ alg: 'none', kid: 'k1' })).toString('base64url')}.${tok.split('.')[1]}.`;
    expect(new AccessTokens(keys).verify(none, now)).toBeNull();
  });

  it('khoá < 32 byte → lỗi khởi tạo', () => {
    expect(() => new AccessTokens({ current: 'k', keys: { k: 'short' } })).toThrow(/32 byte/);
  });
});

class MemCounter implements CounterStore {
  n = new Map<string, number>();
  ttl = new Map<string, number>();
  async incr(k: string) {
    const v = (this.n.get(k) ?? 0) + 1;
    this.n.set(k, v);
    return v;
  }
  async pexpire(k: string, ms: number) {
    this.ttl.set(k, ms);
    return 1;
  }
  async pttl(k: string) {
    return this.ttl.get(k) ?? -1;
  }
}

describe('RateLimiter', () => {
  it('limit lần trong cửa sổ; lần vượt → RATE_LIMITED 429 + retry_after giây', async () => {
    const store = new MemCounter();
    const rl = new RateLimiter(store);
    const rule = { name: 'x', limit: 2, windowMs: 90_500 };
    await rl.hit(rule, 's');
    await rl.hit(rule, 's');
    await expect(rl.hit(rule, 's')).rejects.toMatchObject({ code: 'RATE_LIMITED', httpStatus: 429, fields: { retry_after: '91' } });
    await rl.hit(rule, 'other');
    expect(store.ttl.get('rl:x:s')).toBe(90_500);
  });
});

describe('env + chuẩn hoá', () => {
  it('thiếu JWT_SECRET → null; console mail cấm ở production; brevo cần key', () => {
    expect(readIdentityEnv({})).toBeNull();
    const ok = readIdentityEnv({ JWT_SECRET: 'x'.repeat(32) })!;
    expect(ok).toMatchObject({ MAIL_PROVIDER: 'console', TAX_LOOKUP_PROVIDER: 'mock', COOKIE_SECURE: 'true' });
    expect(() => readIdentityEnv({ JWT_SECRET: 'x'.repeat(32), NODE_ENV: 'production' })).toThrow(/MAIL_PROVIDER/);
    expect(() => readIdentityEnv({ JWT_SECRET: 'x'.repeat(32), MAIL_PROVIDER: 'brevo' })).toThrow(/BREVO_API_KEY/);
    expect(() => readIdentityEnv({ JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('email trim + chữ thường; sha256 hex', () => {
    expect(normalizeEmail('  A.B@Example.VN ')).toBe('a.b@example.vn');
    expect(sha256('x')).toMatch(/^[0-9a-f]{64}$/);
  });
});

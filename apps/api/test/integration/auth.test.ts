// TIP-004 AC2–AC6, AC12 qua HTTP thật (Postgres 16 + Memurai): OTP đăng ký / đăng nhập, chống dò, rate limit,
// mật khẩu argon2id, refresh xoay vòng + phát hiện dùng lại, quên mật khẩu, log không có PII.
import { Writable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startApi, testEmail, type Harness } from './setup';

let h: Harness;
const emails: string[] = [];
beforeAll(async () => {
  h = await startApi();
});
afterAll(async () => {
  const users = await h.platform.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
  users.forEach((u) => h.track(u.id));
  await h.platform.otpCode.deleteMany({ where: { email: { in: emails } } });
  await h?.close();
});

type Res = { status: number; body: any; cookie: string | null }; // eslint-disable-line @typescript-eslint/no-explicit-any
let ipSeq = 0;
const RUN = Math.floor(Math.random() * 200) + 20;
/** Mỗi lời gọi một IP giả khác nhau → test luật theo email không đụng luật theo IP (trừ khi truyền ip). */
async function post(path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Res> {
  const r = await fetch(`${h.base}/v1${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.${RUN}.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  return { status: r.status, body: text ? JSON.parse(text) : null, cookie: r.headers.get('set-cookie') };
}
const fresh = (tag: string) => {
  const e = testEmail(tag);
  emails.push(e);
  return e;
};
const codeOf = (email: string) => /\b(\d{6})\b/.exec(h.mail.last(email)?.text ?? '')?.[1];
const rt = (cookie: string | null) => /rt=([^;]+)/.exec(cookie ?? '')?.[1] ?? '';

async function register(email: string) {
  expect((await post('/auth/otp/request', { email, purpose: 'register' })).status).toBe(204);
  return post('/auth/otp/verify', { email, code: codeOf(email.trim().toLowerCase()), purpose: 'register' });
}

describe('đăng ký / OTP', () => {
  it('AC2 register → mã ở mail → verify 200 + access token + cookie rt đúng thuộc tính; user đã xác thực email', async () => {
    const email = fresh('reg');
    const r = await register(`  ${email.toUpperCase()} `);
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ user: { email }, needs_password: true });
    expect(r.body.data.access_token.split('.')).toHaveLength(3);
    expect(r.cookie).toMatch(/^rt=[^;]+; Path=\/api\/v1\/auth; Expires=[^;]+; HttpOnly; SameSite=Lax; Secure$/);
    const u = await h.platform.user.findUniqueOrThrow({ where: { email } });
    expect(u.emailVerifiedAt).not.toBeNull();
    const otp = await h.platform.otpCode.findFirstOrThrow({ where: { email } });
    expect(otp.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(otp.codeHash).not.toContain(codeOf(email)!);
  });

  it('AC2 sai mã 5 lần → mã khoá (đúng mã sau đó vẫn 401); mã hết hạn 10 phút → 401', async () => {
    const email = fresh('lock');
    await post('/auth/otp/request', { email, purpose: 'register' });
    const code = codeOf(email)!;
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) expect((await post('/auth/otp/verify', { email, code: wrong, purpose: 'register' })).status).toBe(401);
    expect((await post('/auth/otp/verify', { email, code, purpose: 'register' })).status).toBe(401);

    const email2 = fresh('exp');
    await post('/auth/otp/request', { email: email2, purpose: 'register' });
    h.clock.advance(10 * 60_000 + 1);
    expect((await post('/auth/otp/verify', { email: email2, code: codeOf(email2), purpose: 'register' })).status).toBe(401);
    h.clock.set('2026-10-30T08:00:00.000Z');
  });

  it('AC3 chống dò: login / reset với email chưa có và register với email đã có → 204, không gửi mail', async () => {
    const ghost = fresh('ghost');
    const sent = h.mail.sent.length;
    expect((await post('/auth/otp/request', { email: ghost, purpose: 'login' })).status).toBe(204);
    expect((await post('/auth/otp/request', { email: ghost, purpose: 'reset' })).status).toBe(204);
    expect((await post('/auth/password/reset-request', { email: ghost })).status).toBe(204);
    const owner = (await h.platform.user.findUniqueOrThrow({ where: { id: h.user } })).email;
    expect((await post('/auth/otp/request', { email: owner, purpose: 'register' })).status).toBe(204);
    expect(h.mail.sent.length).toBe(sent);
  });

  it('AC4 rate limit: lần thứ 6 trong 15 phút cùng email → 429 RATE_LIMITED + Retry-After', async () => {
    const email = fresh('rl');
    for (let i = 0; i < 5; i++) expect((await post('/auth/otp/request', { email, purpose: 'login' })).status).toBe(204);
    const r = await fetch(`${h.base}/v1/auth/otp/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `11.${RUN}.0.1` },
      body: JSON.stringify({ email, purpose: 'login' }),
    });
    expect(r.status).toBe(429);
    expect(Number(r.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(((await r.json()) as { error: { code: string } }).error.code).toBe('RATE_LIMITED');
  });

  it('rate limit theo IP: 20 / giờ / IP', async () => {
    const ip = { 'x-forwarded-for': `12.${RUN}.0.7` };
    for (let i = 0; i < 20; i++) expect((await post('/auth/otp/request', { email: fresh(`ip${i}`), purpose: 'login' }, ip)).status).toBe(204);
    expect((await post('/auth/otp/request', { email: fresh('ip21'), purpose: 'login' }, ip)).status).toBe(429);
  });

  it('body sai → 422 + fields', async () => {
    const r = await post('/auth/otp/request', { email: 'nope', purpose: 'x' });
    expect(r.status).toBe(422);
    expect(Object.keys(r.body.error.fields).sort()).toEqual(['email', 'purpose']);
  });
});

describe('mật khẩu + phiên', () => {
  it('AC5 password/set (cần token) → login đúng 200; sai mật khẩu / email lạ → cùng 401; hash $argon2id$', async () => {
    const email = fresh('pw');
    const reg = await register(email);
    const auth = { authorization: `Bearer ${reg.body.data.access_token}` };
    expect((await post('/auth/password/set', { password: 'mat-khau-123' })).status).toBe(401);
    expect((await post('/auth/password/set', { password: 'short' }, auth)).status).toBe(422);
    expect((await post('/auth/password/set', { password: 'mat-khau-123' }, auth)).status).toBe(204);
    expect((await h.platform.user.findUniqueOrThrow({ where: { email } })).passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    const ok = await post('/auth/password/login', { email, password: 'mat-khau-123', remember: true });
    expect(ok.status).toBe(200);
    expect(ok.body.data.needs_password).toBe(false);
    const bad = await post('/auth/password/login', { email, password: 'sai-mat-khau' });
    const ghost = await post('/auth/password/login', { email: fresh('nouser'), password: 'mat-khau-123' });
    expect([bad.status, ghost.status]).toEqual([401, 401]);
    expect(bad.body).toEqual(ghost.body);
  });

  it('AC6 refresh xoay vòng; dùng lại token cũ → 401 + thu hồi cả family; logout xoá cookie', async () => {
    const reg = await register(fresh('rt'));
    const t1 = rt(reg.cookie);
    const r2 = await post('/auth/refresh', undefined, { cookie: `rt=${t1}` });
    expect(r2.status).toBe(200);
    expect(r2.body.data.access_token).toBeTruthy();
    const t2 = rt(r2.cookie);
    expect(t2).not.toBe(t1);
    // Dùng lại t1 (đã xoay) → nghi bị đánh cắp: thu hồi family, t2 cũng chết.
    const reuse = await post('/auth/refresh', undefined, { cookie: `rt=${t1}` });
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.fields).toEqual({ refresh: 'reused' });
    expect((await post('/auth/refresh', undefined, { cookie: `rt=${t2}` })).status).toBe(401);
    expect((await post('/auth/refresh')).status).toBe(401);

    const again = await register(fresh('rt2'));
    const out = await post('/auth/logout', undefined, { cookie: `rt=${rt(again.cookie)}` });
    expect(out.status).toBe(204);
    expect(out.cookie).toMatch(/^rt=; .*Expires=Thu, 01 Jan 1970/);
    expect((await post('/auth/refresh', undefined, { cookie: `rt=${rt(again.cookie)}` })).status).toBe(401);
  });

  it('AC6 quên mật khẩu: link 15 phút → đặt lại → refresh cũ bị thu hồi; link dùng lại / hết hạn → 401', async () => {
    const email = fresh('reset');
    const reg = await register(email);
    expect((await post('/auth/password/reset-request', { email })).status).toBe(204);
    const link = /token=([^&\s]+)/.exec(h.mail.last(email)!.text)![1]!;
    const token = decodeURIComponent(link);
    expect((await post('/auth/password/reset', { token, password: 'mat-khau-moi-1' })).status).toBe(204);
    expect((await post('/auth/refresh', undefined, { cookie: `rt=${rt(reg.cookie)}` })).status).toBe(401);
    expect((await post('/auth/password/login', { email, password: 'mat-khau-moi-1' })).status).toBe(200);
    expect((await post('/auth/password/reset', { token, password: 'mat-khau-moi-2' })).status).toBe(401);

    await post('/auth/password/reset-request', { email });
    const t2 = decodeURIComponent(/token=([^&\s]+)/.exec(h.mail.last(email)!.text)![1]!);
    h.clock.advance(15 * 60_000 + 1);
    expect((await post('/auth/password/reset', { token: t2, password: 'mat-khau-moi-3' })).status).toBe(401);
    h.clock.set('2026-10-30T08:00:00.000Z');
  });

  it('OTP đăng nhập (login) cho user có sẵn → 200, needs_password theo trạng thái mật khẩu', async () => {
    const email = fresh('otplogin');
    await register(email);
    await post('/auth/otp/request', { email, purpose: 'login' });
    const r = await post('/auth/otp/verify', { email, code: codeOf(email), purpose: 'login' });
    expect(r.status).toBe(200);
    expect(r.body.data.needs_password).toBe(true);
  });
});

describe('log', () => {
  it('AC12 log của luồng OTP / login không chứa email, mã OTP, token', async () => {
    const lines: string[] = [];
    const sink = new Writable({
      write(chunk, _e, cb) {
        lines.push(String(chunk));
        cb();
      },
    });
    const hl = await startApi({ logSink: sink });
    try {
      const email = testEmail('log');
      const send = (path: string, body: unknown, headers: Record<string, string> = {}) =>
        fetch(`${hl.base}/v1${path}`, {
          method: 'POST',
          // IP giả riêng mỗi lần chạy — bộ đếm 20 / giờ / IP trên Redis còn sống giữa các lần chạy test.
          headers: { 'content-type': 'application/json', 'x-forwarded-for': `13.${RUN}.0.1`, ...headers },
          body: JSON.stringify(body),
        });
      await send('/auth/otp/request', { email, purpose: 'register' });
      const code = /\b(\d{6})\b/.exec(hl.mail.last(email)!.text)![1]!;
      expect((await send('/auth/otp/verify', { email, code: code === '999999' ? '000000' : '999999', purpose: 'register' })).status).toBe(401);
      const ok = await send('/auth/otp/verify', { email, code, purpose: 'register' });
      const token = ((await ok.json()) as { data: { access_token: string } }).data.access_token;
      const refresh = /rt=([^;]+)/.exec(ok.headers.get('set-cookie') ?? '')![1]!;
      await send('/auth/password/login', { email, password: 'khong-dung-123' });
      const all = lines.join('\n');
      expect(lines.filter((l) => l.includes('"msg":"request"')).length).toBeGreaterThanOrEqual(4);
      expect(all).not.toContain(email);
      expect(all).not.toContain(code);
      expect(all).not.toContain(token);
      expect(all).not.toContain(refresh);
      const u = await hl.platform.user.findUnique({ where: { email } });
      if (u) hl.track(u.id);
      await hl.platform.otpCode.deleteMany({ where: { email } });
    } finally {
      await hl.close();
    }
  });
});

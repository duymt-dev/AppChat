// TIP-045b AC1 / AC7 trên HTTP thật (Postgres 16 + Memurai, ngưỡng giới hạn THẬT): CORS chỉ origin app (preflight lạ 403, không header
// cho origin lạ, credentials đúng), header bảo mật (CSP / nosniff / không x-powered-by), `/widget.js` mở cho mọi origin không credentials;
// đọc 601 → 429 + Retry-After, action 121 → 429, trang công khai 31 / IP → 429; đổi workspace không đặt lại bộ đếm; X-Forwarded-For giả từ
// IP không tin cậy không đổi được khoá (logic `clientAddress`); socket `/ws` từ origin lạ bị từ chối; tải `.exe` đổi tên `.pdf` → 415.
import 'reflect-metadata';
import type { IncomingMessage } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io } from 'socket.io-client';
import { uuidv7 } from '@appchat/core';
import { clientAddress } from '../../src/http/kernel/api-rate-limit.guard';
import { call, startApi, type Harness } from './setup';

let h: Harness;
const APP = 'http://localhost:3000';

/** Gửi n yêu cầu theo lô 25 (Windows: hàng chờ kết nối của listener nhỏ — gửi 600 cùng lúc bị ECONNREFUSED, không phải giới hạn). */
async function burst(n: number, fn: () => Promise<Response>): Promise<Response[]> {
  const out: Response[] = [];
  for (let i = 0; i < n; i += 25) out.push(...(await Promise.all(Array.from({ length: Math.min(25, n - i) }, fn))));
  return out;
}

beforeAll(async () => {
  h = await startApi({ realRateLimits: true });
}, 240_000);
afterAll(async () => {
  await h?.close();
});

describe('CORS + header bảo mật', () => {
  it('origin app: credentials + expose; origin lạ: không header CORS, preflight 403; widget.js mở', async () => {
    const ok = await fetch(`${h.base}/v1/health`, { headers: { origin: APP } });
    expect(ok.headers.get('access-control-allow-origin')).toBe(APP);
    expect(ok.headers.get('access-control-allow-credentials')).toBe('true');
    const evil = await fetch(`${h.base}/v1/health`, { headers: { origin: 'https://evil.example' } });
    expect(evil.headers.get('access-control-allow-origin')).toBeNull();
    const pre = await fetch(`${h.base}/v1/actions/contact.create`, { method: 'OPTIONS', headers: { origin: 'https://evil.example', 'access-control-request-method': 'POST' } });
    expect(pre.status).toBe(403);
    const preOk = await fetch(`${h.base}/v1/actions/contact.create`, { method: 'OPTIONS', headers: { origin: APP, 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization,idempotency-key' } });
    expect(preOk.status).toBe(204);
    expect(preOk.headers.get('access-control-allow-headers')).toContain('idempotency-key');
    const w = await fetch(`${h.base}/widget.js`, { headers: { origin: 'https://shop.example' } });
    expect(w.headers.get('access-control-allow-origin')).toBe('*');
    expect(w.headers.get('access-control-allow-credentials')).toBeNull();
    expect(w.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
  });

  it('CSP default-src none + frame-ancestors app, nosniff, không x-powered-by', async () => {
    const r = await fetch(`${h.base}/v1/health`);
    expect(r.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(r.headers.get('content-security-policy')).toContain(`frame-ancestors ${APP}`);
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('x-powered-by')).toBeNull();
  });

  it('socket /ws: origin lạ bị từ chối trước xác thực; origin app qua lớp origin', async () => {
    const connect = (origin: string) =>
      new Promise<string>((done) => {
        const s = io(`${h.base}/ws`, { transports: ['websocket'], extraHeaders: { origin }, auth: { token: h.token, workspace_id: h.ws }, reconnection: false });
        s.on('connect', () => (s.close(), done('connected')));
        s.on('connect_error', (e: Error & { data?: { code?: string; fields?: Record<string, string> } }) => (s.close(), done(e.data?.fields?.origin ?? e.message)));
      });
    expect(await connect('https://evil.example')).toBe('FORBIDDEN');
    expect(await connect(APP)).not.toBe('FORBIDDEN');
  });
});

describe('giới hạn tốc độ (ngưỡng thật)', () => {
  it('đọc: 600 / phút / user → lần 601 trả 429 + Retry-After, envelope chuẩn; đổi workspace không đặt lại', async () => {
    const u = await h.member('manager');
    const get = () => call(h, '/me/authz', undefined, { authorization: `Bearer ${u.token}` });
    const res = await burst(600, get);
    expect(res.filter((r) => r.status === 429)).toHaveLength(0);
    const over = await get();
    expect(over.status).toBe(429);
    expect(Number(over.headers.get('retry-after'))).toBeGreaterThanOrEqual(1);
    expect(((await over.json()) as { error: { code: string } }).error.code).toBe('RATE_LIMITED');
    // Workspace khác (không phải thành viên) — bộ đếm vẫn theo user: 429 trước cả kiểm thành viên.
    expect((await call(h, '/me/authz', undefined, { authorization: `Bearer ${u.token}`, 'x-workspace-id': uuidv7() })).status).toBe(429);
  }, 60_000);

  it('action: 120 / phút / user → lần 121 trả 429', async () => {
    const u = await h.member('manager');
    const post = () => call(h, '/actions/contact.search', { input: { q: 'x' } }, { authorization: `Bearer ${u.token}`, 'idempotency-key': uuidv7() });
    const res = await burst(120, post);
    expect(res.filter((r) => r.status === 429)).toHaveLength(0);
    expect((await post()).status).toBe(429);
  }, 60_000);

  it('trang công khai: 30 / phút / IP → lần 31 trả 429; IP khác (qua proxy tin cậy) không bị ảnh hưởng', async () => {
    const pub = (ip: string) => fetch(`${h.base}/v1/public/quotes/${'x'.repeat(40)}`, { headers: { 'x-forwarded-for': ip } });
    const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
    const res = await burst(30, () => pub(ip));
    expect(res.filter((r) => r.status === 429)).toHaveLength(0);
    expect((await pub(ip)).status).toBe(429);
    expect((await pub('198.51.100.77')).status).not.toBe(429);
  });

  it('X-Forwarded-For chỉ tin khi socket là proxy tin cậy; lấy hop cuối không phải proxy', () => {
    const req = (peer: string, xff?: string) => ({ socket: { remoteAddress: peer }, headers: xff ? { 'x-forwarded-for': xff } : {} }) as unknown as IncomingMessage;
    const trusted = new Set(['127.0.0.1']);
    expect(clientAddress(req('198.51.100.9', '1.2.3.4'), trusted)).toBe('198.51.100.9');
    expect(clientAddress(req('127.0.0.1', '6.6.6.6, 203.0.113.5'), trusted)).toBe('203.0.113.5');
    expect(clientAddress(req('127.0.0.1'), trusted)).toBe('127.0.0.1');
  });
});

describe('tải tệp', () => {
  it('.exe đổi tên .pdf → 415 envelope chuẩn; PDF thật → 201', async () => {
    const up = (name: string, body: Buffer, type: string) => {
      const form = new FormData();
      form.set('purpose', 'attachment');
      form.set('file', new Blob([new Uint8Array(body)], { type }), name);
      return fetch(`${h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${h.token}` }, body: form });
    };
    const exe = await up('hoa-don.pdf', Buffer.concat([Buffer.from('MZ'), Buffer.alloc(128)]), 'application/pdf');
    expect(exe.status).toBe(415);
    expect(await exe.json()).toEqual({ error: { code: 'VALIDATION_FAILED', message: expect.any(String), fields: { file: 'executable' } } });
    expect((await up('hoa-don.pdf', Buffer.from('%PDF-1.4\n%%EOF'), 'application/pdf')).status).toBe(201);
  });
});

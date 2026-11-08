// TIP-012c §1.3–§1.5 (AC1, AC2): cầu mạng mail của DN trong core — HTTP chỉ tới api.brevo.com (host lạ / http → chặn trước mạng), POST
// qua safeFetch chỉ khi không redirect; thăm dò integration.test với adapter mail KHÔNG gửi thư; SMTP đích private chặn trước transport.
// Tách thư hệ thống nền tảng (ports/mail.ts) — adapter tenant không phải MailProvider.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { connectorRegistry, isTenantMail, type ConnectionCtx } from '@appchat/integrations';
import { mailTransports, MAIL_HOSTS } from '../src/integrations/mail/module';
import { probe } from '../src/integrations/services/form-schema';
import { probeOp } from '../src/integrations/operations/probe';
import { FetchLimitError, safeFetch } from '../src/kernel/http/safe-fetch';

let srv: Server;
let port = 0;
const posted: { method?: string; body: string }[] = [];
beforeAll(async () => {
  srv = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      posted.push({ method: req.method, body });
      if (req.url === '/redir') return res.writeHead(302, { location: '/ok' }).end();
      res.writeHead(201, { 'content-type': 'application/json' }).end('{"messageId":"<x@y>"}');
    });
  });
  await new Promise<void>((ok) => srv.listen(0, '127.0.0.1', ok));
  port = (srv.address() as AddressInfo).port;
});
afterAll(() => new Promise<void>((ok) => srv.close(() => ok())));

describe('safeFetch POST', () => {
  const opts = { resolve: async () => [{ address: '127.0.0.1', family: 4 }], testAllowAddresses: ['127.0.0.1'] };
  it('POST có thân chỉ khi maxRedirects 0; thân tới đúng máy chủ', async () => {
    await expect(safeFetch(`http://mail.test:${port}/x`, { ...opts, method: 'POST', body: '{"a":1}' })).rejects.toBeInstanceOf(FetchLimitError);
    const r = await safeFetch(`http://mail.test:${port}/x`, { ...opts, method: 'POST', body: '{"a":1}', maxRedirects: 0 });
    expect(r.status).toBe(201);
    expect(posted.at(-1)).toEqual({ method: 'POST', body: '{"a":1}' });
  });
  it('302 khi maxRedirects 0 → trả nguyên 302 (không gửi lại thân)', async () => {
    const n = posted.length;
    const r = await safeFetch(`http://mail.test:${port}/redir`, { ...opts, method: 'POST', body: 'x', maxRedirects: 0 }).catch((e: Error) => e);
    expect(r).toBeInstanceOf(FetchLimitError);
    expect(posted.length).toBe(n + 1);
  });
});

describe('mailTransports', () => {
  it('chỉ https://api.brevo.com — host lạ / http bị chặn trước mạng', async () => {
    expect([...MAIL_HOSTS]).toEqual(['api.brevo.com']);
    const t = mailTransports({ fetchOptions: { resolve: async () => [] } });
    await expect(t.http({ method: 'POST', url: 'https://evil.test/v3/smtp/email', headers: {} })).rejects.toMatchObject({ code: 'unsupported' });
    await expect(t.http({ method: 'GET', url: 'http://api.brevo.com/v3/senders', headers: {} })).rejects.toMatchObject({ code: 'unsupported' });
  });
  it('SMTP đích private → ProviderError, không tạo transport', async () => {
    const create = vi.fn();
    const t = mailTransports({ resolve: async () => ['10.0.0.8'], smtpCreate: create });
    const c: ConnectionCtx = { id: 'c', mode: 'live', config: { host: 'smtp.spahoa.vn', port: '587', username: 'u' }, secrets: { password: 'p' } };
    await expect(t.smtp!(c)).rejects.toMatchObject({ code: 'unsupported' });
    expect(create).not.toHaveBeenCalled();
  });
});

describe('integration.test với mail DN', () => {
  it('Brevo: probe gọi GET senders bằng khoá nháp, không POST gửi thư; khoá sai → failed đã làm sạch', async () => {
    const e = connectorRegistry.get('brevo')!;
    expect(isTenantMail(e.adapters?.live)).toBe(true);
    const http = vi.fn(async (r: { method: string; url: string }) => ({ status: r.method === 'GET' ? 200 : 500, headers: {}, body: '{"senders":[{"id":1,"email":"hello@spahoa.vn","name":"Spa","active":true}]}' }));
    const conn: ConnectionCtx = { id: 'draft', mode: 'live', config: { sender_email: 'hello@spahoa.vn' }, secrets: { api_key: 'k-draft' } };
    expect(await probe(e, conn, 2000, undefined, { http })).toEqual({ status: 'ok' });
    expect(http.mock.calls.every((c) => c[0].method === 'GET')).toBe(true);
    const bad = vi.fn(async () => ({ status: 401, headers: {}, body: '{"message":"Key not found k-draft"}' }));
    const r = await probe(e, conn, 2000, undefined, { http: bad });
    expect(r).toEqual({ status: 'failed', reason: 'rejected' });
    expect(JSON.stringify(r)).not.toContain('k-draft');
  });
});

describe('connection.probe bền với mail DN (P2)', () => {
  const brevo = connectorRegistry.get('brevo')!.adapters!.live!;
  const conn: ConnectionCtx = { id: 'c1', mode: 'live', config: { sender_email: 'hello@spahoa.vn' }, secrets: { api_key: 'k-live' } };
  const run = async (http: (r: { method: string; url: string }) => Promise<{ status: number; headers: Record<string, string>; body: string }>, mail = true) => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const a = { db: { integrationConnection: { updateMany } }, workspaceId: 'w', call: { configRev: 3 }, conn, connectorKey: 'brevo', adapter: brevo, http: vi.fn(), ...(mail ? { mail: { http, smtp: vi.fn() } } : {}), now: () => new Date('2026-11-09T00:00:00Z') };
    const out = await probeOp.run(a as never);
    return { out, data: (updateMany.mock.calls[0] as unknown as [{ where: unknown; data: Record<string, unknown> }] | undefined)?.[0] };
  };

  it('ghi người gửi + trạng thái cho đúng phiên bản khoá (chưa có token webhook → events false); không POST; không khoá trong bằng chứng', async () => {
    const http = vi.fn(async (r: { method: string; url: string }) => ({ status: r.method === 'GET' ? 200 : 500, headers: {}, body: '{"senders":[{"id":4,"email":"hello@spahoa.vn","name":"Spa","active":true}]}' }));
    const { out, data } = await run(http);
    expect(out).toEqual({ probe: 'verified' });
    expect(data!.where).toMatchObject({ id: 'c1', credentialRev: 3 });
    expect(data!.data).toMatchObject({ lastProbeStatus: 'verified', probedRev: 3, mailSenders: { state: 'sender_verified', events: false, senders: [{ id: '4', email: 'hello@spahoa.vn', name: 'Spa', state: 'sender_verified' }] } });
    expect(JSON.stringify(data)).not.toContain('k-live');
    expect(http.mock.calls.every((c) => c[0].method === 'GET')).toBe(true);
  });

  it('khoá sai → failed auth_failed + bằng chứng degraded; người gửi chưa kích hoạt → failed sender_inactive; thiếu cầu mạng → lỗi tạm (thử lại)', async () => {
    const bad = await run(async () => ({ status: 401, headers: {}, body: '{}' }));
    expect(bad.data!.data).toMatchObject({ lastProbeStatus: 'failed', lastProbeReason: 'auth_failed', mailSenders: { state: 'degraded', senders: [] } });
    const inactive = await run(async () => ({ status: 200, headers: {}, body: '{"senders":[{"id":4,"email":"hello@spahoa.vn","name":"Spa","active":false}]}' }));
    expect(inactive.data!.data).toMatchObject({ lastProbeStatus: 'failed', lastProbeReason: 'sender_inactive' });
    await expect(run(vi.fn(), false)).rejects.toMatchObject({ code: 'provider_unavailable' });
  });
});

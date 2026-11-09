// TIP-012c §1, §3 (AC1, AC4): adapter mail của DN theo hợp đồng fixtures (brevo / smtp tenant-mail-contract.json) — đúng khoá của kết nối,
// thăm dò KHÔNG gửi, kết quả gửi trung thực (accepted chỉ khi mã thư không rỗng; mất phản hồi → unknown), callback bearer + khoá chống lặp.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { brevoManifest } from '../src/connectors/brevo/manifest';
import { smtpManifest } from '../src/connectors/smtp/manifest';
import {
  BREVO_SEND_URL,
  BrevoTenantMail,
  SmtpTenantMail,
  connectorRegistry,
  isTenantMail,
  type ConnectionCtx,
  type MailTransports,
  type SmtpSendInfo,
  type TenantMailMessage,
} from '../src';

const contract = (p: string) => JSON.parse(readFileSync(join(__dirname, 'fixtures', p, 'tenant-mail-contract.json'), 'utf8'));
const B = contract('brevo');
const S = contract('smtp');
const msg: TenantMailMessage = { to: 'khach@example.test', subject: 'Ưu đãi tháng 11', html: '<p>Chào</p>', text: 'Chào', messageId: '<c1.r1@appchat.local>', tag: 'campaign' };
const conn = (o: Partial<ConnectionCtx> = {}): ConnectionCtx => ({ id: 'c1', mode: 'live', config: { sender_email: 'hello@spahoa.vn', sender_name: 'Spa Hoa' }, secrets: { api_key: 'key-tenant-A', webhook_token: 'tok_0123456789abcdef' }, ...o });
const http = (r: { status: number; body: string; headers?: Record<string, string> }) => vi.fn<MailTransports['http']>(async () => ({ status: r.status, body: r.body, headers: r.headers ?? {} }));

describe('đăng ký', () => {
  it('brevo / smtp có adapter mail tenant live, không có sandbox lùi', () => {
    for (const k of ['brevo', 'smtp']) {
      const e = connectorRegistry.get(k)!;
      expect(isTenantMail(e.adapters?.live)).toBe(true);
      expect(e.adapters?.sandbox).toBeUndefined();
    }
  });
  it('manifest chặn CRLF / địa chỉ sai / cổng ngoài 465·587', () => {
    expect(brevoManifest.validate!({ config: { sender_email: 'a@b.vn\r\nBcc: x@y.z' }, secrets: {} })).toMatchObject({ sender_email: 'invalid' });
    expect(brevoManifest.validate!({ config: { sender_email: 'hello@spahoa.vn' }, secrets: { webhook_token: 'ngắn' } })).toMatchObject({ webhook_token: 'invalid' });
    expect(smtpManifest.validate!({ config: { host: 'smtp.gmail.com', username: 'a@b.vn', port: '25' }, secrets: {} })).toMatchObject({ port: 'invalid' });
    expect(smtpManifest.validate!({ config: { host: '10.0.0.1', username: 'a@b.vn' }, secrets: {} })).toMatchObject({ host: 'invalid' });
    expect(smtpManifest.validate!({ config: { host: 'smtp.gmail.com', username: 'a@b.vn' }, secrets: {} })).toBeNull();
  });
});

describe('Brevo tenant', () => {
  const a = new BrevoTenantMail(brevoManifest);
  it('thăm dò = GET /v3/senders bằng khoá của ĐÚNG kết nối, không gửi thư; active → sender_verified', async () => {
    const h = http(B.fixtures.senders);
    const p = await a.probe(conn(), { http: h });
    expect(h).toHaveBeenCalledTimes(1);
    expect(h.mock.calls[0]![0]).toMatchObject({ method: 'GET', url: B.senders.url, headers: { 'api-key': 'key-tenant-A' } });
    expect(p).toMatchObject({ state: 'sender_verified', events: true, senders: [{ email: 'hello@spahoa.vn' }] });
    const p2 = await a.probe(conn({ config: { sender_email: 'old@spahoa.vn' } }), { http: http(B.fixtures.senders) });
    expect(p2).toMatchObject({ state: 'unverified', reason: 'sender_inactive' });
    const p3 = await a.probe(conn({ config: { sender_email: 'khac@spahoa.vn' } }), { http: http(B.fixtures.senders) });
    expect(p3).toMatchObject({ state: 'unverified', reason: 'sender_not_in_account' });
    const b = conn({ secrets: { api_key: 'key-tenant-B' } });
    const hb = http(B.fixtures.senders);
    await a.probe(b, { http: hb });
    expect(hb.mock.calls[0]![0].headers['api-key']).toBe('key-tenant-B');
  });
  it('gửi: 201 + messageId → accepted; mã rỗng / 5xx / mạng → unknown; 400 / 401 vĩnh viễn; 429 tạm + Retry-After', async () => {
    const h = http(B.fixtures.accepted);
    expect(await a.send(conn(), { http: h }, msg)).toEqual({ state: 'accepted', providerMessageRef: '<202611081200.1@smtp-relay.mailin.fr>', evidence: 'http_201' });
    const sent = JSON.parse(h.mock.calls[0]![0].body!);
    expect(h.mock.calls[0]![0].url).toBe(BREVO_SEND_URL);
    expect(sent).toMatchObject({ sender: { email: 'hello@spahoa.vn', name: 'Spa Hoa' }, to: [{ email: msg.to }], tags: ['campaign'] });
    expect(Object.keys(sent)).not.toContain('bcc');
    expect(await a.send(conn(), { http: http(B.fixtures.empty_message_id) }, msg)).toMatchObject({ state: 'unknown', reason: 'empty_message_id' });
    expect(await a.send(conn(), { http: http({ status: 502, body: '' }) }, msg)).toMatchObject({ state: 'unknown' });
    expect(await a.send(conn(), { http: vi.fn(async () => Promise.reject(new Error('socket hang up'))) }, msg)).toMatchObject({ state: 'unknown' });
    expect(await a.send(conn(), { http: http(B.fixtures.bad_request) }, msg)).toMatchObject({ state: 'failed_before_accept', retryable: false });
    expect(await a.send(conn(), { http: http(B.fixtures.auth_failed) }, msg)).toMatchObject({ state: 'failed_before_accept', retryable: false, reason: 'auth_failed' });
    expect(await a.send(conn(), { http: http(B.fixtures.rate_limited) }, msg)).toMatchObject({ state: 'failed_before_accept', retryable: true, retryAfterS: 30 });
  });
  it('thư sai (CRLF tiêu đề / người nhận) → không gọi mạng', async () => {
    const h = http(B.fixtures.accepted);
    expect(await a.send(conn(), { http: h }, { ...msg, subject: 'A\r\nBcc: x@y.z' })).toMatchObject({ state: 'failed_before_accept', reason: 'invalid_subject' });
    expect(await a.send(conn(), { http: h }, { ...msg, to: 'x@y.z, z@w.v' })).toMatchObject({ reason: 'invalid_to' });
    expect(h).not.toHaveBeenCalled();
  });
  it('callback: bearer đúng token webhook (không phải api_key); lô; khoá chống lặp không dùng id webhook; sai → null', () => {
    const req = (raw: string, auth?: string) => ({ headers: { authorization: auth }, rawBody: raw });
    expect(a.parseEvents(conn(), req(B.fixtures.webhook_delivered))).toBeNull();
    expect(a.parseEvents(conn(), req(B.fixtures.webhook_delivered, 'Bearer key-tenant-A'))).toBeNull();
    const one = a.parseEvents(conn(), req(B.fixtures.webhook_delivered, 'Bearer tok_0123456789abcdef'))!;
    expect(one).toHaveLength(1);
    expect(one[0]).toMatchObject({ type: 'delivered', providerMessageRef: '<202611081200.1@smtp-relay.mailin.fr>' });
    expect(one[0]!.key).not.toContain('42');
    expect(JSON.stringify(one)).not.toContain('khach@example.test');
    const batch = a.parseEvents(conn(), req(B.fixtures.webhook_batch, 'Bearer tok_0123456789abcdef'))!;
    expect(batch.map((e) => e.type)).toEqual(['opened', 'hard_bounce']);
    expect(new Set(batch.map((e) => e.key)).size).toBe(2);
    expect(a.parseEvents(conn(), req('x'.repeat(256 * 1024 + 1), 'Bearer tok_0123456789abcdef'))).toBeNull();
    expect(a.parseEvents(conn({ secrets: { api_key: 'k' } }), req(B.fixtures.webhook_delivered, 'Bearer tok_0123456789abcdef'))).toBeNull();
  });
});

describe('SMTP tenant', () => {
  const a = new SmtpTenantMail(smtpManifest);
  const c = conn({ config: { host: 'smtp.spahoa.vn', port: '587', username: 'u', sender_email: 'hello@spahoa.vn', sender_name: 'Spa' }, secrets: { password: 'p' } });
  const smtp = (r: SmtpSendInfo | { error: object }): MailTransports => ({ http: vi.fn(), smtp: async () => async () => ('error' in r ? Promise.reject(r.error) : r) });
  it('thăm dò = authenticated_transport (không chứng minh domain), không sự kiện; không gửi', async () => {
    const send = vi.fn();
    const p = await a.probe(c, { http: vi.fn(), smtp: async () => send });
    expect(p).toMatchObject({ state: 'authenticated_transport', events: false, senders: [{ email: 'hello@spahoa.vn', state: 'unverified' }] });
    expect(send).not.toHaveBeenCalled();
  });
  it('accepted chỉ khi người nhận được nhận + 250; RCPT 550 vĩnh viễn; 451 tạm; mất ở DATA → unknown', async () => {
    expect(await a.send(c, smtp(S.fixtures.accepted), msg)).toMatchObject({ state: 'accepted', providerMessageRef: msg.messageId });
    expect(await a.send(c, smtp({ ...S.fixtures.accepted, accepted: [], rejected: ['khach@example.test'] }), msg)).toMatchObject({ state: 'failed_before_accept', retryable: false });
    expect(await a.send(c, smtp({ ...S.fixtures.accepted, response: '' }), msg)).toMatchObject({ state: 'unknown' });
    expect(await a.send(c, smtp(S.fixtures.rcpt_rejected), msg)).toMatchObject({ state: 'failed_before_accept', retryable: false });
    expect(await a.send(c, smtp(S.fixtures.transient), msg)).toMatchObject({ state: 'failed_before_accept', retryable: true });
    expect(await a.send(c, smtp(S.fixtures.lost_after_data), msg)).toMatchObject({ state: 'unknown' });
    expect(await a.send(c, smtp(S.fixtures.tls_failed), msg)).toMatchObject({ state: 'failed_before_accept', retryable: true });
  });
});

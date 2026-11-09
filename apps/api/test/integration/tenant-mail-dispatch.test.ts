// TIP-012c P3 (§2.4, §3; AC4) trên Postgres 16 thật: chiến dịch email qua mail của DN gửi qua biên nhận gọi integrations (không qua hàng
// gửi kênh) — dispatch tạo biên nhận `tenant_mail_delivery` (digest, không địa chỉ) + lượt gọi `mail.send`; runner gửi bằng transport giả
// đúng hợp đồng Brevo: 201 + messageId → accepted (campaign.record_delivery một lần); messageId rỗng / 5xx sau gửi / đứt → unknown, không
// gửi lại; 429 trước khi nhận → thử lại có giới hạn rồi failed chắc chắn; sập sau đặt chỗ → unknown; khoá đổi giữa chừng → cancelled
// không gọi provider; thiếu bộ xử lý miền → hoãn (không accepted). Gửi thử: biên nhận test_send riêng, không thống kê chiến dịch.
import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectorRegistry, type MailTransports } from '@appchat/integrations';
import {
  MAIL_SEND_OP, MarketingDeps, campaignMailDomain, executeCall, mailSendOp, parseEncKey, providerHttp, registerCallOp, registerMailDomain, sealSecrets,
  unregisterCallOp, unregisterMailDomain, uuidv7, ActionExecutor,
} from '@appchat/core';
import { env, startApi, type Harness } from './setup';
import { Mk } from './helpers/marketing-fixtures';

let h: Harness;
let mk: Mk;
let conn: string;
const KEY = 'xkeysib-test-0000000000000000';
type Req = { method: string; url: string; headers: Record<string, string>; body?: string };
const brevo = { status: 201, body: '{"messageId":"<202611090000.1@smtp-relay.mailin.fr>"}', throws: false, sent: [] as Req[] };
const mail: MailTransports = {
  http: async (r) => {
    if (r.method === 'GET') return { status: 200, headers: {}, body: '{"senders":[{"id":7,"email":"news@shop.vn","name":"Shop News","active":true}]}' };
    brevo.sent.push(r as Req);
    if (brevo.throws) throw new Error('socket hang up');
    const headers: Record<string, string> = brevo.status === 429 ? { 'retry-after': '1' } : {};
    return { status: brevo.status, headers, body: brevo.body };
  },
  smtp: async () => {
    throw new Error('no smtp');
  },
};
const deps = () => ({ tenants: mk.resolver, registry: connectorRegistry, key: parseEncKey(env.APP_ENC_KEY!), http: providerHttp(), mail, kv: null, now: () => h.clock.now() });

beforeAll(async () => {
  h = await startApi();
  mk = new Mk(h);
  conn = uuidv7();
  await (await mk.db()).integrationConnection.create({
    data: {
      id: conn, connectorKey: 'brevo', port: 'mail', name: 'Brevo DN', mode: 'live', status: 'connected', config: { sender_email: 'news@shop.vn' },
      secretEnc: new Uint8Array(sealSecrets({ api_key: KEY }, parseEncKey(env.APP_ENC_KEY!))), credentialRev: 1, probedRev: 1, lastProbeStatus: 'verified', lastProbeAt: h.clock.now(),
      mailSenders: { state: 'sender_verified', account_ref: null, events: false, senders: [{ id: '7', email: 'news@shop.vn', name: 'Shop News', state: 'sender_verified' }] },
    },
  });
  registerCallOp(MAIL_SEND_OP, mailSendOp);
}, 240_000);
afterAll(async () => {
  unregisterCallOp(MAIL_SEND_OP);
  unregisterMailDomain();
  await mk?.close();
  await h?.close();
});
beforeEach(() => {
  Object.assign(brevo, { status: 201, body: '{"messageId":"<202611090000.1@smtp-relay.mailin.fr>"}', throws: false, sent: [] });
  const d = h.app.get(MarketingDeps, { strict: false });
  registerMailDomain(campaignMailDomain({ executor: h.app.get(ActionExecutor, { strict: false }), links: d.links, userEmail: (u) => d.userEmail(u) }));
});

/** Chiến dịch email mail-DN đã duyệt với các khách có email → tick → các biên nhận gọi mail.send. */
async function approved(emails: string[]) {
  const contacts = await Promise.all(emails.map((email) => mk.contact({ email })));
  const c = await mk.act('campaign.create', { name: `Bản tin ${uuidv7().slice(-4)}`, channel: 'email', sender: { kind: 'tenant_mail', connection_id: conn, sender_id: '7' }, contact_ids: contacts, content: { subject: 'Ưu đãi {ten}', text: 'Chào {ten}' } });
  expect(c.status, JSON.stringify(c.body)).toBe(200);
  const id = c.body.data.result.campaign_id as string;
  const s = await mk.act('campaign.submit', { campaign_id: id });
  expect((await mk.confirmed('campaign.approve', { campaign_id: id, if_version: s.body.data.result.version })).status).toBe(200);
  await mk.tick();
  const db = await mk.db();
  const deliveries = await db.tenantMailDelivery.findMany({ where: { campaignId: id }, orderBy: { id: 'asc' } });
  const calls = await db.integrationCallLog.findMany({ where: { connectionId: conn, op: MAIL_SEND_OP, refId: { in: deliveries.map((d) => `${d.dispatchRef}#${d.attempts}`) } } });
  return { id, deliveries, calls };
}
const run = async (callId: string) => executeCall(deps(), h.ws, callId);
const recipient = async (deliveryRef: string) => (await mk.db()).campaignRecipient.findUniqueOrThrow({ where: { id: deliveryRef.slice(3) } });

describe('gửi qua biên nhận gọi integrations', () => {
  it('dispatch tạo biên nhận digest (không địa chỉ) + lượt gọi; 201 + messageId → accepted, record_delivery một lần; chạy lại không gửi đôi', async () => {
    const { id, deliveries, calls } = await approved(['a@khach.vn']);
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]).toMatchObject({ state: 'queued', subjectKind: 'campaign_recipient', senderId: '7', senderRev: 1, attempts: 1 });
    expect(JSON.stringify(deliveries[0])).not.toContain('a@khach.vn');
    expect(JSON.stringify(calls[0])).not.toContain('a@khach.vn');
    expect(await run(calls[0]!.id)).toBe('succeeded');
    expect(brevo.sent).toHaveLength(1);
    const body = JSON.parse(brevo.sent[0]!.body!);
    expect(body).toMatchObject({ sender: { email: 'news@shop.vn' }, to: [{ email: 'a@khach.vn' }] });
    expect(brevo.sent[0]!.headers['api-key']).toBe(KEY);
    const d = await (await mk.db()).tenantMailDelivery.findUniqueOrThrow({ where: { id: deliveries[0]!.id } });
    expect(d).toMatchObject({ state: 'accepted', providerMessageRef: '<202611090000.1@smtp-relay.mailin.fr>' });
    expect(await recipient(d.dispatchRef)).toMatchObject({ status: 'sent', outcome: 'accepted' });
    expect(await run(calls[0]!.id)).toBe('skipped');
    // Lượt quét phút sau (khoá idempotent dispatch theo phút): hết người nhận mở → hoàn tất, không gửi thêm.
    h.clock.advance(60_000);
    await mk.tick();
    expect(brevo.sent).toHaveLength(1);
    expect(await (await mk.db()).campaign.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: 'completed' });
  });

  it('messageId rỗng / 5xx sau gửi / đứt kết nối → unknown, recipient "cần kiểm tra", không gửi lại', async () => {
    for (const setup of [() => (brevo.body = '{"messageId":""}'), () => ((brevo.status = 502), (brevo.body = '<html/>')), () => (brevo.throws = true)]) {
      Object.assign(brevo, { status: 201, body: '{"messageId":"<x@y>"}', throws: false });
      setup();
      const { deliveries, calls } = await approved([`u${uuidv7().slice(-6)}@khach.vn`]);
      await run(calls[0]!.id);
      const d = await (await mk.db()).tenantMailDelivery.findUniqueOrThrow({ where: { id: deliveries[0]!.id } });
      expect(d.state).toBe('unknown');
      expect(await recipient(d.dispatchRef)).toMatchObject({ outcome: 'unknown' });
      const n = brevo.sent.length;
      await mk.tick();
      expect(await run(calls[0]!.id)).toBe('skipped');
      expect(brevo.sent.length).toBe(n);
    }
  });

  it('429 trước khi nhận → thử lại có giới hạn (3 lượt) rồi failed chắc chắn; mỗi lượt một biên nhận gọi riêng', async () => {
    brevo.status = 429;
    brevo.body = '{"code":"too_many_requests"}';
    const { deliveries, calls } = await approved(['r@khach.vn']);
    const db = await mk.db();
    let callId = calls[0]!.id;
    for (let i = 1; i <= 3; i++) {
      expect(await run(callId)).toBe('succeeded');
      const d = await db.tenantMailDelivery.findUniqueOrThrow({ where: { id: deliveries[0]!.id } });
      if (i < 3) {
        expect(d).toMatchObject({ state: 'queued', attempts: i + 1 });
        expect(await recipient(d.dispatchRef)).toMatchObject({ status: 'pending', sendState: 'none' });
        const next = await db.integrationCallLog.findFirstOrThrow({ where: { op: MAIL_SEND_OP, refId: `${d.dispatchRef}#${d.attempts}` } });
        await db.integrationCallLog.update({ where: { id: next.id }, data: { nextAttemptAt: h.clock.now() } });
        callId = next.id;
      } else {
        expect(d.state).toBe('failed_before_accept');
        expect(await recipient(d.dispatchRef)).toMatchObject({ status: 'failed', outcome: 'failed' });
      }
    }
    expect(brevo.sent).toHaveLength(3);
  });

  it('sập sau đặt chỗ (biên nhận reserved) → unknown, không gọi provider; kết nối lại giữa chừng → cancelled trước khi gọi', async () => {
    const a = await approved(['s@khach.vn']);
    const db = await mk.db();
    await db.tenantMailDelivery.update({ where: { id: a.deliveries[0]!.id }, data: { state: 'reserved' } });
    await run(a.calls[0]!.id);
    expect((await db.tenantMailDelivery.findUniqueOrThrow({ where: { id: a.deliveries[0]!.id } })).state).toBe('unknown');
    expect(brevo.sent).toHaveLength(0);
    const b = await approved(['k@khach.vn']);
    await db.integrationConnection.update({ where: { id: conn }, data: { credentialRev: 2 } });
    expect(await run(b.calls[0]!.id)).toBe('cancelled');
    expect(brevo.sent).toHaveLength(0);
    expect((await db.tenantMailDelivery.findUniqueOrThrow({ where: { id: b.deliveries[0]!.id } })).state).toBe('queued');
    await db.integrationConnection.update({ where: { id: conn }, data: { credentialRev: 1 } });
  });

  it('thiếu bộ xử lý miền → hoãn (không accepted, không gọi provider); khách huỷ nhận sau khi nhận lô → failed_before_accept, bỏ qua', async () => {
    const a = await approved(['m@khach.vn']);
    unregisterMailDomain();
    expect(await run(a.calls[0]!.id)).toBe('succeeded');
    const db = await mk.db();
    expect(await db.tenantMailDelivery.findUniqueOrThrow({ where: { id: a.deliveries[0]!.id } })).toMatchObject({ state: 'queued', attempts: 2 });
    expect(brevo.sent).toHaveLength(0);
    const d = campaignMailDomain({ executor: h.app.get(ActionExecutor, { strict: false }), links: null, userEmail: async () => null });
    registerMailDomain(d);
    const b = await approved(['o@khach.vn']);
    const r = await recipient(b.deliveries[0]!.dispatchRef);
    await db.contact.update({ where: { id: r.contactId }, data: { marketingOptOut: true } });
    await run(b.calls[0]!.id);
    expect((await db.tenantMailDelivery.findUniqueOrThrow({ where: { id: b.deliveries[0]!.id } })).state).toBe('failed_before_accept');
    expect(await recipient(b.deliveries[0]!.dispatchRef)).toMatchObject({ status: 'skipped', skipReason: 'opt_out' });
    expect(brevo.sent).toHaveLength(0);
  });

  it('gửi thử: biên nhận test_send tới địa chỉ người bấm, không thống kê / không người nhận chiến dịch', async () => {
    const c = await mk.contact({ email: 't@khach.vn' });
    const id = (await mk.act('campaign.create', { name: 'Thử', channel: 'email', sender: { kind: 'tenant_mail', connection_id: conn, sender_id: '7' }, contact_ids: [c], content: { subject: 'S', text: 'Chào {ten}' } })).body.data.result.campaign_id as string;
    const r = await mk.act('campaign.send_test', { campaign_id: id });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const db = await mk.db();
    const d = await db.tenantMailDelivery.findUniqueOrThrow({ where: { dispatchRef: r.body.data.result.delivery_ref } });
    expect(d).toMatchObject({ subjectKind: 'test_send', state: 'queued' });
    const call = await db.integrationCallLog.findFirstOrThrow({ where: { op: MAIL_SEND_OP, refId: `${d.dispatchRef}#1` } });
    await run(call.id);
    expect((await db.tenantMailDelivery.findUniqueOrThrow({ where: { id: d.id } })).state).toBe('accepted');
    const sent = JSON.parse(brevo.sent[0]!.body!);
    expect(sent.subject.startsWith('[TEST]')).toBe(true);
    expect(sent.to[0].email).toBe(r.body.data.result.sent_to);
    expect(await db.campaignRecipient.count({ where: { campaignId: id } })).toBe(0);
  });
});

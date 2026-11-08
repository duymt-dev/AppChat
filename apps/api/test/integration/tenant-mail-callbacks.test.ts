// TIP-012c P4 (§4; AC5) trên Postgres 16 thật: callback Brevo qua route chung `/hooks/integrations/brevo/:connectionId` — bearer token
// webhook riêng (không phải api_key) kiểm trên byte gốc; sai token → 401, route lạ → 404; sự kiện chống lặp theo khoá provider (một thư
// nhiều sự kiện), lô / không thứ tự → cờ chỉ nâng (không hạ lỗi cứng), lỗi cứng / khiếu nại → huỷ nhận ưu đãi của đúng khách (một lần dù
// phát lại); callback trước phản hồi provider → `unresolved` rồi ghép khi biên nhận có mã; thư lạ → unresolved không tác dụng; ngắt kết nối
// → token webhook giữ riêng (≤ 30 ngày, không giữ api_key) vẫn xác thực callback muộn, token cũ sai vẫn 401 / hết hạn → 404 đồng nhất;
// purge chỉ xoá token đã mã hoá. Kết nối thật qua integration.connect (không mạng — Brevo không có test khi kết nối).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectorRegistry, recipientDigest, type MailTransports } from '@appchat/integrations';
import { ActionExecutor, MAIL_SEND_OP, MarketingDeps, campaignMailDomain, executeCall, mailSendOp, parseEncKey, providerHttp, registerCallOp, registerMailDomain, unregisterCallOp, unregisterMailDomain, uuidv7 } from '@appchat/core';
import { env, startApi, type Harness } from './setup';
import { Mk } from './helpers/marketing-fixtures';

let h: Harness;
let mk: Mk;
let conn: string;
const TOKEN = 'whk_tenantmail_0123456789abcdef';
const API_KEY = 'xkeysib-callback-test-000000000';
let msgSeq = 0;
type Ack = { data: Record<string, unknown> };
const mail: MailTransports = {
  http: async (r) => (r.method === 'GET' ? { status: 200, headers: {}, body: '{"senders":[]}' } : { status: 201, headers: {}, body: `{"messageId":"<cb-${++msgSeq}@smtp-relay.mailin.fr>"}` }),
  smtp: async () => {
    throw new Error('no smtp');
  },
};
const deps = () => ({ tenants: mk.resolver, registry: connectorRegistry, key: parseEncKey(env.APP_ENC_KEY!), http: providerHttp(), mail, kv: null, now: () => h.clock.now() });
const hook = (body: unknown, token = TOKEN, id = conn) =>
  fetch(`${h.base}/hooks/integrations/brevo/${id}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
const ev = (event: string, email: string, messageId: string, ts: number) => ({ event, email, id: 1, 'message-id': messageId, ts_epoch: ts, date: '2026-11-09 00:00:00' });

beforeAll(async () => {
  h = await startApi();
  mk = new Mk(h);
  const c = await mk.act('integration.connect', { provider: 'brevo', fields: { api_key: API_KEY, sender_email: 'news@shop.vn', sender_name: 'Shop', webhook_token: TOKEN } });
  expect(c.status, JSON.stringify(c.body)).toBe(200);
  const db = await mk.db();
  const row = await db.integrationConnection.findFirstOrThrow({ where: { connectorKey: 'brevo' } });
  conn = row.id;
  await db.integrationConnection.update({
    where: { id: conn },
    data: { probedRev: row.credentialRev, lastProbeStatus: 'verified', lastProbeAt: h.clock.now(), mailSenders: { state: 'sender_verified', account_ref: null, events: true, senders: [{ id: '7', email: 'news@shop.vn', name: 'Shop', state: 'sender_verified' }] } },
  });
  registerCallOp(MAIL_SEND_OP, mailSendOp);
  const d = h.app.get(MarketingDeps, { strict: false });
  registerMailDomain(campaignMailDomain({ executor: h.app.get(ActionExecutor, { strict: false }), links: d.links, userEmail: (u) => d.userEmail(u) }));
}, 240_000);
afterAll(async () => {
  unregisterCallOp(MAIL_SEND_OP);
  unregisterMailDomain();
  await mk?.close();
  await h?.close();
});

/** Chiến dịch → duyệt → tick → biên nhận; `send` = chạy lượt gọi (accepted). */
async function campaign(emails: string[], send = true) {
  const db = await mk.db();
  const rev = (await db.integrationConnection.findUniqueOrThrow({ where: { id: conn } })).credentialRev;
  const contacts = await Promise.all(emails.map((email) => mk.contact({ email })));
  const id = (await mk.act('campaign.create', { name: `CB ${uuidv7().slice(-5)}`, channel: 'email', sender: { kind: 'tenant_mail', connection_id: conn, sender_id: '7' }, contact_ids: contacts, content: { subject: 'S', text: 'Chào' } })).body.data.result.campaign_id as string;
  expect(rev).toBeGreaterThan(0);
  const s = await mk.act('campaign.submit', { campaign_id: id });
  expect((await mk.confirmed('campaign.approve', { campaign_id: id, if_version: s.body.data.result.version })).status).toBe(200);
  await mk.tick();
  const deliveries = await db.tenantMailDelivery.findMany({ where: { campaignId: id }, orderBy: { id: 'asc' } });
  if (send) for (const d of deliveries) await executeCall(deps(), h.ws, (await db.integrationCallLog.findFirstOrThrow({ where: { op: MAIL_SEND_OP, refId: `${d.dispatchRef}#${d.attempts}` } })).id);
  return { id, contacts, deliveries: await db.tenantMailDelivery.findMany({ where: { campaignId: id }, orderBy: { id: 'asc' } }) };
}
const facts = async (id: string) => ((await (await mk.db()).tenantMailDelivery.findUniqueOrThrow({ where: { id } })).facts ?? {}) as Record<string, unknown>;

describe('xác thực callback', () => {
  it('sai token / không bearer / api_key làm token → 401; route lạ → 404; thân JSON hỏng → 400 trước khi chạm ingress', async () => {
    expect((await hook([ev('delivered', 'x@khach.vn', '<a@b>', 1)], 'whk_wrong_token_00000000000000')).status).toBe(401);
    expect((await hook([ev('delivered', 'x@khach.vn', '<a@b>', 1)], API_KEY)).status).toBe(401);
    expect((await fetch(`${h.base}/hooks/integrations/brevo/${conn}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '[]' })).status).toBe(401);
    expect((await hook([], TOKEN, uuidv7())).status).toBe(404);
    expect((await hook([], TOKEN, 'not-a-uuid')).status).toBe(404);
    const bad = await fetch(`${h.base}/hooks/integrations/brevo/${conn}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` }, body: '{oops' });
    expect(bad.status).toBe(400);
  });
});

describe('sự kiện giao thư', () => {
  it('delivered + opened + click (lô, lặp, không thứ tự): cờ đúng, chống lặp theo khoá, read_at một lần; khoá trùng → duplicate', async () => {
    const { deliveries } = await campaign(['a1@khach.vn']);
    const d = deliveries[0]!;
    expect(d.state).toBe('accepted');
    const m = d.providerMessageRef!;
    const batch = [ev('opened', 'a1@khach.vn', m, 3000), ev('delivered', 'a1@khach.vn', m, 1000), ev('click', 'a1@khach.vn', m, 4000), ev('opened', 'a1@khach.vn', m, 3000)];
    const r = await hook(batch);
    expect(r.status).toBe(200);
    expect(((await r.json()) as Ack).data).toMatchObject({ accepted: 3 });
    expect(await facts(d.id)).toEqual({ delivered: true, opened: 1, clicked: 1 });
    const again = (await (await hook(batch)).json()) as Ack;
    expect(again.data).toMatchObject({ accepted: 0, duplicate: true });
    expect(await facts(d.id)).toEqual({ delivered: true, opened: 1, clicked: 1 });
    expect((await (await mk.db()).campaignRecipient.findUniqueOrThrow({ where: { id: d.recipientId! } })).readAt?.getTime()).toBe(3000);
  });

  it('hard bounce sau delivered không bị hạ; soft bounce sau hard giữ hard; khiếu nại → huỷ nhận ưu đãi của đúng khách, một lần', async () => {
    const { deliveries, contacts } = await campaign(['b1@khach.vn', 'b2@khach.vn']);
    const by = (email: string) => deliveries.find((d) => d.recipientDigest === recipientDigest(email))!;
    const [d1, d2] = [by('b1@khach.vn'), by('b2@khach.vn')];
    await hook([ev('hard_bounce', 'b1@khach.vn', d1.providerMessageRef!, 2000), ev('soft_bounce', 'b1@khach.vn', d1.providerMessageRef!, 3000), ev('spam', 'b2@khach.vn', d2.providerMessageRef!, 2000)]);
    expect(await facts(d1.id)).toMatchObject({ bounced: 'hard' });
    expect(await facts(d2.id)).toMatchObject({ complained: true });
    const db = await mk.db();
    const ks = await db.contact.findMany({ where: { id: { in: contacts } }, select: { id: true, marketingOptOut: true } });
    expect(ks.every((k) => k.marketingOptOut)).toBe(true);
    const other = await mk.contact({ email: 'b3@khach.vn' });
    expect((await db.contact.findUniqueOrThrow({ where: { id: other } })).marketingOptOut).toBe(false);
  });

  it('callback trước phản hồi provider → unresolved; lượt gửi accepted ghép + áp ngay; thư lạ giữ unresolved không tác dụng', async () => {
    const { deliveries } = await campaign(['c1@khach.vn'], false);
    const d = deliveries[0]!;
    const next = `<cb-${msgSeq + 1}@smtp-relay.mailin.fr>`;
    const r = (await (await hook([ev('delivered', 'c1@khach.vn', next, 5000), ev('delivered', 'zz@la.vn', '<la@la>', 5000)])).json()) as Ack;
    expect(r.data).toMatchObject({ accepted: 0, ignored: 2 });
    const db = await mk.db();
    await executeCall(deps(), h.ws, (await db.integrationCallLog.findFirstOrThrow({ where: { op: MAIL_SEND_OP, refId: `${d.dispatchRef}#${d.attempts}` } })).id);
    expect((await db.tenantMailDelivery.findUniqueOrThrow({ where: { id: d.id } })).providerMessageRef).toBe(next);
    expect(await facts(d.id)).toEqual({ delivered: true });
    const stray = await db.tenantMailEvent.findFirstOrThrow({ where: { connectionId: conn, providerMessageRef: '<la@la>' } });
    expect(stray).toMatchObject({ state: 'unresolved', deliveryId: null, recipientDigest: recipientDigest('zz@la.vn') });
  });
});

describe('ngắt kết nối và callback muộn', () => {
  it('ngắt → binding giữ token webhook (không api_key); callback muộn hợp lệ áp; token sai → 404; hết hạn + purge → 404, bằng chứng còn', async () => {
    const { deliveries } = await campaign(['d1@khach.vn']);
    const d = deliveries[0]!;
    expect((await mk.act('integration.disconnect', { provider: 'brevo' })).status).toBe(200);
    const db = await mk.db();
    const b = await db.tenantMailCallbackBinding.findFirstOrThrow({ where: { connectionId: conn } });
    expect(b.verifierEnc).not.toBeNull();
    expect(Buffer.from(b.verifierEnc!).toString('utf8')).not.toContain(TOKEN);
    expect((await db.integrationConnection.findUniqueOrThrow({ where: { id: conn } })).secretEnc).toBeNull();
    expect((await h.platform.tenantIntegrationRoute.findUniqueOrThrow({ where: { connectionId: conn } })).status).toBe('disconnected');
    const late = await hook([ev('delivered', 'd1@khach.vn', d.providerMessageRef!, 9000)]);
    expect(late.status).toBe(200);
    expect(await facts(d.id)).toEqual({ delivered: true });
    expect((await hook([ev('opened', 'd1@khach.vn', d.providerMessageRef!, 9500)], 'whk_wrong_token_00000000000000')).status).toBe(404);
    // Hết hạn → purge chỉ xoá token; callback sau đó 404 đồng nhất; biên nhận / sự kiện còn.
    await db.tenantMailCallbackBinding.updateMany({ where: { connectionId: conn }, data: { expiresAt: new Date(h.clock.now().getTime() - 1000) } });
    const { purgeMailBindings } = await import('@appchat/core');
    expect((await purgeMailBindings(db, h.clock.now())).bindings).toBeGreaterThan(0);
    expect((await db.tenantMailCallbackBinding.findFirstOrThrow({ where: { connectionId: conn } })).verifierEnc).toBeNull();
    expect((await hook([ev('opened', 'd1@khach.vn', d.providerMessageRef!, 9600)])).status).toBe(404);
    expect(await db.tenantMailEvent.count({ where: { deliveryId: d.id } })).toBe(1);
  });
});

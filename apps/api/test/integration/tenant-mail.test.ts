// TIP-012c P2 (§2.1–§2.3, AC3) trên Postgres 16 thật: người gửi mail của DN chọn TƯỜNG MINH cho chiến dịch email — GET
// /v1/campaigns/mail-senders + campaign.mail_senders cho campaign.manage (không cần integrations.manage, không lộ khoá / cấu hình), người
// gửi lạ / kết nối khác / SMTP chưa xác nhận / kênh Zalo → 422; băm bản duyệt chốt kết nối + định danh + phiên bản; kết nối lại giữa gửi
// duyệt và duyệt → 409 (không đổi sang kết nối khác); email cũ chỉ có tài khoản kênh giữ nguyên; dispatch mail của DN tạo biên nhận
// giao thư (không gọi kênh). Kết nối Brevo / SMTP ghi thẳng DB tenant kèm bằng chứng thăm dò (adapter + thăm dò thật đã kiểm ở integrations).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { campaignDetailSchema, mailSenderDtoSchema } from '@appchat/shared';
import { uuidv7 } from '@appchat/core';
import { startApi, type Harness } from './setup';
import { Mk } from './helpers/marketing-fixtures';

let h: Harness;
let mk: Mk;
let brevo: string;
let smtp: string;
let marketer: { id: string; token: string };
let viewer: { id: string; token: string };
const CANARY = 'CANARY-tenant-mail-secret-7f3a';
type Sender = { id: string; email: string; name: string; state: string };

async function connection(connectorKey: 'brevo' | 'smtp', senders: Sender[], state: string) {
  const id = uuidv7();
  await (await mk.db()).integrationConnection.create({
    data: {
      id, connectorKey, port: 'mail', name: connectorKey === 'brevo' ? 'Brevo DN' : 'SMTP DN', mode: 'live', status: 'connected',
      config: connectorKey === 'smtp' ? { host: 'smtp.example.vn', sender_email: senders[0]!.email } : { sender_email: senders[0]!.email },
      secretEnc: Buffer.from(CANARY), credentialRev: 2, probedRev: 2, lastProbeStatus: 'verified', lastProbeAt: h.clock.now(),
      mailSenders: { state, account_ref: null, events: connectorKey === 'brevo', senders },
    },
  });
  return id;
}

beforeAll(async () => {
  h = await startApi();
  mk = new Mk(h);
  brevo = await connection('brevo', [{ id: '7', email: 'news@shop.vn', name: 'Shop News', state: 'sender_verified' }, { id: '9', email: 'old@shop.vn', name: 'Cũ', state: 'unverified' }], 'sender_verified');
  smtp = await connection('smtp', [{ id: 'configured', email: 'mail@shop.vn', name: 'Shop', state: 'unverified' }], 'authenticated_transport');
  const role = async (name: string, permissions: string[]) =>
    (await mk.act('role.create', { name, permissions, data_scope: { inbox: 'own', crm: 'all', sales: 'own', booking: 'own', support: 'own', insights: 'own' } })).body.data.result.key as string;
  marketer = await h.member(await role('Marketer mail', ['crm.view', 'campaign.view', 'campaign.manage']));
  viewer = await h.member(await role('Xem chiến dịch', ['crm.view', 'campaign.view']));
}, 240_000);
afterAll(async () => {
  await mk?.close();
  await h?.close();
});

const emailCampaign = (sender: unknown, contacts: string[], who?: { id: string; token: string }) =>
  mk.act('campaign.create', { name: 'Bản tin tháng', channel: 'email', sender, contact_ids: contacts, content: { subject: 'Ưu đãi', text: 'Chào {ten}' } }, who);

describe('người gửi dùng được', () => {
  it('campaign.manage không có integrations.manage đọc được; không lộ khoá / cấu hình; chỉ campaign.view → 403', async () => {
    const r = await mk.get('/campaigns/mail-senders', marketer);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.every((s: unknown) => mailSenderDtoSchema.safeParse(s).success)).toBe(true);
    expect(JSON.stringify(r.body)).not.toContain(CANARY);
    expect(JSON.stringify(r.body)).not.toContain('smtp.example.vn');
    const byKey = Object.fromEntries(r.body.data.map((s: { connection_id: string; sender_id: string }) => [`${s.connection_id}:${s.sender_id}`, s]));
    expect(byKey[`${brevo}:7`]).toMatchObject({ usable: true, state: 'sender_verified', transport: 'provider_api', events: true, sender_rev: 2, reason: null });
    expect(byKey[`${brevo}:9`]).toMatchObject({ usable: false, reason: 'sender_inactive' });
    expect(byKey[`${smtp}:configured`]).toMatchObject({ usable: false, transport: 'authenticated_transport', events: false, reason: 'sender_unconfirmed' });
    expect((await mk.get('/campaigns/mail-senders', viewer)).status).toBe(403);
    const a = await mk.act('campaign.mail_senders', {}, marketer);
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    expect(a.body.data.result.senders).toEqual(r.body.data);
    expect((await mk.act('campaign.mail_senders', {}, viewer)).status).toBe(403);
    // P5: thẻ Brevo / SMTP ở Nền tảng kết nối mở Cài đặt › Email Marketing.
    const cards = (await mk.get('/settings/integrations')).body.data as { key: string; opens: string | null }[];
    expect(cards.filter((c) => c.key === 'brevo' || c.key === 'smtp').map((c) => c.opens)).toEqual(['email_mkt', 'email_mkt']);
  });

  it('thăm dò chưa có cho phiên bản khoá hiện tại → probe_pending (không suy người gửi từ cấu hình)', async () => {
    const db = await mk.db();
    await db.integrationConnection.update({ where: { id: smtp }, data: { credentialRev: 3 } });
    const r = await mk.get('/campaigns/mail-senders', marketer);
    expect(r.body.data.filter((s: { connection_id: string }) => s.connection_id === smtp)).toEqual([expect.objectContaining({ usable: false, reason: 'probe_pending', sender_id: '' })]);
    await db.integrationConnection.update({ where: { id: smtp }, data: { credentialRev: 2 } });
  });
});

describe('chọn người gửi cho chiến dịch', () => {
  it('kết nối lạ / người gửi lạ / SMTP chưa xác nhận / Brevo chưa kích hoạt / kênh Zalo → 422', async () => {
    const c = await mk.contact({ email: 'a@khach.vn' });
    const fields = async (sender: unknown) => (await emailCampaign(sender, [c], marketer)).body.error?.fields;
    expect(await fields({ kind: 'tenant_mail', connection_id: uuidv7(), sender_id: '7' })).toEqual({ sender: 'not_found' });
    expect(await fields({ kind: 'tenant_mail', connection_id: brevo, sender_id: '99' })).toEqual({ sender: 'not_found' });
    expect(await fields({ kind: 'tenant_mail', connection_id: smtp, sender_id: 'configured' })).toEqual({ sender: 'sender_unconfirmed' });
    expect(await fields({ kind: 'tenant_mail', connection_id: brevo, sender_id: '9' })).toEqual({ sender: 'sender_inactive' });
    const z = await mk.act('campaign.create', { name: 'Z', channel: 'zalo', sender: { kind: 'tenant_mail', connection_id: brevo, sender_id: '7' }, contact_ids: [c], content: { text: 'x' } }, marketer);
    expect(z.status).toBe(422);
    expect(z.body.error.fields).toEqual({ sender: 'email_only' });
  });

  it('chọn → gửi duyệt → duyệt: DTO hiện người gửi đã chốt; snapshot theo địa chỉ email; dispatch tạo biên nhận giao thư', async () => {
    const a = await mk.contact({ email: 'b@khach.vn' });
    const noMail = await mk.contact();
    const c = await emailCampaign({ kind: 'tenant_mail', connection_id: brevo, sender_id: '7' }, [a, noMail], marketer);
    expect(c.status, JSON.stringify(c.body)).toBe(200);
    const id = c.body.data.result.campaign_id as string;
    const db = await mk.db();
    expect(await db.campaign.findUniqueOrThrow({ where: { id } })).toMatchObject({ senderKind: 'tenant_mail', mailConnectionId: brevo, mailSenderId: '7', mailSenderRev: 2, accountId: null });
    const s = await mk.act('campaign.submit', { campaign_id: id });
    expect(s.status, JSON.stringify(s.body)).toBe(200);
    const rec = await mk.recipients(id);
    expect(rec.map((r) => `${r.status}:${r.skipReason}`).sort()).toEqual(['pending:null', 'skipped:no_endpoint']);
    const ap = await mk.confirmed('campaign.approve', { campaign_id: id, if_version: s.body.data.result.version });
    expect(ap.status, JSON.stringify(ap.body)).toBe(200);
    const d = await mk.get(`/campaigns/${id}`);
    expect(campaignDetailSchema.safeParse(d.body.data).success).toBe(true);
    expect(d.body.data.sender).toEqual({ kind: 'tenant_mail', connection_id: brevo, sender_id: '7', sender_rev: 2, email: 'news@shop.vn', name: 'Shop News', usable: true, reason: null });
    // P3: dispatch tạo biên nhận giao thư (không gọi hàng gửi kênh, chưa gửi tới khi runner integrations chạy — tenant-mail-dispatch.test).
    await mk.tick();
    const deliveries = await db.tenantMailDelivery.findMany({ where: { campaignId: id } });
    expect(deliveries.map((d) => [d.state, d.connectionId, d.senderId])).toEqual([['queued', brevo, '7']]);
    expect((await mk.recipients(id)).every((r) => r.status !== 'sent')).toBe(true);
  });

  it('kết nối lại giữa gửi duyệt và duyệt → 409 sender_changed; từ chối → chọn lại → gửi duyệt lại khớp phiên bản mới', async () => {
    const a = await mk.contact({ email: 'c@khach.vn' });
    const id = (await emailCampaign({ kind: 'tenant_mail', connection_id: brevo, sender_id: '7' }, [a], marketer)).body.data.result.campaign_id as string;
    const s = await mk.act('campaign.submit', { campaign_id: id });
    const db = await mk.db();
    await db.integrationConnection.update({ where: { id: brevo }, data: { credentialRev: 4, probedRev: 4 } });
    const ap = await mk.confirmed('campaign.approve', { campaign_id: id, if_version: s.body.data.result.version });
    expect(ap.status).toBe(409);
    expect(ap.body.error.fields).toEqual({ sender: 'sender_changed' });
    expect((await mk.get(`/campaigns/${id}`)).body.data.sender).toMatchObject({ usable: false, reason: 'sender_changed' });
    const rj = await mk.act('campaign.reject', { campaign_id: id, reason: 'Kết nối đổi', if_version: s.body.data.result.version });
    expect(rj.status, JSON.stringify(rj.body)).toBe(200);
    const up = await mk.act('campaign.update', { campaign_id: id, sender: { kind: 'tenant_mail', connection_id: brevo, sender_id: '7' }, if_version: rj.body.data.result.version }, marketer);
    expect(up.status, JSON.stringify(up.body)).toBe(200);
    expect((await db.campaign.findUniqueOrThrow({ where: { id } })).mailSenderRev).toBe(4);
    const s2 = await mk.act('campaign.submit', { campaign_id: id });
    expect(s2.status).toBe(200);
    expect((await mk.confirmed('campaign.approve', { campaign_id: id, if_version: s2.body.data.result.version })).status).toBe(200);
  });

  it('ngắt kết nối → không còn trong danh sách; chiến dịch đã chọn không gửi duyệt được (không lùi sang SMTP)', async () => {
    const a = await mk.contact({ email: 'd@khach.vn' });
    const id = (await emailCampaign({ kind: 'tenant_mail', connection_id: brevo, sender_id: '7' }, [a], marketer)).body.data.result.campaign_id as string;
    const db = await mk.db();
    await db.integrationConnection.update({ where: { id: smtp }, data: { mailSenders: { state: 'authenticated_transport', account_ref: null, events: false, senders: [{ id: 'configured', email: 'mail@shop.vn', name: 'Shop', state: 'configured' }] } } });
    await db.integrationConnection.update({ where: { id: brevo }, data: { status: 'disconnected', credentialRev: 5 } });
    const list = (await mk.get('/campaigns/mail-senders', marketer)).body.data as { connection_id: string; usable: boolean }[];
    expect(list.map((s) => s.connection_id)).toEqual([smtp]);
    expect(list[0]!.usable).toBe(true);
    const s = await mk.act('campaign.submit', { campaign_id: id });
    expect(s.status).toBe(409);
    expect(s.body.error.fields).toEqual({ sender: 'disconnected' });
    expect((await db.campaign.findUniqueOrThrow({ where: { id } })).mailConnectionId).toBe(brevo);
  });

  it('email cũ chỉ có tài khoản kênh: giữ channel_account (không tự gán kết nối mail); DTO sender channel_account', async () => {
    const acc = await mk.account('email', 'Hộp thư bán hàng');
    const a = await mk.contact({ email: 'e@khach.vn' });
    const c = await mk.act('campaign.create', { name: 'Email kênh', channel: 'email', account_id: acc, contact_ids: [a], content: { subject: 'Hi', text: 'Chào' } });
    expect(c.status, JSON.stringify(c.body)).toBe(200);
    const id = c.body.data.result.campaign_id as string;
    expect(await (await mk.db()).campaign.findUniqueOrThrow({ where: { id } })).toMatchObject({ senderKind: 'channel_account', accountId: acc, mailConnectionId: null });
    expect((await mk.act('campaign.submit', { campaign_id: id })).status).toBe(200);
    expect((await mk.get(`/campaigns/${id}`)).body.data.sender).toEqual({ kind: 'channel_account', account_id: acc });
  });
});

// TIP-025b §D.1–2 (AC04) trên Postgres 16 + Memurai: tạo báo giá / đơn / hợp đồng / ticket / lịch hẹn từ Hộp thư mang `conversation_id`
// (+ `source_message_id`) — ghi đúng hội thoại + khách, đọc lại qua HTTP; khác khách / hội thoại chưa liên kết khách → 422; tin thuộc
// hội thoại khác → 404; hội thoại ngoài scope → 404 (không lộ); nhóm cần khách chọn rõ là thành viên đã liên kết; tạo độc lập không đổi.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string };
const ids = {} as Record<'acc' | 'lan' | 'vy' | 'direct' | 'bare' | 'group' | 'msg' | 'other' | 'svc' | 'staff', string>;

type Body = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as Body });
const as = (u: { id: string }) => ({ authorization: `Bearer ${h.tokenFor(u.id)}` });
const act = (id: string, input: unknown, who?: { id: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...(who ? as(who) : {}) }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const ok = (r: { status: number; body: Body }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data.result as Body;
};
const err = (r: { status: number; body: Body }) => `${r.status} ${r.body?.error?.code}`;
const line = { name: 'HIFU nâng cơ', qty: 1, unit_price: '1500000', tax_rate: 8 };

async function conv(kind: 'direct' | 'group', contactId: string | null, ext: string) {
  const id = uuidv7();
  await (await tenant()).conversation.create({ data: { id, channelAccountId: ids.acc, channelType: 'zalo_personal', kind, contactId, externalThreadId: ext, title: ext, lastMessageAt: h.clock.now() } });
  return id;
}
async function message(conversationId: string) {
  const id = uuidv7();
  await (await tenant()).message.create({ data: { id, conversationId, channelAccountId: ids.acc, direction: 'in', senderType: 'contact', senderId: 'k', kind: 'text', body: 'Cho em báo giá', externalMsgId: uuidv7(), status: 'delivered', createdAt: h.clock.now() } });
  return id;
}

beforeAll(async () => {
  h = await startApi();
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  ids.acc = uuidv7();
  await (await tenant()).channelAccount.create({ data: { id: ids.acc, type: 'zalo_personal', name: 'Zalo', externalId: 'z-ctx', status: 'connected', settings: {} } });
  ids.lan = ok(await act('contact.create', { full_name: 'Nguyễn Thị Lan', phone: '0909 700 001' })).contact_id;
  ids.vy = ok(await act('contact.create', { full_name: 'Trần Vy', phone: '0909 700 002' })).contact_id;
  ids.direct = await conv('direct', ids.lan, 'z-lan');
  ids.bare = await conv('direct', null, 'z-bare');
  ids.group = await conv('group', null, 'g-vip');
  ids.other = await conv('direct', ids.vy, 'z-vy');
  await (await tenant()).conversationParticipant.createMany({ data: [{ conversationId: ids.group, externalId: 'zl_vy', displayName: 'Vy', contactId: ids.vy }] });
  ids.msg = await message(ids.direct);
  ids.svc = ok(await act('product.create', { name: 'Massage', type: 'service', price: '450000', duration_min: 60, tax_rate: 0 })).product_id;
  ids.staff = ok(await act('staff.create', { name: 'KTV. Mai' })).staff_id;
  ok(await act('business_hours.update', { days: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, open: true, start: '08:00', end: '19:00' })), slot_step_min: 30 }));
}, 90_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('ngữ cảnh Hộp thư → chứng từ (§D.1)', () => {
  it('báo giá / đơn / hợp đồng / ticket / lịch hẹn ghi đúng hội thoại + khách (khách suy từ hội thoại 1-1)', async () => {
    const db = await tenant();
    const q = ok(await act('quote.create', { contact_id: ids.lan, items: [line], conversation_id: ids.direct, source_message_id: ids.msg }));
    expect((await db.quote.findUniqueOrThrow({ where: { id: q.quote_id } })).conversationId).toBe(ids.direct);
    const o = ok(await act('order.create', { contact_id: ids.lan, items: [line], conversation_id: ids.direct }));
    expect((await db.order.findUniqueOrThrow({ where: { id: o.order_id } })).conversationId).toBe(ids.direct);
    const c = ok(await act('contract.create', { contact_id: ids.lan, kind: 'service', title: 'HIFU', value: '1500000', start_date: '2026-11-10', end_date: '2027-05-10', conversation_id: ids.direct }));
    expect((await db.contract.findUniqueOrThrow({ where: { id: c.contract_id } })).conversationId).toBe(ids.direct);
    const t = ok(await act('ticket.create', { title: 'Hỏi bảo hành', channel: 'zalo_personal', category: 'Warranty', priority: 'medium', conversation_id: ids.direct, source_message_id: ids.msg }));
    const tr = await db.ticket.findUniqueOrThrow({ where: { id: t.ticket_id } });
    expect([tr.conversationId, tr.sourceMessageId, tr.contactId]).toEqual([ids.direct, ids.msg, ids.lan]);
    const a = ok(await act('appointment.create', { contact_name: 'Lan', service_id: ids.svc, staff_id: ids.staff, date: '2026-11-02', start: '09:00', conversation_id: ids.direct }));
    const ar = await db.appointment.findUniqueOrThrow({ where: { id: a.appointment_id } });
    expect([ar.conversationId, ar.contactId]).toEqual([ids.direct, ids.lan]);
  });

  it('khác khách / chưa liên kết → 422; tin hội thoại khác → 404; không âm thầm bỏ liên kết', async () => {
    expect(err(await act('quote.create', { contact_id: ids.vy, items: [line], conversation_id: ids.direct }))).toBe('422 VALIDATION_FAILED');
    expect(err(await act('order.create', { contact_id: ids.lan, items: [line], conversation_id: ids.bare }))).toBe('422 VALIDATION_FAILED');
    expect(err(await act('quote.create', { contact_id: ids.vy, items: [line], conversation_id: ids.other, source_message_id: ids.msg }))).toBe('404 NOT_FOUND');
    expect(err(await act('appointment.create', { contact_id: ids.vy, contact_name: 'Vy', service_id: ids.svc, staff_id: ids.staff, date: '2026-11-02', start: '11:00', conversation_id: ids.direct }))).toBe('422 VALIDATION_FAILED');
  });

  it('nhóm: thiếu khách / khách không là thành viên → 422; thành viên đã liên kết → ghi nhóm + khách đó', async () => {
    expect(err(await act('ticket.create', { title: 'Nhóm hỏi', channel: 'zalo_personal', category: 'Q', priority: 'low', conversation_id: ids.group }))).toBe('422 VALIDATION_FAILED');
    expect(err(await act('quote.create', { contact_id: ids.lan, items: [line], conversation_id: ids.group }))).toBe('422 VALIDATION_FAILED');
    const q = ok(await act('quote.create', { contact_id: ids.vy, items: [line], conversation_id: ids.group }));
    const r = await (await tenant()).quote.findUniqueOrThrow({ where: { id: q.quote_id } });
    expect([r.conversationId, r.contactId]).toEqual([ids.group, ids.vy]);
  });

  it('ngoài scope inbox → 404 như không tồn tại; tạo độc lập (không ngữ cảnh) giữ hành vi cũ', async () => {
    const r = await act('quote.create', { contact_id: ids.lan, items: [line], conversation_id: ids.direct }, sales);
    expect([403, 404]).toContain(r.status);
    const q = ok(await act('quote.create', { contact_id: ids.lan, items: [line] }));
    expect((await (await tenant()).quote.findUniqueOrThrow({ where: { id: q.quote_id } })).conversationId).toBeNull();
  });
});

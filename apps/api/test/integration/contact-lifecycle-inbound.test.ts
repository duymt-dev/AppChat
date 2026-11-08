// TIP-015f §3–§4 trên Postgres thật: khách đã xoá mềm nhắn lại (cùng định danh, cùng hội thoại / luồng mới, có khách sống trùng SĐT) → tin
// giữ đúng một lần, gắn đúng id khách cũ (identity không gắn lại), không tạo khách, không làm giàu CRM (tên / người phụ trách / VIP), không
// agent mặc định / không kích agent; DTO Hộp thư mang dấu `contact_deleted`, tiêu đề không phải tên CRM cũ. Khôi phục → tin mới làm giàu lại.
// Đơn sàn của người mua đã xoá → 409 (không tạo đơn / khách).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { ContactIdentityService, InboundPipeline, importExternal, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let acc: string;
let lan: string;
let seq = 0;

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const pipeline = new InboundPipeline(new ContactIdentityService());

async function inbound(thread: string, o: { phone?: string } = {}) {
  seq++;
  h.clock.advance(1000);
  return pipeline.handle(await tenant(), h.ws, {
    channelAccountId: acc, externalThreadId: thread, externalMsgId: `m-${thread}-${seq}`, isGroup: false,
    sender: { externalId: 'zl_lan', name: 'Lan (Zalo)', ...(o.phone ? { phone: o.phone } : {}) }, kind: 'text', text: `Tin ${seq}`, sentAt: h.clock.now().toISOString(), raw: {},
  }, h.clock.now());
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  const db = await tenant();
  acc = uuidv7();
  const agent = uuidv7();
  await db.channelAccount.create({ data: { id: acc, type: 'zalo_personal', name: 'Zalo Spa', externalId: `z-${acc.slice(-6)}`, status: 'connected', settings: { agent_id: agent, ai_mode: 'auto' } } });
  const r = await inbound('t-lan', { phone: '0909770001' });
  const conv = await db.conversation.findUniqueOrThrow({ where: { id: r.conversationId! } });
  lan = conv.contactId!;
  await db.contact.update({ where: { id: lan }, data: { name: 'Chị Lan VIP', group: 'vip', ownerUserId: h.user } });
  // Xoá khách qua action thật.
  const del = await act('contact.delete', { contact_id: lan });
  expect(del.status, JSON.stringify(del.body)).toBe(200);
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('tin vào của khách đã xoá', () => {
  it('cùng hội thoại: tin giữ, gắn khách cũ, không kích agent, không VIP / tiêu đề CRM', async () => {
    const db = await tenant();
    const before = await db.contact.count();
    const r = await inbound('t-lan', { phone: '0909770001' });
    expect(r.messageId).toBeTruthy();
    expect(r.agentReply).toBe(false);
    const ev = r.events.find((e) => e.topic === 'message.received')!;
    expect(ev.payload).toMatchObject({ contact_id: lan, vip: false, contact_deleted: true });
    expect(ev.payload.title).not.toBe('Chị Lan VIP');
    expect(await db.contact.count()).toBe(before);
    expect((await db.contactIdentity.findFirstOrThrow({ where: { externalId: 'zl_lan' } })).contactId).toBe(lan);
    expect((await db.message.count({ where: { conversationId: r.conversationId! } }))).toBe(2);
  });

  it('luồng mới + khách sống trùng SĐT: không tạo khách, không chuyển sang khách sống, không agent / người phụ trách', async () => {
    const db = await tenant();
    const other = (await act('contact.create', { full_name: 'Khách mới cùng số', phone: '0909770002' })).body.data.result.contact_id as string;
    const before = await db.contact.count();
    const r = await inbound('t-lan-2', { phone: '0909770002' });
    const conv = await db.conversation.findUniqueOrThrow({ where: { id: r.conversationId! } });
    expect(conv.contactId).toBe(lan);
    expect(conv.contactId).not.toBe(other);
    expect(conv.assigneeUserId).toBeNull();
    expect(conv.assigneeAgentId).toBeNull();
    expect(r.agentReply).toBe(false);
    expect(r.events.some((e) => e.topic === 'lead.routing_requested')).toBe(false);
    expect(await db.contact.count()).toBe(before);
  });

  it('DTO Hộp thư: dấu contact_deleted, tiêu đề không phải tên CRM', async () => {
    const res = await call(h, '/conversations?limit=50', undefined);
    const body = (await res.json()) as { data: { contact_id: string | null; contact_deleted?: boolean; title: string }[] };
    const mine = body.data.filter((c) => c.contact_id === lan);
    expect(mine.length).toBeGreaterThan(0);
    for (const c of mine) {
      expect(c.contact_deleted).toBe(true);
      expect(c.title).not.toBe('Chị Lan VIP');
    }
  });

  it('đơn sàn của người mua đã xoá → 409, không tạo đơn / khách', async () => {
    const db = await tenant();
    const conn = uuidv7();
    await db.contactIdentity.create({ data: { id: uuidv7(), contactId: lan, channelType: 'marketplace', channelAccountId: conn, externalId: 'buyer-lan', createdAt: h.clock.now() } });
    const before = { orders: await db.order.count(), contacts: await db.contact.count() };
    const ext = { external_id: 'SP-1', platform: 'shopee', platform_status: 'READY', buyer: { id: 'buyer-lan', name: 'Lan' }, lines: [{ sku: 'X', name: 'HIFU', qty: 1, unit_price: '100000' }], total: '100000', created_at: h.clock.now().toISOString(), updated_at: h.clock.now().toISOString() };
    await expect(db.$transaction((tx) => importExternal(tx, { id: conn, platform: 'shopee', createdBy: h.user } as never, ext as never, { status: 'new', paid: false } as never, h.clock.now()))).rejects.toMatchObject({ code: 'CONFLICT', fields: { contact: 'deleted' } });
    expect({ orders: await db.order.count(), contacts: await db.contact.count() }).toEqual(before);
  });

  it('khôi phục → tin mới làm giàu lại (tiêu đề / VIP / kích agent)', async () => {
    const r = await act('contact.restore', { contact_id: lan });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const m = await inbound('t-lan', { phone: '0909770001' });
    const ev = m.events.find((e) => e.topic === 'message.received')!;
    expect(ev.payload).toMatchObject({ contact_id: lan, vip: true });
    expect(ev.payload.contact_deleted).toBeUndefined();
  });
});

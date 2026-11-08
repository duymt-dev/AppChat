// TIP-015d — chuyển phụ trách khách trên DB native thật (AC3, AC4, AC6, AC7):
//   - một transaction: khách + hội thoại mở (không đụng hội thoại đã đóng / lưu trữ) + báo giá mở bản MỚI NHẤT (không đụng bản đã thay /
//     đã chốt) + lịch hẹn pending / confirmed bắt đầu sau mốc (không đụng lịch đã qua / đã huỷ) — đếm đúng, biên nhận đủ, nhân viên / giờ
//     lịch hẹn giữ nguyên; báo giá chỉ đổi `assigned_user_id`, `owner_user_id` (người tạo) bất biến (trigger chặn cả ghi tay)
//   - hội thoại chuyển cho người: bỏ agent, auto → copilot, ai_epoch tăng; tin agent chưa đặt chỗ bị huỷ
//   - người nhận đã là người phụ trách → skip: không biên nhận, không event, không undo, generation giữ
//   - if_version cũ → 409 STALE_VERSION, không đổi gì
//   - hoàn tác: trả đúng các bản ghi đã ghi; một bản ghi bị đổi rồi đổi lại (ABA) → revision lệch → 409 cả lần hoàn tác, không khôi phục phần nào
//   - quote.update đổi owner → 422 immutable
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { registerOwnershipPort, unregisterOwnershipPort, uuidv7 } from '@appchat/core';
import type { OwnershipPort } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let sales: { id: string; token: string };
let service: string;
let staff: string;

const json = async (r: Response) => ({ status: r.status, body: (await r.json().catch(() => null)) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u?: { token: string }): Record<string, string> => (u ? { authorization: `Bearer ${u.token}` } : {});
const act = (id: string, input: unknown, who?: { token: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...as(who) }).then(json);
const ALL = { conversations: true, quotes: true, appointments: true };
const TAG = uuidv7().slice(-6);
let seq = 0;

async function contact(name: string) {
  const id = uuidv7();
  await db.contact.create({ data: { id, code: `KH-CT${TAG}${++seq}`, name, source: 'manual', ownerUserId: h.user } });
  return id;
}

async function conv(contactId: string, o: { status?: 'open' | 'closed'; archived?: boolean; agent?: string; auto?: boolean } = {}) {
  const account = (await db.channelAccount.findFirst({ where: { type: 'webchat' }, select: { id: true } }))?.id ?? (await seedAccount());
  const id = uuidv7();
  await db.conversation.create({
    data: { id, channelAccountId: account, channelType: 'webchat', externalThreadId: `t-${id}`, contactId, status: o.status ?? 'open', assigneeUserId: h.user, assigneeAgentId: o.agent ?? null, aiMode: o.auto ? 'auto' : 'copilot', archivedAt: o.archived ? new Date() : null },
  });
  return id;
}

async function seedAccount() {
  const id = uuidv7();
  await db.channelAccount.create({ data: { id, type: 'webchat', name: 'Web', status: 'connected' } });
  return id;
}

async function quote(contactId: string, o: { status?: 'draft' | 'sent' | 'accepted' | 'superseded' | 'revision_requested'; root?: string; version?: number; code?: string } = {}) {
  const id = uuidv7();
  await db.quote.create({ data: { id, code: o.code ?? `BG-CT${TAG}${++seq}`, version: o.version ?? 1, rootQuoteId: o.root ?? id, contactId, ownerUserId: h.user, assignedUserId: h.user, status: o.status ?? 'draft' } });
  return id;
}

async function appt(contactId: string, startInMin: number, status: 'pending' | 'confirmed' | 'cancelled' = 'confirmed') {
  const id = uuidv7();
  const start = new Date(h.clock.now().getTime() + startInMin * 60_000);
  const end = new Date(start.getTime() + 30 * 60_000);
  await db.appointment.create({ data: { id, code: `LH-CT${TAG}${++seq}`, contactId, ownerUserId: h.user, serviceId: service, staffId: staff, startAt: start, endAt: end, blockEndAt: end, status, ...(status === 'cancelled' ? { cancelReason: 'test' } : {}) } });
  return id;
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 'contact-transfer-test'));
  sales = await h.member('sales');
  service = (await act('product.create', { name: `Gội đầu ${TAG}`, type: 'service', price: '100000', duration_min: 30, tax_rate: 0 })).body.data.result.product_id;
  staff = (await act('staff.create', { name: `KTV ${TAG}`, role: 'KTV' })).body.data.result.staff_id;
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('chuyển phụ trách atomic (TIP-015d)', () => {
  it('đếm + hiệu ứng + biên nhận đúng tập ứng viên; báo giá chỉ đổi người phụ trách vận hành; lịch hẹn giữ nhân viên / giờ', async () => {
    const c = await contact('Chị Hà Chuyển');
    const open = await conv(c, { agent: 'ag_1', auto: true });
    await conv(c, { status: 'closed' });
    await conv(c, { archived: true });
    const q1 = await quote(c, { status: 'sent' });
    const oldRev = await quote(c, { status: 'revision_requested', code: `BG-R${TAG}` });
    const q2 = await quote(c, { status: 'draft', code: `BG-R${TAG}`, version: 2, root: oldRev });
    await quote(c, { status: 'accepted' });
    const future = await appt(c, 24 * 60);
    await appt(c, -60);
    await appt(c, 48 * 60, 'cancelled');
    const before = await db.appointment.findUniqueOrThrow({ where: { id: future } });

    const r = await act('contact.transfer_owner', { contact_id: c, to_user_id: sales.id, move: ALL });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ status: 'transferred', owner_user_id: sales.id, moved: { conversations: 1, quotes: 2, appointments: 1 } });
    const tid = r.body.data.result.transfer_id;
    const items = await db.contactTransferItem.findMany({ where: { transferId: tid } });
    expect(items.map((i) => `${i.domain}:${i.entityId}`).sort()).toEqual([`appointment:${future}`, `conversation:${open}`, `quote:${q1}`, `quote:${q2}`].sort());

    const cv = await db.conversation.findUniqueOrThrow({ where: { id: open } });
    expect([cv.assigneeUserId, cv.assigneeAgentId, cv.aiMode, cv.aiEpoch, cv.assignmentRevision]).toEqual([sales.id, null, 'copilot', 1, 1]);
    const qs = await db.quote.findMany({ where: { contactId: c }, select: { id: true, ownerUserId: true, assignedUserId: true } });
    for (const q of qs) expect(q.ownerUserId).toBe(h.user);
    expect(qs.filter((q) => q.assignedUserId === sales.id).map((q) => q.id).sort()).toEqual([q1, q2].sort());
    const a = await db.appointment.findUniqueOrThrow({ where: { id: future } });
    expect([a.ownerUserId, a.staffId, a.startAt.toISOString(), a.version]).toEqual([sales.id, before.staffId, before.startAt.toISOString(), before.version + 1]);
    expect((await db.contact.findUniqueOrThrow({ where: { id: c } })).transferGeneration).toBe(1);

    // Người tạo báo giá bất biến: ghi tay bị trigger chặn; quote.update đổi owner → 422.
    await expect(db.quote.update({ where: { id: q1 }, data: { ownerUserId: sales.id } })).rejects.toThrow(/immutable/);
    const upd = await act('quote.update', { quote_id: q2, patch: { owner_user_id: sales.id } });
    expect([upd.status, upd.body.error?.fields]).toEqual([422, { 'patch.owner_user_id': 'immutable' }]);

    // Hoàn tác: trả đúng các bản ghi.
    expect((await call(h, `/action-logs/${r.body.data.action_log_id}/undo`, {}).then(json)).status).toBe(200);
    expect((await db.contact.findUniqueOrThrow({ where: { id: c } })).ownerUserId).toBe(h.user);
    expect((await db.conversation.findUniqueOrThrow({ where: { id: open } })).assigneeAgentId).toBe('ag_1');
    expect((await db.conversation.findUniqueOrThrow({ where: { id: open } })).aiEpoch).toBe(2);
    expect((await db.quote.findUniqueOrThrow({ where: { id: q1 } })).assignedUserId).toBe(h.user);
    expect((await db.appointment.findUniqueOrThrow({ where: { id: future } })).ownerUserId).toBe(h.user);
    expect((await db.contactTransfer.findUniqueOrThrow({ where: { id: tid } })).status).toBe('undone');
  });

  it('người nhận đã phụ trách → skip (không biên nhận / event / undo); if_version cũ → 409 không đổi gì', async () => {
    const c = await contact('Anh Nam Skip');
    const v = (await db.contact.findUniqueOrThrow({ where: { id: c } })).version;
    const stale = await act('contact.transfer_owner', { contact_id: c, to_user_id: sales.id, move: ALL, if_version: v + 5 });
    expect([stale.status, stale.body.error?.code]).toEqual([409, 'STALE_VERSION']);
    expect((await db.contact.findUniqueOrThrow({ where: { id: c } })).ownerUserId).toBe(h.user);
    const skip = await act('contact.transfer_owner', { contact_id: c, to_user_id: h.user, move: ALL, if_version: v });
    expect(skip.body.data.result).toEqual({ status: 'skipped_already_owner', owner_user_id: h.user, moved: { conversations: 0, quotes: 0, appointments: 0 }, transfer_id: null, version: v });
    expect(skip.body.data.undo_until).toBeUndefined();
    expect(await db.contactTransfer.count({ where: { contactId: c } })).toBe(0);
    const row = await db.contact.findUniqueOrThrow({ where: { id: c } });
    expect([row.version, row.transferGeneration]).toEqual([v, 0]);
  });

  it('ABA: hội thoại bị gán đi rồi gán lại sau lần chuyển → hoàn tác 409 cả lần, không khôi phục phần nào', async () => {
    const c = await contact('Chị Mai ABA');
    const cv = await conv(c);
    const q = await quote(c);
    const r = await act('contact.transfer_owner', { contact_id: c, to_user_id: sales.id, move: ALL });
    expect(r.status).toBe(200);
    await db.conversation.update({ where: { id: cv }, data: { assigneeUserId: h.user } });
    await db.conversation.update({ where: { id: cv }, data: { assigneeUserId: sales.id } });
    const u = await call(h, `/action-logs/${r.body.data.action_log_id}/undo`, {}).then(json);
    expect(u.status).toBe(409);
    expect((await db.contact.findUniqueOrThrow({ where: { id: c } })).ownerUserId).toBe(sales.id);
    expect((await db.quote.findUniqueOrThrow({ where: { id: q } })).assignedUserId).toBe(sales.id);
    expect((await db.contactTransfer.findUniqueOrThrow({ where: { id: r.body.data.result.transfer_id } })).status).toBe('applied');
  });

  it('lần chuyển mới hơn → hoàn tác lần cũ 409', async () => {
    const c = await contact('Chị Lụa Mới');
    const first = await act('contact.transfer_owner', { contact_id: c, to_user_id: sales.id, move: ALL });
    await act('contact.transfer_owner', { contact_id: c, to_user_id: h.user, move: ALL });
    expect((await call(h, `/action-logs/${first.body.data.action_log_id}/undo`, {}).then(json)).status).toBe(409);
    expect((await db.contact.findUniqueOrThrow({ where: { id: c } })).transferGeneration).toBe(2);
  });

  it('port lỗi giữa chừng (sau khi hội thoại đã ghi) → rollback cả khách + hội thoại, không biên nhận', async () => {
    const c = await contact('Chị Thu Rollback');
    const cv = await conv(c);
    const boom: OwnershipPort = { domain: 'appointment', apply: async () => { throw new Error('boom'); }, undo: async () => ({ events: [] }) };
    const { appointmentOwnershipPort } = await import('@appchat/core');
    unregisterOwnershipPort('appointment');
    registerOwnershipPort(boom);
    try {
      const r = await act('contact.transfer_owner', { contact_id: c, to_user_id: sales.id, move: ALL });
      expect(r.status).toBe(500);
    } finally {
      unregisterOwnershipPort('appointment');
      registerOwnershipPort(appointmentOwnershipPort);
    }
    expect((await db.contact.findUniqueOrThrow({ where: { id: c } })).ownerUserId).toBe(h.user);
    expect((await db.conversation.findUniqueOrThrow({ where: { id: cv } })).assigneeUserId).toBe(h.user);
    expect(await db.contactTransfer.count({ where: { contactId: c } })).toBe(0);
  });

  it('hai lần chuyển đồng thời cùng khách → tuyến tính (khoá gốc): đúng một biên nhận mỗi lần đổi thật, generation khớp', async () => {
    const c = await contact('Anh Đức Đồng thời');
    await conv(c);
    const [a, b] = await Promise.all([
      act('contact.transfer_owner', { contact_id: c, to_user_id: sales.id, move: ALL }),
      act('contact.transfer_owner', { contact_id: c, to_user_id: sales.id, move: ALL }),
    ]);
    expect([a.body.data.result.status, b.body.data.result.status].sort()).toEqual(['skipped_already_owner', 'transferred']);
    expect(await db.contactTransfer.count({ where: { contactId: c } })).toBe(1);
    expect((await db.contact.findUniqueOrThrow({ where: { id: c } })).transferGeneration).toBe(1);
  });
});

describe('đọc trạng thái + DTO báo giá (TIP-015d P2)', () => {
  it('GET /contacts/:id/transfers/:id + contact.transfer_status: số đếm + bản ghi theo quyền; sales không crm.reassign → 403; khác khách → 404', async () => {
    const c = await contact('Chị Yến Trạng thái');
    await conv(c);
    const q = await quote(c, { status: 'sent' });
    const r = await act('contact.transfer_owner', { contact_id: c, to_user_id: sales.id, move: ALL });
    const tid = r.body.data.result.transfer_id;
    const http = await call(h, `/contacts/${c}/transfers/${tid}?limit=1`).then(json);
    expect(http.status, JSON.stringify(http.body)).toBe(200);
    expect(http.body.data).toMatchObject({ transfer_id: tid, status: 'applied', from_user_id: h.user, to_user_id: sales.id, moved: { conversations: 1, quotes: 1, appointments: 0 } });
    expect(http.body.data.items).toHaveLength(1);
    const page2 = await call(h, `/contacts/${c}/transfers/${tid}?cursor=${http.body.data.next_cursor}`).then(json);
    expect([...http.body.data.items, ...page2.body.data.items].map((i: { domain: string }) => i.domain).sort()).toEqual(['conversation', 'quote']);
    const viaAction = await act('contact.transfer_status', { contact_id: c, transfer_id: tid });
    expect(viaAction.body.data.result.moved).toEqual(http.body.data.moved);
    expect((await call(h, `/contacts/${c}/transfers/${tid}`, undefined, as(sales)).then(json)).status).toBe(403);
    const other = await contact('Khách khác');
    expect((await call(h, `/contacts/${other}/transfers/${tid}`).then(json)).status).toBe(404);
    expect((await call(h, `/contacts/${c}/transfers/${tid}?cursor=x`).then(json)).status).toBe(400);
    // DTO báo giá: người tạo giữ nguyên, người phụ trách vận hành = sales; bộ lọc assigned_user_id riêng.
    const row = (await call(h, `/quotes/${q}`).then(json)).body.data;
    expect([row.owner_user_id, row.assigned_user_id, row.assigned_name]).toEqual([h.user, sales.id, 'sales']);
    const byAssigned = (await call(h, `/quotes?assigned_user_id=${sales.id}&limit=100`).then(json)).body.data.map((x: { id: string }) => x.id);
    const byOwner = (await call(h, `/quotes?owner_id=${sales.id}&limit=100`).then(json)).body.data.map((x: { id: string }) => x.id);
    expect(byAssigned).toContain(q);
    expect(byOwner).not.toContain(q);
  });
});

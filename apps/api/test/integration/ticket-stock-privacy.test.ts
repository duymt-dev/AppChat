// TIP-034d §3 trên Postgres 16 thật — "Quên khách" và quan sát tồn ticket (AC4–5). Ticket của khách đã quên (gắn trực tiếp, hoặc chỉ qua hội
// thoại) bị loại khỏi tập hiện tại ngay khi fence (chấp nhận yêu cầu), cả hai phía so sánh; dòng quan sát hôm qua của nguồn gốc nay đã
// fence (ticket đổi sang khách khác sau lúc chụp) → so sánh `source_unavailable` (không nêu nguồn). Kiểm kê `ticket_stock` theo khoá nguồn
// chuẩn hoá (cả ticket đã xoá cứng), erase xoá dòng quan sát + mọi kết quả action có ticket đó góp số; lặp lại idempotent. Kết quả action
// cũ chiếu lại trong lịch sử → null sau khi quên. Hai thứ tự khoá (chụp trước / quên trước) không deadlock, không tái tạo dấu vết.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthzResolver, captureStock, familyInventory, materializeStockResult, privacyAdapterOf, readStockSummary, stockRefSource, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import { env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let owner: AuthzContext;
let seq = 0;
const ZONE = 'Asia/Ho_Chi_Minh';
const HOUR = 3_600_000;
const T0 = new Date('2026-10-30T08:00:00.000Z');
const Y = new Date('2026-10-29T09:00:00.000Z');
const OLD = new Date('2026-10-28T00:00:00.000Z');

const tenant = () => resolver.get(TenantContexts.system(h.ws, 'ticket-stock-privacy'));

async function contact(db: TenantDb) {
  const id = uuidv7();
  await db.contact.create({ data: { id, code: `KH-SP${++seq}`, name: `Khách ${seq}`, source: 'manual' } });
  return id;
}
async function conversation(db: TenantDb, contactId: string) {
  const account = (await db.channelAccount.findFirst({ select: { id: true } }))?.id ?? uuidv7();
  await db.channelAccount.upsert({ where: { id: account }, create: { id: account, type: 'webchat', name: 'web', status: 'connected' }, update: {} });
  const id = uuidv7();
  await db.conversation.create({ data: { id, channelAccountId: account, channelType: 'webchat', externalThreadId: `sp-${id}`, contactId, unreadCount: 0 } });
  return id;
}
async function ticket(db: TenantDb, o: { contactId?: string; conversationId?: string } = {}) {
  const id = uuidv7();
  await db.ticket.create({
    data: { id, code: `TK-SP${++seq}`, title: 'Tồn', category: 'Khác', status: 'open', contactId: o.contactId ?? null, conversationId: o.conversationId ?? null, frtDueAt: OLD, ttrStartAt: OLD, ttrDueAt: new Date(T0.getTime() + 48 * HOUR), createdAt: OLD },
  });
  return id;
}
/** Fence như lúc chấp nhận "Quên khách" (privacy_family_member ghi cùng transaction accept). */
async function fence(db: TenantDb, contactId: string) {
  const op = uuidv7();
  await db.$executeRaw`INSERT INTO privacy_operation (id, canonical_contact_id, family_generation, requester_id, policy_version, inventory_revision, phase, request_key, created_at, updated_at)
    VALUES (${op}::uuid, ${contactId}::uuid, 1, ${h.user}::uuid, 1, 'r', 'accepted', ${`k:${op}`}, ${T0}, ${T0})`;
  await db.$executeRaw`INSERT INTO privacy_family_member (operation_id, contact_id, created_at) VALUES (${op}::uuid, ${contactId}::uuid, ${T0})`;
}
const summary = async (db: TenantDb) => db.$transaction((tx) => readStockSummary(tx as never, owner, ZONE, T0));
const stockArtifacts = async (db: TenantDb, contactIds: string[]) =>
  (await db.$transaction((tx) => familyInventory(tx as never, contactIds))).artifacts.filter((a) => a.kind === 'ticket_stock').map((a) => a.recordId).sort();
const erase = (db: TenantDb, ticketId: string) => db.$transaction((tx) => privacyAdapterOf('support').erase(tx as never, { kind: 'ticket_stock', recordId: ticketId }, 'erase_exclusive'));

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  owner = await h.app.get(AuthzResolver).resolve(h.ws, h.user, { roleKey: 'owner', delegations: [] });
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('AC4 — quên khách: loại khỏi hai phía, kiểm kê + xoá dấu vết, lịch sử không chiếu lại', () => {
  it('fence → ticket (trực tiếp + qua hội thoại) ra khỏi số hiện tại và mốc; kiểm kê ticket_stock; erase xoá dòng quan sát + kết quả; idempotent', async () => {
    const db = await tenant();
    const kA = await contact(db);
    const kB = await contact(db);
    const cvA = await conversation(db, kA);
    const direct = await ticket(db, { contactId: kA });
    const viaConv = await ticket(db, { conversationId: cvA });
    const other = await ticket(db, { contactId: kB });
    h.clock.set(Y);
    await captureStock(db, ZONE, () => h.clock.now());
    h.clock.set(T0);
    const result = await db.$transaction((tx) => materializeStockResult(tx as never, owner, ZONE, T0));
    expect(result.comparison.status).toBe('available');
    expect(await stockRefSource(db, { userId: h.user, authz: owner }, result)).toEqual(result);
    const before = await summary(db);

    await fence(db, kA);
    const after = await summary(db);
    expect(after.counts.total).toBe(before.counts.total - 2);
    expect(after.comparison).toMatchObject({ status: 'available', delta: { total: 0 } });
    // Kết quả cũ có khách đã quên góp số → lịch sử không chiếu lại (không tính lại thành số mới).
    expect(await stockRefSource(db, { userId: h.user, authz: owner }, result)).toBeNull();

    expect(await stockArtifacts(db, [kA])).toEqual([direct, viaConv].sort());
    expect(await stockArtifacts(db, [kB])).toEqual([other]);
    for (const t of [direct, viaConv]) await erase(db, t);
    expect(await db.ticketStockObservation.count({ where: { ticketId: { in: [direct, viaConv] } } })).toBe(0);
    expect(await db.ticketStockResultContribution.count({ where: { candidateId: result.result_id! } })).toBe(0);
    expect(await db.ticketStockObservation.count({ where: { ticketId: other } })).toBe(1);
    for (const t of [direct, viaConv]) await erase(db, t); // lặp lại không lỗi
    expect(await stockArtifacts(db, [kA])).toEqual([]);
  });

  it('ticket đổi khách SAU lúc chụp, rồi quên khách GỐC → so sánh source_unavailable; kiểm kê vẫn tìm thấy (kể cả sau khi xoá cứng ticket)', async () => {
    const db = await tenant();
    await db.$executeRaw`DELETE FROM ticket_stock_batch`;
    const kOld = await contact(db);
    const kNew = await contact(db);
    const t = await ticket(db, { contactId: kOld });
    h.clock.set(Y);
    await captureStock(db, ZONE, () => h.clock.now());
    h.clock.set(T0);
    await db.ticket.update({ where: { id: t }, data: { contactId: kNew } });
    await fence(db, kOld);
    expect((await summary(db)).comparison).toEqual({ status: 'unavailable', reason: 'source_unavailable' });
    // Kết quả action lúc này: nguồn gốc đã fence không được ghi lại vào tập đóng góp.
    const r = await db.$transaction((tx) => materializeStockResult(tx as never, owner, ZONE, T0));
    expect(r.comparison).toEqual({ status: 'unavailable', reason: 'source_unavailable' });
    expect(await db.ticketStockResultSource.count({ where: { candidateId: r.result_id!, sourceId: kOld } })).toBe(0);
    await db.ticket.delete({ where: { id: t } });
    expect(await stockArtifacts(db, [kOld])).toEqual([t]);
    await erase(db, t);
    expect(await db.ticketStockObservation.count({ where: { ticketId: t } })).toBe(0);
    expect((await summary(db)).comparison.status).toBe('available');
  });

  it('thứ tự khoá: quên trước (giữ khoá control) → lần chụp chờ rồi thấy fence; chụp trước → quên chờ rồi xoá dòng vừa chụp; không deadlock', async () => {
    const db = await tenant();
    await db.$executeRaw`DELETE FROM ticket_stock_batch`;
    const k1 = await contact(db);
    const t1 = await ticket(db, { contactId: k1 });
    h.clock.set(new Date('2026-11-05T03:00:00.000Z'));
    // Quên trước: transaction giữ khoá control + fence, lần chụp bắt đầu khi còn chờ.
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const forget = db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM ticket_stock_control WHERE id = 1 FOR UPDATE`;
      await fence(tx as unknown as TenantDb, k1);
      await gate;
    }, { timeout: 20_000 });
    await new Promise((r) => setTimeout(r, 200));
    const capture = captureStock(db, ZONE, () => h.clock.now());
    await new Promise((r) => setTimeout(r, 300));
    release();
    await forget;
    expect(await capture).toMatchObject({ status: 'captured' });
    expect(await db.ticketStockObservation.count({ where: { ticketId: t1 } })).toBe(0);

    // Chụp trước: lần chụp ngày sau giữ control; erase (sau khoá control) chờ, rồi xoá dòng vừa chụp của nguồn đã fence.
    const k2 = await contact(db);
    const t2 = await ticket(db, { contactId: k2 });
    h.clock.set(new Date('2026-11-06T03:00:00.000Z'));
    await captureStock(db, ZONE, () => h.clock.now());
    expect(await db.ticketStockObservation.count({ where: { ticketId: t2 } })).toBe(1);
    await fence(db, k2);
    await Promise.all([erase(db, t2), captureStock(db, ZONE, () => h.clock.now())]);
    expect(await db.ticketStockObservation.count({ where: { ticketId: t2 } })).toBe(0);
    h.clock.set(T0);
  });
});

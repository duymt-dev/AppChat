// TIP-032c (AC1, AC2, AC6) — người tạo hợp đồng / đơn bất biến, người phụ trách vận hành tách riêng, trên DB native thật:
//   - mọi đường tạo khởi tạo assigned = người tạo; version = 1; đổi owner trực tiếp ở DB (kể cả về null) → trigger chặn
//   - contract.update / order.update: owner gửi lại đúng giá trị cũ bỏ qua; khác / null → 422 immutable; assigned_user_id đổi / bỏ giao
//   - đơn sàn (locked_lines): đổi người phụ trách / ghi chú được, đổi dòng → 409
//   - scope own theo người phụ trách: Sales được giao thấy + sửa; người tạo cũ mất quyền khi không còn quan hệ hiện tại
//   - contact.transfer_owner không đổi người phụ trách hợp đồng / đơn; bộ lọc owner_id (người tạo) vs assigned_user_id
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let sales: { id: string; token: string };
let lan: string;

const json = async (r: Response) => ({ status: r.status, body: (await r.json().catch(() => null)) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u?: { token: string }): Record<string, string> => (u ? { authorization: `Bearer ${u.token}` } : {});
const act = (id: string, input: unknown, who?: { token: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...as(who) }).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, as(who)).then(json);
const TAG = uuidv7().slice(-6);
const line = { name: 'Serum', qty: 1, unit_price: '500000', tax_rate: 0 };

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 'commerce-attribution-test'));
  sales = await h.member('sales');
  lan = (await act('contact.create', { full_name: `Chị Lan ${TAG}`, phone: `09${Date.now().toString().slice(-8)}` })).body.data.result.contact_id;
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('người tạo bất biến + người phụ trách (TIP-032c)', () => {
  it('tạo: assigned = người tạo, version 1; trigger chặn đổi owner kể cả về null; version tăng mỗi UPDATE (bỏ qua giá trị gửi)', async () => {
    const o = (await act('order.create', { contact_id: lan, items: [line] })).body.data.result.order_id as string;
    const c = (await act('contract.create', { contact_id: lan, kind: 'service', title: 'Gói', value: '1000000' })).body.data.result.contract_id as string;
    expect(await db.order.findUniqueOrThrow({ where: { id: o } })).toMatchObject({ ownerUserId: h.user, assignedUserId: h.user, version: 1 });
    expect(await db.contract.findUniqueOrThrow({ where: { id: c } })).toMatchObject({ ownerUserId: h.user, assignedUserId: h.user, version: 1 });
    await expect(db.order.update({ where: { id: o }, data: { ownerUserId: sales.id } })).rejects.toThrow(/immutable/);
    await expect(db.contract.update({ where: { id: c }, data: { ownerUserId: null } })).rejects.toThrow(/immutable/);
    await db.order.update({ where: { id: o }, data: { note: 'x', version: 99 } });
    expect((await db.order.findUniqueOrThrow({ where: { id: o } })).version).toBe(2);
  });

  it('order.update: owner echo bỏ qua, khác / null → 422; assigned đổi rồi bỏ giao; trả version', async () => {
    const o = (await act('order.create', { contact_id: lan, items: [line] })).body.data.result.order_id as string;
    expect((await act('order.update', { order_id: o, patch: { owner_user_id: sales.id } })).body.error.fields).toEqual({ 'patch.owner_user_id': 'immutable' });
    expect((await act('order.update', { order_id: o, patch: { owner_user_id: null } })).status).toBe(422);
    const ok = await act('order.update', { order_id: o, patch: { owner_user_id: h.user, assigned_user_id: sales.id, note: 'Giao chiều' } });
    expect(ok.status).toBe(200);
    expect(ok.body.data.result.version).toBe(2);
    expect(await db.order.findUniqueOrThrow({ where: { id: o } })).toMatchObject({ ownerUserId: h.user, assignedUserId: sales.id, note: 'Giao chiều' });
    expect((await act('order.update', { order_id: o, patch: { assigned_user_id: uuidv7() } })).body.error.fields).toEqual({ 'patch.assigned_user_id': 'not_member' });
    expect((await act('order.update', { order_id: o, patch: { assigned_user_id: null } })).status).toBe(200);
    expect((await db.order.findUniqueOrThrow({ where: { id: o } })).assignedUserId).toBeNull();
  });

  it('contract.update: owner bất biến (422), assigned đổi được; DTO có owner_* + assigned_* + version', async () => {
    const c = (await act('contract.create', { contact_id: lan, kind: 'service', title: 'Gói năm', value: '2000000' })).body.data.result.contract_id as string;
    expect((await act('contract.update', { contract_id: c, patch: { owner_user_id: sales.id } })).body.error.fields).toEqual({ 'patch.owner_user_id': 'immutable' });
    expect((await act('contract.update', { contract_id: c, if_version: 1, patch: { assigned_user_id: sales.id } })).status).toBe(200);
    const row = (await get(`/contracts/${c}`)).body.data;
    expect(row).toMatchObject({ owner_user_id: h.user, assigned_user_id: sales.id, assigned_name: expect.any(String), version: 2 });
  });

  it('đơn sàn locked_lines: người phụ trách / ghi chú được, dòng → 409', async () => {
    const id = uuidv7();
    const conn = uuidv7();
    await db.integrationConnection.create({ data: { id: conn, connectorKey: 'mock_marketplace', port: 'marketplace', name: 'Sàn thử' } });
    await db.order.create({ data: { id, code: `DH-SAN${TAG}`, source: 'marketplace', externalConnectionId: conn, externalId: `ext-${TAG}`, lockedLines: true, contactId: lan, ownerUserId: h.user, total: 100n, subtotal: 100n } });
    expect((await act('order.update', { order_id: id, patch: { assigned_user_id: sales.id, note: 'Gói kỹ' } })).status).toBe(200);
    expect((await act('order.update', { order_id: id, patch: { items: [line] } })).status).toBe(409);
    expect(await db.order.findUniqueOrThrow({ where: { id } })).toMatchObject({ ownerUserId: h.user, assignedUserId: sales.id });
  });

  it('scope own theo người phụ trách: Sales được giao đọc + sửa; bỏ giao → 404; người tạo không phải quyền ghi vĩnh viễn', async () => {
    const k = (await act('contact.create', { full_name: `Anh Khoa ${TAG}`, phone: `08${Date.now().toString().slice(-8)}` })).body.data.result.contact_id;
    const o = (await act('order.create', { contact_id: k, items: [line] })).body.data.result.order_id as string;
    expect((await get(`/orders/${o}`, sales)).status).toBe(404);
    await act('order.update', { order_id: o, patch: { assigned_user_id: sales.id } });
    expect((await get(`/orders/${o}`, sales)).status).toBe(200);
    expect((await act('order.update', { order_id: o, patch: { note: 'sales sửa' } }, sales)).status).toBe(200);
    const list = (await get(`/orders?assigned_user_id=${sales.id}&limit=50`, sales)).body.data as { id: string }[];
    expect(list.map((r) => r.id)).toContain(o);
    const byOwner = (await get(`/orders?owner_id=${sales.id}&limit=50`, sales)).body.data as { id: string }[];
    expect(byOwner.map((r) => r.id)).not.toContain(o);
    await act('order.update', { order_id: o, patch: { assigned_user_id: null } });
    expect((await get(`/orders/${o}`, sales)).status).toBe(404);
  });

  it('contact.transfer_owner không đổi người phụ trách / người tạo của hợp đồng / đơn', async () => {
    const k = (await act('contact.create', { full_name: `Chị Mai ${TAG}`, phone: `07${Date.now().toString().slice(-8)}` })).body.data.result.contact_id;
    const o = (await act('order.create', { contact_id: k, items: [line] })).body.data.result.order_id as string;
    const c = (await act('contract.create', { contact_id: k, kind: 'service', title: 'Gói', value: '1000000' })).body.data.result.contract_id as string;
    expect((await act('contact.transfer_owner', { contact_id: k, to_user_id: sales.id, move: { conversations: true, quotes: true, appointments: true } })).status).toBe(200);
    expect(await db.order.findUniqueOrThrow({ where: { id: o } })).toMatchObject({ ownerUserId: h.user, assignedUserId: h.user });
    expect(await db.contract.findUniqueOrThrow({ where: { id: c } })).toMatchObject({ ownerUserId: h.user, assignedUserId: h.user });
  });
});

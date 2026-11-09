// TIP-032c (AC4, AC5) — hoàn tác theo trường trên DB native thật:
//   - không xung đột: chỉ khôi phục đúng trường đã đổi, phiên bản tăng (không quay về số cũ), sự kiện bù `edit_undone`, lịch sử giữ
//   - có bản ghi sau (kể cả không liên quan) hoặc ABA → 409, dữ liệu sau giữ nguyên
//   - cọc: chỉ cọc + pay_status, không đụng ghi chú / vận chuyển; vận chuyển: chỉ khoá đã đổi
//   - biên nhận cũ (ảnh chụp schema 1) → 409; hoàn tác lần hai → 409
//   - tạo đơn: huỷ giữ lịch sử (không DELETE); đã sửa / đã có đề nghị thanh toán → 409; cần order.cancel hiện tại
//   - hợp đồng: sửa → hoàn tác trường; tạo → xoá mềm khi nguyên trạng, đã sửa → 409; xoá → khôi phục, báo giá đã chuyển đổi khác → 409
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let lan: string;

const json = async (r: Response) => ({ status: r.status, body: (await r.json().catch(() => null)) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const undo = (logId: string) => call(h, `/action-logs/${logId}/undo`, {}).then(json);
const TAG = uuidv7().slice(-6);
const line = (qty = 1) => ({ name: 'Serum', qty, unit_price: '500000', tax_rate: 0 });
const newOrder = async () => (await act('order.create', { contact_id: lan, items: [line()] })).body.data;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 'commerce-edit-undo-test'));
  lan = (await act('contact.create', { full_name: `Chị Lan ${TAG}`, phone: `09${Date.now().toString().slice(-8)}` })).body.data.result.contact_id;
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('hoàn tác sửa đơn theo trường (TIP-032c)', () => {
  it('update: chỉ trường đã đổi, version tăng, sự kiện bù; lần hai → 409', async () => {
    const o = (await newOrder()).result.order_id as string;
    await act('order.update_shipping', { order_id: o, shipping: { carrier: 'GHN' } });
    const u = (await act('order.update', { order_id: o, patch: { items: [line(3)], note: 'Giao chiều' } })).body.data;
    const v = (await db.order.findUniqueOrThrow({ where: { id: o } })).version;
    expect((await undo(u.action_log_id)).status).toBe(200);
    const row = await db.order.findUniqueOrThrow({ where: { id: o } });
    expect(row).toMatchObject({ total: 500000n, note: '', version: v + 1 });
    expect((row.shipping as { carrier: string }).carrier).toBe('GHN');
    const ev = await db.orderEvent.findMany({ where: { orderId: o }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    expect(ev.map((e) => e.type)).toEqual(['created', 'shipping', 'edit_undone']);
    expect((await undo(u.action_log_id)).status).toBe(409);
  });

  it('bản ghi sau không liên quan / ABA → 409, dữ liệu sau giữ nguyên', async () => {
    const o = (await newOrder()).result.order_id as string;
    const u = (await act('order.update', { order_id: o, patch: { note: 'A' } })).body.data;
    await act('order.update', { order_id: o, patch: { note: 'B' } });
    await act('order.update', { order_id: o, patch: { note: 'A' } });
    expect((await undo(u.action_log_id)).body.error).toMatchObject({ code: 'CONFLICT' });
    expect((await db.order.findUniqueOrThrow({ where: { id: o } })).note).toBe('A');
    const s = (await act('order.update_shipping', { order_id: o, shipping: { tracking: 'T1' } })).body.data;
    await act('order.update', { order_id: o, patch: { note: 'C' } });
    expect((await undo(s.action_log_id)).status).toBe(409);
    expect(((await db.order.findUniqueOrThrow({ where: { id: o } })).shipping as { tracking: string }).tracking).toBe('T1');
  });

  it('cọc: chỉ cọc + pay_status; vận chuyển: chỉ khoá đã đổi', async () => {
    const o = (await newOrder()).result.order_id as string;
    await act('order.update', { order_id: o, patch: { note: 'giữ' } });
    const d = (await act('order.set_deposit', { order_id: o, deposit_amount: '200000' })).body.data;
    expect((await undo(d.action_log_id)).status).toBe(200);
    expect(await db.order.findUniqueOrThrow({ where: { id: o } })).toMatchObject({ depositAmount: 0n, depositRequired: false, payStatus: 'unpaid', note: 'giữ' });
    await act('order.update_shipping', { order_id: o, shipping: { carrier: 'GHN', address: '1 Lê Lợi' } });
    const s = (await act('order.update_shipping', { order_id: o, shipping: { tracking: 'X9' } })).body.data;
    expect((await undo(s.action_log_id)).status).toBe(200);
    expect((await db.order.findUniqueOrThrow({ where: { id: o } })).shipping).toMatchObject({ carrier: 'GHN', address: '1 Lê Lợi', tracking: '' });
  });

  it('biên nhận cũ (ảnh chụp schema 1) → 409', async () => {
    const o = (await newOrder()).result.order_id as string;
    const u = (await act('order.update', { order_id: o, patch: { note: 'cũ' } })).body.data;
    await db.actionLog.update({ where: { id: u.action_log_id }, data: { before: { id: o, items: [], owner: h.user, note: '' } } });
    expect((await undo(u.action_log_id)).body.error).toMatchObject({ code: 'CONFLICT', fields: { receipt: 'legacy' } });
  });
});

describe('hoàn tác tạo / xoá (TIP-032c)', () => {
  it('tạo đơn: huỷ giữ lịch sử; đã sửa → 409; có đề nghị thanh toán → 409', async () => {
    const a = await newOrder();
    expect((await undo(a.action_log_id)).status).toBe(200);
    expect(await db.order.findUniqueOrThrow({ where: { id: a.result.order_id } })).toMatchObject({ status: 'cancelled', cancelReason: 'undo_create', deletedAt: null });
    const b = await newOrder();
    await act('order.update', { order_id: b.result.order_id, patch: { note: 'sửa' } });
    expect((await undo(b.action_log_id)).status).toBe(409);
    const c = await newOrder();
    await db.invoice.create({ data: { id: uuidv7(), code: `DN-U${TAG}`, contactId: lan, orderId: c.result.order_id, ownerUserId: h.user, amount: 1000n, dueDate: new Date() } });
    expect((await undo(c.action_log_id)).body.error).toMatchObject({ fields: { order_id: 'has_dependencies' } });
    expect((await db.order.findUniqueOrThrow({ where: { id: c.result.order_id } })).status).toBe('new');
  });

  it('hợp đồng: sửa → hoàn tác trường; tạo nguyên trạng → xoá mềm, đã sửa → 409; xoá → khôi phục', async () => {
    const cr = (await act('contract.create', { contact_id: lan, kind: 'service', title: 'Gói', value: '1000000' })).body.data;
    const id = cr.result.contract_id as string;
    const up = (await act('contract.update', { contract_id: id, patch: { value: '3000000', note: 'n' } })).body.data;
    expect((await undo(cr.action_log_id)).status).toBe(409);
    expect((await undo(up.action_log_id)).status).toBe(200);
    expect(await db.contract.findUniqueOrThrow({ where: { id } })).toMatchObject({ value: 1000000n, note: '', title: 'Gói', version: 3 });
    const del = (await act('contract.delete', { contract_id: id, if_version: 3 })).body.data;
    expect((await db.contract.findUniqueOrThrow({ where: { id } })).deletedAt).not.toBeNull();
    expect((await undo(del.action_log_id)).status).toBe(200);
    expect((await db.contract.findUniqueOrThrow({ where: { id } })).deletedAt).toBeNull();
    const fresh = (await act('contract.create', { contact_id: lan, kind: 'service', title: 'Mới', value: '1' })).body.data;
    expect((await undo(fresh.action_log_id)).status).toBe(200);
    expect((await db.contract.findUniqueOrThrow({ where: { id: fresh.result.contract_id } })).deletedAt).not.toBeNull();
    expect(await db.contractSignatureEvent.count({ where: { contractId: fresh.result.contract_id } })).toBe(1);
  });
});

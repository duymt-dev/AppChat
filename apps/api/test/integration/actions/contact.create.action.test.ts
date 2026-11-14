// Ma trận contact.create (TIP-023b → TIP-015f): dữ liệu mới (không có ghi chú rỗng); undo = xoá mềm bản còn nguyên trạng (có quan hệ / bị sửa → 409); trùng SĐT → 409; thiếu SĐT lẫn email → 422; idempotency.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('contact.create');
  // Khách có sẵn — ô trùng SĐT va vào đây.
  await m.seed('contact.create', { full_name: 'Chị Lan Anh', phone: '0909440001' });
}, 120_000);
afterAll(() => m?.close());

describe('contact.create', () => {
  it('403 / scope / id lạ', async () => {
    expect((await m.act({ full_name: 'Trùng', phone: '0909440001' })).status).toBe(409);
    expect((await m.act({ full_name: 'Thiếu' })).status).toBe(422);
    const a = await m.actWithKey('ct-create-idem', { full_name: 'Lặp', phone: '0909440099' });
    expect((await m.actWithKey('ct-create-idem', { full_name: 'Lặp', phone: '0909440099' })).body.data.result).toEqual(a.body.data.result);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ full_name: 'Anh Tuấn', phone: '0909440002', city: 'Huế' });
    expect(preview).toEqual({ summary: 'Anh Tuấn · 0909440002', risk: 'write', changes: [{ entity: 'contact', after: { full_name: 'Anh Tuấn', phone: '0909440002', city: 'Huế' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result.code).toMatch(/^KH-/);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    // TIP-015f §5.1: hoàn tác tạo = xoá mềm (giữ dữ liệu + biên nhận 30 ngày), không DELETE.
    const db = await m.db();
    expect(await db.contact.count({ where: { phone: '0909440002', deletedAt: null } })).toBe(0);
    const row = await db.contact.findFirstOrThrow({ where: { phone: '0909440002' } });
    expect(row.deletedAt).not.toBeNull();
    expect(await db.contactLifecycleReceipt.count({ where: { contactId: row.id } })).toBe(1);
  });

  it('hoàn tác tạo bị chặn khi đã có quan hệ / bị sửa sau đó (409, không xoá)', async () => {
    const a = await m.act({ full_name: 'Chị Đã Có Đơn', phone: '0909440003' });
    const id = a.body.data.result.contact_id as string;
    await m.seed('order.create', { contact_id: id, items: [{ name: 'HIFU', qty: 1, unit_price: '1000000', tax_rate: 0 }] });
    expect((await m.undo(a.body.data.action_log_id)).body.error).toMatchObject({ code: 'CONFLICT', fields: { contact_id: 'has_relations' } });
    const b = await m.act({ full_name: 'Chị Bị Sửa', phone: '0909440004' });
    await m.seed('contact.update', { contact_id: b.body.data.result.contact_id, patch: { city: 'Huế' } });
    expect((await m.undo(b.body.data.action_log_id)).body.error).toMatchObject({ code: 'CONFLICT', fields: { contact_id: 'changed' } });
    const db = await m.db();
    expect(await db.contact.count({ where: { id: { in: [id, b.body.data.result.contact_id] }, deletedAt: null } })).toBe(2);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

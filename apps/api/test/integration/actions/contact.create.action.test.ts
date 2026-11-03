// Ma trận contact.create (TIP-023b): dữ liệu mới (không có ghi chú rỗng); undo xoá; trùng SĐT → 409; thiếu SĐT lẫn email → 422; idempotency.
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
    expect(await (await m.db()).contact.count({ where: { phone: '0909440002' } })).toBe(0);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

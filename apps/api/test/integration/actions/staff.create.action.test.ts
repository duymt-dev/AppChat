// Ma trận staff.create (TIP-023b): thêm nhân sự (risk config) → tên + vai trò + dịch vụ làm được (theo tên) + số ngày có ca riêng; dịch vụ
// lạ → 422 ở preview. 403 cs. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let svc: string;

beforeAll(async () => {
  m = await matrix('staff.create');
  svc = (await m.seed('product.create', { name: 'Chăm sóc da', type: 'service', price: '680000', duration_min: 90, tax_rate: 0 })).product_id;
}, 120_000);
afterAll(() => m?.close());

describe('staff.create', () => {
  it('403 cs (không có booking.config)', async () => {
    expect((await m.act({ name: 'X' }, m.cs)).status).toBe(403);
  });

  it('preview Trợ lý → xác nhận; dịch vụ lạ → 422', async () => {
    const { preview, done } = await m.confirm({ name: ' KTV. Hồng Anh ', role: 'KTV da', skills: [svc], schedule: [{ weekday: 5, open: true, start: '13:00', end: '17:00' }] });
    expect(preview).toEqual({ summary: 'KTV. Hồng Anh', risk: 'config', changes: [{ entity: 'staff', after: { name: 'KTV. Hồng Anh', role: 'KTV da', skills: ['Chăm sóc da'], closed_days: 0, custom_days: 1 } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.act({ name: 'X', skills: ['0190f000-0000-7000-8000-00000000beef'] }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ skills: 'not_found' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

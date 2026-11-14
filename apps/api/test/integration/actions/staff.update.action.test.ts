// Ma trận staff.update (TIP-023b): sửa nhân sự (risk config) → trước / sau chỉ trường đổi (dịch vụ theo tên); ca riêng thay → cảnh báo.
// 403 cs · id lạ 404. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let svc: string;
let staff: string;

beforeAll(async () => {
  m = await matrix('staff.update');
  await (m.seed('contact.create', { full_name: 'Chị Lan LH', phone: '0909510001' }));
  svc = (await m.seed('product.create', { name: 'Massage thư giãn', type: 'service', price: '450000', duration_min: 60, tax_rate: 0 })).product_id;
  staff = (await m.seed('staff.create', { name: 'KTV. Mai' })).staff_id;
  await m.seed('business_hours.update', { days: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, open: d !== 6, start: '08:00', end: '19:00' })), slot_step_min: 30, default_buffer_min: 10 });
}, 120_000);
afterAll(() => m?.close());

describe('staff.update', () => {
  it('403 cs (không có booking.config)', async () => {
    expect((await m.act({ staff_id: staff, patch: { role: 'x' } }, m.cs)).status).toBe(403);
  });

  it('id lạ 404 · preview Trợ lý → xác nhận', async () => {
    expect((await m.act({ staff_id: '0190f000-0000-7000-8000-00000000beef', patch: { role: 'x' } })).status).toBe(404);
    const { preview, done } = await m.confirm({ staff_id: staff, patch: { role: 'Trưởng ca', skills: [svc], schedule: [{ weekday: 0, open: true, start: '09:00', end: '12:00' }] } });
    expect(preview).toEqual({ summary: 'KTV. Mai', risk: 'config', changes: [{ entity: 'staff', id: staff, before: { role: '', skills: [], custom_days: 0 }, after: { role: 'Trưởng ca', skills: ['Massage thư giãn'], custom_days: 1 } }], warnings: ['schedule_replaced'] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

// Ma trận staff.deactivate (TIP-023b): ngừng nhân sự (risk config) → tên; còn lịch sắp tới → 409 ở preview. 403 cs · id lạ 404.
// Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let svc: string;
let staff: string;
let a: { appointment_id: string; code: string };
const A = () => a.appointment_id;

beforeAll(async () => {
  m = await matrix('staff.deactivate');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan LH', phone: '0909510001' })).contact_id;
  svc = (await m.seed('product.create', { name: 'Massage thư giãn', type: 'service', price: '450000', duration_min: 60, tax_rate: 0 })).product_id;
  staff = (await m.seed('staff.create', { name: 'KTV. Mai' })).staff_id;
  await m.seed('business_hours.update', { days: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, open: d !== 6, start: '08:00', end: '19:00' })), slot_step_min: 30, default_buffer_min: 10 });
  a = await m.seed('appointment.create', { contact_id: lan, contact_name: 'Chị Lan LH', service_id: svc, staff_id: staff, date: '2026-10-31', start: '09:00' });
}, 120_000);
afterAll(() => m?.close());

describe('staff.deactivate', () => {
  it('403 cs (không có booking.config)', async () => {
    expect((await m.act({ staff_id: staff }, m.cs)).status).toBe(403);
  });

  it('id lạ 404 · còn lịch sắp tới → 409; huỷ lịch rồi preview Trợ lý → xác nhận', async () => {
    expect((await m.act({ staff_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    expect((await m.act({ staff_id: staff }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ staff_id: 'has_upcoming' });
    await m.seed('appointment.cancel', { appointment_id: A(), reason: 'x' });
    const { preview, done } = await m.confirm({ staff_id: staff });
    expect(preview).toEqual({ summary: 'KTV. Mai', risk: 'config', changes: [{ entity: 'staff', id: staff, before: { active: true }, after: { active: false } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

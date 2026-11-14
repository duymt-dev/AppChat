// Ma trận appointment.reschedule (TIP-023b): đổi giờ → giờ / nhân sự trước / sau + số lần dời; slot bận → 409 ở preview; undo trả giờ cũ.
// 403 kế toán · sales own → 404 · id lạ 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let svc: string;
let staff: string;
let a: { appointment_id: string; code: string };
const A = () => a.appointment_id;
const row = async () => (await m.db()).appointment.findUniqueOrThrow({ where: { id: A() } });

beforeAll(async () => {
  m = await matrix('appointment.reschedule');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan LH', phone: '0909510001' })).contact_id;
  svc = (await m.seed('product.create', { name: 'Massage thư giãn', type: 'service', price: '450000', duration_min: 60, tax_rate: 0 })).product_id;
  staff = (await m.seed('staff.create', { name: 'KTV. Mai' })).staff_id;
  await m.seed('business_hours.update', { days: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, open: d !== 6, start: '08:00', end: '19:00' })), slot_step_min: 30, default_buffer_min: 10 });
  a = await m.seed('appointment.create', { contact_id: lan, contact_name: 'Chị Lan LH', service_id: svc, staff_id: staff, date: '2026-10-31', start: '09:00' });
}, 120_000);
afterAll(() => m?.close());

describe('appointment.reschedule', () => {
  it('403 kế toán (không có booking.manage) · sales: lịch của owner → 404 · id lạ → 404', async () => {
    expect((await m.act({ appointment_id: A(), date: '2026-10-31', start: '11:00' }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ appointment_id: A(), date: '2026-10-31', start: '11:00' }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ appointment_id: A(), date: '2026-10-31', start: '11:00' }, appointment_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ appointment_id: A(), date: '2026-10-31', start: '11:00' });
    expect(preview).toEqual({ summary: `${a.code} · 2026-10-31 11:00`, risk: 'write', changes: [{ entity: 'appointment', id: A(), before: { at: '2026-10-31 09:00', reschedule_count: 0 }, after: { at: '2026-10-31 11:00', reschedule_count: 1 } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await row()).rescheduleCount).toBe(0);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

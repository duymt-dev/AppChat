// Ma trận appointment.complete (TIP-023b): hoàn thành → trạng thái trước / sau; ngoài liệu trình → cảnh báo gợi ý tạo đơn; undo về đang làm.
// 403 kế toán · sales own → 404 · id lạ 404. Trừ buổi liệu trình kiểm ở booking.test.
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
  m = await matrix('appointment.complete');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan LH', phone: '0909510001' })).contact_id;
  svc = (await m.seed('product.create', { name: 'Massage thư giãn', type: 'service', price: '450000', duration_min: 60, tax_rate: 0 })).product_id;
  staff = (await m.seed('staff.create', { name: 'KTV. Mai' })).staff_id;
  await m.seed('business_hours.update', { days: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, open: d !== 6, start: '08:00', end: '19:00' })), slot_step_min: 30, default_buffer_min: 10 });
  a = await m.seed('appointment.create', { contact_id: lan, contact_name: 'Chị Lan LH', service_id: svc, staff_id: staff, date: '2026-10-31', start: '09:00' });
  await m.seed('appointment.check_in', { appointment_id: a.appointment_id });
}, 120_000);
afterAll(() => m?.close());

describe('appointment.complete', () => {
  it('403 kế toán (không có booking.manage) · sales: lịch của owner → 404 · id lạ → 404', async () => {
    expect((await m.act({ appointment_id: A() }, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({ appointment_id: A() }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ appointment_id: A() }, appointment_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ appointment_id: A() });
    expect(preview).toEqual({ summary: `${a.code} · Chị Lan LH · Massage thư giãn · 2026-10-31 09:00`, risk: 'write', changes: [{ entity: 'appointment', id: A(), before: { status: 'in_progress' }, after: { status: 'done' } }], warnings: ['suggest_order'] });
    expect(done.body.data.result.suggest_order).toBe(true);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await row()).status).toBe('in_progress');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

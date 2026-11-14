// Ma trận appointment.list (TIP-023b R2): happy (khoảng ngày, lọc trạng thái / khách) · scope (sales own không thấy lịch của owner) · 403 (kế
// toán không có booking.view) · nguồn assistant. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let svc: string;
let staff: string;
let a: { appointment_id: string; code: string };

beforeAll(async () => {
  m = await matrix('appointment.list');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan LH', phone: '0909520001' })).contact_id;
  svc = (await m.seed('product.create', { name: 'Massage thư giãn', type: 'service', price: '450000', duration_min: 60, tax_rate: 0 })).product_id;
  staff = (await m.seed('staff.create', { name: 'KTV. Mai' })).staff_id;
  await m.seed('business_hours.update', { days: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, open: d !== 6, start: '08:00', end: '19:00' })), slot_step_min: 30, default_buffer_min: 10 });
  a = await m.seed('appointment.create', { contact_id: lan, contact_name: 'Chị Lan LH', service_id: svc, staff_id: staff, date: '2026-10-31', start: '09:00' });
}, 120_000);
afterAll(() => m?.close());

describe('appointment.list', () => {
  it('happy: theo khoảng ngày + trạng thái + khách', async () => {
    const r = await m.act({ from: '2026-10-31', to: '2026-10-31' });
    expect(r.body.data.result.appointments).toEqual([expect.objectContaining({ appointment_id: a.appointment_id, code: a.code, contact_name: 'Chị Lan LH', service: 'Massage thư giãn', status: 'pending' })]);
    expect((await m.act({ from: '2026-10-31', to: '2026-10-31', status: 'confirmed' })).body.data.result.appointments).toEqual([]);
    expect((await m.act({ from: '2026-10-31', to: '2026-10-31', contact_id: lan })).body.data.result.appointments).toHaveLength(1);
  });

  it('scope: sales (own) không thấy lịch của owner · 403 kế toán', async () => {
    expect((await m.act({ from: '2026-10-31', to: '2026-10-31' }, m.sales)).body.data.result.appointments).toEqual([]);
    expect((await m.act({ from: '2026-10-31', to: '2026-10-31' }, await m.h.member('accountant'))).status).toBe(403);
  });

  it('nguồn assistant: risk read chạy ngay (không thẻ xác nhận)', async () => {
    const r = await m.act({ from: '2026-10-31', to: '2026-10-31' }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.appointments).toHaveLength(1);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});

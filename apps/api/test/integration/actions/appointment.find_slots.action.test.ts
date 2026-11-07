// Ma trận appointment.find_slots (TIP-023b R2): happy (khung trống theo giờ mở cửa, bỏ giờ đã đặt + buffer) · dịch vụ lạ → 404 · 403 (kế toán
// không có booking.view) · nguồn assistant. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let svc: string;
let staff: string;

beforeAll(async () => {
  m = await matrix('appointment.find_slots');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan LH', phone: '0909520001' })).contact_id;
  svc = (await m.seed('product.create', { name: 'Massage thư giãn', type: 'service', price: '450000', duration_min: 60, tax_rate: 0 })).product_id;
  staff = (await m.seed('staff.create', { name: 'KTV. Mai' })).staff_id;
  await m.seed('business_hours.update', { days: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, open: d !== 6, start: '08:00', end: '19:00' })), slot_step_min: 30, default_buffer_min: 10 });
  await m.seed('appointment.create', { contact_id: lan, contact_name: 'Chị Lan LH', service_id: svc, staff_id: staff, date: '2026-10-31', start: '09:00' });
}, 120_000);
afterAll(() => m?.close());

describe('appointment.find_slots', () => {
  it('happy: giờ đã đặt không còn trống', async () => {
    const r = await m.act({ service_id: svc, date: '2026-10-31', staff_id: staff });
    const starts = r.body.data.result.slots.map((s: { start: string }) => s.start);
    expect(starts.length).toBeGreaterThan(0);
    expect(starts.some((s: string) => s.includes('09:00'))).toBe(false);
  });

  it('dịch vụ lạ → 404 · 403 kế toán', async () => {
    expect((await m.act({ service_id: '0190f000-0000-7000-8000-00000000beef', date: '2026-10-31' })).status).toBe(404);
    expect((await m.act({ service_id: svc, date: '2026-10-31' }, await m.h.member('accountant'))).status).toBe(403);
  });

  it('nguồn assistant: risk read chạy ngay (không thẻ xác nhận)', async () => {
    const r = await m.act({ service_id: svc, date: '2026-10-31' }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(Array.isArray(r.body.data.result.slots)).toBe(true);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});

// Ma trận appointment.get (TIP-023b R2): happy (khách / dịch vụ / nhân sự / giờ / version, mở drawer) · 403 (kế toán không có booking.view)
// · scope (sales own đọc lịch người khác → 404) · nguồn assistant. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let a: { appointment_id: string; code: string };

beforeAll(async () => {
  m = await matrix('appointment.get');
  const svc = (await m.seed('product.create', { name: 'Massage xem lịch', type: 'service', price: '300000', duration_min: 60, tax_rate: 8 })).product_id;
  const st = (await m.seed('staff.create', { name: 'KTV. Lịch' })).staff_id;
  a = await m.seed('appointment.create', { contact_name: 'Khách lịch', phone: '0909350001', service_id: svc, staff_id: st, date: '2026-10-31', start: '09:00' });
}, 120_000);
afterAll(() => m?.close());

describe('appointment.get', () => {
  it('happy', async () => {
    const r = await m.act({ appointment_id: a.appointment_id });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ id: a.appointment_id, code: a.code, contact: 'Khách lịch', service: 'Massage xem lịch', staff: 'KTV. Lịch', status: 'pending', version: expect.any(Number) });
    expect(r.body.data.ui_target).toEqual({ type: 'open', entity: 'appointment', id: a.appointment_id, view: 'drawer' });
  });

  it('403: kế toán không có booking.view', async () => {
    expect((await m.act({ appointment_id: a.appointment_id }, await m.h.member('accountant'))).status).toBe(403);
  });

  it('scope: sales own → 404', async () => {
    expect((await m.act({ appointment_id: a.appointment_id }, m.sales)).status).toBe(404);
  });

  it('nguồn assistant: chạy ngay', async () => {
    expect((await m.act({ appointment_id: a.appointment_id }, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});

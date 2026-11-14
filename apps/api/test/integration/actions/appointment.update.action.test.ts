// Ma trận appointment.update (TIP-023b SPEC C): sửa giờ / ghi chú (risk write) → trước / sau + số lần dời; slot bận → 409, phiên bản cũ → 409
// ở preview; undo về giờ + ghi chú cũ. 403 kế toán (không có booking.manage) · sales own → 404 · id lạ 404 · idempotency.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let svc: string;
let staff: string;
let a: { appointment_id: string; code: string };
const A = () => a.appointment_id;
const SRC = { 'x-action-source': 'assistant' };
const row = async () => (await m.db()).appointment.findUniqueOrThrow({ where: { id: A() } });

beforeAll(async () => {
  m = await matrix('appointment.update');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan Sửa', phone: '0909530001' })).contact_id;
  svc = (await m.seed('product.create', { name: 'Massage thư giãn', type: 'service', price: '450000', duration_min: 60, tax_rate: 0 })).product_id;
  staff = (await m.seed('staff.create', { name: 'KTV. Mai' })).staff_id;
  await m.seed('business_hours.update', { days: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, open: d !== 6, start: '08:00', end: '19:00' })), slot_step_min: 30, default_buffer_min: 10 });
  a = await m.seed('appointment.create', { contact_id: lan, contact_name: 'Chị Lan Sửa', service_id: svc, staff_id: staff, date: '2026-10-31', start: '09:00', note: 'Phòng đôi' });
  await m.seed('appointment.create', { contact_id: lan, contact_name: 'Chị Lan Sửa', service_id: svc, staff_id: staff, date: '2026-10-31', start: '15:00' });
}, 120_000);
afterAll(() => m?.close());

describe('appointment.update', () => {
  it('403 kế toán · sales: lịch của owner → 404 · id lạ → 404', async () => {
    const i = { appointment_id: A(), patch: { note: 'x' } };
    expect((await m.act(i, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act(i, m.sales)).status).toBe(404);
    expect((await m.act({ ...i, appointment_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview: slot bận → 409 · phiên bản cũ → 409 · không gì để đổi → 422', async () => {
    expect((await m.act({ appointment_id: A(), patch: { start: '15:00' } }, undefined, SRC)).body.error.fields).toEqual({ start: 'slot_taken' });
    expect((await m.act({ appointment_id: A(), patch: { note: 'x' }, if_version: 99 }, undefined, SRC)).body.error.code).toBe('STALE_VERSION');
    expect((await m.act({ appointment_id: A(), patch: {} }, undefined, SRC)).status).toBe(422);
  });

  it('preview Trợ lý → xác nhận (dời giờ + ghi chú) → undo', async () => {
    const { preview, done } = await m.confirm({ appointment_id: A(), patch: { start: '11:00', note: 'Phòng riêng' } });
    expect(preview).toEqual({
      summary: `${a.code} · 2026-10-31 11:00`,
      risk: 'write',
      changes: [{ entity: 'appointment', id: A(), before: { at: '2026-10-31 09:00', note: 'Phòng đôi', reschedule_count: 0 }, after: { at: '2026-10-31 11:00', note: 'Phòng riêng', reschedule_count: 1 } }],
      warnings: ['reminders_reset'],
    });
    expect(done.body.data.result).toMatchObject({ appointment_id: A(), status: 'pending' });
    expect((await row()).rescheduleCount).toBe(1);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    const r = await row();
    expect([r.rescheduleCount, r.note]).toEqual([0, 'Phòng đôi']);
  });

  it('idempotency: cùng khoá → một lần ghi', async () => {
    const v = (await row()).version;
    const i = { appointment_id: A(), patch: { note: 'Gọi trước 30 phút' } };
    const r1 = await m.actWithKey('upd-idem', i);
    expect((await m.actWithKey('upd-idem', i)).body.data.result).toEqual(r1.body.data.result);
    expect((await row()).version).toBe(v + 1);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

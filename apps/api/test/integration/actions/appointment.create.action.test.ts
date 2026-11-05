// Ma trận appointment.create (TIP-023b): đặt lịch → khách (có sẵn / theo SĐT / mới — cảnh báo new_contact) + dịch vụ + nhân sự + giờ + trạng thái;
// slot đã có người → 409 ở preview; undo xoá mềm. 403 kế toán · sales: khách của owner → 404 · idempotency.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let svc: string;
let staff: string;

beforeAll(async () => {
  m = await matrix('appointment.create');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan LH', phone: '0909510001' })).contact_id;
  svc = (await m.seed('product.create', { name: 'Massage thư giãn', type: 'service', price: '450000', duration_min: 60, tax_rate: 0 })).product_id;
  staff = (await m.seed('staff.create', { name: 'KTV. Mai' })).staff_id;
  await m.seed('business_hours.update', { days: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, open: d !== 6, start: '08:00', end: '19:00' })), slot_step_min: 30, default_buffer_min: 10 });
}, 120_000);
afterAll(() => m?.close());

describe('appointment.create', () => {
  const inp = () => ({ contact_id: lan, contact_name: 'Chị Lan LH', service_id: svc, staff_id: staff, date: '2026-10-31', start: '10:00' });

  it('403 kế toán · sales: khách ngoài scope → 404', async () => {
    expect((await m.act(inp(), await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act(inp(), m.sales)).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo; slot vừa đặt → 409', async () => {
    const { preview, done } = await m.confirm(inp());
    expect(preview).toEqual({ summary: 'Chị Lan LH · Massage thư giãn · 2026-10-31 10:00', risk: 'write', changes: [{ entity: 'appointment', after: { contact: 'Chị Lan LH', service: 'Massage thư giãn', staff: 'KTV. Mai', at: '2026-10-31 10:00', duration_min: 60, status: 'pending' } }] });
    expect((await m.act(inp(), undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ start: 'slot_taken' });
    const id = done.body.data.result.appointment_id;
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).appointment.findUniqueOrThrow({ where: { id } })).deletedAt).not.toBeNull();
  });

  it('khách mới theo SĐT → cảnh báo new_contact', async () => {
    const pv = await m.act({ contact_name: 'Anh Minh', phone: '0909519999', service_id: svc, staff_id: staff, date: '2026-10-31', start: '13:00' }, undefined, { 'x-action-source': 'assistant' });
    expect(pv.body.data.preview.warnings).toEqual(['new_contact']);
  });

  it('idempotency', async () => {
    const i = { ...inp(), start: '15:00' };
    const r = await m.actWithKey('lh-create-idem', i);
    expect((await m.actWithKey('lh-create-idem', i)).body.data.result).toEqual(r.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

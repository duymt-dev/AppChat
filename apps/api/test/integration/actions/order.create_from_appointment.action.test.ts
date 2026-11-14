// Ma trận order.create_from_appointment (TIP-023b): lịch đã hoàn thành ngoài liệu trình → preview khách + dịch vụ × giá hiện tại + mã lịch
// → xác nhận → undo (TIP-032c: huỷ đơn giữ lịch sử, giữ liên kết lịch ↔ đơn); lịch đã có đơn → preview báo `existing:<mã>`; chưa hoàn thành → 409 ở preview.
// 403 cs (không có order.manage) · sales: lịch của owner ngoài scope → 404 · id lạ 404. Lịch dựng ở DB (vòng đời lịch kiểm ở booking.test).
// TIP-033c §3.2: xem trước bắt buộc cho MỌI nguồn (ui / api cũng 202, 0 ghi); thứ tự lỗi: quyền action → nguồn (404 / 409) → xác nhận.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let appt: { id: string; code: string };
const ASSIST = { 'x-action-source': 'assistant' };

beforeAll(async () => {
  m = await matrix('order.create_from_appointment');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  const lan = (await m.seed('contact.create', { full_name: 'Chị Lan ĐH', phone: '0909490002' })).contact_id;
  const svc = (await m.seed('product.create', { name: 'Chăm sóc da', type: 'service', price: '450000', tax_rate: 8 })).product_id;
  const staff = (await m.seed('staff.create', { name: 'KTV. Mai' })).staff_id;
  const start = m.h.clock.now();
  const end = new Date(start.getTime() + 3_600_000);
  appt = { id: uuidv7(), code: 'LH-9001' };
  await (await m.db()).appointment.create({
    data: { id: appt.id, code: appt.code, contactId: lan, ownerUserId: m.h.user, serviceId: svc, staffId: staff, startAt: start, endAt: end, blockEndAt: end, status: 'pending', source: 'manual', createdByType: 'user' },
  });
}, 120_000);
afterAll(() => m?.close());

describe('order.create_from_appointment', () => {
  it('403 cs · sales ngoài scope → 404 · id lạ 404 · chưa hoàn thành → 409', async () => {
    expect((await m.act({ appointment_id: appt.id }, m.cs)).status).toBe(403);
    expect((await m.act({ appointment_id: appt.id }, m.sales)).status).toBe(404);
    expect((await m.act({ appointment_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    expect((await m.act({ appointment_id: appt.id }, undefined, ASSIST)).body.error.code).toBe('INVALID_TRANSITION');
    expect((await m.act({ appointment_id: appt.id })).body.error.code).toBe('INVALID_TRANSITION');
  });

  it('preview Trợ lý → xác nhận → lần hai báo đơn sẵn có → undo', async () => {
    const db = await m.db();
    await db.appointment.update({ where: { id: appt.id }, data: { status: 'done', doneAt: m.h.clock.now() } });
    // UI / API thô không token → preview_required, chưa ghi.
    const raw = await m.act({ appointment_id: appt.id });
    expect([raw.status, raw.body.data.status]).toEqual([202, 'preview_required']);
    expect((await db.appointment.findUniqueOrThrow({ where: { id: appt.id } })).orderId).toBeNull();
    const { preview, done } = await m.confirm({ appointment_id: appt.id });
    expect(preview).toEqual({
      summary: 'Chị Lan ĐH · 486.000₫',
      risk: 'write',
      changes: [{ entity: 'order', after: { contact: 'Chị Lan ĐH', owner: 'Chủ Spa', source: 'appointment', from: appt.code, items: 1, total: '486000' } }],
    });
    const code = done.body.data.result.code;
    expect(done.body.data.result.reused).toBe(false);
    expect((await m.act({ appointment_id: appt.id }, undefined, ASSIST)).body.data.preview).toEqual({ summary: `${code} · Chị Lan ĐH`, risk: 'write', changes: [], warnings: [`existing:${code}`] });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    const oid = (await db.appointment.findUniqueOrThrow({ where: { id: appt.id } })).orderId!;
    expect((await db.order.findUniqueOrThrow({ where: { id: oid } })).status).toBe('cancelled');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

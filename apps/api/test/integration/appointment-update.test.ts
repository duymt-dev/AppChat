// TIP-023b SPEC C trên Postgres 16: appointment.update — ghi chú / tuỳ biến không tăng số lần dời, không reset nhắc, không phát event dời;
// đổi dịch vụ tính lại giờ kết thúc; hai người cùng dời vào một khung → đúng một bên thắng (EXCLUDE), bên kia CONFLICT, không ghi dở; undo bị
// chặn khi lịch đã sửa tiếp; lịch đã hoàn thành không sửa được.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, type Matrix } from './helpers/action-matrix';

let m: Matrix;
let lan: string;
let svc: string;
let svc90: string;
let mai: string;
let hoa: string;
const book = (start: string, staff = mai) => m.seed('appointment.create', { contact_id: lan, contact_name: 'Chị Lan', service_id: svc, staff_id: staff, date: '2026-10-31', start });
const row = async (id: string) => (await m.db()).appointment.findUniqueOrThrow({ where: { id } });
const outbox = async (id: string) => (await m.db()).outboxEvent.count({ where: { topic: 'appointment.rescheduled', payload: { path: ['appointment_id'], equals: id } } });

beforeAll(async () => {
  m = await matrix('appointment.update');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan', phone: '0909540001' })).contact_id;
  svc = (await m.seed('product.create', { name: 'Massage', type: 'service', price: '450000', duration_min: 60, tax_rate: 0 })).product_id;
  svc90 = (await m.seed('product.create', { name: 'Chăm sóc da', type: 'service', price: '650000', duration_min: 90, tax_rate: 0 })).product_id;
  mai = (await m.seed('staff.create', { name: 'KTV. Mai' })).staff_id;
  hoa = (await m.seed('staff.create', { name: 'KTV. Hoa' })).staff_id;
  await m.seed('business_hours.update', { days: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, open: d !== 6, start: '08:00', end: '19:00' })), slot_step_min: 30, default_buffer_min: 10 });
}, 120_000);
afterAll(() => m?.close());

describe('appointment.update — luật SPEC C', () => {
  it('chỉ ghi chú + nhắc: không dời, không reset nhắc đã gửi, không event dời', async () => {
    const a = await book('09:00');
    await (await m.db()).appointment.update({ where: { id: a.appointment_id }, data: { remindersSent: [{ kind: '24h' }] } });
    const before = await outbox(a.appointment_id);
    const r = await m.act({ appointment_id: a.appointment_id, patch: { note: 'Dị ứng tinh dầu', reminder_min: 120 } });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const x = await row(a.appointment_id);
    expect([x.rescheduleCount, x.note, x.reminderMin, x.remindersSent]).toEqual([0, 'Dị ứng tinh dầu', 120, [{ kind: '24h' }]]);
    expect(await outbox(a.appointment_id)).toBe(before);
  });

  it('đổi dịch vụ: giờ kết thúc theo thời lượng mới, không tính dời', async () => {
    const a = await book('11:00');
    expect((await m.act({ appointment_id: a.appointment_id, patch: { service_id: svc90 } })).status).toBe(200);
    const x = await row(a.appointment_id);
    expect((x.endAt.getTime() - x.startAt.getTime()) / 60_000).toBe(90);
    expect([x.serviceId, x.rescheduleCount]).toEqual([svc90, 0]);
  });

  it('dời giờ: +1 lần dời, event appointment.rescheduled cùng transaction', async () => {
    const a = await book('13:00');
    const before = await outbox(a.appointment_id);
    expect((await m.act({ appointment_id: a.appointment_id, patch: { start: '13:30', staff_id: hoa } })).status).toBe(200);
    const x = await row(a.appointment_id);
    expect([x.rescheduleCount, x.staffId]).toEqual([1, hoa]);
    expect(await outbox(a.appointment_id)).toBe(before + 1);
  });

  it('hai người cùng dời vào một khung → đúng một bên thắng, bên kia CONFLICT', async () => {
    const [a, b] = [await book('16:00'), await book('16:00', hoa)];
    const go = (id: string) => m.act({ appointment_id: id, patch: { start: '17:30', staff_id: mai } });
    const rs = await Promise.all([go(a.appointment_id), go(b.appointment_id)]);
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409]);
    const at = await Promise.all([row(a.appointment_id), row(b.appointment_id)]);
    expect(at.filter((x) => x.staffId === mai && x.startAt.toISOString() === '2026-10-31T10:30:00.000Z')).toHaveLength(1);
  });

  it('undo bị chặn khi lịch đã sửa tiếp (version đổi)', async () => {
    const a = await book('08:00', hoa);
    const first = await m.act({ appointment_id: a.appointment_id, patch: { note: 'Lần 1' } });
    await m.act({ appointment_id: a.appointment_id, patch: { note: 'Lần 2' } });
    expect((await m.undo(first.body.data.action_log_id)).status).toBe(409);
    expect((await row(a.appointment_id)).note).toBe('Lần 2');
  });

  it('lịch đã hoàn thành → INVALID_STATE, không ghi', async () => {
    const a = await book('10:00', hoa);
    await (await m.db()).appointment.update({ where: { id: a.appointment_id }, data: { status: 'done', doneAt: new Date() } });
    const v = (await row(a.appointment_id)).version;
    const r = await m.act({ appointment_id: a.appointment_id, patch: { note: 'x' } }, undefined, { 'idempotency-key': uuidv7() });
    expect([r.status, r.body.error.code]).toEqual([409, 'INVALID_STATE']);
    expect((await row(a.appointment_id)).version).toBe(v);
  });
});

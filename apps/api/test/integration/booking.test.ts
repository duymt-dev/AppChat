// TIP-033 AC trên Postgres 16 + Memurai: lịch hẹn — migration 033 + EXCLUDE chống trùng + index (EXPLAIN khoảng ngày); nhân sự + giờ mở
// cửa (booking.config); slot theo giờ mở cửa / ca riêng / kỹ năng / đệm; tạo (khách CRM bắt buộc — tìm / tạo theo số điện thoại, LH-,
// giữ chỗ 2 giờ, trùng → CONFLICT kể cả hai người đặt cùng lúc) + hoàn tác; đổi giờ giữ mã; vòng đời confirm → check_in → complete
// (liệu trình trừ buổi + package_usage / ngoài gói gợi ý đơn → order.create_from_appointment); no-show sau ân hạn; huỷ có lý do +
// hoàn tác; job hết giữ chỗ + nhắc 24h / 2h qua Zalo; đọc /calendar* + scope (cs own, kế toán none).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { appointmentRowSchema, appointmentsPageSchema, bookingSettingsSchema, calendarMetaSchema, slotsSchema } from '@appchat/shared';
import { ActionExecutor, expireHolds, remindAppointments, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let cs: { id: string };
let accountant: { id: string };
let zalo: string;

beforeAll(async () => {
  h = await startApi();
  [cs, accountant] = [await h.member('cs'), await h.member('accountant')];
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 60_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { id: string }) => ({ authorization: `Bearer ${h.tokenFor(u.id)}` });
const act = (id: string, input: unknown, who?: { id: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...(who ? as(who) : {}) }).then(json);
const get = (path: string, who?: { id: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any>; action_log_id: string } }).data; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const err = (r: { status: number; body: any }) => `${r.status} ${r.body?.error?.code}`; // eslint-disable-line @typescript-eslint/no-explicit-any
const undo = (logId: string) => call(h, `/action-logs/${logId}/undo`, {}).then(json);
const appt = async (id: string, who?: { id: string }) => appointmentRowSchema.parse((await get(`/calendar/${id}`, who)).body.data);

// Đồng hồ test: 2026-10-30 08:00Z = 15:00 thứ Sáu (VN). "Ngày mai" = thứ Bảy 31/10.
const TOMORROW = '2026-10-31';
const ids = {} as Record<'lan' | 'vy' | 'massage' | 'facial' | 'pkg' | 's1' | 's2', string>;
const DAYS = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, open: d !== 6, start: '08:00', end: '19:00' }));

describe('cấu hình', () => {
  it('bảng + EXCLUDE + index; EXPLAIN khoảng ngày', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename = 'appointment'`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['appointment_code_key', 'appointment_start_idx', 'appointment_staff_start_idx', 'appointment_owner_start_idx', 'appointment_contact_idx', 'appointment_hold_idx', 'appointment_no_overlap']));
    const dbName = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName;
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const plan = (await c.query(`EXPLAIN SELECT a.id FROM appointment a WHERE a.deleted_at IS NULL AND a.start_at >= now() AND a.start_at < now() + interval '7 days' ORDER BY a.start_at`)).rows.map((x) => x['QUERY PLAN']).join('\n');
      expect(plan).toMatch(/appointment_(start|open_start)_idx/);
    } finally {
      await c.end();
    }
  });

  it('dịch vụ + liệu trình (thành phần là dịch vụ), nhân sự + giờ mở cửa; cs không cấu hình được (403)', async () => {
    ids.massage = ok(await act('product.create', { name: 'Massage thư giãn', type: 'service', price: '450000', duration_min: 60, tax_rate: 0 })).result.product_id;
    ids.facial = ok(await act('product.create', { name: 'Chăm sóc da mặt', type: 'service', price: '680000', duration_min: 90, tax_rate: 0 })).result.product_id;
    ids.s1 = ok(await act('staff.create', { name: 'KTV. Mai Lan', role: 'KTV da' })).result.staff_id;
    ids.s2 = ok(await act('staff.create', { name: 'KTV. Hồng Anh', skills: [ids.facial], schedule: [{ weekday: 5, open: true, start: '13:00', end: '17:00' }] })).result.staff_id;
    expect(err(await act('staff.create', { name: 'X' }, cs))).toBe('403 FORBIDDEN');
    expect(err(await act('staff.create', { name: 'X', skills: [ids.massage, uuidv7()] }))).toBe('422 VALIDATION_FAILED');
    ok(await act('business_hours.update', { days: DAYS, slot_step_min: 30, default_buffer_min: 10 }));
    expect(err(await act('business_hours.update', { days: DAYS.map((d) => (d.weekday === 0 ? { ...d, start: '19:00', end: '08:00' } : d)) }))).toBe('422 VALIDATION_FAILED');
    const s = bookingSettingsSchema.parse((await get('/settings/booking')).body.data);
    expect([s.staff.length, s.days.find((d) => d.weekday === 6)?.open, s.staff.find((x) => x.id === ids.s2)?.schedule[0]?.start]).toEqual([2, false, '13:00']);
    expect((await get('/settings/booking', cs)).status).toBe(403);
  });

  it('slot: giờ mở cửa ∩ ca riêng, kỹ năng, Chủ nhật nghỉ; hôm nay không trả giờ đã qua', async () => {
    const sl = async (q: string) => slotsSchema.parse((await get(`/calendar/slots?${q}`)).body.data).slots;
    const massage = await sl(`service_id=${ids.massage}&date=${TOMORROW}`);
    expect(massage[0]).toEqual({ start: '08:00', end: '09:00', staff_ids: [ids.s1] });
    expect(massage.at(-1)?.start).toBe('18:00');
    const facial = await sl(`service_id=${ids.facial}&date=${TOMORROW}&staff_id=${ids.s2}`);
    expect([facial[0]?.start, facial.at(-1)?.start]).toEqual(['13:00', '15:30']);
    expect(await sl(`service_id=${ids.massage}&date=2026-11-01`)).toEqual([]);
    expect((await sl(`service_id=${ids.massage}&date=2026-10-30`))[0]?.start).toBe('15:00');
  });
});

describe('đặt lịch', () => {
  let a1 = '';
  it('tạo: khách mới theo số điện thoại (CRM), LH-, giữ chỗ 2 giờ; lần 2 cùng số dùng lại khách; trùng giờ (kể cả đệm) → CONFLICT', async () => {
    const r = ok(await act('appointment.create', { contact_name: 'Ngô Bảo Ngọc', phone: '0909 500 001', service_id: ids.massage, staff_id: ids.s1, date: TOMORROW, start: '09:00' }));
    a1 = r.result.appointment_id;
    expect(r.result.code).toMatch(/^LH-\d{4}$/);
    const db = await tenant();
    const row = await db.appointment.findUniqueOrThrow({ where: { id: a1 } });
    expect([row.status, row.holdExpiresAt?.toISOString(), row.blockEndAt.toISOString()]).toEqual(['pending', '2026-10-30T10:00:00.000Z', '2026-10-31T03:10:00.000Z']);
    ids.lan = row.contactId;
    expect((await db.contact.findUniqueOrThrow({ where: { id: row.contactId } })).name).toBe('Ngô Bảo Ngọc');
    expect(err(await act('appointment.create', { contact_name: 'Khác', phone: '0909500001', service_id: ids.massage, staff_id: ids.s1, date: TOMORROW, start: '09:30' }))).toBe('409 SLOT_TAKEN');
    // 10:00 dính đệm 10 phút của lịch 09:00–10:00 → lưới 30 phút trả 10:30.
    expect(err(await act('appointment.create', { contact_name: 'Khác', phone: '0909500001', service_id: ids.massage, staff_id: ids.s1, date: TOMORROW, start: '10:00' }))).toBe('409 SLOT_TAKEN');
    const b = ok(await act('appointment.create', { contact_name: 'Bảo Ngọc', phone: '0909500001', service_id: ids.massage, staff_id: ids.s1, date: TOMORROW, start: '10:30', status: 'confirmed' }));
    expect((await db.appointment.findUniqueOrThrow({ where: { id: b.result.appointment_id } })).contactId).toBe(ids.lan);
    expect(err(await act('appointment.create', { contact_name: 'X', service_id: ids.massage, staff_id: ids.s2, date: TOMORROW, start: '13:00' }))).toBe('409 SLOT_TAKEN');
  });

  it('ràng buộc DB: hai lịch chồng nhau cùng nhân sự bị EXCLUDE chặn (đặt đồng thời)', async () => {
    const db = await tenant();
    const base = await db.appointment.findUniqueOrThrow({ where: { id: a1 } });
    await expect(
      db.appointment.create({ data: { ...base, id: uuidv7(), code: 'LH-TEST', startAt: new Date('2026-10-31T02:30:00Z'), endAt: new Date('2026-10-31T03:30:00Z'), blockEndAt: new Date('2026-10-31T03:40:00Z'), remindersSent: [], custom: {} } }),
    ).rejects.toThrow(/appointment_no_overlap|exclusion/i);
  });

  it('hoàn tác tạo (giữ bản ghi → cancelled có lý do, trả khung giờ — TIP-033b §2.6); đổi giờ giữ mã + tăng lần dời + hoàn tác', async () => {
    const c = ok(await act('appointment.create', { contact_id: ids.lan, contact_name: 'x', service_id: ids.massage, staff_id: ids.s1, date: TOMORROW, start: '14:00' }));
    expect((await undo(c.action_log_id)).status).toBe(200);
    expect(await appt(c.result.appointment_id)).toMatchObject({ status: 'cancelled', cancel_reason: 'undo_create' });
    ok(await act('appointment.create', { contact_id: ids.lan, contact_name: 'x', service_id: ids.massage, staff_id: ids.s1, date: TOMORROW, start: '14:00' }));
    const before = await appt(a1);
    const m = ok(await act('appointment.reschedule', { appointment_id: a1, date: TOMORROW, start: '16:00' }));
    const moved = await appt(a1);
    expect([moved.code, moved.start_at, moved.reschedule_count]).toEqual([before.code, `${TOMORROW}T16:00:00+07:00`, 1]);
    expect(err(await act('appointment.reschedule', { appointment_id: a1, date: TOMORROW, start: '14:00' }))).toBe('409 SLOT_TAKEN');
    expect((await undo(m.action_log_id)).status).toBe(200);
    expect((await appt(a1)).start_at).toBe(`${TOMORROW}T09:00:00+07:00`);
  });

  it('vòng đời ngoài gói: confirm → check_in → complete → gợi ý đơn → order.create_from_appointment (một lần); sai bước → INVALID_TRANSITION', async () => {
    expect(err(await act('appointment.complete', { appointment_id: a1 }))).toBe('409 INVALID_TRANSITION');
    ok(await act('appointment.confirm', { appointment_id: a1 }));
    ok(await act('appointment.check_in', { appointment_id: a1 }));
    const done = ok(await act('appointment.complete', { appointment_id: a1 }));
    expect([done.result.status, done.result.package, done.result.suggest_order]).toEqual(['done', null, true]);
    const o = ok(await act('order.create_from_appointment', { appointment_id: a1 }));
    expect(o.result.code).toMatch(/^DH-/);
    expect(ok(await act('order.create_from_appointment', { appointment_id: a1 })).result.order_id).toBe(o.result.order_id);
    const db = await tenant();
    const ord = await db.order.findUniqueOrThrow({ where: { id: o.result.order_id } });
    expect([ord.source, ord.appointmentId, String(ord.total)]).toEqual(['appointment', a1, '450000']);
    expect((await appt(a1)).order_id).toBe(o.result.order_id);
  });

  it('liệu trình: gói đã thu đủ → tạo lịch tự gắn gói; hoàn thành trừ 1 buổi (package_usage); hoàn tác trả buổi', async () => {
    ids.pkg = ok(await act('product.create', { name: 'Gói massage 5 buổi', type: 'package', price: '2000000', sessions: 5, valid_days: 90, tax_rate: 0 })).result.product_id;
    const db = await tenant();
    await db.productComponent.create({ data: { productId: ids.pkg, childId: ids.massage, qty: 1 } });
    const o = ok(await act('order.create', { contact_id: ids.lan, items: [{ product_id: ids.pkg, name: 'Gói massage 5 buổi', qty: 1, unit_price: '2000000', tax_rate: 0 }] })).result.order_id;
    ok(await act('order.confirm', { order_id: o }));
    const inv = ok(await act('invoice.create', { order_id: o, contact_id: ids.lan, kind: 'full', amount: '2000000' })).result.invoice_id;
    ok(await act('invoice.record_payment', { invoice_id: inv, amount: '2000000', method: 'cash' }));
    const pk = await db.customerPackage.findFirstOrThrow({ where: { contactId: ids.lan } });
    const r = ok(await act('appointment.create', { contact_id: ids.lan, contact_name: 'x', service_id: ids.massage, staff_id: ids.s1, date: TOMORROW, start: '17:00', status: 'confirmed' }));
    expect(r.result.package_id).toBe(pk.id);
    // Dịch vụ không thuộc gói → không gắn.
    expect(ok(await act('appointment.create', { contact_id: ids.lan, contact_name: 'x', service_id: ids.facial, staff_id: ids.s2, date: TOMORROW, start: '13:00' })).result.package_id).toBeNull();
    const id = r.result.appointment_id;
    ok(await act('appointment.check_in', { appointment_id: id }));
    const d = ok(await act('appointment.complete', { appointment_id: id }));
    expect([d.result.package?.used, d.result.package?.total, d.result.suggest_order]).toEqual([1, 5, false]);
    expect(await db.packageUsage.count({ where: { appointmentId: id, revertedAt: null } })).toBe(1);
    expect(err(await act('order.create_from_appointment', { appointment_id: id }))).toBe('409 INVALID_STATE');
    expect((await undo(d.action_log_id)).status).toBe(200);
    expect((await db.customerPackage.findUniqueOrThrow({ where: { id: pk.id } })).usedSessions).toBe(0);
    expect((await appt(id)).status).toBe('in_progress');
  });

  it('không đến chỉ sau ân hạn 20 phút (không trừ buổi); huỷ bắt buộc lý do + hoàn tác (khung giờ còn trống)', async () => {
    const r = ok(await act('appointment.create', { contact_id: ids.lan, contact_name: 'x', service_id: ids.massage, staff_id: ids.s1, date: '2026-10-30', start: '17:00', status: 'confirmed' }));
    const id = r.result.appointment_id;
    expect(err(await act('appointment.mark_no_show', { appointment_id: id }))).toBe('409 INVALID_STATE');
    h.clock.advance(2 * 3_600_000 + 25 * 60_000);
    ok(await act('appointment.mark_no_show', { appointment_id: id }));
    expect((await appt(id)).status).toBe('no_show');
    h.clock.advance(-(2 * 3_600_000 + 25 * 60_000));
    const c = ok(await act('appointment.create', { contact_id: ids.lan, contact_name: 'x', service_id: ids.massage, staff_id: ids.s1, date: TOMORROW, start: '12:00' }));
    expect((await act('appointment.cancel', { appointment_id: c.result.appointment_id, reason: '  ' })).status).toBe(422);
    const x = ok(await act('appointment.cancel', { appointment_id: c.result.appointment_id, reason: 'Khách bận' }));
    expect((await appt(c.result.appointment_id)).cancel_reason).toBe('Khách bận');
    expect((await undo(x.action_log_id)).status).toBe(200);
    expect((await appt(c.result.appointment_id)).status).toBe('pending');
  });
});

describe('việc hệ thống + đọc', () => {
  it('hết giữ chỗ 2 giờ → expired (khung giờ trả lại); nhắc 24h rồi 2h qua Zalo, mỗi mốc một lần', async () => {
    const db = await tenant();
    zalo = uuidv7();
    await db.channelAccount.create({ data: { id: zalo, type: 'zalo_personal', name: 'Zalo Spa', externalId: 'z-spa', status: 'connected', settings: {} } });
    const vy = ok(await act('appointment.create', { contact_name: 'Phương Vy', phone: '0909500002', service_id: ids.massage, staff_id: ids.s1, date: '2026-11-02', start: '09:00', status: 'confirmed' }));
    const vyRow = await db.appointment.findUniqueOrThrow({ where: { id: vy.result.appointment_id } });
    ids.vy = vyRow.contactId;
    await db.conversation.create({ data: { id: uuidv7(), channelAccountId: zalo, channelType: 'zalo_personal', contactId: ids.vy, externalThreadId: 'z-vy', title: 'Vy', lastMessageAt: h.clock.now() } });
    const hold = ok(await act('appointment.create', { contact_id: ids.vy, contact_name: 'x', service_id: ids.massage, staff_id: ids.s1, date: '2026-11-02', start: '11:00' }));
    h.clock.advance(2 * 3_600_000 + 60_000);
    const sys = { executor: h.app.get(ActionExecutor, { strict: false }), tenants: resolver };
    expect(await expireHolds(db, h.ws, h.clock.now(), sys)).toBeGreaterThanOrEqual(1);
    expect((await appt(hold.result.appointment_id)).status).toBe('expired');
    ok(await act('appointment.create', { contact_id: ids.vy, contact_name: 'x', service_id: ids.massage, staff_id: ids.s1, date: '2026-11-02', start: '11:00' }));
    const run = () => remindAppointments(db, h.ws, h.clock.now(), sys);
    // 02/11 09:00 VN = 02:00Z; mốc 24h = 01/11 02:00Z.
    h.clock.advance(Date.parse('2026-11-01T02:30:00Z') - h.clock.now().getTime());
    expect(await run()).toBeGreaterThanOrEqual(1);
    expect(await run()).toBe(0);
    h.clock.advance(Date.parse('2026-11-02T00:30:00Z') - h.clock.now().getTime());
    expect(await run()).toBeGreaterThanOrEqual(1);
    const sent = (await db.appointment.findUniqueOrThrow({ where: { id: vy.result.appointment_id } })).remindersSent as { key: string }[];
    expect(sent.map((s) => s.key)).toEqual(['h24', 'h2']);
    const conv = (await db.appointment.findUniqueOrThrow({ where: { id: vy.result.appointment_id } })).conversationId!;
    // Cùng hội thoại còn lời nhắc của lịch 11:00 (cùng khách) — tìm đúng hai lời nhắc của lịch 09:00.
    const bodies = (await db.message.findMany({ where: { conversationId: conv }, orderBy: { createdAt: 'asc' } })).map((m) => m.body).filter((b) => b.includes('09:00'));
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toContain('2 giờ');
    expect((await appt(vy.result.appointment_id)).reminders.map((r) => r.kind)).toEqual(['confirm', 'h24', 'h2']);
  });

  it('/calendar khoảng ngày + lọc nhân sự / trạng thái / tìm không dấu; meta KPI; scope cs own (tạo của mình), kế toán none → 403', async () => {
    const page = appointmentsPageSchema.parse((await get(`/calendar?from=${TOMORROW}&to=2026-11-02`)).body);
    expect(page.data.length).toBeGreaterThanOrEqual(6);
    expect(page.data.map((a) => a.start_at)).toEqual([...page.data.map((a) => a.start_at)].sort());
    expect(appointmentsPageSchema.parse((await get(`/calendar?from=${TOMORROW}&to=${TOMORROW}&staff_id=${ids.s2}`)).body).data.every((a) => a.staff_id === ids.s2)).toBe(true);
    expect(appointmentsPageSchema.parse((await get(`/calendar?from=${TOMORROW}&to=2026-11-02&q=phuong vy`)).body).data.every((a) => a.contact_id === ids.vy)).toBe(true);
    expect((await get('/calendar?from=2026-10-01&to=2026-12-31')).status).toBe(400);
    const meta = calendarMetaSchema.parse((await get('/calendar/meta')).body.data);
    expect([meta.today, meta.staff.length, meta.services.length]).toEqual(['2026-11-02', 2, 2]);
    expect(appointmentsPageSchema.parse((await get(`/calendar?from=${TOMORROW}&to=2026-11-02`, cs)).body).data).toEqual([]);
    ok(await act('appointment.create', { contact_name: 'Khách CS', phone: '0909500003', service_id: ids.massage, staff_id: ids.s1, date: '2026-11-03', start: '09:00' }, cs));
    expect(appointmentsPageSchema.parse((await get('/calendar?from=2026-11-03&to=2026-11-03', cs)).body).data.length).toBe(1);
    expect((await get('/calendar?from=2026-11-03&to=2026-11-03', accountant)).status).toBe(403);
  });

  it('ngừng nhân sự còn lịch sắp tới → 409', async () => {
    expect(err(await act('staff.deactivate', { staff_id: ids.s1 }))).toBe('409 INVALID_STATE');
    ok(await act('staff.deactivate', { staff_id: ids.s2 }));
  });
});

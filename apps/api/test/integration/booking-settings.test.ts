// TIP-033b P2 (AC3, AC4, phần khoá của AC2 / AC6) trên Postgres 16: ca riêng tri-state (thứ vắng = theo giờ mở cửa, open=false = nghỉ lưu
// thành dòng, giờ riêng ∩ giờ mở cửa) đọc lại đúng + slot đúng; if_version lệch → STALE_VERSION (không ghi); giờ 29:00 / ngày 2026-02-30 →
// 422; ngừng nhân sự bị chặn bởi lịch đang làm dù bắt đầu từ hôm qua; exclude_id của lịch người khác / không sửa được → 404 đồng nhất và
// không bỏ được chỗ bận; lịch có sẵn chiếm tới block_end đã lưu dù đổi đệm; hoàn tác huỷ sau khi lịch đổi (ABA) → 409; hoàn tác tạo giữ bản
// ghi; tạo lịch song song với ngừng nhân sự → không lọt lịch mới trên nhân sự đã ngừng.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { bookingSettingsSchema } from '@appchat/shared';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let cs: { id: string };

beforeAll(async () => {
  h = await startApi();
  cs = await h.member('cs');
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
const err = (r: { status: number; body: any }) => `${r.status} ${r.body?.error?.code} ${JSON.stringify(r.body?.error?.fields ?? {})}`; // eslint-disable-line @typescript-eslint/no-explicit-any
const undo = (logId: string) => call(h, `/action-logs/${logId}/undo`, {}).then(json);
const settings = async () => bookingSettingsSchema.parse((await get('/settings/booking')).body.data);
const slots = async (q: Record<string, string>, who?: { id: string }) => get(`/calendar/slots?${new URLSearchParams(q)}`, who);
// Đồng hồ harness: 2026-10-30 08:00Z = 15:00 thứ Sáu (VN). Thứ Hai 02/11 (weekday 0), thứ Ba 03/11 (weekday 1), thứ Tư 04/11 (weekday 2).
const DAYS = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, open: d !== 6, start: '08:00', end: '19:00' }));
const ids = {} as Record<'svc' | 's1' | 's2', string>;
let phone = 0;
const book = async (staff: string, date: string, start: string) =>
  ok(await act('appointment.create', { contact_name: 'Khách cấu hình', phone: `09096${String(++phone).padStart(5, '0')}`, service_id: ids.svc, staff_id: staff, date, start }));

describe('cấu hình lịch hẹn + chính sách slot', () => {
  beforeAll(async () => {
    ids.svc = ok(await act('product.create', { name: 'Chăm sóc tóc', type: 'service', price: '250000', duration_min: 60, tax_rate: 0 })).result.product_id;
    ok(await act('business_hours.update', { days: DAYS, slot_step_min: 30, default_buffer_min: 10 }));
    ids.s1 = ok(await act('staff.create', { name: 'KTV. Ba trạng thái', schedule: [{ weekday: 1, open: false, start: '08:00', end: '19:00' }, { weekday: 2, open: true, start: '13:00', end: '17:00' }] })).result.staff_id;
    ids.s2 = ok(await act('staff.create', { name: 'KTV. Phụ' })).result.staff_id;
  });

  it('tri-state: thứ Hai kế thừa giờ mở cửa, thứ Ba nghỉ (dòng lưu), thứ Tư giờ riêng; đọc lại đúng; slot theo đúng ba trạng thái', async () => {
    const st = (await settings()).staff.find((s) => s.id === ids.s1)!;
    expect(st.schedule.sort((a, b) => a.weekday - b.weekday)).toEqual([
      { weekday: 1, open: false, start: '08:00', end: '19:00' },
      { weekday: 2, open: true, start: '13:00', end: '17:00' },
    ]);
    const on = (d: string) => slots({ service_id: ids.svc, date: d, staff_id: ids.s1 }).then((r) => r.body.data.slots as { start: string }[]);
    expect((await on('2026-11-02'))[0]?.start).toBe('08:00');
    expect(await on('2026-11-03')).toEqual([]);
    const wed = await on('2026-11-04');
    expect([wed[0]?.start, wed.at(-1)?.start]).toEqual(['13:00', '16:00']);
  });

  it('if_version lệch → STALE_VERSION không ghi; khớp → version +1; giờ 29:00 / thứ trùng / ngày không có thật → 422', async () => {
    const v = (await settings()).staff.find((s) => s.id === ids.s2)!.version!;
    expect(err(await act('staff.update', { staff_id: ids.s2, if_version: v + 3, patch: { role: 'X' } }))).toMatch(/^409 STALE_VERSION/);
    expect(ok(await act('staff.update', { staff_id: ids.s2, if_version: v, patch: { role: 'KTV tóc' } })).result.version).toBe(v + 1);
    const hv = (await settings()).version!;
    expect(err(await act('business_hours.update', { days: DAYS, if_version: hv + 1 }))).toMatch(/^409 STALE_VERSION/);
    expect(ok(await act('business_hours.update', { days: DAYS, if_version: hv })).result.version).toBe(hv + 1);
    expect(err(await act('staff.update', { staff_id: ids.s2, patch: { schedule: [{ weekday: 0, open: true, start: '29:00', end: '30:00' }] } }))).toMatch(/^422 VALIDATION_FAILED/);
    expect(err(await act('staff.update', { staff_id: ids.s2, patch: { schedule: [DAYS[0]!, DAYS[0]!] } }))).toMatch(/^422 VALIDATION_FAILED .*duplicate_day/);
    expect((await slots({ service_id: ids.svc, date: '2026-02-30' })).status).toBe(422);
    expect(err(await act('appointment.create', { contact_name: 'X', phone: '0909699999', service_id: ids.svc, staff_id: ids.s2, date: '2026-02-30', start: '09:00' }))).toMatch(/^422/);
  });

  it('exclude_id: lịch người khác (cs không sửa được) / id lạ → 404 đồng nhất; chủ → bỏ được chính lịch', async () => {
    const a = (await book(ids.s2, '2026-11-02', '10:00')).result.appointment_id as string;
    const q = { service_id: ids.svc, date: '2026-11-02', staff_id: ids.s2 };
    expect((await slots({ ...q, exclude_id: a }, cs)).status).toBe(404);
    expect((await slots({ ...q, exclude_id: uuidv7() })).status).toBe(404);
    const starts = (r: { body: any }) => (r.body.data.slots as { start: string }[]).map((s) => s.start); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(starts(await slots(q))).not.toContain('10:00');
    expect(starts(await slots({ ...q, exclude_id: a }))).toContain('10:00');
    expect(err(await act('appointment.find_slots', { ...q, exclude_id: a }, cs))).toMatch(/^404/);
  });

  it('lịch có sẵn chiếm tới block_end đã lưu: tăng đệm mặc định không làm lịch cũ chiếm thêm', async () => {
    await book(ids.s2, '2026-11-02', '14:00');
    ok(await act('business_hours.update', { days: DAYS, default_buffer_min: 60 }));
    try {
      // Lịch 14:00–15:00 đã lưu block_end 15:10. Ứng viên 15:30 (đệm mới 60 → chiếm tới 17:30) không đụng [14:00, 15:10).
      const r = await slots({ service_id: ids.svc, date: '2026-11-02', staff_id: ids.s2 });
      expect((r.body.data.slots as { start: string }[]).map((s) => s.start)).toContain('15:30');
    } finally {
      ok(await act('business_hours.update', { days: DAYS, default_buffer_min: 10 }));
    }
  });

  it('ngừng nhân sự: lịch đang làm bắt đầu từ trước vẫn chặn; tạo lịch song song với ngừng không lọt lịch trên nhân sự đã ngừng', async () => {
    const tmp = ok(await act('staff.create', { name: 'KTV. Tạm' })).result.staff_id as string;
    const a = (await book(tmp, '2026-11-02', '09:00')).result.appointment_id as string;
    const db = await tenant();
    await db.appointment.update({ where: { id: a }, data: { status: 'in_progress', startAt: new Date('2026-10-29T02:00:00Z'), endAt: new Date('2026-10-29T03:00:00Z'), blockEndAt: new Date('2026-10-29T03:10:00Z'), holdExpiresAt: null } });
    expect(err(await act('staff.deactivate', { staff_id: tmp }))).toMatch(/^409 INVALID_STATE .*has_upcoming/);
    await db.appointment.update({ where: { id: a }, data: { status: 'done' } });
    const [c, d] = await Promise.all([
      act('appointment.create', { contact_name: 'Đua', phone: '0909688888', service_id: ids.svc, staff_id: tmp, date: '2026-11-02', start: '11:00' }),
      act('staff.deactivate', { staff_id: tmp }),
    ]);
    const live = await db.appointment.count({ where: { staffId: tmp, status: { in: ['pending', 'confirmed'] }, deletedAt: null } });
    const active = (await db.staff.findUniqueOrThrow({ where: { id: tmp } })).active;
    // Một trong hai thắng: tạo trước → ngừng bị chặn (còn lịch); ngừng trước → tạo 404 (nhân sự không hoạt động). Không có cả hai.
    expect([c.status === 200, d.status === 200]).not.toEqual([true, true]);
    if (active) expect([c.status, live]).toEqual([200, 1]);
    else expect([err(c).slice(0, 3), live]).toEqual(['404', 0]);
  });

  it('hoàn tác: tạo → cancelled có lý do (không xoá); huỷ rồi lịch đổi (ABA qua sửa trực tiếp version) → hoàn tác huỷ 409', async () => {
    const c = await book(ids.s1, '2026-11-02', '16:00');
    ok(await undo(c.action_log_id));
    const db = await tenant();
    expect(await db.appointment.findUniqueOrThrow({ where: { id: c.result.appointment_id } })).toMatchObject({ status: 'cancelled', cancelReason: 'undo_create', deletedAt: null });
    const x = (await book(ids.s1, '2026-11-02', '17:00')).result.appointment_id as string;
    const k = ok(await act('appointment.cancel', { appointment_id: x, reason: 'Khách bận' }));
    await db.appointment.update({ where: { id: x }, data: { version: { increment: 1 } } });
    expect((await undo(k.action_log_id)).status).toBe(409);
  });
});

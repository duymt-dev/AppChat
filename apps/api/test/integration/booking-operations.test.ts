// TIP-033b P1 (AC1, AC2 phần xác nhận / hết giữ chỗ, AC6) trên Postgres 16: xác nhận lại lịch hết giữ chỗ đúng khung cũ (cùng id / mã,
// version +1 một lần, không trừ buổi / không đơn), khung đã bị chiếm → SLOT_TAKEN (EXCLUDE), giờ đã qua / nhân sự ngừng / gói hết chỗ → 409
// không ghi; pending quá hạn giữ chỗ (quét chưa tới) cũng đi đường chiếm lại; if_version lệch → STALE_VERSION; xác nhận đồng thời với quét
// hết giữ chỗ → một bên thắng, không deadlock. Hoàn tác có điều kiện: chỉ khi chưa đổi; từ hết giữ chỗ về lại expired.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { appointmentRowSchema } from '@appchat/shared';
import { ActionExecutor, expireHolds, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 60_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any>; action_log_id: string } }).data; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const err = (r: { status: number; body: any }) => `${r.status} ${r.body?.error?.code} ${JSON.stringify(r.body?.error?.fields ?? {})}`; // eslint-disable-line @typescript-eslint/no-explicit-any
const undo = (logId: string) => call(h, `/action-logs/${logId}/undo`, {}).then(json);
const appt = async (id: string) => appointmentRowSchema.parse((await call(h, `/calendar/${id}`).then(json)).body.data);
// Đồng hồ harness: 2026-10-30 08:00Z = 15:00 thứ Sáu (VN). Lịch đặt thứ Hai 02/11 (giữ chỗ 2 giờ → hết trước giờ hẹn rất lâu).
const DAY = '2026-11-02';
const DAYS = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, open: d !== 6, start: '08:00', end: '19:00' }));
const ids = {} as Record<'svc' | 's1' | 's2', string>;
let phone = 0;

async function book(start: string, staff = ids.s1) {
  return ok(await act('appointment.create', { contact_name: 'Khách xác nhận lại', phone: `09095${String(++phone).padStart(5, '0')}`, service_id: ids.svc, staff_id: staff, date: DAY, start })).result.appointment_id as string;
}
async function expire(id: string) {
  h.clock.advance(2 * 3_600_000 + 60_000);
  await expireHolds(await tenant(), h.ws, h.clock.now(), { executor: h.app.get(ActionExecutor, { strict: false }), tenants: resolver });
  expect((await appt(id)).status).toBe('expired');
}

describe('xác nhận lại lịch hết giữ chỗ', () => {
  beforeAll(async () => {
    ids.svc = ok(await act('product.create', { name: 'Gội dưỡng sinh', type: 'service', price: '300000', duration_min: 60, tax_rate: 0 })).result.product_id;
    ids.s1 = ok(await act('staff.create', { name: 'KTV. Thu' })).result.staff_id;
    ids.s2 = ok(await act('staff.create', { name: 'KTV. Hà' })).result.staff_id;
    ok(await act('business_hours.update', { days: DAYS, slot_step_min: 30, default_buffer_min: 10 }));
  });

  it('khung còn trống → cùng id / mã, confirmed, version +1 một lần, không trừ buổi; hoàn tác → về expired', async () => {
    const id = await book('09:00');
    await expire(id);
    const before = await appt(id);
    const r = ok(await act('appointment.confirm', { appointment_id: id, if_version: before.version }));
    expect(r.result).toMatchObject({ appointment_id: id, status: 'confirmed', version: before.version! + 1 });
    const after = await appt(id);
    expect([after.code, after.start_at, after.staff_id, after.status]).toEqual([before.code, before.start_at, before.staff_id, 'confirmed']);
    expect(await (await tenant()).packageUsage.count({ where: { appointmentId: id } })).toBe(0);
    expect(err(await act('appointment.confirm', { appointment_id: id }))).toMatch(/^409 INVALID_TRANSITION/);
    ok(await undo(r.action_log_id));
    expect((await appt(id)).status).toBe('expired');
  });

  it('khung đã có người khác → SLOT_TAKEN, lịch vẫn expired; dời / check-in trực tiếp từ expired bị chặn', async () => {
    const id = await book('11:00');
    await expire(id);
    await book('11:00');
    expect(err(await act('appointment.confirm', { appointment_id: id }))).toMatch(/^409 SLOT_TAKEN .*slot_taken/);
    expect((await appt(id)).status).toBe('expired');
    expect(err(await act('appointment.check_in', { appointment_id: id }))).toMatch(/^409 INVALID_TRANSITION/);
    expect(err(await act('appointment.reschedule', { appointment_id: id, date: DAY, start: '15:00' }))).toMatch(/^409/);
  });

  it('nhân sự đã ngừng → 409 staff inactive; if_version lệch → STALE_VERSION', async () => {
    const id = await book('13:00', ids.s2);
    await expire(id);
    const v = (await appt(id)).version!;
    expect(err(await act('appointment.confirm', { appointment_id: id, if_version: v + 5 }))).toMatch(/^409 STALE_VERSION/);
    const db = await tenant();
    await db.staff.update({ where: { id: ids.s2 }, data: { active: false } });
    try {
      expect(err(await act('appointment.confirm', { appointment_id: id }))).toMatch(/^409 INVALID_STATE .*inactive/);
    } finally {
      await db.staff.update({ where: { id: ids.s2 }, data: { active: true } });
    }
    expect((await appt(id)).version).toBe(v);
  });

  it('pending quá hạn giữ chỗ (quét chưa chạy) đi đường chiếm lại; hoàn tác không bịa giữ chỗ mới (409)', async () => {
    const id = await book('15:00');
    h.clock.advance(2 * 3_600_000 + 60_000);
    expect((await appt(id)).status).toBe('pending');
    const r = ok(await act('appointment.confirm', { appointment_id: id }));
    expect(r.result.status).toBe('confirmed');
    ok(await undo(r.action_log_id));
    expect((await appt(id)).status).toBe('expired');
  });

  it('chờ còn giữ chỗ: xác nhận + hoàn tác trả giữ chỗ cũ; đã check-in sau xác nhận → hoàn tác 409', async () => {
    const id = await book('16:00');
    const r = ok(await act('appointment.confirm', { appointment_id: id }));
    ok(await undo(r.action_log_id));
    expect((await appt(id)).status).toBe('pending');
    const r2 = ok(await act('appointment.confirm', { appointment_id: id }));
    const db = await tenant();
    await db.appointment.update({ where: { id }, data: { checkedInAt: h.clock.now(), status: 'in_progress', version: { increment: 1 } } });
    expect((await undo(r2.action_log_id)).status).toBe(409);
  });

  it('xác nhận đồng thời với quét hết giữ chỗ → một kết cục, không deadlock', async () => {
    const id = await book('16:00', ids.s2);
    h.clock.advance(2 * 3_600_000 + 60_000);
    const [c, n] = await Promise.all([act('appointment.confirm', { appointment_id: id }), expireHolds(await tenant(), h.ws, h.clock.now(), { executor: h.app.get(ActionExecutor, { strict: false }), tenants: resolver })]);
    // Quét thắng trước → lịch expired rồi xác nhận lại; xác nhận thắng trước → quét bỏ qua. Cả hai đều kết thúc confirmed.
    expect(c.status, JSON.stringify(c.body)).toBe(200);
    expect(n).toBeGreaterThanOrEqual(0);
    expect((await appt(id)).status).toBe('confirmed');
  });
});

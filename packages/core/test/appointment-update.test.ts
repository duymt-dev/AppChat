// TIP-023b SPEC C: kế hoạch sửa lịch hẹn (`planEdit`, dùng chung preview + execute) — ghi chú / tuỳ biến không tính dời lịch; đổi giờ /
// nhân sự = dời (+ kiểm slot, giữ chỗ mới khi đang chờ); đổi dịch vụ tính lại giờ kết thúc + liệu trình; if_version lệch / lịch đã đóng → 409.
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import type { TenantTx } from '../src/kernel/actions/action-context';
import { planEdit } from '../src/booking/services/appointment-edit';
import type { AppointmentRecord } from '../src/booking/booking-access';

const TZ = 'Asia/Ho_Chi_Minh';
const NOW = new Date('2026-10-30T02:00:00Z');
const SVC = '7c1e2b8a-0000-4000-8000-0000000000a1';
const SVC2 = '7c1e2b8a-0000-4000-8000-0000000000a2';
const ST = '7c1e2b8a-0000-4000-8000-0000000000b1';
const ST2 = '7c1e2b8a-0000-4000-8000-0000000000b2';
const PKG = '7c1e2b8a-0000-4000-8000-0000000000c1';

const appt = (o: Partial<AppointmentRecord> = {}): AppointmentRecord =>
  ({
    id: '7c1e2b8a-0000-4000-8000-0000000000d1',
    code: 'LH-1001',
    contactId: '7c1e2b8a-0000-4000-8000-0000000000e1',
    serviceId: SVC,
    staffId: ST,
    startAt: new Date('2026-10-31T02:00:00Z'), // 09:00 giờ VN
    endAt: new Date('2026-10-31T03:00:00Z'),
    blockEndAt: new Date('2026-10-31T03:10:00Z'),
    status: 'pending',
    holdExpiresAt: new Date('2026-10-30T04:00:00Z'),
    rescheduleCount: 0,
    packageId: null,
    note: 'cũ',
    reminderMin: 60,
    remindersSent: [],
    custom: { room: 'A' },
    version: 3,
    ...o,
  }) as AppointmentRecord;

/** Tx giả: dịch vụ (60 / 90 phút), hai nhân sự làm mọi dịch vụ, mở 08–19 giờ, chưa có lịch khác; một trường tuỳ biến `room`. */
function fakeTx(): TenantTx {
  const product = (id: string) => ({ id, name: id === SVC ? 'Massage' : 'Gội đầu', type: 'service', price: 0n, taxRate: 0, durationMin: id === SVC ? 60 : 90, status: 'active', deletedAt: null });
  return {
    product: { findUnique: async ({ where }: { where: { id: string } }) => product(where.id) },
    bookingSetting: { findUnique: async () => ({ defaultBufferMin: 10, slotStepMin: 30, noShowDeducts: false }) },
    staff: {
      findFirst: async ({ where }: { where: { id: string } }) => ({ name: where.id === ST ? 'Mai' : 'Hoa' }),
      findMany: async () => [ST, ST2].map((id) => ({ id, skills: [], schedules: [] })),
    },
    businessHours: { findUnique: async () => ({ open: true, startTime: '08:00', endTime: '19:00' }) },
    appointment: { findMany: async () => [], groupBy: async () => [] },
    customerPackage: { findMany: async () => [], findUnique: async () => ({ productId: 'p', status: 'active' }) },
    productComponent: { findMany: async ({ where }: { where: { productId: string } }) => (where.productId === 'p' ? [{ childId: SVC }] : []) },
    customFieldDef: { findMany: async () => [{ key: 'room', label: 'Phòng', type: 'text', options: [], required: false, ai: true, sys: false, roles: {}, condition: null, visibleIn: {} }] },
    $queryRaw: async () => [],
  } as unknown as TenantTx;
}

const plan = (a: AppointmentRecord, p: Parameters<typeof planEdit>[2], ifVersion?: number, tx = fakeTx()) => planEdit(tx, a, p, { timeZone: TZ, now: NOW, role: 'owner', ifVersion });

describe('planEdit — appointment.update', () => {
  it('chỉ ghi chú / tuỳ biến → không dời, giữ giờ + giữ chỗ, gộp custom', async () => {
    const a = appt();
    const r = await plan(a, { note: '  phòng riêng ', custom: { room: null } });
    expect(r.moved).toBe(false);
    expect([r.startAt, r.endAt, r.blockEndAt, r.hold(NOW)]).toEqual([a.startAt, a.endAt, a.blockEndAt, a.holdExpiresAt]);
    expect(r.note).toBe('phòng riêng');
    expect(r.custom).toEqual({});
  });

  it('đổi giờ → dời: giờ kết thúc theo thời lượng, đệm, giữ chỗ mới khi đang chờ', async () => {
    const r = await plan(appt(), { start: '14:00' });
    expect(r.moved).toBe(true);
    expect(r.startAt.toISOString()).toBe('2026-10-31T07:00:00.000Z');
    expect(r.endAt.toISOString()).toBe('2026-10-31T08:00:00.000Z');
    expect(r.blockEndAt.toISOString()).toBe('2026-10-31T08:10:00.000Z');
    expect(r.hold(NOW)?.getTime()).toBeGreaterThan(NOW.getTime());
  });

  it('đổi nhân sự = dời; đổi dịch vụ giữ giờ nhưng tính lại kết thúc (90 phút), không tính dời', async () => {
    expect((await plan(appt(), { staff_id: ST2 })).moved).toBe(true);
    const r = await plan(appt(), { service_id: SVC2 });
    expect(r.moved).toBe(false);
    expect(r.endAt.toISOString()).toBe('2026-10-31T03:30:00.000Z');
  });

  it('đổi dịch vụ: liệu trình không còn hợp → bỏ gắn; cùng dịch vụ → giữ', async () => {
    expect((await plan(appt({ packageId: PKG }), { service_id: SVC2 })).packageId).toBeNull();
    expect((await plan(appt({ packageId: PKG }), { note: 'x' })).packageId).toBe(PKG);
  });

  it('if_version lệch → STALE_VERSION · lịch đã xong → INVALID_STATE · tuỳ biến lạ → 422', async () => {
    await expect(plan(appt(), { note: 'x' }, 2)).rejects.toMatchObject({ code: 'STALE_VERSION', httpStatus: 409 });
    await expect(plan(appt({ status: 'done' }), { note: 'x' })).rejects.toMatchObject({ code: 'INVALID_STATE' });
    await expect(plan(appt(), { custom: { nope: 'x' } })).rejects.toMatchObject({ httpStatus: 422, fields: { 'custom.nope': 'unknown' } });
  });

  it('đang phục vụ (in_progress): sửa ghi chú được, dời giờ thì không', async () => {
    expect((await plan(appt({ status: 'in_progress' }), { note: 'x' })).moved).toBe(false);
    await expect(plan(appt({ status: 'in_progress' }), { start: '14:00' })).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });
});

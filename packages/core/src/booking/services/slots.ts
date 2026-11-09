// Tìm khung giờ trống (Blueprint §3.4 appointment.find_slots, REQ-G01 / G03): giờ mở cửa của thứ đó ∩ ca riêng của nhân sự, nhân sự
// làm được dịch vụ (`skills` rỗng = mọi dịch vụ), trừ lịch còn giữ chỗ (+ thời gian đệm) — cùng hàm `findSlots` với mock FE. Hôm nay
// thì không trả slot đã qua. EXCLUDE ở DB vẫn là chốt cuối khi hai người đặt cùng lúc (SLOT_TAKEN). TIP-033b: ca riêng tri-state (không có
// dòng = theo giờ mở cửa, `open = false` = nghỉ), lịch có sẵn chiếm tới `block_end_at` đã lưu (không cộng đệm hiện hành), ngày theo lịch
// (nửa đêm hôm sau, không cộng cứng 24 giờ), giờ tường lặp / không tồn tại khi đổi giờ bị bỏ khỏi ứng viên. `excludeId` chỉ nhận id đã
// được `operations/slot-policy.ts` xác minh quyền sửa — không truyền thẳng từ HTTP / tool.
import { AppError, dayBounds, findSlots, resolveLocal, toHm, utcToWall, weekdayOf, type Slot } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { UUID } from '../booking-access';

export interface ServiceInfo {
  id: string;
  name: string;
  price: bigint;
  taxRate: number;
  duration: number;
  buffer: number;
}

export async function bookingSetting(tx: TenantTx) {
  return (await tx.bookingSetting.findUnique({ where: { id: 1 } })) ?? { defaultBufferMin: 10, slotStepMin: 30, noShowDeducts: false, version: 1 };
}

/** Dịch vụ đặt lịch được: sản phẩm loại service còn bán, có thời lượng. */
export async function serviceOf(tx: TenantTx, id: string): Promise<ServiceInfo> {
  const p = UUID.test(id) ? await tx.product.findUnique({ where: { id }, select: { id: true, name: true, type: true, price: true, taxRate: true, durationMin: true, status: true, deletedAt: true } }) : null;
  if (!p || p.deletedAt || p.type !== 'service' || p.status !== 'active') throw new AppError('NOT_FOUND', 404, { service_id: 'not_found' });
  if (!p.durationMin) throw new AppError('VALIDATION_FAILED', 422, { service_id: 'no_duration' });
  const s = await bookingSetting(tx);
  return { id: p.id, name: p.name, price: p.price, taxRate: p.taxRate, duration: p.durationMin, buffer: s.defaultBufferMin };
}

export interface StaffRow {
  id: string;
  skills: string[];
  schedules: { weekday: number; open: boolean; startTime: string; endTime: string }[];
}

export const SCHEDULE_SELECT = { weekday: true, open: true, startTime: true, endTime: true } as const;

/** Khung làm việc của nhân sự trong ngày (ca riêng ∩ giờ mở cửa); null = nghỉ (cửa hàng nghỉ hoặc nhân sự nghỉ tường minh). */
export function windowOf(st: StaffRow, open: { open: boolean; startTime: string; endTime: string } | null, weekday: number) {
  if (!open?.open) return null;
  const own = st.schedules.find((x) => x.weekday === weekday);
  if (own && !own.open) return null;
  const start = own && own.startTime > open.startTime ? own.startTime : open.startTime;
  const end = own && own.endTime < open.endTime ? own.endTime : open.endTime;
  return start < end ? { start, end } : null;
}

export async function slotsFor(
  tx: TenantTx,
  q: { serviceId: string; date: string; staffId?: string; excludeId?: string; timeZone: string; now: Date },
): Promise<Slot[]> {
  const svc = await serviceOf(tx, q.serviceId);
  const setting = await bookingSetting(tx);
  const weekday = weekdayOf(q.date);
  const open = await tx.businessHours.findUnique({ where: { weekday } });
  const staff = await tx.staff.findMany({
    where: { active: true, ...(q.staffId ? { id: UUID.test(q.staffId) ? q.staffId : '00000000-0000-0000-0000-000000000000' } : {}) },
    select: { id: true, skills: true, schedules: { select: SCHEDULE_SELECT } },
    orderBy: [{ sort: 'asc' }, { name: 'asc' }],
  });
  const able = staff.filter((s) => !s.skills.length || s.skills.includes(svc.id));
  if (!able.length) return [];
  const { start: dayStart, end: dayEnd } = dayBounds(q.date, q.timeZone);
  const rows = await tx.appointment.findMany({
    where: {
      staffId: { in: able.map((s) => s.id) },
      // Lịch kéo qua ngày trước còn chiếm đầu ngày (đệm tính tới block_end_at).
      status: { in: ['pending', 'confirmed', 'in_progress'] },
      deletedAt: null,
      startAt: { lt: dayEnd },
      blockEndAt: { gt: dayStart },
      ...(q.excludeId && UUID.test(q.excludeId) ? { id: { not: q.excludeId } } : {}),
    },
    select: { staffId: true, startAt: true, endAt: true, blockEndAt: true },
  });
  // Phút trong ngày theo giờ tường; qua nửa đêm hôm sau = 1440 (không có khe ma 23:59–24:00).
  const minOf = (d: Date) => {
    if (d <= dayStart) return 0;
    if (d >= dayEnd) return 1440;
    const w = utcToWall(d, q.timeZone).hm;
    return +w.slice(0, 2) * 60 + +w.slice(3, 5);
  };
  const busy = rows.map((r) => ({ staff_id: r.staffId, start: toHm(Math.min(minOf(r.startAt), 1439)), end: toHm(Math.min(minOf(r.endAt), 1439)), block_end_min: minOf(r.blockEndAt) }));
  const today = utcToWall(q.now, q.timeZone);
  if (q.date < today.date) return [];
  const notBefore = q.date === today.date ? today.hm : undefined;
  // Mỗi nhân sự có khung riêng → tính từng người rồi gộp theo giờ bắt đầu (giữ thứ tự nhân sự).
  const merged = new Map<string, Slot>();
  for (const st of able) {
    const w = windowOf(st, open, weekday);
    if (!w) continue;
    for (const s of findSlots({ open: w, duration: svc.duration, buffer: svc.buffer, staff_ids: [st.id], busy, step: setting.slotStepMin, ...(notBefore ? { not_before: notBefore } : {}) })) {
      const cur = merged.get(s.start);
      if (cur) cur.staff_ids.push(st.id);
      else merged.set(s.start, { ...s, staff_ids: [st.id] });
    }
  }
  // Giờ tường không tồn tại / lặp hai lần (đổi giờ) không phải ứng viên — ghi trực tiếp sẽ bị 422 (assertLocalTime).
  return [...merged.values()].filter((s) => resolveLocal(q.date, s.start, q.timeZone).ok).sort((a, b) => a.start.localeCompare(b.start));
}

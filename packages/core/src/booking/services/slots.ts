// Tìm khung giờ trống (Blueprint §3.4 appointment.find_slots, REQ-G01 / G03): giờ mở cửa của thứ đó ∩ ca riêng của nhân sự, nhân sự
// làm được dịch vụ (`skills` rỗng = mọi dịch vụ), trừ lịch còn giữ chỗ (+ thời gian đệm) — cùng hàm `findSlots` với mock FE. Hôm nay
// thì không trả slot đã qua. EXCLUDE ở DB vẫn là chốt cuối khi hai người đặt cùng lúc (CONFLICT).
import { AppError, findSlots, utcToWall, wallToUtc, weekdayOf, type Slot } from '@appchat/shared';
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
  return (await tx.bookingSetting.findUnique({ where: { id: 1 } })) ?? { defaultBufferMin: 10, slotStepMin: 30, noShowDeducts: false };
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
  schedules: { weekday: number; startTime: string; endTime: string }[];
}

/** Khung làm việc của nhân sự trong ngày (ca riêng ∩ giờ mở cửa); null = nghỉ. */
export function windowOf(st: StaffRow, open: { open: boolean; startTime: string; endTime: string } | null, weekday: number) {
  if (!open?.open) return null;
  const own = st.schedules.find((x) => x.weekday === weekday);
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
    select: { id: true, skills: true, schedules: { select: { weekday: true, startTime: true, endTime: true } } },
    orderBy: [{ sort: 'asc' }, { name: 'asc' }],
  });
  const able = staff.filter((s) => !s.skills.length || s.skills.includes(svc.id));
  if (!able.length) return [];
  const dayStart = wallToUtc(q.date, '00:00', q.timeZone);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
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
    select: { staffId: true, startAt: true, endAt: true },
  });
  // findSlots cộng đệm cho cả hai phía (s, e + đệm) ∩ (bắt đầu, kết thúc + đệm) — đúng điều kiện EXCLUDE trên [start_at, block_end_at).
  const hmOf = (d: Date) => (d <= dayStart ? '00:00' : d >= dayEnd ? '23:59' : utcToWall(d, q.timeZone).hm);
  const busy = rows.map((r) => ({ staff_id: r.staffId, start: hmOf(r.startAt), end: hmOf(r.endAt) }));
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
  return [...merged.values()].sort((a, b) => a.start.localeCompare(b.start));
}

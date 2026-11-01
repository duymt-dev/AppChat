// Ghi lịch hẹn dùng chung handler + job (Blueprint §2.2 / §3.4 booking, COMMERCE §6 / 8b, REQ-G02 / G03): chiếm khung giờ (EXCLUDE —
// trùng → CONFLICT 409 không lộ lịch khác), giữ chỗ 2 giờ cho lịch chờ, gắn liệu trình phù hợp, chuyển trạng thái theo
// APPOINTMENT_FLOW, trừ / trả buổi liệu trình (`package_usage` một dòng mỗi lịch — idempotent), event + timeline.
import { uuidv7 } from '../../kernel/ids';
import { AppError, assertTransition, APPOINTMENT_FLOW, utcToWall, type AppointmentStatusKey } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { writeTimeline, type TimelineInput } from '../../crm/public';
import type { AppointmentRecord } from '../booking-access';

export type Ev = { topic: string; payload: Record<string, unknown> };
export type Actor = { type: string; id: string | null };

/** Lỗi ràng buộc EXCLUDE (23P01) → CONFLICT; lỗi khác ném lại. */
export function conflictOf(e: unknown): never {
  const msg = String((e as { message?: string })?.message ?? '');
  const code = (e as { code?: string; meta?: { code?: string } })?.meta?.code ?? (e as { code?: string })?.code;
  if (code === '23P01' || msg.includes('appointment_no_overlap')) throw new AppError('CONFLICT', 409, { start: 'slot_taken' });
  throw e;
}

/** Ghi chiếm khung giờ: lỗi EXCLUDE → CONFLICT (executor huỷ cả transaction — không ghi dở). */
export async function guarded<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    return conflictOf(e);
  }
}

export const eventOf = (a: AppointmentRecord, timeZone: string) => ({
  appointment_id: a.id,
  contact_id: a.contactId,
  service_id: a.serviceId,
  staff_id: a.staffId,
  code: a.code,
  start_at: utcToWall(a.startAt, timeZone).iso,
  status: a.status,
  package_id: a.packageId,
});

/** Liệu trình còn dùng được cho dịch vụ: gói của khách còn buổi, còn hạn, sản phẩm gói có dịch vụ này là thành phần (hoặc không ghi thành phần). */
export async function matchingPackage(tx: TenantTx, contactId: string, serviceId: string, at: Date): Promise<{ id: string } | null> {
  const pkgs = await tx.customerPackage.findMany({
    where: { contactId, status: 'active', OR: [{ expiresAt: null }, { expiresAt: { gt: at } }] },
    orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, productId: true, totalSessions: true, usedSessions: true },
  });
  if (!pkgs.length) return null;
  const parts = await tx.productComponent.findMany({ where: { productId: { in: pkgs.map((p) => p.productId) } }, select: { productId: true, childId: true } });
  // Buổi đã đặt nhưng chưa dùng (lịch đang mở gắn gói) cũng giữ chỗ trong gói.
  const booked = await tx.appointment.groupBy({ by: ['packageId'], where: { packageId: { in: pkgs.map((p) => p.id) }, status: { in: ['pending', 'confirmed', 'in_progress'] }, deletedAt: null }, _count: { _all: true } });
  const held = new Map(booked.map((b) => [b.packageId, b._count._all]));
  for (const p of pkgs) {
    const svc = parts.filter((x) => x.productId === p.productId).map((x) => x.childId);
    if (svc.length && !svc.includes(serviceId)) continue;
    if (p.usedSessions + (held.get(p.id) ?? 0) < p.totalSessions) return { id: p.id };
  }
  return null;
}

/** Chuyển trạng thái theo bảng (sai → INVALID_TRANSITION 409). */
export function step(a: Pick<AppointmentRecord, 'status'>, action: string): AppointmentStatusKey {
  return assertTransition(APPOINTMENT_FLOW, a.status, action);
}

/** Trừ 1 buổi liệu trình khi hoàn thành (hoặc no-show có cấu hình trừ). Gói hết buổi → exhausted. Trả { used, total } hoặc null. */
export async function useSession(tx: TenantTx, a: AppointmentRecord, now: Date): Promise<{ id: string; name: string; used: number; total: number } | null> {
  if (!a.packageId) return null;
  await tx.$queryRaw`SELECT 1 FROM customer_package WHERE id = ${a.packageId}::uuid FOR UPDATE`;
  const p = await tx.customerPackage.findUnique({ where: { id: a.packageId } });
  if (!p || p.status === 'refunded') return null;
  const prior = await tx.packageUsage.findUnique({ where: { appointmentId: a.id } });
  if (prior && !prior.revertedAt) return { id: p.id, name: p.name, used: p.usedSessions, total: p.totalSessions };
  if (p.usedSessions >= p.totalSessions) throw new AppError('INVALID_STATE', 409, { package_id: 'exhausted' });
  const used = p.usedSessions + 1;
  await tx.customerPackage.update({ where: { id: p.id }, data: { usedSessions: used, status: used >= p.totalSessions ? 'exhausted' : p.status, updatedAt: now } });
  if (prior) await tx.packageUsage.update({ where: { id: prior.id }, data: { usedAt: now, revertedAt: null } });
  else await tx.packageUsage.create({ data: { id: uuidv7(now.getTime()), packageId: p.id, appointmentId: a.id, usedAt: now } });
  return { id: p.id, name: p.name, used, total: p.totalSessions };
}

/** Trả buổi (hoàn tác hoàn thành / no-show). */
export async function revertSession(tx: TenantTx, a: Pick<AppointmentRecord, 'id' | 'packageId'>, now: Date): Promise<void> {
  const u = await tx.packageUsage.findUnique({ where: { appointmentId: a.id } });
  if (!u || u.revertedAt) return;
  await tx.$queryRaw`SELECT 1 FROM customer_package WHERE id = ${u.packageId}::uuid FOR UPDATE`;
  const p = await tx.customerPackage.findUniqueOrThrow({ where: { id: u.packageId } });
  const used = Math.max(0, p.usedSessions - 1);
  const expired = p.expiresAt && p.expiresAt <= now;
  await tx.customerPackage.update({ where: { id: p.id }, data: { usedSessions: used, status: p.status === 'refunded' ? 'refunded' : expired ? 'expired' : 'active', updatedAt: now } });
  await tx.packageUsage.update({ where: { id: u.id }, data: { revertedAt: now } });
}

export const timeline = (tx: TenantTx, a: AppointmentRecord, key: TimelineInput['key'], params: Record<string, string | number>, actor: Actor, at: Date) =>
  writeTimeline(tx, { contactId: a.contactId, type: 'appointment', key, params: { code: a.code, ...params }, actor, ref: { type: 'appointment', id: a.id }, at });

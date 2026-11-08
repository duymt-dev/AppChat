// Xác nhận / xác nhận lại lịch (TIP-033b §2.3–§2.5, D52d): khoá chuỗi khách → gói → nhân sự → lịch (locks.ts), kiểm quyền GHI hiện tại,
// if_version (lệch → STALE_VERSION). Lịch chờ còn giữ chỗ → xác nhận như cũ (giữ chỗ hiện có). Lịch hết giữ chỗ (expired, hoặc pending đã
// quá hạn giữ chỗ dù quét chưa tới) → CHIẾM LẠI đúng khung cũ: cùng id / mã / khách / dịch vụ / nhân sự / start / end / block_end, giờ
// hẹn chưa qua, nhân sự còn hoạt động + làm được dịch vụ, khoảng gốc nằm trong khung làm việc hiện tại; gói (nếu có) còn hiệu lực tại giờ
// hẹn + còn chỗ (không tính chính lịch này); không bỏ gói / đổi gói / gắn gói mới. EXCLUDE là chốt cuối (23P01 → SLOT_TAKEN). Không trừ
// buổi, không tạo đơn / điểm, không gửi lại nhắc đã gửi.
import { AppError, APPOINTMENT_HOLDING, assertVersion, utcToWall, weekdayOf, type AppointmentStatusKey } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { lockAppointmentChain } from './locks';
import { visibleAppointment, type AppointmentRecord } from '../booking-access';
import { guarded, step } from '../services/appointment-write';
import { windowOf } from '../services/slots';

export type PriorState = 'pending' | 'expired';
export interface ConfirmResult {
  before: AppointmentRecord;
  row: AppointmentRecord;
  /** Trạng thái hiệu lực trước khi xác nhận (pending quá hạn giữ chỗ tính là expired). */
  prior: PriorState;
}

const reject = (field: string, reason: string): never => {
  throw new AppError('INVALID_STATE', 409, { [field]: reason });
};

/** Hiệu lực: pending đã quá hạn giữ chỗ coi như đã nhả chỗ (quét có thể trễ). */
export const effectiveOf = (a: Pick<AppointmentRecord, 'status' | 'holdExpiresAt'>, now: Date): AppointmentStatusKey =>
  a.status === 'pending' && a.holdExpiresAt && a.holdExpiresAt <= now ? 'expired' : a.status;

/** Kiểm lại đúng khung cũ còn hợp lệ cho việc chiếm lại (không đổi giờ / thời lượng / đệm). */
export async function assertReacquirable(tx: TenantTx, a: AppointmentRecord, now: Date, timeZone: string): Promise<void> {
  if (a.startAt <= now) reject('start', 'in_past');
  const st = await tx.staff.findUnique({ where: { id: a.staffId }, select: { id: true, active: true, skills: true, schedules: { select: { weekday: true, startTime: true, endTime: true } } } });
  if (!st?.active) reject('staff_id', 'inactive');
  if (st!.skills.length && !st!.skills.includes(a.serviceId)) reject('staff_id', 'not_skilled');
  const svc = await tx.product.findUnique({ where: { id: a.serviceId }, select: { status: true, deletedAt: true, type: true } });
  if (!svc || svc.deletedAt || svc.status !== 'active' || svc.type !== 'service') reject('service_id', 'unavailable');
  const s = utcToWall(a.startAt, timeZone);
  const e = utcToWall(a.endAt, timeZone);
  const weekday = weekdayOf(s.date);
  const w = windowOf(st!, await tx.businessHours.findUnique({ where: { weekday } }), weekday);
  if (!w || e.date !== s.date || s.hm < w.start || e.hm > w.end) reject('start', 'outside_hours');
  if (a.packageId) {
    const p = await tx.customerPackage.findUnique({ where: { id: a.packageId }, select: { status: true, expiresAt: true, totalSessions: true, usedSessions: true } });
    if (!p || p.status !== 'active' || (p.expiresAt && p.expiresAt <= a.startAt)) reject('package_id', 'unavailable');
    const held = await tx.appointment.count({ where: { packageId: a.packageId, status: { in: [...APPOINTMENT_HOLDING] }, deletedAt: null, id: { not: a.id } } });
    if (p!.usedSessions + held >= p!.totalSessions) reject('package_id', 'exhausted');
  }
}

/** Xác nhận lịch theo luật trên (handler + Trợ lý + agent dùng chung qua action). */
export async function confirmAppointment(ctx: ActionContext, tx: TenantTx, id: string, ifVersion: number | undefined, now: Date, timeZone: string): Promise<ConfirmResult> {
  const refs = await lockAppointmentChain(tx, id);
  if (!refs) throw new AppError('NOT_FOUND', 404, { appointment_id: 'not_found' });
  const a = await visibleAppointment(tx, ctx.authz, id, 'write');
  assertVersion(a.version, ifVersion);
  const live = await tx.contact.findUnique({ where: { id: a.contactId }, select: { deletedAt: true } });
  if (!live || live.deletedAt) reject('contact_id', 'deleted');
  const prior = effectiveOf(a, now);
  if (prior !== 'pending' && prior !== 'expired') step(a, 'appointment.confirm');
  if (prior === 'expired') {
    step({ status: 'expired' }, 'appointment.confirm');
    await assertReacquirable(tx, a, now, timeZone);
  }
  const row = await guarded(() => tx.appointment.update({ where: { id: a.id }, data: { status: 'confirmed', holdExpiresAt: null, confirmedAt: now, version: { increment: 1 }, updatedAt: now } }));
  return { before: a, row, prior: prior as PriorState };
}

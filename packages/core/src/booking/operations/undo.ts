// Hoàn tác xác nhận có điều kiện (TIP-033b §2.6): ràng buộc phiên bản SAU-ghi + quyền hiện tại. Lịch vẫn đúng như lúc xác nhận (cùng
// version, vẫn `confirmed`, chưa check-in / đổi giờ / gộp) mới hoàn tác. Từ hết giữ chỗ → về `expired` (nhả đúng chỗ của chính nó);
// từ chờ → về `pending` với giữ chỗ cũ CHỈ KHI giữ chỗ đó còn ở tương lai (không bịa thêm 2 giờ). Không gọi trả buổi (xác nhận không trừ
// buổi). Log cũ thiếu dữ liệu ràng buộc → 409. Cùng nguyên tắc cho hoàn tác check-in / hoàn thành / không đến / huỷ (undoFlow) và tạo
// lịch (undoCreate → cancelled, không xoá).
import { AppError, APPOINTMENT_HOLDING, type AppointmentStatusKey } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import type { ActionLogRow } from '../../kernel/actions/handler';
import { lockAppointmentChain } from './locks';
import { visibleAppointment, type AppointmentRecord } from '../booking-access';
import { guarded } from '../services/appointment-write';

export interface ConfirmSnap {
  id: string;
  prior?: 'pending' | 'expired';
  hold: string | null;
  after_version?: number;
  status?: string;
}

const changed = (): never => {
  throw new AppError('CONFLICT', 409, { appointment_id: 'changed' });
};

export async function undoConfirm(ctx: ActionContext, log: ActionLogRow, tx: TenantTx, now: Date): Promise<void> {
  const b = log.before as ConfirmSnap;
  if (!b?.id || b.after_version === undefined || !b.prior) changed();
  if (!(await lockAppointmentChain(tx, b.id))) changed();
  const a = await visibleAppointment(tx, ctx.authz, b.id, 'write');
  if (a.status !== 'confirmed' || a.version !== b.after_version || a.checkedInAt) changed();
  if (b.prior === 'expired') {
    await tx.appointment.update({ where: { id: a.id }, data: { status: 'expired', holdExpiresAt: null, confirmedAt: null, version: { increment: 1 }, updatedAt: now } });
    return;
  }
  const hold = b.hold ? new Date(b.hold) : null;
  if (!hold || hold <= now) changed();
  await guarded(() => tx.appointment.update({ where: { id: a.id }, data: { status: 'pending', holdExpiresAt: hold, confirmedAt: null, version: { increment: 1 }, updatedAt: now } }));
}

/** Ảnh chụp chuyển trạng thái (check-in / hoàn thành / không đến / huỷ) + version SAU-ghi. */
export interface FlowSnap {
  id: string;
  status: AppointmentStatusKey;
  hold: string | null;
  confirmed_at: string | null;
  checked_in_at: string | null;
  done_at: string | null;
  after_version?: number;
}

const iso = (s: string | null) => (s ? new Date(s) : null);
const HOLDING: readonly string[] = ['pending', 'confirmed', 'in_progress'];

/** Về lại trạng thái giữ chỗ: lịch chờ cần giữ chỗ cũ còn hạn; gói (nếu có) còn chỗ không tính chính lịch; EXCLUDE kiểm khung (guarded). */
async function assertRehold(tx: TenantTx, a: { id: string; packageId: string | null }, to: AppointmentStatusKey, hold: Date | null, now: Date) {
  if (!HOLDING.includes(to)) return;
  if (to === 'pending' && (!hold || hold <= now)) changed();
  if (!a.packageId) return;
  const p = await tx.customerPackage.findUnique({ where: { id: a.packageId }, select: { totalSessions: true, usedSessions: true, status: true } });
  const held = await tx.appointment.count({ where: { packageId: a.packageId, status: { in: [...APPOINTMENT_HOLDING] }, deletedAt: null, id: { not: a.id } } });
  if (!p || p.status === 'refunded' || p.usedSessions + held >= p.totalSessions) changed();
}

/**
 * Hoàn tác chuyển trạng thái (§2.6): lịch vẫn ở trạng thái action đưa tới + đúng version sau-ghi + quyền ghi hiện tại; trả buổi CỦA CHÍNH
 * lịch này nếu action đã trừ; về lại trạng thái giữ chỗ thì kiểm lại giữ chỗ / gói / khung. Log cũ không có version → 409.
 */
export async function undoFlow(ctx: ActionContext, log: ActionLogRow, tx: TenantTx, expect: AppointmentStatusKey, now: Date, revert: (a: AppointmentRecord) => Promise<void>): Promise<void> {
  const b = log.before as FlowSnap;
  if (!b?.id || b.after_version === undefined) changed();
  if (!(await lockAppointmentChain(tx, b.id))) changed();
  const a = await visibleAppointment(tx, ctx.authz, b.id, 'write');
  if (a.status !== expect || a.version !== b.after_version) changed();
  await assertRehold(tx, a, b.status, iso(b.hold), now);
  await revert(a);
  await guarded(() =>
    tx.appointment.update({ where: { id: b.id }, data: { status: b.status, cancelReason: null, holdExpiresAt: iso(b.hold), confirmedAt: iso(b.confirmed_at), checkedInAt: iso(b.checked_in_at), doneAt: iso(b.done_at), version: { increment: 1 }, updatedAt: now } }),
  );
}

/**
 * Hoàn tác tạo lịch (§2.6, validation-defaults §3): giữ bản ghi, chuyển `cancelled` với lý do kiểm toán — không xoá cứng / không ẩn bằng
 * deleted_at. Chỉ khi lịch chưa đổi (version lúc tạo), còn chờ / đã xác nhận, chưa có đơn / buổi đã dùng.
 */
export async function undoCreate(ctx: ActionContext, log: ActionLogRow, tx: TenantTx, now: Date): Promise<void> {
  const b = log.after as { id: string; version?: number };
  if (!b?.id) changed();
  if (!(await lockAppointmentChain(tx, b.id))) return;
  const a = await visibleAppointment(tx, ctx.authz, b.id, 'write');
  if (a.status === 'cancelled' && a.cancelReason === UNDO_CREATE) return;
  if ((a.status !== 'pending' && a.status !== 'confirmed') || a.version !== (b.version ?? 1) || a.orderId) changed();
  if (await tx.packageUsage.count({ where: { appointmentId: a.id, revertedAt: null } })) changed();
  await tx.appointment.update({ where: { id: a.id }, data: { status: 'cancelled', cancelReason: UNDO_CREATE, holdExpiresAt: null, version: { increment: 1 }, updatedAt: now } });
}

/** Lý do kiểm toán của lịch bị hoàn tác tạo (FE dịch qua khoá i18n). */
export const UNDO_CREATE = 'undo_create';

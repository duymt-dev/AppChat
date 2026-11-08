// Hoàn tác xác nhận có điều kiện (TIP-033b §2.6): ràng buộc phiên bản SAU-ghi + quyền hiện tại. Lịch vẫn đúng như lúc xác nhận (cùng
// version, vẫn `confirmed`, chưa check-in / đổi giờ / gộp) mới hoàn tác. Từ hết giữ chỗ → về `expired` (nhả đúng chỗ của chính nó);
// từ chờ → về `pending` với giữ chỗ cũ CHỈ KHI giữ chỗ đó còn ở tương lai (không bịa thêm 2 giờ). Không gọi trả buổi (xác nhận không trừ
// buổi). Log cũ thiếu dữ liệu ràng buộc → 409.
import { AppError } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import type { ActionLogRow } from '../../kernel/actions/handler';
import { lockAppointmentChain } from './locks';
import { visibleAppointment } from '../booking-access';
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

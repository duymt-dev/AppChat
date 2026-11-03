// Preview vòng đời lịch hẹn (TIP-023b R2.8): xác nhận / check-in / hoàn thành / không đến / huỷ → mã + khách + dịch vụ + giờ, trạng thái
// trước / sau; hoàn thành thuộc liệu trình → số buổi trước / sau (hết buổi → 409 như execute), ngoài liệu trình → cảnh báo gợi ý tạo đơn;
// không đến trong ân hạn → 409, có trừ buổi khi bật `no_show_deducts`; huỷ nêu lý do. Chỉ đọc — không trừ buổi.
import type { ActionInput, ActionPreview, appointmentCancel, appointmentCheckIn, appointmentComplete, appointmentConfirm, appointmentMarkNoShow } from '@appchat/actions';
import { AppError, noShowAllowed, utcToWall } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { line, preview, updated, type Change } from '../../../kernel/actions/preview-kit';
import { visibleAppointment, type AppointmentRecord } from '../../booking-access';
import { step } from '../../services/appointment-write';
import { bookingSetting } from '../../services/slots';

async function flowOf(ctx: ActionContext, tx: TenantTx, id: string, action: string, timeZone: string) {
  const a = await visibleAppointment(tx, ctx.authz, id);
  const to = step(a, action);
  const [c, s] = await Promise.all([tx.contact.findUnique({ where: { id: a.contactId }, select: { name: true } }), tx.product.findUnique({ where: { id: a.serviceId }, select: { name: true } })]);
  const w = utcToWall(a.startAt, timeZone);
  return { a, to, name: line(a.code, c?.name, s?.name, `${w.date} ${w.hm}`) };
}

/** Buổi liệu trình sẽ trừ (như `useSession`): đã trừ cho lịch này → không đổi; hết buổi → 409. */
async function session(tx: TenantTx, a: AppointmentRecord): Promise<Change[]> {
  if (!a.packageId) return [];
  const p = await tx.customerPackage.findUnique({ where: { id: a.packageId } });
  if (!p || p.status === 'refunded') return [];
  const prior = await tx.packageUsage.findUnique({ where: { appointmentId: a.id } });
  if (prior && !prior.revertedAt) return [];
  if (p.usedSessions >= p.totalSessions) throw new AppError('INVALID_STATE', 409, { package_id: 'exhausted' });
  return [{ entity: 'customer_package', id: p.id, before: { name: p.name, used: p.usedSessions }, after: { used: p.usedSessions + 1, total: p.totalSessions } }];
}

const simple = (action: string) => async (ctx: ActionContext, tx: TenantTx, i: { appointment_id: string }, timeZone: string): Promise<ActionPreview> => {
  const { a, to, name } = await flowOf(ctx, tx, i.appointment_id, action, timeZone);
  return preview('write', name, { changes: updated('appointment', a.id, { status: a.status }, { status: to }) });
};

export const confirmPreview: (ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof appointmentConfirm>, tz: string) => Promise<ActionPreview> = simple('appointment.confirm');
export const checkInPreview: (ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof appointmentCheckIn>, tz: string) => Promise<ActionPreview> = simple('appointment.check_in');

export async function completePreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof appointmentComplete>, timeZone: string): Promise<ActionPreview> {
  const { a, to, name } = await flowOf(ctx, tx, i.appointment_id, 'appointment.complete', timeZone);
  const pkg = await session(tx, a);
  return preview('write', name, { changes: [...updated('appointment', a.id, { status: a.status }, { status: to }), ...pkg], ...(!a.packageId && !a.orderId ? { warnings: ['suggest_order'] } : {}) });
}

export async function noShowPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof appointmentMarkNoShow>, now: Date, timeZone: string): Promise<ActionPreview> {
  const { a, to, name } = await flowOf(ctx, tx, i.appointment_id, 'appointment.mark_no_show', timeZone);
  if (!noShowAllowed(a.startAt, now)) throw new AppError('INVALID_STATE', 409, { start_at: 'grace_period' });
  const pkg = (await bookingSetting(tx)).noShowDeducts ? await session(tx, a) : [];
  return preview('write', name, { changes: [...updated('appointment', a.id, { status: a.status }, { status: to }), ...pkg] });
}

export async function cancelPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof appointmentCancel>, timeZone: string): Promise<ActionPreview> {
  const { a, to, name } = await flowOf(ctx, tx, i.appointment_id, 'appointment.cancel', timeZone);
  return preview('write', name, { changes: updated('appointment', a.id, { status: a.status, reason: null }, { status: to, reason: i.reason.trim() }) });
}

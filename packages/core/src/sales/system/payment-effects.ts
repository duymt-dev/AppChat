// Hiệu ứng từng đề nghị thanh toán / liệu trình của `invoice.system_transition` / `package.system_transition` (TIP-003c §2, §4.3) — thân
// transaction cũ của payment-system.ts / packages.ts dời vào đây. Vị từ hiện tại thắng; nhắc tạo outgoing bền (writeOutgoing) trong
// transaction, enqueue sau commit — "đã nhận" ≠ "đã gửi". Người gửi là SYSTEM_SENDER, không mượn Owner.
import { INVOICE_REMINDERS, daysLeft } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import type { CrmMembers } from '../../crm/public';
import type { Outgoing } from '../../inbox/public';
import type { QuoteDeps } from '../quotes/services/quote-deps';
import { invoiceText, postInvoice, type InvoiceChannel } from '../payments/services/invoice-send';
import { grantPackages } from '../payments/services/packages';
import { packageReminderIn } from '../payments/services/package-reminders';
import { localDay, statusAfter } from '../payments/services/payment-write';
import { applied, none, type Effect } from './quote-effects';

const SYSTEM = { type: 'system', id: null };

async function lockInvoice(tx: TenantTx, id: string) {
  await tx.$queryRaw`SELECT 1 FROM invoice WHERE id = ${id}::uuid FOR UPDATE`;
  return tx.invoice.findUnique({ where: { id } });
}

export async function markInvoiceOverdue(tx: TenantTx, id: string, now: Date, timeZone: string): Promise<Effect> {
  const i = await lockInvoice(tx, id);
  if (!i || (i.status !== 'sent' && i.status !== 'partial')) return none(id, 'state');
  const to = statusAfter(i, i.paidAmount, localDay(now, timeZone));
  if (to !== 'overdue') return none(id, 'not_due');
  await tx.invoice.update({ where: { id }, data: { status: to, version: { increment: 1 }, updatedAt: now } });
  return applied(id, [{ topic: 'invoice.overdue', payload: { invoice_id: i.id, contact_id: i.contactId, order_id: i.orderId, code: i.code, amount: String(i.amount - i.paidAmount), status: to } }]);
}

/** Mốc nhắc hiện tại (gần nhất đã tới) theo hạn — null khi chưa tới mốc nào. Mốc lỡ (máy dừng) vẫn nhắc mốc đó, không dồn mốc cũ. */
export const reminderStep = (dueDate: Date, now: Date, timeZone: string) => {
  const offset = -daysLeft(now, dueDate, timeZone);
  return [...INVOICE_REMINDERS].reverse().find((r) => r.offset <= offset) ?? null;
};

export interface RemindDeps {
  quotes: QuoteDeps;
  members: CrmMembers;
}

export async function remindInvoice(ctx: ActionContext, tx: TenantTx, d: RemindDeps, id: string, milestone: string, now: Date, timeZone: string): Promise<Effect & { outgoing?: Outgoing }> {
  const i = await lockInvoice(tx, id);
  if (!i || !i.conversationId || !['sent', 'partial', 'overdue'].includes(i.status)) return none(id, 'not_eligible');
  const step = reminderStep(i.dueDate, now, timeZone);
  // Hạn đã đổi (mốc hiện tại khác mốc của trigger) → trigger cũ không còn hiệu lực; lần quét sau sinh trigger đúng mốc mới.
  if (!step || step.key !== milestone) return none(id, 'milestone_changed');
  const sent = i.remindersSent as { key: string }[];
  if (sent.some((s) => s.key === step.key)) return none(id, 'already_reminded');
  const channel = (i.sentChannel ?? 'zalo_personal') as InvoiceChannel;
  const text = await invoiceText(tx, d.quotes, ctx.workspaceId, i, 'remind', now);
  const r = await postInvoice(ctx, tx, d.quotes, d.members, i, { channel, text, now, system: true });
  await tx.invoice.update({ where: { id }, data: { remindersSent: [...sent, { key: step.key, at: now.toISOString(), channel, by: null }] as object[], updatedAt: now } });
  return { ...applied(id, r.events, r.out.messageId), out: { disposition: 'handed_off', operation_id: id, effect_ref: r.out.messageId }, outgoing: r.out };
}

/** `order.confirmed`: đơn đã thu đủ / đủ cọc → sinh liệu trình (grantPackages 032b — một gói mỗi dòng đơn, ON CONFLICT chốt chặn). */
export async function grantOnConfirm(tx: TenantTx, orderId: string, now: Date): Promise<Effect> {
  await tx.$queryRaw`SELECT 1 FROM "order" WHERE id = ${orderId}::uuid FOR UPDATE`;
  const o = await tx.order.findUnique({ where: { id: orderId } });
  if (!o) return none(orderId, 'not_found');
  const events = await grantPackages(tx, o, SYSTEM, now);
  return events.length ? applied(orderId, events) : none(orderId, 'not_eligible');
}

export async function expirePackage(tx: TenantTx, id: string, now: Date): Promise<Effect> {
  const r = await tx.customerPackage.updateMany({ where: { id, status: 'active', expiresAt: { lt: now } }, data: { status: 'expired', updatedAt: now } });
  if (r.count !== 1) return none(id, 'not_due');
  const p = (await tx.customerPackage.findUnique({ where: { id } }))!;
  return applied(id, [{ topic: 'package.expired', payload: { package_id: id, contact_id: p.contactId } }]);
}

/** `appointment.completed` trừ buổi → còn đúng 1 buổi thì nhắc ngay (biên nhận `package_reminder` unique — một lần mỗi gói). */
export async function remindRemainingPackage(tx: TenantTx, id: string, now: Date, timeZone: string): Promise<Effect> {
  const events = await packageReminderIn(tx, id, 'remaining_1', now, timeZone);
  return events ? applied(id, events) : none(id, 'not_due');
}

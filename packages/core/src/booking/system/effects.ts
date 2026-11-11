// Hiệu ứng từng lịch hẹn của `appointment.system_transition` (TIP-003c §2, §4.3) — thân transaction cũ của booking-system.ts dời vào đây.
// Hết giữ chỗ: cùng chuỗi khoá với xác nhận (khách → gói → nhân sự → lịch — TIP-033b §2.1), vị từ hạn giữ HIỆN TẠI thắng. Nhắc: mốc
// hiện tại theo giờ hẹn hiện tại (dueReminder), outgoing bền + SYSTEM sender — không mượn Owner; không kênh → ghi mốc đã xét, không gửi.
import { APPOINTMENT_FLOW, dueReminder, interpolate, nextState, serverMessages, utcToWall } from '@appchat/shared';
import type { SystemOutput } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import type { OutboxEventInput } from '../../kernel/outbox/outbox';
import type { CrmMembers } from '../../crm/public';
import type { Outgoing } from '../../inbox/public';
import { postToCustomer } from '../../sales/public';
import { lockAppointmentChain } from '../operations/locks';
import { eventOf } from '../services/appointment-write';

const SENDER = { type: 'system' as const, id: null, name: null };

export type Effect = { out: SystemOutput; events: OutboxEventInput[]; outgoing?: Outgoing };
const none = (id: string, reason: string): Effect => ({ out: { disposition: 'no_effect', operation_id: id, reason_code: reason }, events: [] });

export async function expireHold(tx: TenantTx, id: string, now: Date, timeZone: string): Promise<Effect> {
  if (!(await lockAppointmentChain(tx, id))) return none(id, 'not_found');
  const a = await tx.appointment.findUnique({ where: { id } });
  if (!a || !a.holdExpiresAt || a.holdExpiresAt > now || nextState(APPOINTMENT_FLOW, a.status, 'appointment.expire') !== 'expired') return none(id, 'not_due');
  const row = await tx.appointment.update({ where: { id }, data: { status: 'expired', holdExpiresAt: null, version: { increment: 1 }, updatedAt: now } });
  return { out: { disposition: 'applied', operation_id: id }, events: [{ topic: 'appointment.expired', payload: eventOf(row, timeZone) }] };
}

/** Hội thoại gửi được của lịch: hội thoại gắn lịch, hoặc hội thoại gần nhất của khách (mọi kênh còn kết nối, không tạm dừng). */
async function conversationFor(tx: TenantTx, a: { conversationId: string | null; contactId: string }) {
  const ok = async (accountId: string) => !!(await tx.channelAccount.findFirst({ where: { id: accountId, status: 'connected', pausedAt: null }, select: { id: true } }));
  if (a.conversationId) {
    const c = await tx.conversation.findUnique({ where: { id: a.conversationId } });
    if (c && !c.archivedAt && (await ok(c.channelAccountId))) return c;
  }
  const convs = await tx.conversation.findMany({ where: { contactId: a.contactId, archivedAt: null }, orderBy: { lastMessageAt: 'desc' }, take: 5 });
  for (const c of convs) if (await ok(c.channelAccountId)) return c;
  return null;
}

export interface RemindPlace {
  business: { legal_name?: string | null };
  locale: string;
  timeZone: string;
}

export async function remindAppointment(ctx: ActionContext, tx: TenantTx, members: CrmMembers, place: RemindPlace, id: string, milestone: string, now: Date): Promise<Effect> {
  await tx.$queryRaw`SELECT 1 FROM appointment WHERE id = ${id}::uuid FOR UPDATE`;
  const a = await tx.appointment.findUnique({ where: { id } });
  if (!a || a.deletedAt || (a.status !== 'pending' && a.status !== 'confirmed')) return none(id, 'not_eligible');
  const sent = a.remindersSent as { key: string; at: string }[];
  const step = dueReminder(a.startAt, now, sent.map((s) => s.key));
  if (!step || step.key !== milestone) return none(id, 'milestone_changed');
  const conv = await conversationFor(tx, a);
  if (!conv) {
    await tx.appointment.update({ where: { id }, data: { remindersSent: [...sent, { key: step.key, at: now.toISOString(), skipped: true }] as object[] } });
    return none(id, 'no_channel');
  }
  const [contact, svc] = await Promise.all([tx.contact.findUnique({ where: { id: a.contactId }, select: { name: true } }), tx.product.findUnique({ where: { id: a.serviceId }, select: { name: true } })]);
  const w = utcToWall(a.startAt, place.timeZone);
  const m = serverMessages(place.locale).booking.remind;
  const text = interpolate(m[step.key], { name: contact?.name ?? '', business: place.business.legal_name ?? '', service: svc?.name ?? '', time: w.hm, date: w.date.split('-').reverse().join('/'), code: a.code });
  const r = await postToCustomer(ctx, tx, members, { conv, created: false, text, now, sender: SENDER });
  await tx.appointment.update({ where: { id }, data: { remindersSent: [...sent, { key: step.key, at: now.toISOString() }] as object[], conversationId: a.conversationId ?? conv.id } });
  return { out: { disposition: 'handed_off', operation_id: id, effect_ref: r.out.messageId }, events: r.events, outgoing: r.out };
}

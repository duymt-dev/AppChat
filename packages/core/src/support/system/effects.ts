// Hiệu ứng từng ticket của `ticket.system_transition` (TIP-003c §2, §4.4) — thân transaction cũ của support-system.ts dời vào đây, khoá
// dòng ticket. Tin khách / phản hồi đọc lại từ tin ĐÃ LƯU dưới guard hiện tại (tin thu hồi / xoá / khách đã quên → no_effect, không chép
// nội dung). Giữ nguyên D52 (tự mở lại 7 ngày), CSAT 1–5, bình luận duy nhất theo (ticket, message), mốc SLA một lần, agent quá hạn TTR →
// giao người. Thời điểm phản hồi đầu = thời điểm tin nguồn (không trôi theo giờ xử lý).
import { SLA_WARN_RATIO, TICKET_REOPEN_DAYS } from '@appchat/shared';
import type { SystemOutput } from '@appchat/actions';
import type { TenantTx } from '../../kernel/actions/action-context';
import { isPrivacyFenced } from '../../kernel/privacy/guard';
import { uuidv7 } from '../../kernel/ids';
import type { TicketRecord } from '../ticket-access';
import { defaultPolicy, escalationOf, resumeDue, type SlaCalendar } from '../services/sla-clock';
import { evOf, logEvent, SYSTEM_ACTOR, type Ev } from '../services/ticket-write';
import { reopenTicket } from '../actions/ticket-flow.handlers';

type Cal = Awaited<ReturnType<SlaCalendar['of']>>;
export type Effect = { out: SystemOutput; events: Ev[] };
const none = (id: string, reason: string): Effect => ({ out: { disposition: 'no_effect', operation_id: id, reason_code: reason }, events: [] });
const applied = (id: string, events: Ev[]): Effect => ({ out: { disposition: 'applied', operation_id: id }, events });

async function lock(tx: TenantTx, id: string): Promise<TicketRecord | null> {
  await tx.$queryRaw`SELECT 1 FROM ticket WHERE id = ${id}::uuid FOR UPDATE`;
  return tx.ticket.findUnique({ where: { id } });
}

/** Tin nguồn còn hợp lệ: cùng hội thoại của ticket, chưa thu hồi / xoá, khách chưa bị "Quên". */
async function sourceMessage(tx: TenantTx, t: TicketRecord, messageId: string) {
  const m = await tx.message.findUnique({ where: { id: messageId }, select: { conversationId: true, body: true, senderName: true, senderType: true, createdAt: true, recalledAt: true, deletedAt: true, purpose: true } });
  if (!m || m.conversationId !== t.conversationId || m.recalledAt || m.deletedAt) return null;
  if (t.contactId && (await isPrivacyFenced(tx, t.contactId))) return null;
  return m;
}

export async function customerMessage(tx: TenantTx, id: string, messageId: string, now: Date, cal: Cal): Promise<Effect> {
  const t = await lock(tx, id);
  if (!t) return none(id, 'not_found');
  const m = await sourceMessage(tx, t, messageId);
  if (!m || m.senderType !== 'contact') return none(id, 'source_unavailable');
  const evs: Ev[] = [];
  // CSAT: ticket đã đóng (đã giải quyết) chưa có điểm mà khách trả lời một số 1–5 → ghi điểm, không mở lại.
  const score = /^\s*([1-5])\s*(?:sao|\*|⭐)?\s*$/i.exec(m.body)?.[1];
  if (t.status === 'closed' && score && t.csat === null && t.closeReason === 'resolved') {
    await tx.ticket.update({ where: { id }, data: { csat: Number(score) } });
  } else if (t.status === 'closed') {
    // D52: khách nhắn trong 7 ngày kể từ lúc đóng → tự mở lại (giữ mã + lịch sử).
    if (!t.closedAt || now.getTime() - t.closedAt.getTime() > TICKET_REOPEN_DAYS * 86_400_000) return none(id, 'closed');
    evs.push(evOf('ticket.reopened', await reopenTicket(tx, t, now, cal, SYSTEM_ACTOR)));
  } else if (t.status === 'waiting') {
    const row = await tx.ticket.update({ where: { id }, data: { status: 'in_progress', pausedSince: null, ...resumeDue(t, now, cal), updatedAt: now } });
    await logEvent(tx, id, 'status', SYSTEM_ACTOR, now, { status: 'in_progress' });
    evs.push(evOf('ticket.updated', row));
  }
  // Unique partial (ticket_id, message_id) — chạy lại không chép trùng.
  if (m.body.trim() && !(await tx.ticketComment.findFirst({ where: { ticketId: id, messageId }, select: { id: true } })))
    await tx.ticketComment.create({ data: { id: uuidv7(now.getTime()), ticketId: id, authorType: 'contact', authorName: m.senderName ?? '', body: m.body, messageId, createdAt: m.createdAt } });
  return applied(id, evs);
}

/** Người / agent trả lời (không phải tin hệ thống, không phải lời chào tự động) → chốt phản hồi đầu theo giờ tin. */
export async function firstResponse(tx: TenantTx, id: string, messageId: string): Promise<Effect> {
  const t = await lock(tx, id);
  if (!t || t.status === 'closed' || t.firstResponseAt) return none(id, 'not_eligible');
  const m = await sourceMessage(tx, t, messageId);
  if (!m || (m.senderType !== 'user' && m.senderType !== 'agent') || m.purpose === 'greeting') return none(id, 'source_unavailable');
  await tx.ticket.update({ where: { id }, data: { firstResponseAt: m.createdAt } });
  return applied(id, []);
}

export async function slaWarning(tx: TenantTx, id: string, now: Date): Promise<Effect> {
  const t = await lock(tx, id);
  if (!t || t.warnedAt || (t.status !== 'open' && t.status !== 'in_progress') || t.ttrDueAt < now) return none(id, 'not_eligible');
  if (escalationOf(await defaultPolicy(tx, now)).warn_80 === false) return none(id, 'policy_off');
  const span = t.ttrDueAt.getTime() - t.ttrStartAt.getTime();
  if (now.getTime() - t.ttrStartAt.getTime() < span * SLA_WARN_RATIO) return none(id, 'not_due');
  const row = await tx.ticket.update({ where: { id }, data: { warnedAt: now } });
  return applied(id, [evOf('ticket.sla_warning', row, { sla: 'ttr' })]);
}

export async function frtBreach(tx: TenantTx, id: string, now: Date): Promise<Effect> {
  const t = await lock(tx, id);
  if (!t || t.frtBreachedAt || t.firstResponseAt || t.status === 'closed' || t.frtDueAt >= now) return none(id, 'not_due');
  if (escalationOf(await defaultPolicy(tx, now)).frt_breach === false) return none(id, 'policy_off');
  const row = await tx.ticket.update({ where: { id }, data: { frtBreachedAt: now, escalations: { increment: 1 }, updatedAt: now } });
  await logEvent(tx, id, 'escalated', SYSTEM_ACTOR, now, { sla: 'frt' });
  return applied(id, [evOf('ticket.sla_breached', row, { sla: 'frt' })]);
}

export async function ttrBreach(tx: TenantTx, id: string, now: Date): Promise<Effect> {
  const t = await lock(tx, id);
  if (!t || t.breachedAt || (t.status !== 'open' && t.status !== 'in_progress') || t.ttrDueAt >= now) return none(id, 'not_due');
  const esc = escalationOf(await defaultPolicy(tx, now));
  if (esc.ttr_breach === false) return none(id, 'policy_off');
  // Agent quá hạn xử lý → giao lại người (Tickets spec "TTR (AI) quá hạn → chuyển người").
  const handoff = esc.ai_low !== false && t.assigneeAgentId ? { assigneeAgentId: null } : {};
  const row = await tx.ticket.update({ where: { id }, data: { breachedAt: now, escalations: { increment: 1 }, ...handoff, updatedAt: now } });
  await logEvent(tx, id, 'escalated', SYSTEM_ACTOR, now, { sla: 'ttr' });
  return applied(id, [evOf('ticket.sla_breached', row, { sla: 'ttr' })]);
}

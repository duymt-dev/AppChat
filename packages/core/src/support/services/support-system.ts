// Việc hệ thống của ticket (Blueprint §2.3 consumer `support`, REQ-H03, D52, state-machine ticket):
// - Quét SLA: còn ≤ 20% hạn TTR (warn_80) → `ticket.sla_warning` (người phụ trách); quá hạn FRT / TTR → `ticket.sla_breached` (leo thang
//   Chủ sở hữu + quản lý) — mỗi mốc một lần (`warned_at` / `frt_breached_at` / `breached_at`), theo quy tắc leo thang bật / tắt của
//   chính sách; agent quá hạn TTR → giao lại người (ai_low / handoff).
// - `message.received` của hội thoại có ticket: ticket còn mở → chép tin khách vào bình luận, đang chờ → Đang xử lý (SLA chạy tiếp);
//   ticket đã đóng trong 7 ngày → tự mở lại.
// - `message.sent` (người / agent) vào hội thoại có ticket chưa phản hồi → chốt phản hồi đầu (dừng FRT).
import { TICKET_REOPEN_DAYS, SLA_WARN_RATIO } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import { uuidv7 } from '../../kernel/ids';
import { writeOutbox } from '../../kernel/outbox/outbox';
import type { TicketRecord } from '../ticket-access';
import { defaultPolicy, escalationOf, resumeDue, type SlaCalendar } from './sla-clock';
import { evOf, logEvent, SYSTEM_ACTOR, type Ev } from './ticket-write';
import { reopenTicket } from '../actions/ticket-flow.handlers';

const BATCH = 200;
type Cal = Awaited<ReturnType<SlaCalendar['of']>>;

async function locked(db: TenantDb, id: string, fn: (tx: Parameters<Parameters<TenantDb['$transaction']>[0]>[0], t: TicketRecord) => Promise<Ev[]>, ws: string, now: Date): Promise<boolean> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM ticket WHERE id = ${id}::uuid FOR UPDATE`;
    const t = await tx.ticket.findUnique({ where: { id } });
    if (!t) return false;
    const evs = await fn(tx, t);
    if (evs.length) await writeOutbox(tx, ws, evs, now);
    return evs.length > 0;
  });
}

/** Quét SLA một workspace. Trả số mốc đã phát. */
export async function sweepSla(db: TenantDb, ws: string, now: Date): Promise<{ warned: number; breached: number }> {
  const policy = await db.$transaction((tx) => defaultPolicy(tx, now));
  const esc = escalationOf(policy);
  const r = { warned: 0, breached: 0 };
  // Quá hạn TTR (đang chạy — không tính ticket đang chờ).
  if (esc.ttr_breach !== false) {
    const due = await db.ticket.findMany({ where: { status: { in: ['open', 'in_progress'] }, ttrDueAt: { lt: now }, breachedAt: null }, select: { id: true }, take: BATCH });
    for (const { id } of due)
      if (
        await locked(db, id, async (tx, t) => {
          if (t.breachedAt || t.status === 'closed' || t.status === 'waiting' || t.ttrDueAt >= now) return [];
          // Agent quá hạn xử lý → giao lại người (Tickets spec "TTR (AI) quá hạn → chuyển người").
          const handoff = esc.ai_low !== false && t.assigneeAgentId ? { assigneeAgentId: null } : {};
          const row = await tx.ticket.update({ where: { id }, data: { breachedAt: now, escalations: { increment: 1 }, ...handoff, updatedAt: now } });
          await logEvent(tx, id, 'escalated', SYSTEM_ACTOR, now, { sla: 'ttr' });
          return [evOf('ticket.sla_breached', row, { sla: 'ttr' })];
        }, ws, now)
      )
        r.breached++;
  }
  // Quá hạn phản hồi đầu.
  if (esc.frt_breach !== false) {
    const due = await db.ticket.findMany({ where: { status: { not: 'closed' }, firstResponseAt: null, frtDueAt: { lt: now }, frtBreachedAt: null }, select: { id: true }, take: BATCH });
    for (const { id } of due)
      if (
        await locked(db, id, async (tx, t) => {
          if (t.frtBreachedAt || t.firstResponseAt || t.status === 'closed' || t.frtDueAt >= now) return [];
          const row = await tx.ticket.update({ where: { id }, data: { frtBreachedAt: now, escalations: { increment: 1 }, updatedAt: now } });
          await logEvent(tx, id, 'escalated', SYSTEM_ACTOR, now, { sla: 'frt' });
          return [evOf('ticket.sla_breached', row, { sla: 'frt' })];
        }, ws, now)
      )
        r.breached++;
  }
  // Sắp đến hạn (đã trôi ≥ 80% hạn TTR).
  if (esc.warn_80 !== false) {
    const open = await db.ticket.findMany({ where: { status: { in: ['open', 'in_progress'] }, ttrDueAt: { gte: now }, warnedAt: null }, select: { id: true, ttrStartAt: true, ttrDueAt: true }, orderBy: { ttrDueAt: 'asc' }, take: BATCH });
    for (const x of open) {
      const span = x.ttrDueAt.getTime() - x.ttrStartAt.getTime();
      if (now.getTime() - x.ttrStartAt.getTime() < span * SLA_WARN_RATIO) continue;
      if (
        await locked(db, x.id, async (tx, t) => {
          if (t.warnedAt || t.status === 'closed' || t.status === 'waiting') return [];
          const row = await tx.ticket.update({ where: { id: x.id }, data: { warnedAt: now } });
          return [evOf('ticket.sla_warning', row, { sla: 'ttr' })];
        }, ws, now)
      )
        r.warned++;
    }
  }
  return r;
}

/** Tin khách vào hội thoại có ticket. */
export async function onCustomerMessage(db: TenantDb, ws: string, p: { conversation_id: string; message_id: string }, now: Date, cal: Cal): Promise<void> {
  const m = await db.message.findUnique({ where: { id: p.message_id }, select: { body: true, senderName: true, createdAt: true } });
  if (!m) return;
  const t0 = await db.ticket.findFirst({ where: { conversationId: p.conversation_id }, orderBy: { createdAt: 'desc' }, select: { id: true } });
  if (!t0) return;
  await locked(db, t0.id, async (tx, t) => {
    const evs: Ev[] = [];
    // CSAT: ticket đã đóng (đã giải quyết) chưa có điểm mà khách trả lời một số 1–5 → ghi điểm, không mở lại.
    const score = /^\s*([1-5])\s*(?:sao|\*|⭐)?\s*$/i.exec(m.body)?.[1];
    if (t.status === 'closed' && score && t.csat === null && t.closeReason === 'resolved') {
      await tx.ticket.update({ where: { id: t.id }, data: { csat: Number(score) } });
    } else if (t.status === 'closed') {
      // D52: khách nhắn trong 7 ngày kể từ lúc đóng → tự mở lại (giữ mã + lịch sử).
      if (!t.closedAt || now.getTime() - t.closedAt.getTime() > TICKET_REOPEN_DAYS * 86_400_000) return [];
      const row = await reopenTicket(tx, t, now, cal, SYSTEM_ACTOR);
      evs.push(evOf('ticket.reopened', row));
    } else if (t.status === 'waiting') {
      const due = resumeDue(t, now, cal);
      const row = await tx.ticket.update({ where: { id: t.id }, data: { status: 'in_progress', pausedSince: null, ...due, version: { increment: 1 }, updatedAt: now } });
      await logEvent(tx, t.id, 'status', SYSTEM_ACTOR, now, { status: 'in_progress' });
      evs.push(evOf('ticket.updated', row));
    }
    if (m.body.trim()) {
      // Unique partial (ticket_id, message_id) — consumer chạy lại không chép trùng.
      if (!(await tx.ticketComment.findFirst({ where: { ticketId: t.id, messageId: p.message_id }, select: { id: true } })))
        await tx.ticketComment.create({ data: { id: uuidv7(now.getTime()), ticketId: t.id, authorType: 'contact', authorName: m.senderName ?? '', body: m.body, messageId: p.message_id, createdAt: m.createdAt } });
    }
    return evs;
  }, ws, now);
}

/** Người / agent trả lời trong hội thoại có ticket chưa phản hồi → chốt phản hồi đầu. */
export async function onAgentReply(db: TenantDb, p: { conversation_id: string; sender_type: string }, now: Date): Promise<void> {
  if (p.sender_type === 'system') return;
  await db.ticket.updateMany({ where: { conversationId: p.conversation_id, status: { not: 'closed' }, firstResponseAt: null }, data: { firstResponseAt: now } });
}

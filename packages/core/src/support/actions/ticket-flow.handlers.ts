// ticket.set_status · close · reopen (state-machine ticket, REQ-H01 / H03 / H04): chuyển theo TICKET_FLOW (sai → INVALID_TRANSITION).
// "Đang chờ" dừng đồng hồ TTR người; rời chờ → hạn cộng thời gian dừng (phút làm việc). Đóng: lý do bắt buộc, chốt `sla_result`
// (quá hạn TTR lúc đóng → breached), gửi khảo sát CSAT qua hội thoại gốc (nếu có) + timeline. Mở lại: về Đang mở, giữ mã + lịch sử,
// +1 lần mở lại, hạn TTR mới từ lúc mở lại. Hoàn tác 24 giờ cho đổi trạng thái / đóng.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, interpolate, serverMessages, setStatusKey } from '@appchat/shared';
import type { ActionInput, ticketClose, ticketReopen, ticketSetStatus } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { ChannelSendQueue } from '../../channels/public';
import { CrmMembers, actorUserId } from '../../crm/public';
import { enqueueOutgoing, writeOutgoing, type Outgoing } from '../../inbox/public';
import { lockTicket, type TicketRecord } from '../ticket-access';
import { SlaCalendar, defaultPolicy, resumeDue, targetsFor } from '../services/sla-clock';
import { actorOf, evOf, logEvent, step, timeline, type Ev } from '../services/ticket-write';
import * as pv from './previews/ticket-flow.handlers.preview';

type Out = { ticket_id: string; status: string };
type Snap = { id: string; status: string; paused_since: string | null; ttr_due_at: string; paused_total_sec: number; sla_result: string | null; close_reason: string | null; closed_at: string | null };
const snap = (t: TicketRecord): Snap => ({
  id: t.id,
  status: t.status,
  paused_since: t.pausedSince?.toISOString() ?? null,
  ttr_due_at: t.ttrDueAt.toISOString(),
  paused_total_sec: t.pausedTotalSec,
  sla_result: t.slaResult,
  close_reason: t.closeReason,
  closed_at: t.closedAt?.toISOString() ?? null,
});
const d = (s: string | null) => (s ? new Date(s) : null);

/** Hoàn tác chuyển trạng thái: chỉ khi ticket vẫn ở trạng thái action đã đưa tới. */
async function restore(tx: TenantTx, log: ActionLogRow, expect: string, now: Date) {
  const b = log.before as Snap;
  await tx.$queryRaw`SELECT 1 FROM ticket WHERE id = ${b.id}::uuid FOR UPDATE`;
  const t = await tx.ticket.findUnique({ where: { id: b.id } });
  if (!t || t.status !== expect) throw new AppError('CONFLICT', 409, { ticket_id: 'changed' });
  await tx.ticket.update({
    where: { id: b.id },
    data: { status: b.status as TicketRecord['status'], pausedSince: d(b.paused_since), ttrDueAt: new Date(b.ttr_due_at), pausedTotalSec: b.paused_total_sec, slaResult: b.sla_result, closeReason: b.close_reason, closedAt: d(b.closed_at), version: { increment: 1 }, updatedAt: now },
  });
}

@Injectable()
@ActionHandler('ticket.set_status')
export class TicketSetStatusHandler implements Handler<ActionInput<typeof ticketSetStatus>, Out> {
  constructor(
    @Inject(SlaCalendar) private readonly cal: SlaCalendar,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof ticketSetStatus>, tx: TenantTx) {
    return pv.setStatusPreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof ticketSetStatus>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const now = this.clock.now();
    const t = await lockTicket(tx, ctx.authz, input.ticket_id);
    const to = step(t, setStatusKey(input.status));
    const resumed = t.status === 'waiting' ? resumeDue(t, now, await this.cal.of(ctx.workspaceId)) : {};
    const row = await tx.ticket.update({ where: { id: t.id }, data: { status: to, pausedSince: to === 'waiting' ? now : null, ...resumed, version: { increment: 1 }, updatedAt: now } });
    await logEvent(tx, t.id, 'status', await actorOf(ctx, tx, this.members), now, { status: to });
    return { result: { ticket_id: t.id, status: to }, before: snap(t), events: [evOf('ticket.updated', row)] };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    await restore(tx, log, (log.result as Out).status, this.clock.now());
  }
}

@Injectable()
@ActionHandler('ticket.close')
export class TicketCloseHandler implements Handler<ActionInput<typeof ticketClose>, Out & { sla_result: 'met' | 'breached' }> {
  constructor(
    @Inject(SlaCalendar) private readonly cal: SlaCalendar,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(ChannelSendQueue) private readonly queue: ChannelSendQueue | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof ticketClose>, tx: TenantTx) {
    return pv.closePreview(tx, ctx.authz, input, this.clock.now());
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof ticketClose>, tx: TenantTx): Promise<HandlerOutcome<Out & { sla_result: 'met' | 'breached' }>> {
    const now = this.clock.now();
    const t = await lockTicket(tx, ctx.authz, input.ticket_id);
    const to = step(t, 'ticket.close');
    const cal = await this.cal.of(ctx.workspaceId);
    const due = t.status === 'waiting' ? resumeDue(t, now, cal) : { ttrDueAt: t.ttrDueAt, pausedTotalSec: t.pausedTotalSec };
    const sla_result = now > due.ttrDueAt ? 'breached' : 'met';
    const actor = await actorOf(ctx, tx, this.members);
    const row = await tx.ticket.update({
      where: { id: t.id },
      data: { status: to, ...due, pausedSince: null, slaResult: sla_result, closeReason: input.reason, closeNote: input.note?.trim() || null, closedAt: now, version: { increment: 1 }, updatedAt: now },
    });
    await logEvent(tx, t.id, 'closed', actor, now, { reason: input.reason, ...(input.note?.trim() ? { note: input.note.trim() } : {}) });
    const m = serverMessages(cal.locale).support;
    await timeline(tx, row, 'ticket_closed', { reason: m.reason[input.reason] }, actor, now);
    const events: Ev[] = [evOf('ticket.closed', row, { sla_result, by_user_id: actorUserId(ctx) })];
    // Khảo sát CSAT qua hội thoại gốc (Tickets spec) — chỉ khi đã giải quyết và kênh còn gửi được; lỗi kênh không chặn đóng.
    let out: Outgoing | null = null;
    if (input.reason === 'resolved' && row.conversationId) {
      const conv = await tx.conversation.findUnique({ where: { id: row.conversationId } });
      const name = row.contactId ? ((await tx.contact.findUnique({ where: { id: row.contactId }, select: { name: true } }))?.name ?? '') : '';
      if (conv && !conv.archivedAt)
        out = await writeOutgoing(tx, { conv, kind: 'text', body: interpolate(m.csat, { name, code: row.code }), sender: { type: 'system', id: null, name: null }, now }).catch(() => null);
    }
    return {
      result: { ticket_id: t.id, status: to, sla_result },
      before: snap(t),
      events,
      ...(out ? { afterCommit: () => enqueueOutgoing(this.queue, ctx.workspaceId, out!) } : {}),
    };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    await restore(tx, log, 'closed', this.clock.now());
  }
}

@Injectable()
@ActionHandler('ticket.reopen')
export class TicketReopenHandler implements Handler<ActionInput<typeof ticketReopen>, Out> {
  constructor(
    @Inject(SlaCalendar) private readonly cal: SlaCalendar,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof ticketReopen>, tx: TenantTx) {
    return pv.reopenPreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof ticketReopen>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const now = this.clock.now();
    const t = await lockTicket(tx, ctx.authz, input.ticket_id);
    const row = await reopenTicket(tx, t, now, await this.cal.of(ctx.workspaceId), await actorOf(ctx, tx, this.members));
    return { result: { ticket_id: t.id, status: row.status }, events: [evOf('ticket.reopened', row)] };
  }
}

/** Mở lại (người bấm hoặc khách nhắn trong 7 ngày): hạn TTR / FRT mới từ lúc mở lại theo chính sách mặc định hiện hành. */
export async function reopenTicket(tx: TenantTx, t: TicketRecord, now: Date, cal: Awaited<ReturnType<SlaCalendar['of']>>, actor: Parameters<typeof logEvent>[3]) {
  const to = step(t, 'ticket.reopen');
  const sla = targetsFor(await defaultPolicy(tx, now), !!t.assigneeAgentId, now, cal);
  const row = await tx.ticket.update({
    where: { id: t.id },
    data: { status: to, ...sla, firstResponseAt: null, slaResult: null, closeReason: null, closeNote: null, closedAt: null, pausedSince: null, warnedAt: null, frtBreachedAt: null, breachedAt: null, reopenedCount: { increment: 1 }, version: { increment: 1 }, updatedAt: now },
  });
  await logEvent(tx, t.id, 'reopened', actor, now);
  await timeline(tx, row, 'ticket_reopened', {}, actor, now);
  return row;
}

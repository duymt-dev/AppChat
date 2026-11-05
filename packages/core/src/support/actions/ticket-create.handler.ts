// ticket.create (Blueprint §3.4 support, REQ-H01 / H02 / H03): mã `TKT-{n}`, ưu tiên mặc định TB, chính sách SLA mặc định (chụp mục tiêu
// + hạn lúc tạo — đổi chính sách chỉ áp việc mới), người phụ trách = người HOẶC agent (mặc định người tạo). Tạo từ tin nhắn
// (`source_message_id`) / agent trực kênh → gắn hội thoại + khách. Chống trùng: khách có ticket còn mở cùng danh mục trong 24 giờ →
// hỏi gộp (409 CONFLICT `duplicate_of`), `merge` thêm nội dung vào ticket cũ, `create` vẫn tạo mới. Hoàn tác 24 giờ (khi chưa có
// thao tác khác) = xoá ticket.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, TICKET_DUP_HOURS, validateCustomValues } from '@appchat/shared';
import type { ActionInput, ticketCreate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import { nextCode } from '../../kernel/sequence';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { CrmMembers, actorUserId, fieldDefs, visibleContact } from '../../crm/public';
import { UUID, inSupportScope } from '../ticket-access';
import { SlaCalendar, defaultPolicy, targetsFor } from '../services/sla-clock';
import { actorOf, evOf, logEvent, timeline } from '../services/ticket-write';
import { createPreview } from './previews/ticket-create.handler.preview';
import { soleTeamOf } from '../../authz/data-access';

type In = ActionInput<typeof ticketCreate>;
type Out = { ticket_id: string; code: string; merged?: boolean };

/** Hội thoại + khách nguồn: tin nhắn (menu ⋯ Hộp thư) hoặc hội thoại agent đang phục vụ. */
async function sourceOf(ctx: ActionContext, tx: TenantTx, input: In) {
  if (input.source_message_id && UUID.test(input.source_message_id)) {
    const m = await tx.message.findUnique({ where: { id: input.source_message_id }, select: { id: true, conversationId: true } });
    if (m) {
      const c = await tx.conversation.findUnique({ where: { id: m.conversationId }, select: { id: true, contactId: true } });
      return { messageId: m.id, conversationId: c?.id ?? null, contactId: c?.contactId ?? null };
    }
  }
  if (ctx.servedConversationId) {
    const c = await tx.conversation.findUnique({ where: { id: ctx.servedConversationId }, select: { id: true, contactId: true } });
    if (c) return { messageId: null, conversationId: c.id, contactId: c.contactId };
  }
  return { messageId: null, conversationId: null, contactId: null };
}

@Injectable()
@ActionHandler('ticket.create')
export class TicketCreateHandler implements Handler<In, Out> {
  constructor(
    @Inject(SlaCalendar) private readonly cal: SlaCalendar,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    return createPreview(tx, ctx.authz, this.members, input, this.clock.now());
  }

  async execute(ctx: ActionContext, input: In, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const now = this.clock.now();
    const src = await sourceOf(ctx, tx, input);
    let contactId = src.contactId;
    if (input.contact_id) contactId = (await visibleContact(tx, ctx.authz, input.contact_id)).contact.id;
    const contact = contactId ? await tx.contact.findUnique({ where: { id: contactId }, select: { name: true, email: true } }) : null;
    const errs = validateCustomValues(await fieldDefs(tx, 'ticket'), input.custom, ctx.authz.isOwner ? 'owner' : await this.members.roleOf(ctx.workspaceId, actorUserId(ctx)), 'create');
    if (Object.keys(errs).length) throw new AppError('VALIDATION_FAILED', 422, errs);
    if (input.assignee_user_id && input.assignee_agent_id) throw new AppError('VALIDATION_FAILED', 422, { assignee: 'one_only' });
    if (input.assignee_user_id) await this.members.assertMember(ctx.workspaceId, input.assignee_user_id, 'assignee_user_id');
    if (input.assignee_agent_id && !(UUID.test(input.assignee_agent_id) && (await tx.aiAgent.findUnique({ where: { id: input.assignee_agent_id }, select: { id: true } }))))
      throw new AppError('VALIDATION_FAILED', 422, { assignee_agent_id: 'not_found' });
    const actor = await actorOf(ctx, tx, this.members);

    // REQ-H02: cùng khách + danh mục còn mở trong 24 giờ.
    if (contactId && input.on_duplicate !== 'create') {
      const dup = await tx.ticket.findFirst({
        where: { contactId, category: input.category, status: { not: 'closed' }, createdAt: { gte: new Date(now.getTime() - TICKET_DUP_HOURS * 3_600_000) } },
        orderBy: { createdAt: 'desc' },
      });
      if (dup && inSupportScope(ctx.authz, dup)) {
        if (input.on_duplicate !== 'merge') throw new AppError('CONFLICT', 409, { duplicate_of: dup.code });
        const body = [input.title.trim(), input.description?.trim()].filter(Boolean).join('\n');
        const cm = await tx.ticketComment.create({ data: { id: uuidv7(now.getTime()), ticketId: dup.id, authorType: actor.type === 'system' ? 'system' : actor.type, authorId: actor.id, authorName: actor.name, body, internal: true, createdAt: now } });
        await logEvent(tx, dup.id, 'note', actor, now, { merged: true });
        await tx.ticket.update({ where: { id: dup.id }, data: { updatedAt: now, version: { increment: 1 } } });
        return { result: { ticket_id: dup.id, code: dup.code, merged: true }, after: { merged_comment: cm.id } };
      }
    }

    const policy = await defaultPolicy(tx, now);
    const ai = !!input.assignee_agent_id;
    const sla = targetsFor(policy, ai, now, await this.cal.of(ctx.workspaceId));
    const status = input.status ?? 'open';
    const id = uuidv7(now.getTime());
    const code = await nextCode(tx, 'ticket');
    const row = await tx.ticket.create({
      data: {
        id,
        code,
        contactId,
        conversationId: src.conversationId,
        sourceMessageId: src.messageId,
        title: input.title.trim(),
        description: input.description?.trim() ?? '',
        category: input.category.trim(),
        channel: input.channel,
        company: input.company?.trim() || '',
        email: input.email ?? contact?.email ?? '',
        priority: input.priority,
        status,
        assigneeUserId: ai ? null : (input.assignee_user_id ?? actorUserId(ctx)),
        assigneeAgentId: input.assignee_agent_id ?? null,
        // DC-299: nhóm người tạo chọn; không chọn → nhóm duy nhất của người được gán (0 / nhiều nhóm → null; giao AI → không nhóm).
        teamId: input.team_id ?? (ai ? null : await soleTeamOf(tx, input.assignee_user_id ?? actorUserId(ctx))),
        slaPolicyId: policy.id,
        slaPolicyName: policy.name,
        ...sla,
        pausedSince: status === 'waiting' ? now : null,
        custom: (input.custom ?? {}) as object,
        createdByType: actor.type,
        createdById: actor.id,
        createdAt: now,
        updatedAt: now,
      },
    });
    if (row.description) await tx.ticketComment.create({ data: { id: uuidv7(now.getTime()), ticketId: id, authorType: 'contact', authorName: input.company?.trim() || contact?.name || '', body: row.description, createdAt: now } });
    await logEvent(tx, id, 'created', actor, now);
    if (row.assigneeUserId || row.assigneeAgentId) await logEvent(tx, id, 'assigned', actor, now, { user_id: row.assigneeUserId, agent_id: row.assigneeAgentId });
    await timeline(tx, row, 'ticket_opened', { title: row.title }, actor, now);
    return {
      result: { ticket_id: id, code },
      after: { id },
      events: [evOf('ticket.created', row, { by_user_id: actorUserId(ctx) })],
    };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const a = log.after as { id?: string; merged_comment?: string };
    if (a.merged_comment) {
      await tx.ticketComment.updateMany({ where: { id: a.merged_comment }, data: { deletedAt: this.clock.now() } });
      return;
    }
    const t = a.id ? await tx.ticket.findUnique({ where: { id: a.id } }) : null;
    if (!t) return;
    // Đã có thao tác khác (bình luận / đổi trạng thái / đóng) → không xoá được, đóng với lý do "withdrawn" thay vì hoàn tác.
    if (t.version > 1 || t.status === 'closed') throw new AppError('CONFLICT', 409, { ticket_id: 'changed' });
    await tx.timelineEvent.deleteMany({ where: { refType: 'ticket', refId: t.id } });
    await tx.ticket.delete({ where: { id: t.id } });
  }
}

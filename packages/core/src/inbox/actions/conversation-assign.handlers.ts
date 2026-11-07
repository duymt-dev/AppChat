// conversation.assign · tag · set_tags · bulk_update (Blueprint §3.4 inbox; REQ-C04, C08, C10). Gán người phải là thành viên
// active (kiểm ở DB nền tảng); gán agent lưu id (bảng ai_agent — TIP-021). Thẻ theo tên: chưa có → tạo (nguồn thẻ dùng chung).
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionPreview, conversationAssign, conversationBulkUpdate, conversationSetTags, conversationTag } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { CrmMembers } from '../../crm/public';
import { scopeCols, writableConversation } from '../services/access';
import { me, restore, snap, tagByLabel, tagNamesOf, updatedEvent, type ConvSnap } from './kit';
import * as pv from './previews/conversation-assign.handlers.preview';

type Conv = NonNullable<Awaited<ReturnType<TenantTx['conversation']['findUnique']>>>;

async function assignedEvent(tx: TenantTx, c: Conv, by: string | null, title: string) {
  return { topic: 'conversation.assigned', payload: { ...(await scopeCols(tx, c)), assignee_agent_id: c.assigneeAgentId, by_user_id: by, auto: false, title } };
}

const titleOf = async (tx: TenantTx, c: Conv) =>
  c.title ?? (c.contactId ? ((await tx.contact.findUnique({ where: { id: c.contactId }, select: { name: true } }))?.name ?? '') : '');

@Injectable()
@ActionHandler('conversation.assign')
export class ConversationAssignHandler implements Handler<ActionInput<typeof conversationAssign>, { assignee_user_id: string | null; assignee_agent_id: string | null }> {
  constructor(@Inject(CrmMembers) private readonly members: CrmMembers) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof conversationAssign>, tx: TenantTx) {
    return pv.assignPreview(tx, ctx.authz, this.members, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof conversationAssign>, tx: TenantTx) {
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    if (input.user_id) await this.members.assertMember(ctx.workspaceId, input.user_id, 'user_id');
    const data = input.user_id ? { assigneeUserId: input.user_id } : { assigneeAgentId: input.agent_id!, aiMode: c.aiMode === 'off' ? ('copilot' as const) : c.aiMode };
    const next = await tx.conversation.update({ where: { id: c.id }, data });
    const events = input.user_id && input.user_id !== c.assigneeUserId ? [await assignedEvent(tx, next, me(ctx), await titleOf(tx, c))] : [await updatedEvent(tx, next, 'assign')];
    const out: HandlerOutcome<{ assignee_user_id: string | null; assignee_agent_id: string | null }> = {
      result: { assignee_user_id: next.assigneeUserId, assignee_agent_id: next.assigneeAgentId },
      before: snap(c, ['assigneeUserId', 'assigneeAgentId', 'aiMode']),
      events,
    };
    return out;
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await restore(tx, log.before as ConvSnap);
  }
}

@Injectable()
@ActionHandler('conversation.tag')
export class ConversationTagHandler implements Handler<ActionInput<typeof conversationTag>, { tags: string[] }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof conversationTag>, tx: TenantTx) {
    return pv.tagPreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof conversationTag>, tx: TenantTx): Promise<HandlerOutcome<{ tags: string[] }>> {
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    const t = (await tagByLabel(tx, input.tag, me(ctx), this.clock.now(), true))!;
    const had = await tx.conversationTag.findUnique({ where: { conversationId_tagId: { conversationId: c.id, tagId: t.id } } });
    if (!had) await tx.conversationTag.create({ data: { conversationId: c.id, tagId: t.id, createdAt: this.clock.now() } });
    return { result: { tags: await tagNamesOf(tx, c.id) }, before: { id: c.id, tag_id: t.id, added: !had }, events: [await updatedEvent(tx, c, 'tags')] };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; tag_id: string; added: boolean };
    if (b.added) await tx.conversationTag.deleteMany({ where: { conversationId: b.id, tagId: b.tag_id } });
  }
}

@Injectable()
@ActionHandler('conversation.set_tags')
export class ConversationSetTagsHandler implements Handler<ActionInput<typeof conversationSetTags>, { tags: string[] }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof conversationSetTags>, tx: TenantTx) {
    return pv.setTagsPreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof conversationSetTags>, tx: TenantTx): Promise<HandlerOutcome<{ tags: string[] }>> {
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    const now = this.clock.now();
    const before = (await tx.conversationTag.findMany({ where: { conversationId: c.id }, select: { tagId: true } })).map((x) => x.tagId);
    const ids: string[] = [];
    for (const label of input.tags) {
      const t = (await tagByLabel(tx, label, me(ctx), now, true))!;
      if (!ids.includes(t.id)) ids.push(t.id);
    }
    await tx.conversationTag.deleteMany({ where: { conversationId: c.id, tagId: { notIn: ids } } });
    for (const tagId of ids.filter((x) => !before.includes(x))) await tx.conversationTag.create({ data: { conversationId: c.id, tagId, createdAt: now } });
    return { result: { tags: await tagNamesOf(tx, c.id) }, before: { id: c.id, tag_ids: before }, events: [await updatedEvent(tx, c, 'tags')] };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; tag_ids: string[] };
    await tx.conversationTag.deleteMany({ where: { conversationId: b.id } });
    // Thẻ đã bị xoá sau đó → bỏ qua.
    const live = await tx.tag.findMany({ where: { id: { in: b.tag_ids } }, select: { id: true } });
    await tx.conversationTag.createMany({ data: live.map((t) => ({ conversationId: b.id, tagId: t.id })), skipDuplicates: true });
  }
}

type BulkIn = ActionInput<typeof conversationBulkUpdate>;
interface BulkBefore {
  convs: ConvSnap[];
  added: { conversation_id: string; tag_id: string }[];
}

@Injectable()
@ActionHandler('conversation.bulk_update')
export class ConversationBulkUpdateHandler implements Handler<BulkIn, { updated: number }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Bulk luôn preview kèm số bản ghi (§3.3) — đếm hội thoại người gọi được sửa. */
  async preview(ctx: ActionContext, input: BulkIn, tx: TenantTx): Promise<ActionPreview> {
    return pv.bulkPreview((await this.load(ctx, input, tx)).length, this.members, input);
  }

  async execute(ctx: ActionContext, input: BulkIn, tx: TenantTx): Promise<HandlerOutcome<{ updated: number }>> {
    const convs = await this.load(ctx, input, tx);
    if (input.assignee_user_id) await this.members.assertMember(ctx.workspaceId, input.assignee_user_id, 'assignee_user_id');
    const now = this.clock.now();
    const tags = [];
    for (const label of input.add_tags ?? []) tags.push((await tagByLabel(tx, label, me(ctx), now, true))!);
    const before: BulkBefore = { convs: convs.map((c) => snap(c, ['assigneeUserId', 'status', 'snoozedUntil', 'archivedAt'])), added: [] };
    const events = [];
    for (const c of convs) {
      await tx.conversation.update({
        where: { id: c.id },
        data: {
          ...(input.assignee_user_id ? { assigneeUserId: input.assignee_user_id } : {}),
          ...(input.status ? { status: input.status, snoozedUntil: null } : {}),
          ...(input.archive !== undefined ? { archivedAt: input.archive ? (c.archivedAt ?? now) : null } : {}),
        },
      });
      for (const t of tags) {
        const r = await tx.conversationTag.createMany({ data: [{ conversationId: c.id, tagId: t.id, createdAt: now }], skipDuplicates: true });
        if (r.count) before.added.push({ conversation_id: c.id, tag_id: t.id });
      }
      events.push(await updatedEvent(tx, { ...c, assigneeUserId: input.assignee_user_id ?? c.assigneeUserId }, 'bulk'));
    }
    return { result: { updated: convs.length }, before, events };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as BulkBefore;
    for (const s of b.convs) await restore(tx, s);
    for (const a of b.added) await tx.conversationTag.deleteMany({ where: { conversationId: a.conversation_id, tagId: a.tag_id } });
  }

  /** Mọi id phải tồn tại + trong scope (một id sai → cả lô 404 / 403, không sửa nửa vời). */
  private async load(ctx: ActionContext, input: BulkIn, tx: TenantTx): Promise<Conv[]> {
    const ids = [...new Set(input.conversation_ids)];
    const out: Conv[] = [];
    for (const id of ids) out.push(await writableConversation(tx, ctx.authz, id));
    if (!out.length) throw new AppError('VALIDATION_FAILED', 422, { conversation_ids: 'too_small' });
    return out;
  }
}

// conversation.add_assignee · remove_assignee (D32-mirror cho hội thoại — bảng conversation_assignee): thêm / gỡ đồng phụ trách
// (người hoặc AI Agent) BÊN CẠNH phụ trách chính (assignee_user_id / assignee_agent_id — không đổi, action conversation.assign
// riêng). Luôn thao tác tay; auto-route (routing-apply.handler.ts) không bao giờ ghi vào bảng này.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, conversationAddAssignee, conversationRemoveAssignee } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { assertAgentAssignable } from '../../ai/agents/agent-names';
import { CrmMembers } from '../../crm/public';
import { lockRootOf } from '../../kernel/ownership/root-lock';
import { writableConversation } from '../services/access';
import { me, updatedEvent } from './kit';
import * as pv from './previews/conversation-assignee.handlers.preview';

const count = (tx: TenantTx, conversationId: string) => tx.conversationAssignee.count({ where: { conversationId } });

@Injectable()
@ActionHandler('conversation.add_assignee')
export class ConversationAddAssigneeHandler implements Handler<ActionInput<typeof conversationAddAssignee>, { assignees: number }> {
  constructor(@Inject(CrmMembers) private readonly members: CrmMembers) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof conversationAddAssignee>, tx: TenantTx) {
    return pv.addAssigneePreview(tx, ctx.authz, this.members, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof conversationAddAssignee>, tx: TenantTx): Promise<HandlerOutcome<{ assignees: number }>> {
    await lockRootOf(tx, 'conversation', input.conversation_id);
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    if (input.kind === 'user') {
      await this.members.assertMember(ctx.workspaceId, input.assignee_id, 'assignee_id');
      if (input.assignee_id === c.assigneeUserId) throw new AppError('VALIDATION_FAILED', 422, { assignee_id: 'is_primary' });
    } else {
      await assertAgentAssignable(tx, input.assignee_id);
      if (input.assignee_id === c.assigneeAgentId) throw new AppError('VALIDATION_FAILED', 422, { assignee_id: 'is_primary' });
    }
    const key = { conversationId_kind_assigneeId: { conversationId: c.id, kind: input.kind, assigneeId: input.assignee_id } };
    const prev = await tx.conversationAssignee.findUnique({ where: key });
    if (!prev) await tx.conversationAssignee.create({ data: { conversationId: c.id, kind: input.kind, assigneeId: input.assignee_id, addedBy: me(ctx) } });
    return {
      result: { assignees: await count(tx, c.id) },
      before: { id: c.id, kind: input.kind, assignee_id: input.assignee_id, existed: !!prev },
      events: prev ? [] : [await updatedEvent(tx, c, 'co_assignees')],
    };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; kind: 'user' | 'agent'; assignee_id: string; existed: boolean };
    if (!b.existed) await tx.conversationAssignee.deleteMany({ where: { conversationId: b.id, kind: b.kind, assigneeId: b.assignee_id } });
  }
}

@Injectable()
@ActionHandler('conversation.remove_assignee')
export class ConversationRemoveAssigneeHandler implements Handler<ActionInput<typeof conversationRemoveAssignee>, { assignees: number }> {
  constructor(@Inject(CrmMembers) private readonly members: CrmMembers) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof conversationRemoveAssignee>, tx: TenantTx) {
    return pv.removeAssigneePreview(tx, ctx.authz, this.members, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof conversationRemoveAssignee>, tx: TenantTx): Promise<HandlerOutcome<{ assignees: number }>> {
    await lockRootOf(tx, 'conversation', input.conversation_id);
    const c = await writableConversation(tx, ctx.authz, input.conversation_id);
    const key = { conversationId_kind_assigneeId: { conversationId: c.id, kind: input.kind, assigneeId: input.assignee_id } };
    const prev = await tx.conversationAssignee.findUnique({ where: key });
    if (!prev) throw new AppError('NOT_FOUND', 404, { assignee_id: 'not_assigned' });
    await tx.conversationAssignee.delete({ where: key });
    return {
      result: { assignees: await count(tx, c.id) },
      before: { id: c.id, kind: input.kind, assignee_id: input.assignee_id, added_by: prev.addedBy },
      events: [await updatedEvent(tx, c, 'co_assignees')],
    };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; kind: 'user' | 'agent'; assignee_id: string; added_by: string | null };
    await tx.conversationAssignee.createMany({ data: [{ conversationId: b.id, kind: b.kind, assigneeId: b.assignee_id, addedBy: b.added_by }], skipDuplicates: true });
  }
}

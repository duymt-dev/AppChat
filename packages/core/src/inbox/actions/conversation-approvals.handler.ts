// `conversation.approvals` (TIP-025b §G.1): Trợ lý đọc thẻ duyệt của một hội thoại — cùng reader với route Hộp thư (scope inbox hiện
// hành, approvals.decide ∩ quyền duyệt action gốc). Chỉ đọc; quyết định vẫn qua approval.*.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import type { ActionInput, ActionPreview, conversationApprovals as def } from '@appchat/actions';
import type { ApprovalRowDto } from '@appchat/shared';
import { CLOCK, type Clock } from '../../kernel/clock';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { line, preview } from '../../kernel/actions/preview-kit';
import { visibleConversation } from '../services/access';
import { conversationApprovals } from '../approvals/conversation-approvals';

type Out = { items: ApprovalRowDto[]; pending: number };

@Injectable()
@ActionHandler('conversation.approvals')
export class ConversationApprovalsHandler implements Handler<ActionInput<typeof def>, Out> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: Pick<PlatformDb, 'workspace'> | null,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof def>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const ws = this.platform ? await this.platform.workspace.findUnique({ where: { id: ctx.workspaceId }, select: { timezone: true } }) : null;
    return { result: await conversationApprovals(tx, ctx.authz, input.conversation_id, this.clock.now(), ws?.timezone ?? 'Asia/Ho_Chi_Minh') };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof def>, tx: TenantTx): Promise<ActionPreview> {
    const c = await visibleConversation(tx, ctx.authz, input.conversation_id);
    return preview('read', line(c.title || c.id, 'approvals'));
  }
}

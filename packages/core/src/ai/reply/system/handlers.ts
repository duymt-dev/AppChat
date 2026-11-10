// Handler `inbox.system_agent_transition` (TIP-003c §2, §4.7): chỉ tới đây sau cổng capability + biên nhận trigger. Khoá hội thoại,
// so ai_epoch với thế hệ đã niêm phong — người tiếp quản / đổi chế độ giữa chừng → no_effect. Agent đích đọc lại theo phiên bản đã
// công bố (022b); quyền tool vẫn là quyền agent (∩ người ra lệnh) ở runtime — action này không cấp tool nào.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, SystemOutput, inboxSystemAgentTransition } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { systemCapabilityOf } from '../../../kernel/actions/system';
import { CLOCK, type Clock } from '../../../kernel/clock';
import { takeHandoff, type AgentOp } from './sources';
import { handoffEffect } from './handoff-effect';

type Out = HandlerOutcome<SystemOutput>;
const none = (id: string, reason: string): Out => ({ result: { disposition: 'no_effect', operation_id: id, reason_code: reason }, noUndo: true });

@Injectable()
@ActionHandler('inbox.system_agent_transition')
export class InboxSystemAgentTransitionHandler implements Handler<ActionInput<typeof inboxSystemAgentTransition>, SystemOutput> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { capability: 'internal' });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof inboxSystemAgentTransition>, tx: TenantTx): Promise<Out> {
    const cap = systemCapabilityOf(ctx);
    if (!cap || cap.targetId !== i.entity_id) throw new AppError('FORBIDDEN', 403, { capability: 'missing' });
    const id = i.entity_id;
    const now = this.clock.now();
    await tx.$queryRaw`SELECT 1 FROM conversation WHERE id = ${id}::uuid FOR UPDATE`;
    const c = await tx.conversation.findUnique({ where: { id } });
    if (!c) return none(id, 'not_found');
    if (String(c.aiEpoch) !== cap.generation) return none(id, 'stale_epoch');
    const op = i.operation as AgentOp;
    if (op === 'handoff') {
      const h = takeHandoff(ctx.idempotencyKey);
      if (!h) return none(id, 'handoff_missing');
      if (h.onlyAutoActive && (c.aiMode !== 'auto' || !['idle', 'running'].includes(c.aiState))) return none(id, 'not_auto_active');
      const events = await handoffEffect(tx, ctx.workspaceId, c, h, now);
      return { result: { disposition: 'applied', operation_id: id }, events, noUndo: true };
    }
    if (op === 'assign_current_agent') {
      const r = await tx.aiTurnReceipt.findUnique({ where: { conversationId_sourceMessageId: { conversationId: id, sourceMessageId: cap.sourceRef.slice(5) } }, select: { agentId: true } });
      if (!r?.agentId) return none(id, 'receipt_missing');
      // Đã có agent phụ trách (gán tay / lượt trước) → giữ nguyên.
      if (c.assigneeAgentId) return none(id, 'already_assigned');
      await tx.conversation.update({ where: { id }, data: { assigneeAgentId: r.agentId } });
      return { result: { disposition: 'applied', operation_id: id, effect_ref: r.agentId }, noUndo: true };
    }
    // transfer_agent: đích = bước `transfer_to_agent` thành công cuối cùng của run nguồn (không nhận id agent từ input).
    const runId = cap.sourceRef.slice(4);
    const steps = await tx.aiRunStep.findMany({ where: { runId, type: 'tool', actionId: 'transfer_to_agent', status: 'ok' }, orderBy: { idx: 'desc' }, take: 1, select: { output: true } });
    const target = String(((steps[0]?.output ?? {}) as { output?: { agent_id?: unknown } }).output?.agent_id ?? '');
    const a = target ? await tx.aiAgent.findUnique({ where: { id: target }, select: { id: true, deletedAt: true, status: true, publishedVersion: true } }) : null;
    if (!a || a.deletedAt || a.status !== 'active' || !a.publishedVersion) return none(id, 'no_target');
    await tx.conversation.update({ where: { id }, data: { assigneeAgentId: a.id } });
    return { result: { disposition: 'applied', operation_id: id, effect_ref: a.id }, noUndo: true };
  }
}

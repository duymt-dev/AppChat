// Mục đích `greeting` của tin agent (TIP-022b B): `message.send` chỉ nhận khi ngữ cảnh NỘI BỘ của lượt agent ràng đúng run + tin khách
// nguồn có receipt lượt `greeting_phase = pending` (ghi trước khi gửi). HTTP / model không đặt được `outboundPurpose`. Ghi id tin lời chào
// lên receipt cùng transaction ghi tin → phục hồi biết đã có tin chào (không gửi lại khi kết quả kênh chưa rõ).
import { AppError } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';

export async function greetingPurpose(tx: TenantTx, ctx: Pick<ActionContext, 'outboundPurpose' | 'runId' | 'actor'>, conversationId: string) {
  const p = ctx.outboundPurpose;
  if (!p || p.kind !== 'greeting') return undefined;
  if (ctx.actor.type !== 'agent' || ctx.runId !== p.runId) throw new AppError('FORBIDDEN', 403, { purpose: 'unbound' });
  const r = await tx.aiTurnReceipt.findUnique({ where: { conversationId_sourceMessageId: { conversationId, sourceMessageId: p.sourceMessageId } } });
  if (!r || r.runId !== p.runId || r.greetingPhase !== 'pending' || r.greetingMessageId) throw new AppError('INVALID_STATE', 409, { purpose: 'greeting_not_pending' });
  return p;
}

export async function bindGreeting(tx: TenantTx, conversationId: string, sourceMessageId: string, messageId: string, now: Date) {
  await tx.aiTurnReceipt.update({ where: { conversationId_sourceMessageId: { conversationId, sourceMessageId } }, data: { greetingMessageId: messageId, updatedAt: now } });
}

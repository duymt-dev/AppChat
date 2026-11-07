// Chính sách AI nhóm (TIP-025b §A.2): mention / auto / off theo hội thoại nhóm, CAS theo `conversation_group_state.policy_revision`
// (if_version lệch → 409, hai người sửa cùng lúc không ghi đè). Ghi dưới khoá hội thoại cùng transaction với outbox; đổi chính sách tăng
// `ai_epoch` + huỷ tin agent còn `pending` (chưa đặt chỗ gửi) — kết quả model cũ không vượt được off / mention mới. Không đổi `ai_mode`
// (auto ở nhóm không ép hội thoại sang auto, không tự gán agent).
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { lockConversation } from '../services/human-takeover';
import type { Conv } from '../services/access';

export type Policy = 'mention' | 'auto' | 'off';

export async function policyState(tx: TenantTx, conversationId: string) {
  const s = await tx.conversationGroupState.findUnique({ where: { conversationId }, select: { policyRevision: true } });
  return s?.policyRevision ?? 0;
}

/** Tin agent chưa đặt chỗ gửi → huỷ (giữ nội dung ở message.failed); tin đã đặt chỗ / đang gửi không gọi lại được — trả cờ cho preview. */
async function dropPendingAgentSends(tx: TenantTx, conversationId: string) {
  const rows = await tx.$queryRaw<{ id: string; status: string; message_id: string }[]>`
    SELECT o.id, o.status::text AS status, o.message_id FROM outbox_message o JOIN message m ON m.id = o.message_id
    WHERE m.conversation_id = ${conversationId}::uuid AND o.turn_fence IS NOT NULL AND o.status IN ('pending', 'dispatch_reserved', 'sending')`;
  for (const o of rows.filter((r) => r.status === 'pending')) {
    await tx.outboxMessage.update({ where: { id: o.id }, data: { status: 'dead', lastError: 'group_policy_changed' } });
    await tx.message.update({ where: { id: o.message_id }, data: { status: 'failed', error: 'group_policy_changed' } });
  }
  return { dropped: rows.filter((r) => r.status === 'pending').length, inFlight: rows.some((r) => r.status !== 'pending') };
}

export async function setGroupPolicy(tx: TenantTx, c: Conv, policy: Policy, ifVersion: number, now: Date) {
  await lockConversation(tx, c.id);
  const cur = await policyState(tx, c.id);
  if (cur !== ifVersion) throw new AppError('CONFLICT', 409, { if_version: `stale:${cur}` });
  const fresh = await tx.conversation.findUniqueOrThrow({ where: { id: c.id }, select: { groupAiPolicy: true } });
  const before = (fresh.groupAiPolicy ?? 'mention') as Policy;
  const version = cur + 1;
  await tx.conversationGroupState.upsert({ where: { conversationId: c.id }, create: { conversationId: c.id, policyRevision: version, updatedAt: now }, update: { policyRevision: version } });
  if (before === policy) return { before, version, dropped: 0, inFlight: false };
  await tx.conversation.update({ where: { id: c.id }, data: { groupAiPolicy: policy, aiEpoch: { increment: 1 }, aiTurnUntil: null, aiTurnOwner: null } });
  const d = policy === 'auto' ? { dropped: 0, inFlight: false } : await dropPendingAgentSends(tx, c.id);
  return { before, version, ...d };
}

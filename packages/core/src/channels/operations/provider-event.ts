// Áp kết quả lệnh thao tác + sự kiện kênh vào DB tenant (TIP-014b A). Idempotent: lệnh đã kết thúc không đổi lại; sự kiện kênh chỉ khớp tin
// trong ĐÚNG tài khoản theo msgId đã lưu (không tạo tin / khách, không khớp tài khoản khác). Thu hồi: `recalled_at` chỉ ghi khi mọi phần
// của tin đã xác nhận (ACK hoặc sự kiện thu hồi của kênh). Cảm xúc: revision đơn điệu — ACK / sự kiện cũ không đè ý định mới hơn.
// TIP-022c: cả hai đường ghi `recalled_at` đi qua `markRecalled` (inbox — cùng thứ tự khoá với cổng ý định khách, vô hiệu căn cứ báo giá).
import type { ProviderEvent, ReactionEmoji } from '@appchat/channels';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { OutboxEventInput } from '../../kernel/outbox/outbox';
import { applySelfRef, messageByProviderId, messageRefs } from './operation-store';
import { applyReceipt } from './delivery-receipts';
import { applyFriendEvent } from './friend-store';
import type { OperationStatus } from './types';
import { markRecalled } from '../../inbox/services/customer-source-fence';

type Part = { part_no: number; status: 'confirmed' | 'failed' | 'unknown'; error?: string };
export type OperationOutcome = { status: 'confirmed' | 'failed' | 'unknown'; error?: string; parts?: Part[] };

const FINAL: readonly OperationStatus[] = ['confirmed', 'failed', 'unknown', 'partial', 'cancelled', 'superseded'];

async function updatedEvent(tx: TenantTx, messageId: string, change: string): Promise<OutboxEventInput | null> {
  const m = await tx.message.findUnique({ where: { id: messageId }, select: { conversationId: true, channelAccountId: true } });
  const c = m ? await tx.conversation.findUnique({ where: { id: m.conversationId }, select: { id: true, contactId: true, assigneeUserId: true } }) : null;
  if (!m || !c) return null;
  const k = c.contactId ? await tx.contact.findUnique({ where: { id: c.contactId }, select: { ownerUserId: true } }) : null;
  return { topic: 'message.updated', payload: { conversation_id: c.id, channel_account_id: m.channelAccountId, contact_id: c.contactId, assignee_user_id: c.assigneeUserId, contact_owner_user_id: k?.ownerUserId ?? null, message_id: messageId, change } };
}

/** Gộp kết quả từng phần: hết xác nhận → confirmed; có unknown → unknown; có xác nhận lẫn lỗi → partial; toàn lỗi → failed. */
export function foldParts(parts: Part[]): OperationStatus {
  if (parts.every((p) => p.status === 'confirmed')) return 'confirmed';
  if (parts.some((p) => p.status === 'unknown')) return 'unknown';
  return parts.some((p) => p.status === 'confirmed') ? 'partial' : 'failed';
}

/** Kết quả từ worker giữ phiên. Trả event cần ghi outbox (rỗng nếu lệnh đã kết thúc / không còn). */
export async function applyOperationResult(tx: TenantTx, operationId: string, o: OperationOutcome, now: Date): Promise<OutboxEventInput[]> {
  const op = await tx.channelOperation.findUnique({ where: { id: operationId } });
  if (!op || FINAL.includes(op.status as OperationStatus)) return [];
  const status: OperationStatus = o.parts?.length ? foldParts(o.parts) : o.status;
  await tx.channelOperation.update({ where: { id: op.id }, data: { status, error: o.error?.slice(0, 200) ?? null, result: o.parts ? { parts: o.parts } : {}, finishedAt: now } });
  let change = 'operation';
  if (op.kind === 'recall' && status === 'confirmed') {
    await markRecalled(tx, op.messageId, now);
    change = 'recalled';
  }
  if (op.kind === 'react' && status === 'confirmed') {
    const emoji = (op.desired as { emoji?: ReactionEmoji | null }).emoji ?? null;
    // Chỉ revision mới hơn bản đã xác nhận mới ghi (ACK trễ của lệnh cũ không đè).
    await tx.messageAccountReaction.updateMany({ where: { messageId: op.messageId, confirmedRevision: { lt: op.revision } }, data: { confirmedEmoji: emoji, confirmedRevision: op.revision } });
    change = 'reaction';
  }
  const e = await updatedEvent(tx, op.messageId, change);
  return e ? [e] : [];
}

/** Lệnh đã đặt chỗ gọi kênh mà job chạy lại (sập / mất lease giữa chừng) → unknown, không gọi lại. */
export async function markInterrupted(tx: TenantTx, operationId: string, now: Date): Promise<OutboxEventInput[]> {
  return applyOperationResult(tx, operationId, { status: 'unknown', error: 'interrupted_after_attempt' }, now);
}

/** Sự kiện kênh (self-listen / thu hồi / cảm xúc). Event cũ / lặp / không khớp tài khoản → không đổi gì. */
export async function applyProviderEvent(tx: TenantTx, e: ProviderEvent, now: Date): Promise<OutboxEventInput[]> {
  if (e.kind === 'self_ref') {
    await applySelfRef(tx, e.accountId, e.ref, now);
    return [];
  }
  if (e.kind === 'recalled') {
    const ref = await messageByProviderId(tx, e.accountId, e.msgId);
    if (!ref || ref.threadId !== e.threadId) return [];
    const msg = await tx.message.findUnique({ where: { id: ref.messageId }, select: { id: true, recalledAt: true, direction: true } });
    if (!msg || msg.recalledAt) return [];
    // Tin ra nhiều phần: chỉ thu hồi xong khi mọi phần đã thấy thu hồi — ghi phần này vào lệnh thu hồi đang mở (nếu có).
    const refs = await messageRefs(tx, msg.id);
    const op = await tx.channelOperation.findFirst({ where: { messageId: msg.id, kind: 'recall', status: { in: ['queued', 'dispatch_reserved', 'unknown', 'partial'] } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    if (refs.length > 1 && op) {
      const prev = ((op.result as { parts?: Part[] }).parts ?? refs.map((r) => ({ part_no: r.partNo, status: 'unknown' as const }))).map((p) => (p.part_no === ref.partNo ? { ...p, status: 'confirmed' as const } : p));
      const status = foldParts(prev);
      await tx.channelOperation.update({ where: { id: op.id }, data: { result: { parts: prev }, ...(status === 'confirmed' ? { status, finishedAt: now } : {}) } });
      if (status !== 'confirmed') return [];
    } else if (op) {
      await tx.channelOperation.update({ where: { id: op.id }, data: { status: 'confirmed', finishedAt: now } });
    }
    await markRecalled(tx, msg.id, now);
    const ev = await updatedEvent(tx, msg.id, 'recalled');
    return ev ? [ev] : [];
  }
  if (e.kind === 'friend') return applyFriendEvent(tx, e, now);
  if (e.kind !== 'reaction') return applyReceipt(tx, e, now);
  // Cảm xúc: chỉ cảm xúc của chính tài khoản là "trạng thái phía kênh" của tài khoản; cảm xúc của khách lưu theo người (contact).
  const out: OutboxEventInput[] = [];
  for (const msgId of e.msgIds) {
    const ref = await messageByProviderId(tx, e.accountId, msgId);
    if (!ref || ref.threadId !== e.threadId) continue;
    if (e.self) {
      await tx.messageAccountReaction.upsert({
        where: { messageId: ref.messageId },
        create: { messageId: ref.messageId, channelAccountId: e.accountId, remoteEmoji: e.emoji },
        update: { remoteEmoji: e.emoji },
      });
    } else {
      await tx.messageReaction.deleteMany({ where: { messageId: ref.messageId, actorType: 'contact', actorId: e.actorId } });
      if (e.emoji) await tx.messageReaction.create({ data: { messageId: ref.messageId, actorType: 'contact', actorId: e.actorId, emoji: e.emoji, createdAt: now } });
    }
    const ev = await updatedEvent(tx, ref.messageId, 'reaction');
    if (ev) out.push(ev);
  }
  return out;
}

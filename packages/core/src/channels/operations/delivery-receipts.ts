// Sổ gửi từng phần + biên nhận đã nhận / đã xem (TIP-014b B). Sổ gửi (SendLedger cho adapter): đặt chỗ phần trong DB tenant TRƯỚC khi gọi
// kênh, ghi xác nhận ngay sau ACK — chạy lại sau sập bỏ qua phần đã xác nhận; phần còn `dispatch_reserved` từ lần trước = không biết đã tới
// khách chưa → dừng (unknown), không gửi lại mù. Biên nhận: chỉ tăng (sent < delivered < read), nhóm lưu theo từng người có bằng chứng.
import { ChannelOperationError, type ProviderMessageRef, type ReceiptEvent, type SendLedger } from '@appchat/channels';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { OutboxEventInput } from '../../kernel/outbox/outbox';
import { messageByProviderId } from './operation-store';

/** Phần gửi treo từ lần chạy trước (đã đặt chỗ, chưa xác nhận) — không biết đã tới khách chưa. */
export class UnknownPartError extends Error {
  constructor(readonly partNo: number) {
    super(`send_part_unknown:${partNo}`);
    this.name = 'UnknownPartError';
  }
}

export function sendLedger(db: TenantDb, o: { outboxId: string; accountId: string; threadId: string; isGroup: boolean; generation?: number; now: () => Date; traceId?: string }): SendLedger {
  return {
    async reserve(partNo, hash) {
      // Ném SAU commit — ném trong transaction sẽ rollback lần ghi `unknown`.
      const r = await db.$transaction(async (tx): Promise<'send' | 'stuck' | { skip: ProviderMessageRef }> => {
        const cur = await tx.outboxSendPart.findUnique({ where: { outboxMessageId_partNo: { outboxMessageId: o.outboxId, partNo } } });
        if (cur?.status === 'confirmed_sent' && cur.msgId) return { skip: { threadId: o.threadId, isGroup: o.isGroup, msgId: cur.msgId, cliMsgId: null } satisfies ProviderMessageRef };
        // Lỗi chắc chắn lần trước (kênh từ chối rõ) = chưa tới khách → gửi lại được; còn lại (đang đặt chỗ / chưa rõ) → dừng.
        if (cur && cur.status !== 'pending' && cur.status !== 'definite_failure') {
          // Đã đặt chỗ ở lần chạy trước mà không có kết quả → chưa rõ, không gửi lại mù.
          if (cur.status === 'dispatch_reserved') await tx.outboxSendPart.update({ where: { outboxMessageId_partNo: { outboxMessageId: o.outboxId, partNo } }, data: { status: 'unknown', error: 'interrupted_after_attempt' } });
          return 'stuck';
        }
        if (cur && cur.contentHash !== hash) throw new ChannelOperationError('invalid', 'part_hash_changed');
        const data = { status: 'dispatch_reserved' as const, attemptedAt: o.now(), generation: o.generation ?? 0, traceId: o.traceId ?? null };
        if (cur) await tx.outboxSendPart.update({ where: { outboxMessageId_partNo: { outboxMessageId: o.outboxId, partNo } }, data });
        else await tx.outboxSendPart.create({ data: { outboxMessageId: o.outboxId, partNo, channelAccountId: o.accountId, contentHash: hash, ...data } });
        return 'send';
      });
      if (r === 'stuck') throw new UnknownPartError(partNo);
      return r;
    },
    async confirm(partNo, ref) {
      await db.outboxSendPart.update({ where: { outboxMessageId_partNo: { outboxMessageId: o.outboxId, partNo } }, data: { status: 'confirmed_sent', msgId: ref.msgId, confirmedAt: o.now(), error: null } });
    },
  };
}

/** Lỗi khi gọi kênh cho phần đang `dispatch_reserved`: lỗi chắc chắn (từ chối rõ) / chưa rõ (mạng, hết giờ). */
export async function failReservedParts(db: Pick<TenantDb, 'outboxSendPart'>, outboxId: string, definite: boolean, error: string): Promise<number> {
  const r = await db.outboxSendPart.updateMany({ where: { outboxMessageId: outboxId, status: 'dispatch_reserved' }, data: { status: definite ? 'definite_failure' : 'unknown', error: error.slice(0, 200) } });
  return r.count;
}

// `unknown` (không rõ đã gửi) + biên nhận của kênh = bằng chứng đã tới → nâng được; `partial` giữ nguyên (còn phần chưa tới).
const RANK: Record<string, number> = { queued: 0, unknown: 1, sent: 1, delivered: 2, read: 3 };

/** Biên nhận từ kênh → `message_receipt` (theo người) + nâng `message.status` (không bao giờ hạ). Tin không khớp tài khoản → bỏ. */
export async function applyReceipt(tx: TenantTx, e: ReceiptEvent, now: Date): Promise<OutboxEventInput[]> {
  const at = Number.isNaN(Date.parse(e.at)) || Date.parse(e.at) <= 0 ? now : new Date(e.at);
  const touched = new Set<string>();
  for (const msgId of e.msgIds) {
    const ref = await messageByProviderId(tx, e.accountId, msgId);
    if (!ref || ref.threadId !== e.threadId) continue;
    const msg = await tx.message.findUnique({ where: { id: ref.messageId }, select: { id: true, direction: true, status: true } });
    if (!msg || msg.direction !== 'out') continue;
    for (const who of e.recipients) {
      const field = e.kind === 'seen' ? { readAt: at } : { deliveredAt: at };
      await tx.messageReceipt.upsert({
        where: { messageId_recipientId: { messageId: msg.id, recipientId: who } },
        create: { messageId: msg.id, recipientId: who, deliveredAt: at, ...(e.kind === 'seen' ? { readAt: at } : {}) },
        update: e.kind === 'seen' ? field : {},
      });
    }
    // 1-1: trạng thái tin theo biên nhận; nhóm: chỉ "đã nhận" khi có bằng chứng — "đã xem" cả nhóm không suy từ một người.
    const next = e.kind === 'seen' && !e.isGroup ? 'read' : 'delivered';
    if ((RANK[msg.status] ?? -1) >= 1 && (RANK[next] ?? 0) > (RANK[msg.status] ?? 0)) {
      await tx.message.update({ where: { id: msg.id }, data: { status: next } });
      touched.add(msg.id);
    }
  }
  const out: OutboxEventInput[] = [];
  for (const id of touched) {
    const m = await tx.message.findUnique({ where: { id }, select: { conversationId: true, channelAccountId: true } });
    const c = m ? await tx.conversation.findUnique({ where: { id: m.conversationId }, select: { id: true, contactId: true, assigneeUserId: true } }) : null;
    if (!m || !c) continue;
    const k = c.contactId ? await tx.contact.findUnique({ where: { id: c.contactId }, select: { ownerUserId: true } }) : null;
    out.push({ topic: 'message.updated', payload: { conversation_id: c.id, channel_account_id: m.channelAccountId, contact_id: c.contactId, assignee_user_id: c.assigneeUserId, contact_owner_user_id: k?.ownerUserId ?? null, message_id: id, change: 'status' } });
  }
  return out;
}

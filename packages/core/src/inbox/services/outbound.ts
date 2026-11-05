// Gửi tin ra kênh (events/outbox §7, omnichannel-adapter §6): handler ghi `message` (queued) + `outbox_message` (pending) trong
// transaction của action; SAU commit đẩy vào hàng đợi gửi của tài khoản (`ChannelSendQueue`, job id = id outbox → gửi một lần).
// Kết quả gửi (worker ROLE=channels) về qua `registerSendResultSink('inbox')` → `applySendResult`. Không rẽ nhánh theo kênh.
import type { OutboundMessage } from '@appchat/channels';
import { TenantSql } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import type { OutboxEventInput } from '../../kernel/outbox/outbox';
import { emailOutboundExtras, type ChannelSendQueue, type SendResult } from '../../channels/public';
import { previewOf } from './view';

type Conv = NonNullable<Awaited<ReturnType<TenantTx['conversation']['findUnique']>>>;

export interface OutgoingInput {
  conv: Conv;
  kind: 'text' | 'image' | 'file' | 'sticker' | 'audio' | 'card';
  body: string;
  attachments?: { url: string; mime: string; name?: string }[];
  sender: { type: 'user' | 'agent' | 'system'; id: string | null; name: string | null };
  replyToId?: string | null;
  forwardedFromId?: string | null;
  /** Tin agent (TIP-045b annex D): fence lượt + epoch hội thoại lúc ghi — đặt chỗ gửi kiểm lại trước khi gọi kênh. */
  turn?: { fence: number; epoch: number };
  now: Date;
}

export interface Outgoing {
  messageId: string;
  outboxId: string;
  job: { account_id: string; ref_id: string; message: OutboundMessage; proactive?: boolean };
}

const day0 = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** Tài khoản gửi được: còn kết nối + không tạm dừng → ngược lại 409 INVALID_STATE (FE báo "kênh đang tạm dừng / mất kết nối"). */
export async function sendableAccount(tx: TenantTx, accountId: string) {
  const a = await tx.channelAccount.findUnique({ where: { id: accountId } });
  if (!a || a.status !== 'connected' || a.pausedAt) throw new AppError('INVALID_STATE', 409, { channel: a ? (a.pausedAt ? 'paused' : a.status) : 'disconnected' });
  return a;
}

/** Ghi tin ra + outbox gửi; cập nhật hội thoại (preview, đã đọc, FRT). Trả job để người gọi đẩy hàng đợi sau commit. */
export async function writeOutgoing(tx: TenantTx, o: OutgoingInput): Promise<Outgoing> {
  const { conv, now } = o;
  await sendableAccount(tx, conv.channelAccountId);
  let replyExt: string | undefined;
  if (o.replyToId) {
    const r = await tx.message.findUnique({ where: { id: o.replyToId }, select: { conversationId: true, externalMsgId: true } });
    if (!r || r.conversationId !== conv.id) throw new AppError('VALIDATION_FAILED', 422, { reply_to_id: 'not_found' });
    replyExt = r.externalMsgId ?? undefined;
  }
  const messageId = uuidv7(now.getTime());
  const outboxId = uuidv7(now.getTime());
  const message: OutboundMessage = {
    externalThreadId: conv.externalThreadId,
    isGroup: conv.kind === 'group',
    kind: o.kind,
    ...(o.body ? { text: o.body } : {}),
    ...(o.attachments?.length ? { attachments: o.attachments } : {}),
    ...(replyExt ? { replyToExternalMsgId: replyExt } : {}),
    // Email: người nhận + In-Reply-To / References / tiêu đề của chuỗi (TIP-018); kênh khác không có.
    ...(await emailOutboundExtras(tx, conv)),
  };
  await tx.message.create({
    data: {
      id: messageId,
      conversationId: conv.id,
      channelAccountId: conv.channelAccountId,
      direction: 'out',
      senderType: o.sender.type,
      senderId: o.sender.id,
      senderName: o.sender.name,
      kind: o.kind,
      body: o.body,
      attachments: o.attachments ?? [],
      status: 'queued',
      replyToId: o.replyToId ?? null,
      forwardedFromId: o.forwardedFromId ?? null,
      createdAt: now,
    },
  });
  await tx.outboxMessage.create({ data: { id: outboxId, messageId, channelAccountId: conv.channelAccountId, payload: message as object, status: 'pending', nextAttemptAt: now, createdAt: now, ...(o.turn ? { turnFence: o.turn.fence, aiEpoch: o.turn.epoch } : {}) } });
  // Phản hồi đầu tiên sau tin khách → FRT vào thống kê ngày của tài khoản (REQ-B11).
  if (conv.frtPendingSince && o.sender.type !== 'system') {
    const sec = Math.max(0, Math.round((now.getTime() - conv.frtPendingSince.getTime()) / 1000));
    await tx.$executeRaw`
      INSERT INTO channel_account_stat_daily (channel_account_id, day, frt_sum, frt_count) VALUES (${conv.channelAccountId}::uuid, ${day0(now)}::date, ${sec}, 1)
      ON CONFLICT (channel_account_id, day) DO UPDATE SET frt_sum = channel_account_stat_daily.frt_sum + ${sec}, frt_count = channel_account_stat_daily.frt_count + 1`;
  }
  await tx.conversation.update({
    where: { id: conv.id },
    // Người / agent đã trả lời → gợi ý copilot + bản nháp AI hết hiệu lực (TIP-022).
    data: { lastMessageAt: now, lastMessagePreview: previewOf(o.kind, o.body), lastSenderName: o.sender.name, unreadCount: 0, frtPendingSince: null, hiddenAt: null, aiSuggestion: TenantSql.DbNull },
  });
  return { messageId, outboxId, job: { account_id: conv.channelAccountId, ref_id: outboxId, message } };
}

/** Đẩy job gửi (sau commit). Hàng đợi vắng (thiếu Redis) → outbox giữ `pending`, vòng quét của worker gửi lại. */
export async function enqueueOutgoing(queue: ChannelSendQueue | null, ws: string, o: Outgoing): Promise<void> {
  await queue?.enqueue({ ws, ...o.job });
}

/** Kết quả gửi → outbox + message + event (`message.sent` / `message.failed`). null = không phải tin của inbox. */
export async function applySendResult(tx: TenantTx, r: SendResult): Promise<OutboxEventInput[] | null> {
  const ob = await tx.outboxMessage.findUnique({ where: { id: r.ref_id } });
  if (!ob || ob.status === 'sent' || ob.status === 'dead') return ob ? [] : null;
  const msg = await tx.message.findUnique({ where: { id: ob.messageId } });
  const conv = msg ? await tx.conversation.findUnique({ where: { id: msg.conversationId } }) : null;
  if (!msg || !conv) return [];
  const owner = conv.contactId ? await tx.contact.findUnique({ where: { id: conv.contactId }, select: { ownerUserId: true } }) : null;
  const base = { conversation_id: conv.id, channel_account_id: conv.channelAccountId, contact_id: conv.contactId, assignee_user_id: conv.assigneeUserId, contact_owner_user_id: owner?.ownerUserId ?? null, message_id: msg.id };
  if (r.ok) {
    await tx.outboxMessage.update({ where: { id: ob.id }, data: { status: 'sent', attempts: ob.attempts + 1, lastError: null } });
    // Id phía kênh trùng tin khác (kênh trả lại id cũ) → giữ tin, bỏ id.
    const taken = await tx.message.findUnique({ where: { channelAccountId_externalMsgId: { channelAccountId: conv.channelAccountId, externalMsgId: r.external_msg_id } }, select: { id: true } });
    await tx.message.update({ where: { id: msg.id }, data: { status: 'sent', error: null, ...(taken ? {} : { externalMsgId: r.external_msg_id }) } });
    return [{ topic: 'message.sent', payload: { ...base, sender_type: msg.senderType === 'contact' ? 'system' : msg.senderType, sender_id: msg.senderId } }];
  }
  const error = r.error.slice(0, 200);
  if (!r.final) {
    await tx.outboxMessage.update({ where: { id: ob.id }, data: { status: 'sending', attempts: ob.attempts + 1, lastError: error } });
    return [];
  }
  await tx.outboxMessage.update({ where: { id: ob.id }, data: { status: 'dead', attempts: ob.attempts + 1, lastError: error } });
  await tx.message.update({ where: { id: msg.id }, data: { status: 'failed', error } });
  return [{ topic: 'message.failed', payload: { ...base, error } }];
}

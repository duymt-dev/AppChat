// Tạo lệnh thao tác kênh bền (TIP-014b A) trong transaction của action: dòng `channel_operation` + event `channel.operation_requested`
// cùng commit → 202 `job_accepted` (status_url route inbox). Cảm xúc: revision tài khoản tăng đơn điệu bằng một câu SQL nguyên tử
// (INSERT … ON CONFLICT … RETURNING) — lệnh cảm xúc cũ còn `queued` bị thay (`superseded`), không gọi kênh hai lần cho ý định cũ.
import type { ReactionEmoji } from '@appchat/channels';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import type { OperationKind } from './types';

export const operationStatusUrl = (id: string) => `/v1/inbox/channel-operations/${id}`;

interface RequestInput {
  kind: OperationKind;
  accountId: string;
  conversationId: string;
  messageId: string;
  actorId: string | null;
  desired?: { emoji: ReactionEmoji | null };
  revision?: number;
  now: Date;
}

export async function requestOperation(tx: TenantTx, i: RequestInput) {
  const id = uuidv7(i.now.getTime());
  await tx.channelOperation.create({
    data: {
      id,
      kind: i.kind,
      channelAccountId: i.accountId,
      conversationId: i.conversationId,
      messageId: i.messageId,
      actorId: i.actorId,
      desired: i.desired ?? {},
      revision: i.revision ?? 0,
      status: 'queued',
      createdAt: i.now,
    },
  });
  return { id, event: { topic: 'channel.operation_requested', payload: { operation_id: id, channel_account_id: i.accountId } } };
}

/** Lệnh thu hồi đang mở / đã xác nhận của tin — thu hồi lại cùng tin trả đúng lệnh này (không gọi kênh lần hai). */
export async function liveRecall(tx: Pick<TenantTx, 'channelOperation'>, messageId: string) {
  return tx.channelOperation.findFirst({
    where: { messageId, kind: 'recall', status: { in: ['queued', 'dispatch_reserved', 'unknown', 'confirmed'] } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
}

/**
 * Ghi cảm xúc mong muốn mới của tài khoản → revision mới (nguyên tử). Lệnh cảm xúc cũ chưa gọi kênh (`queued`) bị thay. Trả revision
 * để gắn vào lệnh — ACK / sự kiện của revision cũ không đè được ý định mới hơn.
 */
export async function nextReaction(tx: TenantTx, accountId: string, messageId: string, emoji: ReactionEmoji | null, now: Date): Promise<number> {
  const rows = await tx.$queryRaw<{ desired_revision: number }[]>`
    INSERT INTO message_account_reaction (message_id, channel_account_id, desired_emoji, desired_revision, updated_at)
    VALUES (${messageId}::uuid, ${accountId}::uuid, ${emoji}, 1, now())
    ON CONFLICT (message_id) DO UPDATE SET desired_emoji = EXCLUDED.desired_emoji,
      desired_revision = message_account_reaction.desired_revision + 1, updated_at = now()
    RETURNING desired_revision`;
  const revision = rows[0]!.desired_revision;
  await tx.channelOperation.updateMany({ where: { messageId, kind: 'react', status: 'queued', revision: { lt: revision } }, data: { status: 'superseded', finishedAt: now } });
  return revision;
}

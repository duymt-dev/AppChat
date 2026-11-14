// @nhắc trong ghi chú nội bộ (TIP-025, REQ-C05): lưu `message_mention` cho thành viên active được nhắc (bỏ chính mình, bỏ id lạ),
// xin thông báo `msg_mention` (event `notify.requested`) dẫn về `/inbox?c=<id>`. Mở hội thoại → đánh dấu các lần nhắc mình đã đọc.
import type { TenantTx } from '../../kernel/actions/action-context';
import type { CrmMembers } from '../../crm/public';

type Conv = NonNullable<Awaited<ReturnType<TenantTx['conversation']['findUnique']>>>;

export interface MentionInput {
  workspaceId: string;
  conv: Conv;
  messageId: string;
  by: { id: string | null; name: string | null };
  userIds: readonly string[];
  now: Date;
}

/** Ghi các lần nhắc hợp lệ; trả event xin thông báo (rỗng khi không nhắc ai). */
export async function recordMentions(tx: TenantTx, members: Pick<CrmMembers, 'list'>, m: MentionInput) {
  if (!m.userIds.length) return { userIds: [] as string[], events: [] };
  const active = new Set((await members.list(m.workspaceId)).map((x) => x.id));
  const userIds = [...new Set(m.userIds)].filter((id) => active.has(id) && id !== m.by.id);
  if (!userIds.length) return { userIds, events: [] };
  await tx.messageMention.createMany({ data: userIds.map((userId) => ({ messageId: m.messageId, userId, conversationId: m.conv.id, createdAt: m.now })), skipDuplicates: true });
  const contact = m.conv.title ?? (m.conv.contactId ? (await tx.contact.findUnique({ where: { id: m.conv.contactId }, select: { name: true } }))?.name : null) ?? '';
  return {
    userIds,
    events: [
      {
        topic: 'notify.requested',
        payload: { kind: 'msg_mention', to: { user_ids: userIds }, params: { actor: (m.by.name ?? '').slice(0, 200), contact: contact.slice(0, 200) }, link: `/inbox?c=${m.conv.id}` },
      },
    ],
  };
}

/** Đánh dấu các lần nhắc `userId` trong hội thoại đã đọc — trả số dòng đổi (0 = không có gì mới). */
export async function readMentions(tx: TenantTx, conversationId: string, userId: string | null, now: Date): Promise<number> {
  if (!userId) return 0;
  const r = await tx.messageMention.updateMany({ where: { userId, conversationId, readAt: null }, data: { readAt: now } });
  return r.count;
}

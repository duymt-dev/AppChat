// Áp kết quả tạo nhóm (TIP-023b SPEC D): chỉ chuyển từ queued / running; thành công → hội thoại nhóm theo (tài khoản, id nhóm) bằng INSERT … ON
// CONFLICT DO NOTHING rồi đọc lại (tin nhóm về trước kết quả vẫn một hội thoại) + thành viên đã thêm. `unknown` giữ nguyên rõ ràng — không
// đoán id nhóm theo tên. Gọi qua handler `channel.group_result` (executor, nguồn system) nên log + outbox cùng transaction.
import { AppError, interpolate, serverMessages } from '@appchat/shared';
import type { ActionInput, channelGroupResult } from '@appchat/actions';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import type { Participant } from './group-requests';

type In = ActionInput<typeof channelGroupResult>;
const OPEN = ['queued', 'running'];

export async function applyGroupResult(tx: TenantTx, i: In, now: Date) {
  await tx.$queryRaw`SELECT 1 FROM conversation_group_request WHERE id = ${i.request_id}::uuid FOR UPDATE`;
  const r = await tx.conversationGroupRequest.findUnique({ where: { id: i.request_id } });
  if (!r) throw new AppError('NOT_FOUND', 404, { request_id: 'not_found' });
  // Kết quả lặp (worker thử lại sau commit) → trả trạng thái đã ghi, không đổi gì.
  if (!OPEN.includes(r.status)) return { row: r, changed: false };
  if (i.outcome !== 'succeeded') {
    const row = await tx.conversationGroupRequest.update({ where: { id: r.id }, data: { status: i.outcome, error: i.error ?? null, updatedAt: now } });
    return { row, changed: true };
  }
  if (!i.group_id) throw new AppError('VALIDATION_FAILED', 422, { group_id: 'required' });
  const account = await tx.channelAccount.findUniqueOrThrow({ where: { id: r.channelAccountId }, select: { id: true, type: true, name: true } });
  const title = r.name || interpolate(serverMessages('vi').inbox.groupTitle, { channel: account.name });
  await tx.$executeRaw`
    INSERT INTO conversation (id, channel_account_id, channel_type, kind, external_thread_id, title, group_ai_policy, last_message_at, last_message_preview, created_at, updated_at)
    VALUES (${uuidv7(now.getTime())}::uuid, ${account.id}::uuid, ${account.type}, 'group', ${i.group_id}, ${title}, 'mention', ${now}, '', ${now}, ${now})
    ON CONFLICT (channel_account_id, external_thread_id) DO NOTHING`;
  const conv = await tx.conversation.findUniqueOrThrow({ where: { channelAccountId_externalThreadId: { channelAccountId: account.id, externalThreadId: i.group_id } } });
  const added = new Set(i.added ?? []);
  for (const p of (r.participants as unknown as Participant[]).filter((x) => added.has(x.external_id))) {
    await tx.conversationParticipant.upsert({
      where: { conversationId_externalId: { conversationId: conv.id, externalId: p.external_id } },
      create: { conversationId: conv.id, externalId: p.external_id, displayName: p.display_name, contactId: p.contact_id },
      update: { contactId: p.contact_id },
    });
  }
  const row = await tx.conversationGroupRequest.update({
    where: { id: r.id },
    data: { status: 'succeeded', providerGroupId: i.group_id, conversationId: conv.id, added: [...added], failedMembers: i.failed ?? [], error: null, updatedAt: now },
  });
  return { row, changed: true, conversation: conv };
}

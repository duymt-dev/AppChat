// Yêu cầu tạo nhóm (TIP-023b SPEC D · DC-247): chụp thành viên từ hội thoại 1-1 người gọi thấy được trên đúng tài khoản Zalo có capability
// `createGroup` (không suy từ `group`), tài khoản phải đang kết nối và không tạm dừng. Chỉ định danh khách đã nhắn với tài khoản này — không
// nhận số điện thoại / id tuỳ ý. `plan` chỉ đọc (preview + execute dùng chung); execute ghi request + outbox `channel.group_requested`.
import { createHash } from 'node:crypto';
import type { ChannelRegistry } from '@appchat/channels';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { ActionInput, conversationCreateGroup } from '@appchat/actions';
import type { TenantTx } from '../../kernel/actions/action-context';
import { canSeeConversation } from '../../inbox/services/access';
import { UUID } from './accounts.service';

type In = ActionInput<typeof conversationCreateGroup>;

export interface Participant {
  external_id: string;
  display_name: string;
  contact_id: string | null;
  conversation_id: string;
}

export interface GroupPlan {
  account: { id: string; name: string; type: string };
  name: string;
  participants: Participant[];
  digest: string;
}

/** Tài khoản tạo nhóm được: tồn tại, đang kết nối, không tạm dừng, adapter thật có `createGroup`. */
async function groupAccount(tx: TenantTx, registry: ChannelRegistry, id: string) {
  const a = UUID.test(id) ? await tx.channelAccount.findUnique({ where: { id }, select: { id: true, name: true, type: true, status: true, pausedAt: true } }) : null;
  if (!a) throw new AppError('NOT_FOUND', 404, { channel_account_id: 'not_found' });
  const entry = registry.get(a.type);
  if (!entry?.manifest.capabilities.createGroup || !entry.adapter?.createGroup) throw new AppError('VALIDATION_FAILED', 422, { channel_account_id: 'create_group_unsupported' });
  if (a.status !== 'connected' || a.pausedAt) throw new AppError('INVALID_STATE', 409, { channel_account_id: a.pausedAt ? 'paused' : a.status });
  return a;
}

export async function planGroup(tx: TenantTx, authz: AuthzContext, registry: ChannelRegistry, i: In): Promise<GroupPlan> {
  const account = await groupAccount(tx, registry, i.channel_account_id);
  const ids = [...new Set(i.conversation_ids)];
  const convs = await tx.conversation.findMany({ where: { id: { in: ids.filter((x) => UUID.test(x)) } } });
  const participants: Participant[] = [];
  for (const id of ids) {
    const c = convs.find((x) => x.id === id);
    // Ngoài scope trả như không tồn tại (không lộ hội thoại của người khác).
    if (!c || !(await canSeeConversation(tx, authz, c))) throw new AppError('NOT_FOUND', 404, { conversation_ids: `not_found:${id}` });
    if (c.channelAccountId !== account.id) throw new AppError('VALIDATION_FAILED', 422, { conversation_ids: `other_account:${id}` });
    if (c.kind !== 'direct') throw new AppError('VALIDATION_FAILED', 422, { conversation_ids: `not_direct:${id}` });
    const p = await tx.conversationParticipant.findFirst({ where: { conversationId: c.id }, select: { displayName: true } });
    const name = c.contactId ? ((await tx.contact.findUnique({ where: { id: c.contactId }, select: { name: true } }))?.name ?? null) : null;
    participants.push({ external_id: c.externalThreadId, display_name: name ?? p?.displayName ?? c.title ?? '', contact_id: c.contactId, conversation_id: c.id });
  }
  const members = participants.map((p) => p.external_id).sort();
  const digest = createHash('sha256').update(JSON.stringify([account.id, i.name.trim(), members])).digest('hex');
  return { account, name: i.name.trim(), participants, digest };
}

/** DTO trạng thái (HTTP + đọc của Trợ lý) — không trả id phía kênh của khách. */
export function requestDto(r: { id: string; channelAccountId: string; name: string; status: string; conversationId: string | null; participants: unknown; added: unknown; failedMembers: unknown; error: string | null; createdAt: Date; updatedAt: Date }) {
  const ps = (r.participants as Participant[]) ?? [];
  const added = new Set((r.added as string[]) ?? []);
  const failed = new Set((r.failedMembers as string[]) ?? []);
  return {
    request_id: r.id,
    channel_account_id: r.channelAccountId,
    name: r.name,
    status: r.status as 'queued' | 'running' | 'succeeded' | 'failed' | 'unknown',
    conversation_id: r.conversationId,
    members: ps.map((p) => ({ conversation_id: p.conversation_id, name: p.display_name, result: added.has(p.external_id) ? 'added' : failed.has(p.external_id) ? 'failed' : null })),
    error: r.error,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}

// Đọc trạng thái nhóm cho Hộp thư + Trợ lý (TIP-025b §A.1, §A.4): chính sách + revision, số thành viên QUAN SÁT trong AppChat (nhãn
// observed), ảnh chụp nhà cung cấp lần đọc gần nhất (fetched_at + complete), thao tác hỗ trợ theo manifest + vai trò, lệnh đang mở.
// Không có URL link. Ứng viên thêm thành viên: hội thoại 1-1 người xem thấy được trên đúng tài khoản của nhóm (keyset theo id).
import type { ChannelRegistry } from '@appchat/channels';
import { AppError, can, type AuthzContext, type GroupCommandDto, type GroupStateDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { convScopeSql, UUID, visibleConversation } from '../services/access';
import { TenantSql as Prisma } from '@appchat/db';
import { groupCommandDto, supports } from './group-commands';

export async function groupState(tx: TenantTx, authz: AuthzContext, registry: ChannelRegistry, id: string): Promise<GroupStateDto> {
  const c = await visibleConversation(tx, authz, id);
  if (c.kind !== 'group') throw new AppError('NOT_FOUND', 404, { conversation_id: 'not_group' });
  const [st, observed, open] = await Promise.all([
    tx.conversationGroupState.findUnique({ where: { conversationId: c.id } }),
    tx.conversationParticipant.count({ where: { conversationId: c.id } }),
    tx.groupCommand.findMany({ where: { conversationId: c.id, status: { in: ['queued', 'dispatch_reserved'] } }, select: { id: true, kind: true }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);
  const manage = can(authz, 'inbox.manage');
  const notMember = st?.accountRole !== 'member';
  return {
    conversation_id: c.id,
    policy: (c.groupAiPolicy ?? 'mention') as GroupStateDto['policy'],
    policy_version: st?.policyRevision ?? 0,
    observed_members: observed,
    provider: st?.fetchedAt
      ? { name: st.providerName, total: st.providerTotal, complete: st.complete, account_role: st.accountRole as 'owner' | 'admin' | 'member' | null, link_enabled: st.linkEnabled, muted: st.muted, version: st.providerVersion, fetched_at: st.fetchedAt.toISOString() }
      : null,
    supports: {
      refresh: supports(registry, c, 'refresh'),
      add_members: supports(registry, c, 'add_members'),
      update: supports(registry, c, 'update') && notMember,
      set_mute: supports(registry, c, 'set_mute'),
      link: supports(registry, c, 'update') && notMember,
    },
    can_manage: manage,
    pending: open.map((o) => ({ id: o.id, kind: o.kind as GroupStateDto['pending'][number]['kind'] })),
  };
}

/** Trạng thái một lệnh nhóm — cần inbox.manage (lệnh làm mới: inbox.view) + thấy hội thoại; không phải lệnh nhóm → 404. */
export async function groupCommand(tx: TenantTx, authz: AuthzContext, commandId: string): Promise<GroupCommandDto> {
  const missing = () => new AppError('NOT_FOUND', 404, { command_id: 'not_found' });
  const r = UUID.test(commandId) ? await tx.groupCommand.findUnique({ where: { id: commandId } }) : null;
  if (!r) throw missing();
  if (r.kind !== 'refresh' && !can(authz, 'inbox.manage')) throw missing();
  try {
    await visibleConversation(tx, authz, r.conversationId);
  } catch {
    throw missing();
  }
  return groupCommandDto(r);
}

/** Ứng viên thêm vào nhóm (hội thoại 1-1 cùng tài khoản, trong scope người xem), keyset theo id. */
export async function groupCandidates(tx: TenantTx, authz: AuthzContext, id: string, cursor: string | undefined, limit = 50) {
  const c = await visibleConversation(tx, authz, id);
  if (c.kind !== 'group') throw new AppError('NOT_FOUND', 404, { conversation_id: 'not_group' });
  const after = cursor && UUID.test(cursor) ? Prisma.sql`AND cv.id > ${cursor}::uuid` : Prisma.empty;
  const size = Math.min(50, Math.max(1, limit));
  const rows = await tx.$queryRaw<{ id: string; title: string | null; contact_id: string | null }[]>`
    SELECT cv.id, cv.title, cv.contact_id FROM conversation cv
    WHERE cv.channel_account_id = ${c.channelAccountId}::uuid AND cv.kind = 'direct' AND ${convScopeSql(authz)} ${after}
    ORDER BY cv.id LIMIT ${size + 1}`;
  const page = rows.slice(0, size);
  return { data: page.map((r) => ({ conversation_id: r.id, title: r.title ?? '', contact_id: r.contact_id })), next_cursor: rows.length > size ? (page.at(-1)?.id ?? null) : null };
}

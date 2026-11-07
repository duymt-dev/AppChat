// Ứng viên phụ trách hội thoại (TIP-025b §B.6): người = thành viên đang hoạt động (CrmMembers — cùng nguồn conversation.assign kiểm),
// agent = đang chạy (active, đã xuất bản), nhận đúng loại kênh của hội thoại (`channels`; rỗng = mọi kênh như Builder), chưa xoá. Kèm tải
// mở: người theo `conversation_routing_load_idx` (cùng nghĩa 042b), agent đếm hội thoại mở đang giao. Cần inbox.assign + thấy hội thoại.
// Trang theo vị trí trong danh sách đã sắp (người trước, agent sau) — không cắt ở trang agent đầu. Ghi vẫn chỉ qua conversation.assign.
import { AppError, ASSIGNEE_PAGE, can, isSystemRole, ROLE_NAMES, type AssigneeCandidateDto, type AssigneeCandidatesDto, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { assigneeLoadOf, type CrmMembers } from '../../crm/public';
import { visibleConversation } from './access';

export async function assigneeCandidates(tx: TenantTx, authz: AuthzContext, members: CrmMembers, ws: string, conversationId: string, cursor?: string, q?: string): Promise<AssigneeCandidatesDto> {
  if (!can(authz, 'inbox.assign')) throw new AppError('FORBIDDEN', 403, { permission: 'inbox.assign' });
  const c = await visibleConversation(tx, authz, conversationId);
  const needle = (q ?? '').trim().toLowerCase();
  const people = (await members.list(ws)).filter((m) => !needle || m.name.toLowerCase().includes(needle));
  const agents = await tx.aiAgent.findMany({
    where: { status: 'active', deletedAt: null, publishedVersion: { gt: 0 }, OR: [{ channels: { has: c.channelType } }, { channels: { isEmpty: true } }] },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: { id: true, name: true, role: true, roleLabel: true, publishedVersion: true },
  });
  const bots = agents.filter((a) => !needle || a.name.toLowerCase().includes(needle));
  const all: { kind: 'user' | 'agent'; id: string }[] = [...people.map((p) => ({ kind: 'user' as const, id: p.id })), ...bots.map((a) => ({ kind: 'agent' as const, id: a.id }))];
  const start = Math.max(0, Number.parseInt(cursor ?? '0', 10) || 0);
  const page = all.slice(start, start + ASSIGNEE_PAGE);
  const userIds = page.filter((x) => x.kind === 'user').map((x) => x.id);
  const agentIds = page.filter((x) => x.kind === 'agent').map((x) => x.id);
  const load = await assigneeLoadOf(tx, userIds);
  const agentLoad = new Map(
    (agentIds.length
      ? await tx.conversation.groupBy({ by: ['assigneeAgentId'], where: { assigneeAgentId: { in: agentIds }, status: { in: ['open', 'pending', 'snoozed'] }, archivedAt: null, hiddenAt: null }, _count: { _all: true } })
      : []
    ).map((r) => [r.assigneeAgentId!, r._count._all]),
  );
  const pBy = new Map(people.map((p) => [p.id, p]));
  const aBy = new Map(bots.map((a) => [a.id, a]));
  const data: AssigneeCandidateDto[] = page.map((x) => {
    if (x.kind === 'user') {
      const p = pBy.get(x.id)!;
      return { kind: 'user', id: p.id, name: p.name, role: isSystemRole(p.roleKey) ? ROLE_NAMES[p.roleKey] : p.roleKey.replace(/^custom:/, ''), load: load.get(p.id) ?? 0, current: c.assigneeUserId === p.id };
    }
    const a = aBy.get(x.id)!;
    return { kind: 'agent', id: a.id, name: a.name, role: a.roleLabel || a.role, load: agentLoad.get(a.id) ?? 0, current: c.assigneeAgentId === a.id, version: a.publishedVersion };
  });
  return { data, next_cursor: start + ASSIGNEE_PAGE < all.length ? String(start + ASSIGNEE_PAGE) : null };
}

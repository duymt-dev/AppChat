// Preview gán / thẻ hội thoại (TIP-023b R2.8): assign → người / agent trước và sau (tên); tag → thẻ thêm (mới tạo hay có sẵn); set_tags →
// danh sách thẻ trước / sau; bulk_update → số hội thoại + thay đổi chung. Chỉ đọc — thẻ chưa có chỉ được tạo ở execute.
import type { ActionInput, ActionPreview, conversationAssign, conversationBulkUpdate, conversationSetTags, conversationTag } from '@appchat/actions';
import type { AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import type { CrmMembers } from '../../../crm/public';
import { defined, line, preview, updated } from '../../../kernel/actions/preview-kit';
import { writableConversation } from '../../services/access';
import { tagByLabel, tagNamesOf } from '../kit';
import { convTitle } from './conversation-state.handlers.preview';

const agentName = async (tx: TenantTx, id: string | null) =>
  id ? ((await tx.aiAgent.findFirst({ where: { id }, select: { name: true } }))?.name ?? id) : null;

export async function assignPreview(tx: TenantTx, a: AuthzContext, members: CrmMembers, i: ActionInput<typeof conversationAssign>): Promise<ActionPreview> {
  const c = await writableConversation(tx, a, i.conversation_id);
  const names = await members.names([c.assigneeUserId, i.user_id]);
  const who = (id: string | null | undefined) => (id ? (names.get(id) ?? id) : null);
  const cur = i.user_id ? { assignee: who(c.assigneeUserId) } : { agent: await agentName(tx, c.assigneeAgentId) };
  const next = i.user_id ? { assignee: who(i.user_id) } : { agent: await agentName(tx, i.agent_id ?? null) };
  return preview('write', line(await convTitle(tx, c), Object.values(next)[0]), { changes: updated('conversation', c.id, cur, next) });
}

export async function tagPreview(tx: TenantTx, a: AuthzContext, i: ActionInput<typeof conversationTag>): Promise<ActionPreview> {
  const c = await writableConversation(tx, a, i.conversation_id);
  const hit = await tagByLabel(tx, i.tag, null, new Date(0), false);
  const tags = await tagNamesOf(tx, c.id);
  const name = hit?.name ?? i.tag.trim();
  return preview('write', line(await convTitle(tx, c), name), {
    changes: updated('conversation', c.id, { tags }, { tags: tags.includes(name) ? tags : [...tags, name] }),
    ...(hit ? {} : { warnings: [`new_tag:${name}`] }),
  });
}

export async function setTagsPreview(tx: TenantTx, a: AuthzContext, i: ActionInput<typeof conversationSetTags>): Promise<ActionPreview> {
  const c = await writableConversation(tx, a, i.conversation_id);
  const next: string[] = [];
  for (const label of i.tags) {
    const name = (await tagByLabel(tx, label, null, new Date(0), false))?.name ?? label.trim();
    if (!next.includes(name)) next.push(name);
  }
  return preview('write', await convTitle(tx, c), { changes: updated('conversation', c.id, { tags: await tagNamesOf(tx, c.id) }, { tags: next }) });
}

export async function bulkPreview(n: number, members: CrmMembers, i: ActionInput<typeof conversationBulkUpdate>): Promise<ActionPreview> {
  const who = i.assignee_user_id ? ((await members.names([i.assignee_user_id])).get(i.assignee_user_id) ?? i.assignee_user_id) : undefined;
  const after = defined({ assignee: who, status: i.status, archived: i.archive, add_tags: i.add_tags?.length ? i.add_tags : undefined });
  return preview('write', `${n}`, { count: n, changes: [{ entity: 'conversation', after }] });
}

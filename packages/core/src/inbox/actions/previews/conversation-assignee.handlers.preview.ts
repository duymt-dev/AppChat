// Preview thêm / gỡ đồng phụ trách hội thoại (mirror contact-owner.handlers.preview.ts) — chỉ đọc, luật ở execute.
import type { ActionInput, ActionPreview, conversationAddAssignee, conversationRemoveAssignee } from '@appchat/actions';
import type { AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import type { CrmMembers } from '../../../crm/public';
import { line, preview, updated } from '../../../kernel/actions/preview-kit';
import { writableConversation } from '../../services/access';
import { convTitle } from './conversation-state.handlers.preview';

async function nameOf(tx: TenantTx, members: CrmMembers, kind: 'user' | 'agent', id: string): Promise<string> {
  if (kind === 'agent') return (await tx.aiAgent.findFirst({ where: { id }, select: { name: true } }))?.name ?? id;
  return (await members.names([id])).get(id) ?? id;
}

export async function addAssigneePreview(tx: TenantTx, a: AuthzContext, members: CrmMembers, i: ActionInput<typeof conversationAddAssignee>): Promise<ActionPreview> {
  const c = await writableConversation(tx, a, i.conversation_id);
  const who = await nameOf(tx, members, i.kind, i.assignee_id);
  return preview('write', line(await convTitle(tx, c), who), { changes: updated('conversation_assignee', c.id, { assignee: null }, { assignee: who }) });
}

export async function removeAssigneePreview(tx: TenantTx, a: AuthzContext, members: CrmMembers, i: ActionInput<typeof conversationRemoveAssignee>): Promise<ActionPreview> {
  const c = await writableConversation(tx, a, i.conversation_id);
  const who = await nameOf(tx, members, i.kind, i.assignee_id);
  return preview('write', line(await convTitle(tx, c), who), { changes: [{ entity: 'conversation_assignee', id: c.id, before: { assignee: who } }] });
}

// Preview phụ trách / chia sẻ khách (TIP-023b R2.8): thêm / gỡ đồng phụ trách → người + vai trò trước / sau; chuyển phụ trách → người cũ / mới
// (tên) + số hội thoại đang mở sẽ chuyển theo; xin chia sẻ → khách (chỉ mã + tên — người xin chưa thấy hồ sơ); duyệt → người xin + quyết định.
// Chỉ đọc; luật ai được làm gì vẫn ở execute.
import type { ActionInput, ActionPreview, contactAddCollaborator, contactDecideAccess, contactRemoveCollaborator, contactRequestAccess, contactTransferOwner } from '@appchat/actions';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { line, preview, updated } from '../../../kernel/actions/preview-kit';
import { UUID, visibleContact } from '../../services/access';
import type { CrmMembers } from '../../services/members.service';

const nameOf = async (members: CrmMembers, id: string | null | undefined) => (id ? ((await members.names([id])).get(id) ?? id) : null);

async function collabRole(tx: TenantTx, contactId: string, userId: string) {
  if (!UUID.test(userId)) return null;
  return (await tx.contactCollaborator.findUnique({ where: { contactId_userId: { contactId, userId } }, select: { role: true } }))?.role ?? null;
}

export async function addCollaboratorPreview(tx: TenantTx, a: AuthzContext, members: CrmMembers, i: ActionInput<typeof contactAddCollaborator>): Promise<ActionPreview> {
  const { contact: c } = await visibleContact(tx, a, i.contact_id);
  const who = await nameOf(members, i.user_id);
  return preview('write', line(c.code, c.name, who), { changes: updated('contact_collaborator', c.id, { user: who, role: await collabRole(tx, c.id, i.user_id) }, { user: who, role: i.role }) });
}

export async function removeCollaboratorPreview(tx: TenantTx, a: AuthzContext, members: CrmMembers, i: ActionInput<typeof contactRemoveCollaborator>): Promise<ActionPreview> {
  const { contact: c } = await visibleContact(tx, a, i.contact_id);
  const who = await nameOf(members, i.user_id);
  return preview('write', line(c.code, c.name, who), { changes: [{ entity: 'contact_collaborator', id: c.id, before: { user: who, role: await collabRole(tx, c.id, i.user_id) } }] });
}

export async function transferOwnerPreview(tx: TenantTx, a: AuthzContext, members: CrmMembers, i: ActionInput<typeof contactTransferOwner>): Promise<ActionPreview> {
  const { contact: c } = await visibleContact(tx, a, i.contact_id);
  const [from, to] = [await nameOf(members, c.ownerUserId), await nameOf(members, i.to_user_id)];
  const convs = i.move.conversations ? await tx.conversation.count({ where: { contactId: c.id, status: { not: 'closed' } } }) : 0;
  return preview('write', line(c.code, c.name, to), { count: convs, changes: [...updated('contact', c.id, { owner: from }, { owner: to }), ...(convs ? [{ entity: 'conversation', after: { assignee: to, count: convs } }] : [])] });
}

/** Người xin chưa thấy hồ sơ — chỉ mã + tên (như lỗi CONTACT_OWNED đã trả). */
export async function requestAccessPreview(tx: TenantTx, i: ActionInput<typeof contactRequestAccess>): Promise<ActionPreview> {
  const c = UUID.test(i.contact_id) ? await tx.contact.findUnique({ where: { id: i.contact_id }, select: { id: true, code: true, name: true, deletedAt: true } }) : null;
  if (!c || c.deletedAt) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
  return preview('write', line(c.code, c.name), { changes: [{ entity: 'contact_access_request', after: { contact: c.code, note: i.note?.trim() || undefined } }] });
}

export async function decideAccessPreview(tx: TenantTx, members: CrmMembers, i: ActionInput<typeof contactDecideAccess>): Promise<ActionPreview> {
  const r = UUID.test(i.request_id) ? await tx.contactAccessRequest.findUnique({ where: { id: i.request_id } }) : null;
  if (!r) throw new AppError('NOT_FOUND', 404, { request_id: 'not_found' });
  const c = await tx.contact.findUniqueOrThrow({ where: { id: r.contactId }, select: { code: true, name: true } });
  const who = await nameOf(members, r.requesterUserId);
  return preview('write', line(c.code, c.name, who), { changes: updated('contact_access_request', r.id, { status: r.status }, { status: i.decision }) });
}

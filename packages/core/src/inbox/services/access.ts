// Quyền trên một hội thoại (rbac-permissions §5, D32): data scope `inbox`.
// own  → hội thoại gán cho mình + hội thoại của khách mình phụ trách / đồng phụ trách / theo dõi (contact_collaborator)
// team → như own, mở rộng cho thành viên các nhóm của mình · all / none.
// Không thấy → 404 (không lộ tồn tại — rbac §9); thấy nhưng ghi bị chặn do scope → 403 SCOPE_FORBIDDEN.
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const level = (authz: AuthzContext) => (authz.isOwner ? 'all' : authz.scope.inbox);
const people = (authz: AuthzContext) => [...new Set([authz.userId, ...(level(authz) === 'team' ? (authz.teamUserIds ?? []) : [])])];

/** Điều kiện SQL (alias `cv`) cho danh sách hội thoại theo scope inbox. */
export function convScopeSql(authz: AuthzContext): Prisma.Sql {
  const l = level(authz);
  if (l === 'all') return Prisma.sql`TRUE`;
  if (l === 'none') return Prisma.sql`FALSE`;
  const ids = Prisma.join(people(authz).map((x) => Prisma.sql`${x}::uuid`));
  return Prisma.sql`(cv.assignee_user_id IN (${ids})
    OR EXISTS (SELECT 1 FROM contact k WHERE k.id = cv.contact_id AND k.owner_user_id IN (${ids}))
    OR EXISTS (SELECT 1 FROM contact_collaborator cc WHERE cc.contact_id = cv.contact_id AND cc.user_id IN (${ids})))`;
}

interface ConvRef {
  id: string;
  contactId: string | null;
  assigneeUserId: string | null;
}

/** Người xem thấy hội thoại này không (một bản ghi — handler / get / guard phòng realtime). */
export async function canSeeConversation(tx: Pick<TenantTx, 'contact' | 'contactCollaborator'>, authz: AuthzContext, c: ConvRef): Promise<boolean> {
  const l = level(authz);
  if (l === 'all') return true;
  if (l === 'none') return false;
  const who = people(authz);
  if (c.assigneeUserId && who.includes(c.assigneeUserId)) return true;
  if (!c.contactId) return false;
  const k = await tx.contact.findUnique({ where: { id: c.contactId }, select: { ownerUserId: true } });
  if (k?.ownerUserId && who.includes(k.ownerUserId)) return true;
  return (await tx.contactCollaborator.count({ where: { contactId: c.contactId, userId: { in: who } } })) > 0;
}

type Conv = NonNullable<Awaited<ReturnType<TenantTx['conversation']['findUnique']>>>;

/** Hội thoại người gọi thấy được — id lạ / ngoài scope → 404. */
export async function visibleConversation(tx: TenantTx, authz: AuthzContext, id: string): Promise<Conv> {
  const c = UUID.test(id) ? await tx.conversation.findUnique({ where: { id } }) : null;
  if (!c || !(await canSeeConversation(tx, authz, c))) throw new AppError('NOT_FOUND', 404, { conversation_id: 'not_found' });
  return c;
}

/**
 * Hội thoại cho handler ghi: id lạ → 404; tồn tại nhưng ngoài scope → 403 SCOPE_FORBIDDEN (action-registry §5 bước 3 —
 * như crm `editableContact`: executor đã qua permission, handler báo rõ lỗi scope).
 */
export async function writableConversation(tx: TenantTx, authz: AuthzContext, id: string): Promise<Conv> {
  const c = UUID.test(id) ? await tx.conversation.findUnique({ where: { id } }) : null;
  if (!c) throw new AppError('NOT_FOUND', 404, { conversation_id: 'not_found' });
  if (!(await canSeeConversation(tx, authz, c))) throw new AppError('SCOPE_FORBIDDEN', 403, { scope: 'inbox' });
  return c;
}

/** Tin thuộc hội thoại (không lộ tin hội thoại khác). */
export async function messageOf(tx: TenantTx, conversationId: string, messageId: string) {
  const m = UUID.test(messageId) ? await tx.message.findUnique({ where: { id: messageId } }) : null;
  if (!m || m.conversationId !== conversationId) throw new AppError('NOT_FOUND', 404, { message_id: 'not_found' });
  return m;
}

/** Người thực hiện của action (user gốc khi Trợ lý / agent làm thay). */
export const actorUserId = (ctx: { onBehalfOfUserId?: string; actor: { type: string; id: string } }) =>
  ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);

/** Cột scope của một hội thoại cho payload event (lọc người nhận realtime theo scope). */
export async function scopeCols(tx: Pick<TenantTx, 'contact'>, c: ConvRef & { channelAccountId: string }) {
  const k = c.contactId ? await tx.contact.findUnique({ where: { id: c.contactId }, select: { ownerUserId: true } }) : null;
  return { conversation_id: c.id, channel_account_id: c.channelAccountId, contact_id: c.contactId, assignee_user_id: c.assigneeUserId, contact_owner_user_id: k?.ownerUserId ?? null };
}

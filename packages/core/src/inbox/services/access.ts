// Quyền trên một hội thoại (rbac-permissions §5, D32, TIP-042c): data scope `inbox`, bảng chân trị chung `authz/data-access`.
// own  → hội thoại gán cho mình + hội thoại của khách mình phụ trách + quan hệ khách (collaborator / watcher ĐỌC; chỉ collaborator GHI)
// team → như own + `team_id` hội thoại ∈ nhóm mình (DC-299; không suy từ người phụ trách ∈ thành viên nhóm) · all / none (none chặn trước).
// Hội thoại nhóm (không khách) → chỉ người được gán / nhóm / all. Không thấy → 404 (rbac §9); thấy nhưng không ghi được → 403 SCOPE_FORBIDDEN.
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { POLICIES, decide, grantAllows, grantOf, recordScopeSql, type AccessMode } from '../../authz/data-access';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COLS = {
  assignee: Prisma.raw('cv.assignee_user_id'),
  team: Prisma.raw('cv.team_id'),
  contact: Prisma.raw('cv.contact_id'),
  mine: (me: string) => Prisma.sql`EXISTS (SELECT 1 FROM contact k WHERE k.id = cv.contact_id AND k.owner_user_id = ${me}::uuid)`,
};

/** Điều kiện SQL (alias `cv`) cho danh sách hội thoại theo scope inbox. */
export function convScopeSql(authz: AuthzContext, mode: AccessMode = 'read'): Prisma.Sql {
  return recordScopeSql(authz, POLICIES.inbox, mode, COLS);
}

interface ConvRef {
  id: string;
  contactId: string | null;
  assigneeUserId: string | null;
  /** `team_id` hội thoại — thiếu (select cũ) → coi như null (chỉ thu hẹp, không mở rộng). */
  teamId?: string | null;
}

type Tx = Pick<TenantTx, 'contact' | 'contactCollaborator'>;

/** Người xem được đọc / ghi hội thoại này không (một bản ghi — handler / get / guard phòng realtime). */
export async function canAccessConversation(tx: Tx, authz: AuthzContext, c: ConvRef, mode: AccessMode): Promise<boolean> {
  const ref = { assignee: c.assigneeUserId, team: c.teamId ?? null, contact: c.contactId };
  const quick = decide(authz, POLICIES.inbox, mode, ref);
  if (quick !== 'grant') return quick;
  const k = await tx.contact.findUnique({ where: { id: c.contactId! }, select: { ownerUserId: true } });
  if (k?.ownerUserId === authz.userId) return true;
  return grantAllows(await grantOf(tx, c.contactId, authz.userId), mode);
}

/** Người xem THẤY hội thoại này không (đọc). */
export const canSeeConversation = (tx: Tx, authz: AuthzContext, c: ConvRef): Promise<boolean> => canAccessConversation(tx, authz, c, 'read');

export type Conv = NonNullable<Awaited<ReturnType<TenantTx['conversation']['findUnique']>>>;

/** Hội thoại người gọi thấy được — id lạ / ngoài scope → 404. */
export async function visibleConversation(tx: TenantTx, authz: AuthzContext, id: string): Promise<Conv> {
  const c = UUID.test(id) ? await tx.conversation.findUnique({ where: { id } }) : null;
  if (!c || !(await canSeeConversation(tx, authz, c))) throw new AppError('NOT_FOUND', 404, { conversation_id: 'not_found' });
  return c;
}

/**
 * Hội thoại cho handler ghi (gửi tin, gán, gắn thẻ, đổi trạng thái…): không thấy → 404; thấy nhưng chỉ đọc (watcher / scope ghi hẹp
 * hơn) → 403 SCOPE_FORBIDDEN (action-registry §5 bước 3).
 */
export async function writableConversation(tx: TenantTx, authz: AuthzContext, id: string): Promise<Conv> {
  const c = await visibleConversation(tx, authz, id);
  if (!(await canAccessConversation(tx, authz, c, 'write'))) throw new AppError('SCOPE_FORBIDDEN', 403, { scope: 'inbox' });
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
  return {
    conversation_id: c.id,
    channel_account_id: c.channelAccountId,
    contact_id: c.contactId,
    assignee_user_id: c.assigneeUserId,
    contact_owner_user_id: k?.ownerUserId ?? null,
    ...(c.teamId ? { team_id: c.teamId } : {}),
  };
}

// Quyền hoạt động CRM (TIP-026b §1–2): mọi đọc / ghi / hoàn tác kiểm lại khách cha theo scope HIỆN TẠI (khách đã xoá / gộp → không nhận
// hoạt động mới), nguồn hội thoại / tin phải thuộc đúng khách + người gọi đang thấy (inbox.view) — không kéo nội dung bằng id giả. Tiền cơ
// hội theo chính sách trường tiền 045b: đọc cần crm.view ∩ quote.view, ghi (kể cả xoá về null) cần crm.edit ∩ quote.create — giao quyền
// sẵn có, KHÔNG thêm quyền. Người được giao việc phải là thành viên active còn quyền sửa khách — giao việc không cấp quyền.
import { AppError, type AuthzContext } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { editableContact, visibleContact, actorUserId } from '../services/access';
import { canSeeConversation, messageOf } from '../../inbox/services/access';

/** Người thấy giá trị kỳ vọng của cơ hội. */
export const canReadAmount = (a: AuthzContext) => a.isOwner || a.permissions.has('quote.view');
/** Người được ghi / xoá giá trị kỳ vọng. */
export const canWriteAmount = (a: AuthzContext) => a.isOwner || a.permissions.has('quote.create');

/** Khách cha cho ghi (thấy + sửa được); xoá / gộp → 404. */
export const writableParent = (tx: TenantTx, authz: AuthzContext, contactId: string) => editableContact(tx, authz, contactId);
/** Khách cha cho đọc. */
export const readableParent = (tx: TenantTx, authz: AuthzContext, contactId: string) => visibleContact(tx, authz, contactId);

/** Nguồn hội thoại / tin: hội thoại thuộc ĐÚNG khách, người gọi thấy, tin thuộc hội thoại đó. Sai → 422 (không lộ tồn tại). */
export async function checkSource(tx: TenantTx, authz: AuthzContext, contactId: string, src: { source_conversation_id?: string; source_message_id?: string }) {
  const conv = src.source_conversation_id;
  if (!conv) {
    if (src.source_message_id) throw new AppError('VALIDATION_FAILED', 422, { source_message_id: 'needs_conversation' });
    return { sourceConversationId: null, sourceMessageId: null };
  }
  const c = await tx.conversation.findUnique({ where: { id: conv } });
  if (!c || c.contactId !== contactId || !authz.permissions.has('inbox.view') || !(await canSeeConversation(tx, authz, c))) {
    throw new AppError('VALIDATION_FAILED', 422, { source_conversation_id: 'invalid' });
  }
  if (src.source_message_id) await messageOf(tx, conv, src.source_message_id).catch(() => {
    throw new AppError('VALIDATION_FAILED', 422, { source_message_id: 'invalid' });
  });
  return { sourceConversationId: conv, sourceMessageId: src.source_message_id ?? null };
}

/** Tác giả bản ghi: người thật (kể cả Trợ lý làm thay) hoặc agent kênh (không giả id agent thành user). */
export function authorOf(ctx: ActionContext) {
  const user = actorUserId(ctx);
  return { userId: user, actorType: user ? 'user' : ctx.actor.type, actorId: user ? null : ctx.actor.id };
}

/**
 * Người được giao việc: thành viên active + còn quyền sửa khách (theo quyền CỦA HỌ, không của người giao). `resolve` trả quyền hiện tại
 * của thành viên (null = không còn active).
 */
export async function checkAssignee(tx: TenantTx, contactId: string, userId: string, resolve: (userId: string) => Promise<AuthzContext | null>) {
  const a = await resolve(userId);
  if (!a || !(a.isOwner || a.permissions.has('crm.edit'))) throw new AppError('VALIDATION_FAILED', 422, { assignee_user_id: 'not_eligible' });
  await editableContact(tx, a, contactId).catch(() => {
    throw new AppError('VALIDATION_FAILED', 422, { assignee_user_id: 'not_eligible' });
  });
}

/** Đối chiếu version: lệch → 409 STALE_VERSION (kèm version hiện tại). */
export function checkVersion(current: number, ifVersion: number | undefined) {
  if (ifVersion !== undefined && ifVersion !== current) throw new AppError('STALE_VERSION', 409, { version: String(current) });
}

// Hoàn tác chuyển phụ trách (TIP-015d §4.1–4.2): chỉ lần chuyển MỚI NHẤT của khách (generation khớp, owner vẫn là người nhận), mọi bản ghi
// đã ghi biên nhận còn đúng revision sau chuyển — một dòng lệch / bị xoá / có bản báo giá mới → 409 cho CẢ lần hoàn tác (không khôi phục
// một phần). Không quét lại quan hệ của khách; bản ghi tạo sau lần chuyển không bị đụng. Người cũ chỉ trả lại nếu còn là thành viên active
// (hoặc vốn null); tên / giai đoạn / trường tuỳ biến / tiền giữ nguyên. Quan hệ cũ của người nhận trả lại nếu chưa có quan hệ mới.
import { AppError, can } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { OWNERSHIP_DOMAINS } from '../../kernel/ownership/ports';
import { ownershipPort } from '../../kernel/ownership/registry';
import { editableContact } from '../services/access';
import { lockLiveContact } from './contact-lock';
import { itemsOf } from './receipts.repo';

export interface UndoDeps {
  /** Còn là thành viên active của workspace. */
  isActiveMember(workspaceId: string, userId: string): Promise<boolean>;
}

type Event = { topic: string; payload: Record<string, unknown> };

export async function undoTransfer(ctx: ActionContext, tx: TenantTx, transferId: string, d: UndoDeps, now: Date): Promise<{ events: Event[] }> {
  const t = await tx.contactTransfer.findUnique({ where: { id: transferId } });
  if (!t) throw new AppError('NOT_FOUND', 404, { transfer_id: 'not_found' });
  if (t.status !== 'applied') throw new AppError('CONFLICT', 409, { transfer: 'already_undone' });
  const c = await lockLiveContact(tx, t.contactId);
  if (c.transferGeneration !== t.generation || c.ownerUserId !== t.toUserId) throw new AppError('CONFLICT', 409, { owner_user_id: 'changed' });
  // Quyền HIỆN TẠI của người hoàn tác: crm.reassign + scope ghi khách (UndoService chỉ kiểm người làm / Owner).
  if (!can(ctx.authz, 'crm.reassign')) throw new AppError('FORBIDDEN', 403, { permission: 'crm.reassign' });
  await editableContact(tx, ctx.authz, c.id);
  if (t.fromUserId && !(await d.isActiveMember(ctx.workspaceId, t.fromUserId))) throw new AppError('CONFLICT', 409, { from_user_id: 'inactive' });
  const items = await itemsOf(tx, t.id);
  const events: Event[] = [];
  // Thứ tự khoá như chiều đi: hội thoại → báo giá → lịch hẹn (mỗi domain id tăng). Domain không có biên nhận không cần port.
  for (const domain of OWNERSHIP_DOMAINS) {
    if (items[domain].length) events.push(...(await ownershipPort(domain).undo(tx, items[domain], t.toUserId)).events);
  }
  // Nhóm chỉ trả về khi chưa ai đổi tiếp (CAS theo giá trị đã đặt — TIP-042c).
  await tx.contact.update({ where: { id: c.id }, data: { ownerUserId: t.fromUserId, ...(c.teamId === t.toTeamId ? { teamId: t.fromTeamId } : {}), updatedAt: now } });
  const collab = t.collab as { role: 'collaborator' | 'watcher'; added_by: string | null } | null;
  if (collab) await tx.contactCollaborator.createMany({ data: [{ contactId: c.id, userId: t.toUserId, role: collab.role, addedBy: collab.added_by }], skipDuplicates: true });
  const n = await tx.contactTransfer.updateMany({ where: { id: t.id, status: 'applied' }, data: { status: 'undone', undoneAt: now } });
  if (n.count !== 1) throw new AppError('CONFLICT', 409, { transfer: 'already_undone' });
  // Về chưa có người phụ trách: không có đích cho `contact.owner_changed` (to bắt buộc) — Hộp thư / CRM làm mới qua event hội thoại + invalidates.
  if (t.fromUserId) events.unshift({ topic: 'contact.owner_changed', payload: { contact_id: c.id, from: t.toUserId, to: t.fromUserId, move: t.move, transfer_id: t.id, undo: true } });
  return { events };
}

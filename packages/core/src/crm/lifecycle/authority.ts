// Điều kiện xoá / khôi phục khách hiện tại (TIP-015f §1.5): crm.delete (action đã kiểm) + scope GHI crm qua chính người phụ trách hoặc
// scope (own = mình phụ trách; team = nhóm của khách ∈ nhóm mình; all). Bảng chân trị none-chặn-trước của 042c — nhưng quan hệ
// collaborator / watcher KHÔNG đủ (D32: collaborator-only không có quyền xoá / khôi phục; thấy trong thùng rác ≠ quyền ghi). Áp được cho
// dòng đã xoá (chỉ dùng cho kiểm tra khôi phục). Không đủ → 403 nếu đọc được, 404 nếu không thấy (không lộ tồn tại).
import { AppError, type AuthzContext } from '@appchat/shared';
import { POLICIES, decide } from '../../authz/data-access';

interface Row {
  id: string;
  ownerUserId: string | null;
  teamId: string | null;
}

const ref = (c: Row) => ({ owner: c.ownerUserId, team: c.teamId, contact: c.id });

/** Có quyền xoá / khôi phục khách này (không xét quan hệ collaborator). */
export function canDeleteContact(authz: AuthzContext, c: Row): boolean {
  return decide(authz, POLICIES.crm, 'write', ref(c), null) === true;
}

/** Ném 404 (không thấy theo scope đọc, kể cả quan hệ) hoặc 403 (thấy mà không đủ điều kiện xoá). */
export function assertDeleteAuthority(authz: AuthzContext, c: Row, readable: boolean): void {
  if (canDeleteContact(authz, c)) return;
  if (!readable) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
  throw new AppError('SCOPE_FORBIDDEN', 403, { contact_id: 'scope' });
}

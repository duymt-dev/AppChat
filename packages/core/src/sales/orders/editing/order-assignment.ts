// Người tạo / người phụ trách đơn (TIP-032c §1, COMMERCE §8b): `owner_user_id` là người tạo tính doanh số — bất biến (trigger + 422 ở đây);
// gửi lại đúng giá trị cũ được bỏ qua. `assigned_user_id` là người phụ trách vận hành: UUID thành viên đang hoạt động hoặc null (chưa
// giao). Gán không cấp vai trò / quyền module, không đổi người phụ trách / cộng tác của khách.
import { AppError } from '@appchat/shared';
import type { ActionContext } from '../../../kernel/actions/action-context';
import type { CrmMembers } from '../../../crm/public';

/** Người tạo trong patch sửa: vắng / trùng hiện tại → bỏ qua; khác / rỗng / null → 422 immutable. */
export function checkOwnerEcho(sent: string | null | undefined, current: string | null, field = 'patch.owner_user_id') {
  if (sent === undefined) return;
  if (sent !== null && sent !== '' && sent === current) return;
  throw new AppError('VALIDATION_FAILED', 422, { [field]: 'immutable' });
}

/** Người phụ trách mới: null = bỏ giao; id phải là thành viên đang hoạt động (không → 422 not_member). */
export async function checkAssignee(ctx: ActionContext, members: CrmMembers, value: string | null | undefined, field = 'patch.assigned_user_id') {
  if (value === undefined || value === null) return;
  await members.assertMember(ctx.workspaceId, value, field);
}

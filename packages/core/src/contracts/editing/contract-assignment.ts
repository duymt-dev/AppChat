// Người tạo / người phụ trách hợp đồng (TIP-032c §1, COMMERCE §8b): `owner_user_id` = người làm hợp đồng tính doanh số — bất biến (trigger +
// 422); gửi lại đúng giá trị cũ được bỏ qua. `assigned_user_id` = người phụ trách vận hành (thành viên đang hoạt động hoặc null).
import { AppError } from '@appchat/shared';
import type { ActionContext } from '../../kernel/actions/action-context';
import type { CrmMembers } from '../../crm/public';

export function checkContractOwnerEcho(sent: string | null | undefined, current: string | null) {
  if (sent === undefined || (sent !== null && sent !== '' && sent === current)) return;
  throw new AppError('VALIDATION_FAILED', 422, { 'patch.owner_user_id': 'immutable' });
}

export async function checkContractAssignee(ctx: ActionContext, members: CrmMembers, value: string | null | undefined) {
  if (value === undefined || value === null) return;
  await members.assertMember(ctx.workspaceId, value, 'patch.assigned_user_id');
}

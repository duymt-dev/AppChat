// Kiểm chung của member.set_role / member.remove: người đích là thành viên active (không → 404), không phải Owner
// (`workspace.owner_user_id` — rbac-permissions §7, đổi Owner là workspace.transfer_ownership).
import { AppError } from '@appchat/shared';
import type { PlatformTx } from '../../kernel/actions/action-context';

export async function activeMember(ptx: Pick<PlatformTx, 'workspace' | 'membership'>, workspaceId: string, userId: string) {
  const ws = await ptx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { ownerUserId: true } });
  if (ws.ownerUserId === userId) throw new AppError('VALIDATION_FAILED', 422, { user_id: 'owner_locked' });
  const m = await ptx.membership.findFirst({ where: { workspaceId, userId, status: 'active' }, select: { userId: true, roleKey: true } });
  if (!m) throw new AppError('NOT_FOUND', 404, { user_id: 'not_member' });
  return m;
}

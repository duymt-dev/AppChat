// Preview thu hồi lời mời (TIP-023b R2.8): email + vai trò của lời mời đang chờ; không còn chờ (đã nhận / thu hồi / lạ) → 404 như
// execute. Chỉ đọc.
import type { ActionInput, ActionPreview, inviteRevoke } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import { line, preview, updated } from '../../../kernel/actions/preview-kit';
import { UUID_V7 } from '../../../kernel/ids';
import type { PlatformRead } from './platform-read';

export async function revokePreview(p: PlatformRead, ws: string, i: ActionInput<typeof inviteRevoke>): Promise<ActionPreview> {
  const inv = UUID_V7.test(i.invite_id) ? await p.invite.findFirst({ where: { id: i.invite_id, workspaceId: ws, acceptedAt: null, revokedAt: null } }) : null;
  if (!inv) throw new AppError('NOT_FOUND', 404, { invite_id: 'not_found' });
  return preview('write', line(inv.email, inv.roleKey), { changes: updated('invite', inv.id, { status: 'pending' }, { status: 'revoked' }) });
}

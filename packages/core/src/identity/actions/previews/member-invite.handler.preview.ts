// Preview mời thành viên (TIP-023b R2.8, risk send): email + tên + vai trò, thư mời gửi tới email đó; đã là thành viên → 409 như execute;
// lời mời cũ cùng email còn chờ → cảnh báo thay lời mời cũ. Hạn mức gói (402) vẫn kiểm ở execute (khoá workspace). Chỉ đọc.
import type { ActionInput, ActionPreview, memberInvite } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import { normalizeEmail } from '../../services/secrets';
import { created, line, preview } from '../../../kernel/actions/preview-kit';
import type { PlatformRead } from './platform-read';

export async function invitePreview(p: PlatformRead, ws: string, i: ActionInput<typeof memberInvite>, now: Date): Promise<ActionPreview> {
  const email = normalizeEmail(i.email);
  const u = await p.user.findUnique({ where: { email }, select: { id: true } });
  if (u && (await p.membership.findFirst({ where: { workspaceId: ws, userId: u.id, status: 'active' }, select: { userId: true } }))) throw new AppError('CONFLICT', 409, { email: 'already_member' });
  const old = await p.invite.count({ where: { workspaceId: ws, email, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } } });
  return preview('send', line(email, i.role), { changes: [created('invite', { email, name: i.name?.trim() || undefined, role: i.role })], ...(old ? { warnings: ['replaces_pending_invite'] } : {}) });
}

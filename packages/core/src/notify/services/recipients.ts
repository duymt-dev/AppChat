// Người nhận của một ý định thông báo: thành viên `active` của workspace (DB nền tảng), theo danh sách user và / hoặc
// permission (AuthzContext thật — Owner luôn có) hoặc Owner hiện tại (`ownerOnly`). Trả kèm locale + email (render theo người nhận — i18n §8).
import { can } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { AuthzResolver } from '../../authz/services/authz-resolver';
import type { NotifyIntent } from '../rules';

export interface Recipient {
  userId: string;
  email: string;
  locale: string;
}

export async function resolveRecipients(
  platform: Pick<PlatformDb, 'membership' | 'user'> & Partial<Pick<PlatformDb, 'workspace'>>,
  authz: Pick<AuthzResolver, 'resolve'>,
  workspaceId: string,
  to: NotifyIntent['to'],
  excludeUserId?: string,
): Promise<Recipient[]> {
  if (to.ownerOnly) {
    // Owner hiện tại (đọc lúc gửi) và vẫn là thành viên active — không dùng id chủ đã chụp từ trước.
    const w = await platform.workspace?.findUnique({ where: { id: workspaceId }, select: { ownerUserId: true } });
    if (!w) return [];
    to = { userIds: [w.ownerUserId] };
  }
  const members = await platform.membership.findMany({
    where: { workspaceId, status: 'active', ...(to.permission ? {} : { userId: { in: [...(to.userIds ?? [])] } }) },
    select: { userId: true, roleKey: true, delegations: true },
  });
  const listed = new Set(to.userIds ?? []);
  const picked: string[] = [];
  for (const m of members) {
    if (m.userId === excludeUserId) continue;
    if (listed.has(m.userId)) {
      picked.push(m.userId);
      continue;
    }
    if (to.permission && can(await authz.resolve(workspaceId, m.userId, m), to.permission)) picked.push(m.userId);
  }
  if (!picked.length) return [];
  const users = await platform.user.findMany({ where: { id: { in: picked } }, select: { id: true, email: true, locale: true } });
  return users.map((u) => ({ userId: u.id, email: u.email, locale: u.locale })).sort((a, b) => a.userId.localeCompare(b.userId));
}

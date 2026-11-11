// Người nhận OTP Owner HIỆN TẠI (TIP-030c §4.3): thành viên active của workspace (DB nền tảng) + quyền dựng lại (AuthzResolver, epoch) + email
// đọc lúc gửi — không dùng bản chụp địa chỉ. Gỡ thành viên / đổi vai trò / đổi email trước khi gửi → không gửi mã cũ.
import type { PlatformDb } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import type { AuthzResolver } from '../../authz/services/authz-resolver';

export const SIGNING_RECIPIENTS = Symbol('SIGNING_RECIPIENTS');

export interface SigningRecipients {
  of(ws: string, userId: string): Promise<{ email: string; authz: AuthzContext } | null>;
}

export function signingRecipients(platform: Pick<PlatformDb, 'membership' | 'user'>, authz: Pick<AuthzResolver, 'resolve'>): SigningRecipients {
  return {
    async of(ws, userId) {
      const m = await platform.membership.findUnique({ where: { workspaceId_userId: { workspaceId: ws, userId } }, select: { status: true, roleKey: true, delegations: true } });
      if (!m || m.status !== 'active') return null;
      const u = await platform.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (!u?.email) return null;
      return { email: u.email, authz: await authz.resolve(ws, userId, m) };
    },
  };
}

// Authorizer của executor (TIP-005, thay bản tạm DC-010): `self` luôn được; `platform_admin` chỉ user có `is_platform_admin`
// ở DB nền tảng; còn lại `can()` trên AuthzContext đã resolve (permission + uỷ quyền + Owner — domain authz dựng).
import { can, type PermissionKey } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { ActionContext, Authorizer } from './action-context';

export class ContextAuthorizer implements Authorizer {
  constructor(private readonly platform: PlatformDb | null = null) {}

  async can(ctx: ActionContext, permission: PermissionKey | 'platform_admin' | 'self'): Promise<boolean> {
    if (permission === 'self') return true;
    if (permission === 'platform_admin') {
      const id = ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);
      if (!this.platform || !id) return false;
      const u = await this.platform.user.findUnique({ where: { id }, select: { isPlatformAdmin: true } });
      return !!u?.isPlatformAdmin;
    }
    return can(ctx.authz, permission);
  }
}

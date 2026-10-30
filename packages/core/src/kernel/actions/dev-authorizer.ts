// Authorizer tạm (DC-010) tới khi TIP-005 cài AuthzContext thật (role / team / scope từ DB tenant):
// `self` luôn được; `platform_admin` cần ctx.authz.isOwner + cờ admin (chưa có → từ chối); còn lại theo `can()` của shared.
import { can, type PermissionKey } from '@appchat/shared';
import type { ActionContext, Authorizer } from './action-context';

export class ContextAuthorizer implements Authorizer {
  can(ctx: ActionContext, permission: PermissionKey | 'platform_admin' | 'self'): boolean {
    if (permission === 'self') return true;
    if (permission === 'platform_admin') return false;
    return can(ctx.authz, permission);
  }
}

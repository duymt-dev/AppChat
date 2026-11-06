// Phụ thuộc dùng chung của marketing (TIP-037): DB tenant / nền tảng, quyền hiện tại của một thành viên (kiểm lại người duyệt / người tạo
// lúc chạy nền), kho tệp, link huỷ nhận tin, hàng gửi của tài khoản. Thiếu phần nào → 501 rõ ràng khi dùng (không giả thành công).
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { AppError, can, type AuthzContext, type PermissionKey } from '@appchat/shared';
import type { AuthzResolver } from '../../authz/services/authz-resolver';
import type { FilesService } from '../../kernel/files/files.service';
import type { ChannelSendQueue } from '../../channels/public';
import type { UnsubLinks } from './unsubscribe-token';

export class MarketingDeps {
  constructor(
    private readonly t: TenantDbResolver | null,
    private readonly platform: PlatformDb | null,
    private readonly authz: AuthzResolver | null,
    private readonly f: FilesService | null,
    readonly links: UnsubLinks | null,
    readonly send: ChannelSendQueue | null,
  ) {}

  tenants(): TenantDbResolver {
    if (!this.t) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'TenantDbResolver chưa cấu hình');
    return this.t;
  }

  files(): FilesService {
    if (!this.f) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'FilesService chưa cấu hình');
    return this.f;
  }

  /** Quyền HIỆN TẠI của thành viên (null = không còn hoạt động trong workspace). */
  async authzOf(ws: string, userId: string | null): Promise<AuthzContext | null> {
    if (!userId || !this.platform || !this.authz) return null;
    const m = await this.platform.membership.findFirst({ where: { workspaceId: ws, userId, status: 'active' }, select: { roleKey: true, delegations: true } });
    return m ? this.authz.resolve(ws, userId, m) : null;
  }

  async still(ws: string, userId: string | null, p: PermissionKey): Promise<boolean> {
    const a = await this.authzOf(ws, userId);
    return !!a && can(a, p);
  }

  async userEmail(userId: string | null): Promise<{ email: string; name: string } | null> {
    if (!userId || !this.platform) return null;
    return this.platform.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  }
}

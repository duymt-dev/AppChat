// Phụ thuộc của thao tác ticket hàng loạt (TIP-034c): DB tenant ngoài transaction cha (chạy con sau commit), quyền HIỆN TẠI của người
// tạo (thành viên đang hoạt động — đọc lại mỗi con / mỗi lần thử lại / mỗi lần đọc kết quả; không có Owner hệ thống bịa ra), Executor lấy
// muộn (handler của chính executor nằm trong module này). Thiếu cấu hình → 501.
import type { Provider } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { TenantContexts, type PlatformDb, type TenantDb, type TenantDbResolver } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import { AuthzResolver } from '../../authz/services/authz-resolver';
import { ActionExecutor } from '../../kernel/actions/executor';
import { CLOCK, type Clock } from '../../kernel/clock';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';

export class TicketBulkDeps {
  constructor(
    private readonly r: TenantDbResolver | null,
    private readonly platform: PlatformDb | null,
    private readonly authz: AuthzResolver | null,
    private readonly exec: () => ActionExecutor | null,
    readonly now: () => Date,
  ) {}

  async db(ws: string, why: string): Promise<TenantDb> {
    if (!this.r) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'TenantDbResolver chưa cấu hình');
    return this.r.get(TenantContexts.system(ws, why));
  }

  resolver(): TenantDbResolver | null {
    return this.r;
  }

  executor(): ActionExecutor {
    const e = this.exec();
    if (!e) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'ActionExecutor chưa cấu hình');
    return e;
  }

  /** Quyền hiện tại của người tạo — null khi đã bị gỡ khỏi workspace. */
  async authzOf(ws: string, userId: string | null): Promise<AuthzContext | null> {
    if (!userId || !this.platform || !this.authz) return null;
    const m = await this.platform.membership.findFirst({ where: { workspaceId: ws, userId, status: 'active' }, select: { roleKey: true, delegations: true } });
    return m ? this.authz.resolve(ws, userId, m) : null;
  }
}

const opt = (token: symbol) => ({ token, optional: true });

export const TICKET_BULK_DEPS: Provider = {
  provide: TicketBulkDeps,
  inject: [opt(TENANT_RESOLVER), opt(PLATFORM_DB), { token: AuthzResolver, optional: true }, ModuleRef, CLOCK],
  useFactory: (r: TenantDbResolver | undefined, p: PlatformDb | undefined, a: AuthzResolver | null | undefined, refs: ModuleRef, c: Clock) =>
    new TicketBulkDeps(r ?? null, p ?? null, a ?? null, () => refs.get(ActionExecutor, { strict: false }) ?? null, () => c.now()),
};

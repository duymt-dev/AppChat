// Phụ thuộc domain data-transfer (TIP-038b): DB tenant (đọc tệp NGOÀI transaction action), FilesService, quyền hiện tại của người tạo
// (DB nền tảng + AuthzResolver — kiểm lại mỗi lô lúc ghi), ActionExecutor (ghi nghiệp vụ qua action domain). Thiếu cấu hình → 501.
import type { PlatformDb, TenantDb, TenantDbResolver } from '@appchat/db';
import { TenantContexts } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { AuthzResolver } from '../authz/services/authz-resolver';
import type { ActionExecutor } from '../kernel/actions/executor';
import type { FilesService } from '../kernel/files/files.service';

export class TransferDeps {
  constructor(
    private readonly r: TenantDbResolver | null,
    private readonly f: FilesService | null,
    private readonly platform: PlatformDb | null,
    private readonly authz: AuthzResolver | null,
    private readonly exec: (() => ActionExecutor | null) | null,
    readonly now: () => Date,
  ) {}

  async db(ws: string, why: string): Promise<TenantDb> {
    if (!this.r) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'TenantDbResolver chưa cấu hình');
    return this.r.get(TenantContexts.system(ws, why));
  }

  files(): FilesService {
    if (!this.f) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'FilesService chưa cấu hình');
    return this.f;
  }

  executor(): ActionExecutor {
    const e = this.exec?.() ?? null;
    if (!e) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'ActionExecutor chưa cấu hình');
    return e;
  }

  /** Quyền hiện tại của người tạo (thành viên hoạt động) — null khi đã bị gỡ. */
  async authzOf(ws: string, userId: string): Promise<AuthzContext | null> {
    if (!this.platform || !this.authz) return null;
    const m = await this.platform.membership.findFirst({
      where: { workspaceId: ws, userId, status: 'active' },
      select: { roleKey: true, delegations: true },
    });
    return m ? this.authz.resolve(ws, userId, m) : null;
  }
}

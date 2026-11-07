// Đăng ký bộ lọc WS cho sự kiện run (TIP-019b §5.3, DC-380): người nhận `run.step` / `run.done` phải còn đọc được run — cùng
// `readableRun` với REST chi tiết (assistant.use + runScope theo người khởi tạo run gốc), tra DB tenant mỗi lần phát.
import { Inject, Optional, type OnModuleInit } from '@nestjs/common';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { registerRunGuard } from '../../notify/realtime/run-guard';
import { readableRun } from './run-status';

export class RunGuardInstaller implements OnModuleInit {
  constructor(@Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined) {}

  onModuleInit(): void {
    const tenants = this.tenants;
    if (!tenants) return;
    registerRunGuard(async ({ workspaceId, userId, authz, runId }) => !!(await readableRun(await tenants.get(TenantContexts.fromMembership(workspaceId, userId)), authz, runId)));
  }
}

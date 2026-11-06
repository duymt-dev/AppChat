// Domain `data-transfer` (TIP-038b, DC-374): nhập dữ liệu dùng chung cho CRM / commerce — kế hoạch + dòng + biên nhận, ghi qua action
// domain bằng ActionExecutor; đọc cho `/v1/data-transfer/*`. Xuất dùng action xuất có sẵn của từng danh sách (038, contact.export).
// Thiếu DB / executor → handler 501 (không giả thành công).
import { Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { AuthzModule } from '../authz/authz.module';
import { AuthzResolver } from '../authz/services/authz-resolver';
import { ActionExecutor } from '../kernel/actions/executor';
import { CLOCK, type Clock } from '../kernel/clock';
import { FilesService } from '../kernel/files/files.service';
import { PLATFORM_DB, TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import { TransferCancelHandler, TransferCommitHandler } from './actions/commit.handlers';
import { TransferPlanHandler, TransferUpdateMappingHandler } from './actions/plan.handlers';
import { TransferDeps } from './data-transfer.providers';
import { TransferReadService } from './services/transfer-read';

const opt = (token: symbol) => ({ token, optional: true });

@Module({
  imports: [AuthzModule],
  providers: [
    TransferPlanHandler,
    TransferUpdateMappingHandler,
    TransferCommitHandler,
    TransferCancelHandler,
    {
      provide: TransferDeps,
      inject: [
        opt(TENANT_RESOLVER),
        { token: FilesService, optional: true },
        opt(PLATFORM_DB),
        { token: AuthzResolver, optional: true },
        ModuleRef,
        CLOCK,
      ],
      // Executor lấy muộn (ModuleRef): handler của chính executor nằm trong module này — tránh vòng phụ thuộc lúc dựng.
      useFactory: (
        r: TenantDbResolver | undefined,
        f: FilesService | undefined,
        p: PlatformDb | undefined,
        a: AuthzResolver | null | undefined,
        refs: ModuleRef,
        c: Clock,
      ) =>
        new TransferDeps(
          r ?? null,
          f ?? null,
          p ?? null,
          a ?? null,
          () => refs.get(ActionExecutor, { strict: false }) ?? null,
          () => c.now(),
        ),
    },
    {
      provide: TransferReadService,
      inject: [TransferDeps],
      useFactory: (d: TransferDeps) => new TransferReadService(d),
    },
  ],
  exports: [TransferDeps, TransferReadService],
})
export class DataTransferModule {}

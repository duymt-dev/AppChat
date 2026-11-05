// Chính sách bán hàng (TIP-032b P1): handler `sales_settings.update` + đọc `GET /v1/settings/sales-policy`. Module riêng, không import
// SalesModule (SalesModule import module này) — không vòng. Thiếu DB tenant → service null (API trả 501).
import { Module } from '@nestjs/common';
import type { TenantDbResolver } from '@appchat/db';
import { TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { SalesSettingsUpdateHandler } from './settings.handler';
import { CommerceSettingsService } from './settings.service';

@Module({
  providers: [
    SalesSettingsUpdateHandler,
    {
      provide: CommerceSettingsService,
      inject: [{ token: TENANT_RESOLVER, optional: true }],
      useFactory: (r: TenantDbResolver | undefined) => (r ? new CommerceSettingsService(r) : null),
    },
  ],
  exports: [SalesSettingsUpdateHandler, CommerceSettingsService],
})
export class SalesSettingsModule {}

// Domain `loyalty` (TIP-036): cấu hình, sổ điểm FIFO, hạng; đọc cho /v1/loyalty/*. Action: loyalty.get_member / adjust_points /
// update_config. Seed `loyalty_config` đăng ký ở loyalty.seed.ts (registry DC-026). Thiếu DB → service null.
import { Module } from '@nestjs/common';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../kernel/clock';
import { PLATFORM_DB, TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import { CrmModule } from '../crm/crm.module';
import './loyalty.seed';
import { LoyaltyUpdateConfigHandler } from './actions/config.handler';
import { LoyaltyAdjustPointsHandler, LoyaltyGetMemberHandler } from './actions/member.handlers';
import { MemberReadService } from './services/member-read.service';

const opt = (token: symbol) => ({ token, optional: true });

const HANDLERS = [LoyaltyGetMemberHandler, LoyaltyAdjustPointsHandler, LoyaltyUpdateConfigHandler];

@Module({
  imports: [CrmModule],
  providers: [
    ...HANDLERS,
    {
      provide: MemberReadService,
      inject: [opt(TENANT_RESOLVER), opt(PLATFORM_DB), CLOCK],
      useFactory: (r: TenantDbResolver | undefined, p: PlatformDb | undefined, c: Clock) => (r && p ? new MemberReadService(r, p, () => c.now()) : null),
    },
  ],
  exports: [MemberReadService],
})
export class LoyaltyModule {}

// Domain `loyalty` (TIP-036): cấu hình, sổ điểm FIFO, hạng; đọc cho /v1/loyalty/*. Action: loyalty.get_member / adjust_points /
// update_config / attach_file (tệp thành viên), system-only earn / reverse / expire / review_tier (consumer + job — loyalty.jobs.module),
// payment.redeem_points (khoản thu `points` qua đường ghi chung của sales). Seed `loyalty_config` đăng ký ở loyalty.seed.ts (registry DC-026). Thiếu DB → service null.
import { Module } from '@nestjs/common';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../kernel/clock';
import { PLATFORM_DB, TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import { CrmModule } from '../crm/crm.module';
import { SalesModule } from '../sales/sales.module';
import './loyalty.seed';
import { LoyaltyUpdateConfigHandler } from './actions/config.handler';
import { LoyaltyEarnHandler, LoyaltyExpireHandler, LoyaltyReverseHandler, LoyaltyReviewTierHandler } from './actions/ledger-system.handlers';
import { LoyaltyAdjustPointsHandler, LoyaltyGetMemberHandler } from './actions/member.handlers';
import { PaymentRedeemPointsHandler } from './actions/redeem-points.handler';
import { LoyaltyAttachFileHandler } from './actions/member-files.handlers';
import { FilesService } from '../kernel/files/files.service';
import { MemberReadService } from './services/member-read.service';

const opt = (token: symbol) => ({ token, optional: true });

const HANDLERS = [
  LoyaltyGetMemberHandler,
  LoyaltyAdjustPointsHandler,
  LoyaltyUpdateConfigHandler,
  LoyaltyEarnHandler,
  LoyaltyReverseHandler,
  LoyaltyExpireHandler,
  LoyaltyReviewTierHandler,
  PaymentRedeemPointsHandler,
  LoyaltyAttachFileHandler,
];

@Module({
  imports: [CrmModule, SalesModule],
  providers: [
    ...HANDLERS,
    {
      provide: MemberReadService,
      inject: [opt(TENANT_RESOLVER), opt(PLATFORM_DB), CLOCK, { token: FilesService, optional: true }],
      useFactory: (r: TenantDbResolver | undefined, p: PlatformDb | undefined, c: Clock, f: FilesService | undefined) => (r && p ? new MemberReadService(r, p, () => c.now(), f ?? null) : null),
    },
  ],
  exports: [MemberReadService],
})
export class LoyaltyModule {}

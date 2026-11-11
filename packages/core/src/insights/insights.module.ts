// Domain `insights` — query số liệu chỉ đọc (Blueprint §3.4, D19 không có module Báo cáo): registry metric (`insight.query` / GET
// /v1/insights/:metric / Trợ lý `query_data`), thống kê agent có nguồn. Chỉ đọc DB tenant + helper scope của domain khác — không import
// module AI (tránh vòng AI ↔ Insights). Digest (TIP-038 pha 4) cần AuthzResolver + MailProvider. Provider ở insights.providers.ts.
import { Module, type OnModuleInit } from '@nestjs/common';
import { domainVerifier, registerSystemVerifier } from '../kernel/actions/system';
import { DIGEST_ACTOR } from './actions/digest.handlers';
import { FOLLOW_UP_ACTOR } from './actions/follow-up.handlers';
import { AuthzModule } from '../authz/authz.module';
import { IdentityModule } from '../identity/identity.module';
import { InsightsReadService } from './services/insights-read.service';
import { InsightsService } from './metrics/registry';
import { DashboardService } from './services/dashboard.service';
import { INSIGHTS_PROVIDERS } from './insights.providers';

@Module({
  imports: [AuthzModule, IdentityModule],
  providers: INSIGHTS_PROVIDERS,
  exports: [InsightsService, InsightsReadService, DashboardService],
})
export class InsightsModule implements OnModuleInit {
  /** TIP-003c: action riêng tiền nhiệm 038 — `source_key` / sổ digest unique của domain là chống lặp (biên nhận domain). */
  onModuleInit(): void {
    registerSystemVerifier('follow_up.reconcile', domainVerifier(FOLLOW_UP_ACTOR, ['schedule']), { receipt: 'domain', db: false });
    registerSystemVerifier('digest.dispatch', domainVerifier(DIGEST_ACTOR, ['schedule']), { receipt: 'domain', db: false });
  }
}

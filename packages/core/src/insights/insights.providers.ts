// Provider domain insights (TIP-038) — insights.module chỉ trải mảng này: registry metric, dịch vụ đọc HTTP, handler `insight.query`,
// dashboard + việc follow (pha 2: `follow_up.complete` / `follow_up.reconcile`), xuất 4 danh sách (pha 3: quote / order / contract / ticket.export), email tóm tắt (pha 4: `digest.dispatch` — mail lấy từ
// MailProvider của identity).
import type { Provider } from '@nestjs/common';
import type { MailProvider } from '@appchat/integrations';
import type { IdentityEnv } from '../identity/identity.env';
import { IDENTITY_ENV, MAIL_PROVIDER } from '../identity/services/identity.tokens';
import { DIGEST_MAIL, DigestDispatchHandler, type DigestMail } from './actions/digest.handlers';
import { InsightQueryHandler } from './actions/insight-query.handler';
import { FollowUpCompleteHandler, FollowUpReconcileHandler } from './actions/follow-up.handlers';
import { ContractExportHandler, OrderExportHandler, QuoteExportHandler, TicketExportHandler } from './actions/export.handlers';
import { DashboardService } from './services/dashboard.service';
import { InsightsService } from './metrics/registry';
import { InsightsReadService } from './services/insights-read.service';

export const INSIGHTS_PROVIDERS: Provider[] = [InsightsService, InsightsReadService, InsightQueryHandler, DashboardService, FollowUpCompleteHandler, FollowUpReconcileHandler,
  QuoteExportHandler, OrderExportHandler, ContractExportHandler, TicketExportHandler, DigestDispatchHandler,
  {
    provide: DIGEST_MAIL,
    inject: [MAIL_PROVIDER, IDENTITY_ENV],
    useFactory: (mail: MailProvider | null, env: IdentityEnv | null): DigestMail | null => (mail && env ? { mail, publicUrl: env.APP_PUBLIC_URL } : null),
  }];

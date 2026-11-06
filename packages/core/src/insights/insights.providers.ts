// Provider domain insights (TIP-038) — insights.module chỉ trải mảng này: registry metric, dịch vụ đọc HTTP, handler `insight.query`,
// dashboard + việc follow (pha 2: `follow_up.complete` / `follow_up.reconcile`), xuất 4 danh sách (pha 3: quote / order / contract / ticket.export).
import type { Provider } from '@nestjs/common';
import { InsightQueryHandler } from './actions/insight-query.handler';
import { FollowUpCompleteHandler, FollowUpReconcileHandler } from './actions/follow-up.handlers';
import { ContractExportHandler, OrderExportHandler, QuoteExportHandler, TicketExportHandler } from './actions/export.handlers';
import { DashboardService } from './services/dashboard.service';
import { InsightsService } from './metrics/registry';
import { InsightsReadService } from './services/insights-read.service';

export const INSIGHTS_PROVIDERS: Provider[] = [InsightsService, InsightsReadService, InsightQueryHandler, DashboardService, FollowUpCompleteHandler, FollowUpReconcileHandler,
  QuoteExportHandler, OrderExportHandler, ContractExportHandler, TicketExportHandler];

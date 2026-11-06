// Provider domain insights (TIP-038) — insights.module chỉ trải mảng này: registry metric, dịch vụ đọc HTTP, handler `insight.query`.
import type { Provider } from '@nestjs/common';
import { InsightQueryHandler } from './actions/insight-query.handler';
import { InsightsService } from './metrics/registry';
import { InsightsReadService } from './services/insights-read.service';

export const INSIGHTS_PROVIDERS: Provider[] = [InsightsService, InsightsReadService, InsightQueryHandler];

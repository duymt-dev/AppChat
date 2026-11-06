// Domain `insights` — query số liệu chỉ đọc (Blueprint §3.4, D19 không có module Báo cáo): registry metric (`insight.query` / GET
// /v1/insights/:metric / Trợ lý `query_data`), thống kê agent có nguồn. Chỉ đọc DB tenant + helper scope của domain khác — không import
// module AI (tránh vòng AI ↔ Insights). Provider ở insights.providers.ts.
import { Module } from '@nestjs/common';
import { InsightsReadService } from './services/insights-read.service';
import { InsightsService } from './metrics/registry';
import { DashboardService } from './services/dashboard.service';
import { INSIGHTS_PROVIDERS } from './insights.providers';

@Module({ providers: INSIGHTS_PROVIDERS, exports: [InsightsService, InsightsReadService, DashboardService] })
export class InsightsModule {}

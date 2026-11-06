// Số liệu đọc sẵn (Blueprint §3.4 insights, §5.2 `query_data`, TIP-038): chỉ metric trong allowlist `METRIC_KEYS`, tham số kiểm theo từng
// metric (zod strict) ở handler — không SQL tự do. Cùng service với `GET /v1/insights/:metric`; lọc theo data scope + quyền nguồn của người hỏi.
import { z } from 'zod';
import { METRIC_KEYS, insightResultSchema } from '@appchat/shared';
import { defineAction } from './define';

export const insightQuery = defineAction({
  id: 'insight.query',
  module: 'insights',
  title: 'actions.insight.query.title',
  description:
    'Read a predefined business metric (read-only, scoped to the caller). Metrics: sales.booked (orders not cancelled, by created date), sales.collected (confirmed payments minus confirmed refunds), customers.at_risk (customers with past orders and no order in the window), agents.performance, support.performance. Params: from / to as YYYY-MM-DD (to exclusive, default last 30 days, max 366), bucket day|week|month. Example: {"metric":"sales.collected","params":{"from":"2026-10-01","to":"2026-11-01","bucket":"week"}}',
  input: z.object({ metric: z.enum(METRIC_KEYS), params: z.record(z.string(), z.unknown()).optional() }),
  output: insightResultSchema,
  permission: 'insights.view',
  risk: 'read',
  agentGrantable: true,
  skill: true,
  invalidates: [],
});

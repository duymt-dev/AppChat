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

// Sweep việc follow (TIP-038 pha 2, DC-241) — system-only: job `insights.follow-up-sweep` (ROLE=jobs) gọi qua ActionExecutor nguồn system
// (actor `system:follow-up`); người / Trợ lý / agent / API không gọi được (SYSTEM_ONLY + guard actor). Một lần gọi = một lô khách tới hạn
// (khách sống, chưa won / lost, im lặng ≥ 7 ngày): sinh việc theo `source_key` (khách + mốc tương tác), thay việc cũ khi có tương tác mới.
export const followUpReconcile = defineAction({
  id: 'follow_up.reconcile',
  module: 'insights',
  title: 'actions.follow_up.reconcile.title',
  description: 'System-only: create due customer follow-ups (7 days without interaction) and supersede stale ones, one bounded batch. Never sends messages. Not callable by users, assistant or agents. Example: {"batch":"2026-11-06T09"}',
  input: z.object({ batch: z.string().min(1).max(40) }),
  output: z.object({ created: z.number().int(), superseded: z.number().int() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['dashboard', 'calendar'],
});

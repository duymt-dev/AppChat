# TIP-038 — Tổng quan, scoped insights, agent statistics, list export và digest

## HEADER
- **Parallel-safe with TIP-003c (System actions manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/actions/src/insights.ts`, `packages/core/src/ai/assistant/meta-tools.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/core/src/insights/actions/follow-up.handlers.ts`, `packages/core/src/insights/jobs/follow-up.consumer.ts`, `packages/core/src/insights/services/follow-ups.ts`; integrate 038 before003c.
- **Parallel-safe with TIP-003b (Event protocol manifest):** sequential, shares `packages/core/src/index.ts`, `packages/shared/src/index.ts`; integrate 038 before003b.
- **Parallel-safe with TIP-023f (Assistant input manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/meta-tools.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before023f.
- **Parallel-safe with TIP-023e (Action discovery manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/meta-tools.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 038 before023e.
- **Parallel-safe with TIP-023d (Assistant plans manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/meta-tools.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before023d.
- **Parallel-safe with TIP-015c (Privacy manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before015c.
- **Parallel-safe with TIP-019c (AI utilities manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/meta-tools.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before019c.
- **Parallel-safe with TIP-033b (Booking operations manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/domains/calendar.ts`, `packages/actions/src/index.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before033b.
- **Parallel-safe with TIP-012c (Tenant mail manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before012c.
- **Parallel-safe with TIP-015e (Contact merge manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/contracts/repos/contracts.repo.ts`, `packages/core/src/index.ts`, `packages/core/src/insights/exports/sales-readers.ts`, `packages/core/src/insights/metrics/customers.ts`, `packages/core/src/insights/metrics/sales.ts`, `packages/core/src/sales/orders/repos/orders.repo.ts`, `packages/core/src/sales/quotes/repos/quotes.repo.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before015e.
- **Parallel-safe with TIP-015f (Contact lifecycle manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/features/orders/components/OrdersToolbar.tsx`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before015f.
- **Parallel-safe with TIP-032c (Commerce edit manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/features/contracts/components/ContractsToolbar.tsx`, `apps/web/src/features/orders/components/OrdersToolbar.tsx`, `apps/web/src/shared/api/mock/domains/contracts.ts`, `apps/web/src/shared/api/mock/domains/orders.ts`, `packages/actions/src/index.ts`, `packages/core/src/contracts/repos/contracts.repo.ts`, `packages/core/src/insights/exports/sales-readers.ts`, `packages/core/src/insights/metrics/sales.ts`, `packages/core/src/sales/orders/repos/orders.repo.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before032c.
- **Parallel-safe with TIP-015d (CRM ownership manifest):** sequential, shares `apps/api/src/http/ai/agents.controller.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/features/quotes/components/QuotesToolbar.tsx`, `apps/web/src/shared/api/mock/domains/quotes.ts`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/core/src/insights/exports/sales-readers.ts`, `packages/core/src/insights/metrics/sales.ts`, `packages/core/src/sales/quotes/repos/quotes.repo.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before015d.
- **Parallel-safe with TIP-026b (CRM activity manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before026b.
- **Parallel-safe with TIP-012b (Bank integration manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/tasks/task-scheduler.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before012b.
- **Parallel-safe with TIP-019b (Runtime integration manifest):** sequential, shares `packages/core/src/ai/assistant/meta-tools.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/ai.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before019b.
- **Parallel-safe with TIP-025b (Inbox integration manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/domains/calendar.ts`, `apps/web/src/shared/api/mock/domains/contracts.ts`, `apps/web/src/shared/api/mock/domains/orders.ts`, `apps/web/src/shared/api/mock/domains/quotes.ts`, `apps/web/src/shared/api/mock/domains/tickets.ts`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before025b.
- **Parallel-safe with TIP-022b (agent behavior manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/agents.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/agents.json`, `apps/web/src/features/agents/types.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/agents/agents.read.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/ai.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 022b before038.
- **Parallel-safe with TIP-014b (Zalo lifecycle manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 014b before038.
- **Parallel-safe with TIP-032b (accepted foundation manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/domains/quotes.ts`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/meta-tools.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032b before038.
- **Parallel-safe with TIP-045b (hardening manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/meta-tools.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/index.ts`, `packages/core/src/sales/orders/repos/orders.repo.ts`, `packages/core/src/sales/quotes/repos/quotes.repo.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 045b before038. Recompute for later TIPs.
- **Parallel-safe with TIP-030b (contract files manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/domains/contracts.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 030b before038. Recompute when incomplete manifests expand.
- **Parallel-safe with TIP-023c (genui revised manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/agents.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/agents.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/meta-tools.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023c before038. Recompute when remaining manifests expand.
- **Parallel-safe with TIP-023c (genui exact manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/agents.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/agents.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/meta-tools.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-023c before TIP-038. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-023b (complete manifest intersection):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/agents/agents.read.ts`, `packages/core/src/ai/assistant/meta-tools.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-023b before TIP-038.
- **Parallel-safe with TIP-023b (public API wiring):** sequential, shares `packages/core/src/index.ts`, `packages/shared/src/index.ts`, `packages/shared/src/api/index.ts`; integrate TIP-023b before TIP-038.
- **Parallel-safe with TIP-023b (exact manifest audit):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/agents/agents.read.ts`, `packages/core/src/ai/assistant/meta-tools.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-023b before TIP-038. Recompute on later manifest expansion; this is not whole-graph parallel clearance.
- **Parallel-safe with TIP-032b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/domains/quotes.ts`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-032b before TIP-038. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-015b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-015b before TIP-038. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-041:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate this TIP before 041. Recheck incomplete manifests.
- **Parallel-safe with TIP-038b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate this TIP before 038b. Recheck incomplete manifests.
- **Parallel-safe with TIP-040:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate this TIP before 040. Recheck incomplete manifests.
- **Parallel-safe with TIP-039:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate this TIP before 039. Recheck incomplete manifests.
- TIP-ID: TIP-038; Project: AppChat V2; Module: insights; Priority: P0/P1; Estimated: XL, chia implementation theo metric → dashboard → export → digest.
- Depends on:006/009/011/021/022/024/029–035; tích hợp sau023b/023c/015b/020b/030b/032b/036/037/042/042b/042c/043/045b vì scope, serializers, jobs và shared files; trước044/046.
- **Dòng COVERAGE nhận:** REQ-K01a/D07d/D14b/E07/F06-i/F07-e/F09h/H04b; COM-9-19; DC-030; DEF-006-1/022-3/023-3/024-2; Q-024; ACT-follow_up.complete/insight.query; BP-4.4-ai-b/4.4-dashboard/5.2-c; PRO-dashboard-read/followup/calendar-followup/quotes-export/orders-export/contracts-export/tickets-export; STD-domain-customfields-4c; STD-actions-registry-6 phần insight.
- **Parallel-safe with:** sequential, shares `packages/actions/src/index.ts` với015b/020b/023b/023c/030b/032b/036/037/042/042b/043/045b; `coding-packs/plans/BLUEPRINT.md` với042c; shared indexes/locales/parity/deviations với các TIP trên. Metadata hai chiều đã tính trước khi viết. Các pending manifest chưa hoàn chỉnh phải tính lại, không được tự mở song song.
- **Files touched:** chính xác C=create/M=modify bên dưới. Chưa code trong câu A; Q-029 ảnh hưởng team scopes phải chốt ở042c trước build phần đó.

| Op | File |
|---|---|
| C | `tools/parity/modules/insights.ts` |
| M | `packages/shared/src/i18n/server/index.ts` |
| C | `packages/shared/src/i18n/server/vi/insights.ts` |
| C | `packages/shared/src/i18n/server/en/insights.ts` |
| M | `apps/web/src/shared/api/mock/domains/quotes.ts` |
| M | `apps/web/src/shared/api/mock/domains/orders.ts` |
| M | `apps/web/src/shared/api/mock/domains/contracts.ts` |
| M | `apps/web/src/shared/api/mock/domains/tickets.ts` |
| M | `packages/actions/src/index.ts` |
| M | `packages/actions/src/dashboard.ts` |
| M | `packages/shared/src/api/index.ts` |
| M | `packages/shared/src/index.ts` |
| M | `packages/shared/src/api/ai.ts` |
| M | `packages/core/src/index.ts` |
| M | `packages/core/src/insights/insights.module.ts` |
| M | `packages/core/src/insights/jobs/insights.jobs.module.ts` |
| M | `packages/core/src/ai/assistant/meta-tools.ts` |
| M | `packages/core/src/ai/agents/agents.read.ts` |
| M | `packages/core/src/ai/jobs/ai.jobs.module.ts` |
| M | `packages/core/src/booking/services/calendar-read.service.ts` |
| M | `apps/api/src/http/insights/insights.http.module.ts` |
| M | `apps/web/src/features/dashboard/types.ts` |
| M | `apps/web/src/features/dashboard/api.ts` |
| M | `apps/web/src/features/dashboard/screens/DashboardScreen.tsx` |
| M | `apps/web/src/features/dashboard/components/UpdatesWidget.tsx` |
| M | `apps/web/src/features/dashboard/components/AgentsSection.tsx` |
| M | `apps/web/src/features/quotes/components/QuotesToolbar.tsx` |
| M | `apps/web/src/features/orders/components/OrdersToolbar.tsx` |
| M | `apps/web/src/features/contracts/components/ContractsToolbar.tsx` |
| M | `apps/web/src/features/tickets/components/TicketsHeader.tsx` |
| M | `apps/web/messages/vi/dashboard.json` |
| M | `apps/web/messages/en/dashboard.json` |
| M | `apps/web/messages/vi/actions.json` |
| M | `apps/web/messages/en/actions.json` |
| M | `tools/parity/parity.manifest.ts` |
| M | `coding-packs/docs/06-prototype/DEVIATIONS.md` |
| M | `coding-packs/plans/BLUEPRINT.md` |
| M | `apps/web/src/shared/api/mock/domains/dashboard.ts` |
| M | `apps/web/src/shared/api/mock/domains/calendar.ts` |
| M | `apps/web/src/features/agents/types.ts` |
| M | `apps/web/src/features/agents/components/AgentCard.tsx` |
| M | `packages/core/src/ai/tasks/task-briefing.ts` |
| M | `packages/shared/src/ai-tasks/task-catalog.ts` |
| M | `packages/core/src/ai/tasks/task-scheduler.ts` |
| M | `apps/web/messages/vi/agents.json` |
| M | `apps/web/messages/en/agents.json` |
| M | `packages/core/src/sales/quotes/repos/quotes.repo.ts` |
| M | `packages/core/src/sales/orders/repos/orders.repo.ts` |
| M | `packages/core/src/contracts/repos/contracts.repo.ts` |
| M | `apps/api/src/http/ai/agents.controller.ts` |
| C | `packages/actions/src/insights.ts` |
| C | `packages/actions/src/list-exports.ts` |
| C | `packages/shared/src/api/insights.ts` |
| C | `packages/shared/src/api/list-exports.ts` |
| C | `packages/shared/src/insights/metrics.ts` |
| C | `packages/db/prisma/tenant/insights.prisma` |
| C | `packages/db/prisma/tenant/migrations/20261102003800_insights/migration.sql` |
| C | `packages/core/src/insights/insights.providers.ts` |
| C | `packages/core/src/insights/public.ts` |
| C | `packages/core/src/insights/metrics/registry.ts` |
| C | `packages/core/src/insights/metrics/sales.ts` |
| C | `packages/core/src/insights/metrics/customers.ts` |
| C | `packages/core/src/insights/metrics/agents.ts` |
| C | `packages/core/src/insights/metrics/support.ts` |
| C | `packages/core/src/insights/metrics/common.ts` |
| C | `packages/core/src/insights/services/dashboard.service.ts` |
| C | `packages/core/src/insights/services/work-items.ts` |
| C | `packages/core/src/insights/services/agent-stats.ts` |
| C | `packages/core/src/insights/services/follow-ups.ts` |
| C | `packages/core/src/insights/actions/insight-query.handler.ts` |
| C | `packages/core/src/insights/actions/follow-up.handlers.ts` |
| C | `packages/core/src/insights/actions/export.handlers.ts` |
| C | `packages/core/src/insights/exports/export-runner.ts` |
| C | `packages/core/src/insights/exports/export-columns.ts` |
| C | `packages/core/src/insights/exports/sales-readers.ts` |
| C | `packages/core/src/insights/exports/ticket-reader.ts` |
| C | `packages/core/src/insights/jobs/insights.jobs.providers.ts` |
| C | `packages/core/src/insights/jobs/follow-up.consumer.ts` |
| C | `packages/core/src/insights/jobs/digest.scheduler.ts` |
| C | `packages/core/src/insights/jobs/digest-mail.ts` |
| C | `packages/core/src/insights/jobs/exports.worker.ts` |
| C | `apps/api/src/http/insights/insights.controller.ts` |
| C | `apps/api/src/http/insights/exports.controller.ts` |
| C | `apps/web/src/features/dashboard/components/MyWorkPanel.tsx` |
| C | `apps/web/src/features/dashboard/components/AiTodayPanel.tsx` |
| C | `apps/web/src/features/dashboard/components/CreditBalanceCard.tsx` |
| C | `apps/web/src/shared/actions/useListExport.ts` |
| C | `packages/core/test/insight-metrics.test.ts` |
| C | `packages/core/test/dashboard-work.test.ts` |
| C | `packages/core/test/digest.test.ts` |
| C | `packages/core/test/list-exports.test.ts` |
| C | `apps/api/test/integration/insights.test.ts` |
| C | `apps/api/test/integration/insights-contract.test.ts` |
| C | `apps/api/test/integration/list-exports.test.ts` |
| C | `apps/api/test/integration/digest.test.ts` |
| C | `apps/web/e2e/http/insights.spec.ts` |
| C | `coding-packs/reports/TIP-038-completion.md` |
| C | `packages/core/src/insights/services/renewal-suggestions.ts` |
| C | `packages/core/src/insights/exports/types.ts` |
| C | `packages/core/src/insights/jobs/types.ts` |
| C | `packages/core/src/insights/jobs/digest-template.ts` |
| C | `apps/web/src/features/agents/components/AgentStatsPanel.tsx` |
| C | `apps/web/src/features/agents/hooks/useAgentStats.ts` |

## CONTEXT
- Workspace: `D:/CODING/AppChat_Ver2`; stack theo CLAUDE/BUILDER-HANDOFF: NestJS, Prisma/Postgres native tenant-per-DB, BullMQ, Next.js/Ant Design, exceljs đã có. Không thêm reporting engine.
- `core/src/insights/insights.module.ts`, `insights/jobs/insights.jobs.module.ts`, API insights module chỉ stub. Dashboard API/mock dùng fixture; DashboardScreen chưa có nguồn dữ liệu thật cho MyWork/AI hôm nay/credit.
- `packages/actions/src/dashboard.ts:21` khai follow_up.complete (crm.edit, undo24h), không có handler/schema persistence. `booking/services/calendar-read.service.ts:166` trả follow_ups rỗng; mock dashboard phân biệt ID cfu_ ở calendar. Không lấy mẫu ID làm dữ liệu thật.
- `core/src/ai/assistant/meta-tools.ts:114–117` query_data trả NOT_IMPLEMENTED. Blueprint §3.4/§5.2 yêu cầu insight.query qua metric registry, không SQL tuỳ ý.
- `core/src/ai/agents/agents.read.ts:20–40` đếm run không dry-run, resolve_rate theo run, csat=0 cứng. `tenant/support.prisma:55–73` có assigneeAgentId/csat, không thiếu nguồn CSAT.
- `contracts/services/contract-system.ts:50–67` đã nhắc T-30 một lần và phát contract.expiring. `shared/src/ai-tasks/task-catalog.ts:54` chưa nhận event đó; không dựng scheduler gia hạn thứ hai.
- `notify/services/prefs.service.ts:25–28` có digest daily/weekly/off theo user; chưa có job gửi digest. `ai/tasks/task-briefing.ts:24–49` có báo sáng nhưng team được coi all ở query: phải dùng policy042c khi reuse, không sao chép lỗi sang dashboard/digest.
- QuotesToolbar:82, OrdersToolbar:96, ContractsToolbar:69, TicketsHeader:143 chỉ toast export. `sales/quotes/repos/quotes.repo.ts:44` có list IDs nhưng nhánh page=null LIMIT2000: không dùng làm “xuất tất cả”.
- SoT: Blueprint §§3.4,4.4,5.2,5.4,7; COMMERCE §9; D19 không module Báo cáo ≠ cấm xuất danh sách (Q024). Onboarding011 đã có action, giữ semantics.

## APPLICABLE STANDARDS
Đọc toàn bộ trước build:
- actions/action-registry; api/response-envelope; events/outbox.
- database/tenant-db, indexing; authz/rbac-permissions.
- domain/custom-fields, concurrency, money-time-numbering, validation-defaults, gap-filling.
- ai/agent-gateway, eval; integrations/provider-ports; ops/observability-security.
- ui/frontend-structure, prototype-parity, interaction-patterns; i18n/i18n.
- code/file-size-module-layout, testing; workflow/git-flow-ci.
Các đường dẫn dưới `coding-packs/standards/`, đuôi .md. Quyền settled và COMMERCE thắng mọi giả định kỹ thuật dưới đây.

## Rà trước khi làm
1. Xác nhận042c scope read/write,045b serializer field-level + async202 đã tích hợp. Không aggregate trên query unscoped rồi chỉ che UI.
2. Kiểm tra ActionDef insight.query chưa được023b tạo; nếu có thì dùng một định nghĩa, sửa manifest trước code. query_data dùng assistantActionCtx hiện hữu, không bỏ actor/onBehalfOfUser.
3. Đối chiếu registry wiring API/jobs/ai; InsightsJobsModule chỉ ROLE=jobs, không enqueue scheduler ở mỗi API process. AI gọi read cần module không import ngược AI tạo Nest cycle.
4. Đo line caps trước sửa agents.read/meta-tools/task-briefing/controller; file vượt cap chỉ facade1–2 dòng sang module mới. Thiếu file manifest → cập nhật pack + overlap trước code.
5. Đọc shape thật DashboardDto/calendar/AgentDto và filter của4 danh sách. Giữ mock/http cùng schema; không phá test parity cũ bằng thay fixture tuỳ tiện.
6. Kiểm chứng nguồn credit/run attribution, closed timestamps, contact↔document links. Không gán công cho agent bằng owner hiện tại khi thiếu lịch sử. Bất kỳ quyền/giá mới phải hỏi, không lấy dashboard làm cớ nới billing.
7. Test DB/Redis riêng, không chạy vào dữ liệu demo đang dùng; không dừng dịch vụ native của Chủ nhà.

## TASK

### 1. Metric registry và read contract
- Implement allowlist metric, zod params riêng: sales.booked (đơn không huỷ), sales.collected (payment confirmed trừ refund confirmed); customers.at_risk; agents.performance; support.performance. Tiền integer/VND string; không cộng quote+order+payment thành “doanh thu”.
- Window [from,to), timezone workspace; mặc định30 ngày, tối đa366 ngày/request, bucket day/week/month; invalid metric/filter/date trả validation. Không nhận SQL, tên bảng/cột/expression từ model.
- Mỗi metric khai quyền nguồn (order.view/quote.view/contract.view/crm.view/ticket.view/inbox.view tương ứng) ngoài insights.view; thu thực dùng quyền đọc tài chính của service hiện hữu, không tự tạo sales.view/support.view. Scope insights và scope domain phải cùng cho phép; none ở một bên không đọc dữ liệu. Không suy ra Owner từ tên role. Join chỉ expose field nguồn đã được serializer045b cho phép; nguồn không đủ quyền bị loại rõ availability, không trả tổng đã chứa chúng.
- Output typed {metric,params,window,as_of,rows,columns,chart?,sources,sample_count,availability}; max100 rows, bounded grouping, chart schema023c; sources là route/record IDs có quyền, hoặc mô tả nguồn aggregate không PII. Không model bịa số liệu/nguồn.
- GET /v1/insights/:metric và action insight.query dùng cùng service; risk read, agentGrantable true, không undo/outbox mutation. query_data gọi ActionExecutor với auth context từng tool; Cowork vẫn giao quyền agent∩user và data groups, không cho insight bypass nhóm dữ liệu.
- Cache nếu có key gồm tenant/user/authzRevision/filter/timezone, không cache global theo metric. Invalidate theo nguồn và revocation, không TTL-only security.

### 2. Agent statistics có provenance
- GET /v1/agents/:id/stats?from=&to= trả đúng agent/window; list/get thẻ agent reuse service/semantics, không còn csat=0 giả. Bổ sung optional availability để giữ compatibility; UI hiển thị “chưa có dữ liệu” khác số0 thật.
- Conversations: distinct conversation_id của agent_reply không dry_run trong window. Resolve rate giữ định nghĩa completed/(completed+handoff), ghi rõ đây là tỷ lệ lượt xử lý, không đổi thành tỷ lệ khách.
- CSAT: trung bình ticket.csat không null, assignee_agent_id=agent, closed_at trong window; kèm n, nguồn/định nghĩa “ticket được giao”, không khẳng định causal contribution.
- Close rate: cohort khách có hội thoại agent phục vụ trong window; tử số khách trong cohort có đơn completed trong cùng window, mỗi khách một lần. Gắn nhãn tương quan, không dùng trả hoa hồng; nếu scope không đủ cả sales+inbox thì unavailable, không mở quyền.
- Credit: actual settled usage liên kết run/step (không model estimate, không dry_run); refund/adjustment giữ theo ledger; thiếu linkage historical → unavailable có lý do, không0. Không public wallet cho user thiếu quyền billing hiện hữu.
- Human comparison cùng timewindow/cohort definition trên dữ liệu human có bằng chứng; tách mixed/unattributed, không gán toàn bộ đơn cho last-agent. Tooltip numerator/denominator/source và giới hạn. Thêm AgentStatsPanel/hook độc lập, card orchestrates.

### 3. Dashboard, follow-up, renewal
- GET /dashboard dùng contract typed; dữ liệu thật onboarding, channels, agents, notifications. News/modules/CDP chỉ catalog tĩnh có nhãn, không bịa chỉ số kinh doanh. MyWork: pending approvals đủ quyền quyết định, handoff inbox, overdue tickets/appointments và T-30 signed contracts trong scope. Mỗi item stable ID/type/due/route, không chỉ text.
- AI hôm nay tổng hợp run/action/audit thực tế theo ngày địa phương; không cộng dry-run. Credit card reuse wallet read permission/available balance, user không có quyền không nhận payload balance.
- Persistent follow_up: id UUID, contact_id, source_key unique (contact+last_interaction_at), due_at, status pending/done/superseded, version, completed_by/at, created_at. Rule kỹ thuật: contact live không won/lost, không tương tác7 ngày; null last_interaction không auto-seed. New interaction supersedes oldpending; không sinh lại item đã done cho cùng source_key. Không tự gửi tin.
- Consumer/sweep bounded gọi internal action qua Executor, không GET side effect; source/reconcile action không public cho user. Completed action giữ contract existing input, kiểm crm.edit + writable contact, transaction CAS, idempotent repeat không trừ remaining hai lần. Undo24h chỉ đúng phiên bản và source chưa superseded; emit outbox/invalidate dashboard+calendar trong transaction. Calendar cùng service, dashboard trả tối đa5 pending theo due_at,id; count remaining là số còn visible chứ không tổng tenant.
- Renewal service đọc signed contract T-30/end_date + renew_notice_at để MyWork không phụ thuộc event bị trim. CTA “nhờ agent soạn đề xuất gia hạn” mở Trợ lý/context đã scoped, không gửi/renew tự động. Bổ sung contract.expiring vào task catalog và kiểm current creator scopes trước event task, chỉ task người dùng đã tạo/bật mới chạy; không tự tạo task gửi hàng loạt. Xoá/expire/đổi end_date phải làm item hết hiệu lực.
- Reuse work-item selectors cho briefing, bỏ team=all; giữ lịch briefing08:00 đã có, không đổi thành digest.

### 4. Xuất danh sách thật
- Thêm action quote.export/order.export/contract.export/ticket.export risk write (tạo artifact/job), permission view tương ứng, không undo; idempotency key. Không coi export là quyền đọc toàn workspace. Schema domain filter/sort giống list; columns allowlist + fieldvisibility/customfields typed; không nhập rawSQL/column expression.
- Snapshot danh sách IDs ở thời điểm yêu cầu, bounded batches/deferred joins; list reader chung policy042c. Nâng repo accessor để không truncate2000; module wrappers không copy filter drift. Snapshot retry cùng job không thêm bản ghi mới; trước hydrate và download revalidate quyền hiện tại, scope thu hẹp → huỷ artifact/rebuild thay vì phát file cũ.
- >50 rows dùng async job202/progress045b; <=50 cũng trả export handle thống nhất. Tenant ExportJob chứa requested_by, filters/hash, IDs hoặc snapshot chunks, authz_revision, state/row_count/storage_key/expires_at/error; URL download authenticated và ràng buộc user/workspace, expiry24h, không public storage.
- exceljs có sẵn: text bắt đầu =,+,-,@ là string an toàn, tuyệt đối không cell.formula; dates/timezone rõ, VND không mất bigint, custom columns không leak hidden fields. Empty filter xuất workbook header+0 dòng. Trần kỹ thuật100k rows, quá trần báo cần thu hẹp, không im lặng cắt.
- Four buttons gọi shared useListExport(useAction), truyền filter đang dùng, progress/error/retry/download thật. Không export chỉ page hiện tại khi UI nói toàn danh sách. Không thêm Reports nav/module.

### 5. Digest daily/weekly, không phải AI briefing
- ROLE=jobs scheduler đọc prefs off/daily/weekly; gửi riêng từng user+workspace active, email verified, current membership. Quy tắc kỹ thuật DC-241: daily09:00 local ngày kế tiếp, weeklyMonday09:00 kỳ trước; ngày/tuần theo workspace, tính calendar boundaries không cộng86400 cho DST. Tôn trọng DND: trì hoãn tới allowed time trong kỳ, không replay backlog nhiều email.
- Payload tổng hợp work/AI/metrics user được xem, cùng scoped services, không LLM/không charge Credit. Escape HTML, vi/en, link route yêu cầu login; không gửi data cho member removed. Prefs global user không có nghĩa gộp nhiều workspace vào một email không scope.
- Tenant DigestDelivery unique(user_id,cadence,period_start); queued/sending/sent/failed/unknown/skipped, attempt timestamps/provider_id; unique DB là authority, Redis jobId không đủ. Internal dispatch action qua Executor, outbox→mail port hiện hữu, recheck prefs+membership+permissions trước send. Không tái dùng contract OTP mail path.
- Claim CAS; timeout/crash sau provideraccept => unknown, không blind resend (không hứa exactly-once). Safe retry chỉ trước side effect hoặc provider chứng minh failed/notaccepted; logs không email body/PII. Cleanup artifact/ledger theo retention security đã chốt, không xoá dữ liệu khách tùy ý.

### 6. Schema, indexes, wiring và lỗi
- Tenant insights.prisma chứa FollowUp, ExportJob(+snapshot chunks nếu cần), DigestDelivery; không workspace_id. Migration áp template và existing tenant theo runner chuẩn; graph ownership bổ sung vì claim cũ038 “không bảng mới” không còn đúng.
- Index follow_up(status,due_at,id) INCLUDE(contact_id,version), partial pending; digest(user_id,cadence,period_start) unique + (state,next_attempt_at,id) partial actionable; export(requested_by,created_at DESC,id) INCLUDE(state,expires_at). Scope queries thêm equality owner/team trước sort nếu access path cần. Source metric index agent_id/assignee_agent_id trước created_at/closed_at, INCLUDE select payload nhỏ; kiểm existing index trước thêm. Ghi EXPLAIN ANALYZE BUFFERS với realistic fixtures, không include JSONB rộng.
- Route/controller thin, providers bind dependencies rõ; API module/ai jobs read và ROLEjobs processors boot-tested, không vòng import AI↔Insights (metric chỉ đọc DB + contracts/public).
- Errors: VALIDATION_FAILED/403/no-scope; ID không visible trả NOT_FOUND theo convention; STALE_VERSION409; export too large validation; expired410; provider unavailable503 hoặc durable failed/unknown. GET không làm mutation; failure một widget không làm rò dữ liệu widget khác.
- Events follow_up.completed/undone + export/digest job transition qua outbox; internal ActionDefs schema/permission guard không agentGrantable. Locale errors/actionlabels đầy đủ, telemetry correlationId không prompt/file/email payload.

## ACCEPTANCE CRITERIA
1. **AC01 registry/tool** — Given scoped Sales và metric allowlist; When HTTP/action/query_data cùng params; Then kết quả cùng rows/sources/window. Unknown metric/SQL attempt bị từ chối; source permission thiếu không lộ tổng; assistant và Cowork không vượt group grants.
2. **AC02 metric arithmetic** — Given payment/refund/booked khác nhau, date-boundary/DST, bigint lớn; When query; Then tiền chính xác strings, window halfopen, empty denominator null+n0, nguồn truy được trong scope, không cộng trùng join.
3. **AC03 stats** — Given2 agents, dryrun, handoff, rated/unrated tickets, mixed human cohort; When list/card/detailstats; Then csat thực và samples đúng, credit actual only, close-rate definition được hiển thị; user không quyền không nhận wallet/hidden sales.
4. **AC04 dashboard isolation** — Given2 tenants và own/team/none/watchers; When dashboard/briefing/digest selectors; Then chỉ visible work, approval CTA đủ quyền, credit hidden nếu không phép; onboarding persistence011 không regress.
5. **AC05 follow-up concurrency** — Given7-day eligible contacts; When2 consumers replay+2 complete calls+restart; Then một source item, dashboard<=5, calendar đồng bộ, remaining chính xác; undo stale/newinteraction không hồi sinh việc cũ, watcher không complete.
6. **AC06 renewal** — Given signed T-30 contract và existing notice; When sweep/dashboard+event replay; Then một notice hiện hữu, một workitem, CTA soạn gia hạn không tự gửi; task opted-in mới nhận event, revoked creator không đọc contract.
7. **AC07 export contents** — Given4 lists với filters/custom hiddenfields/>2000 rows/bigint/formula-like strings; When export/download; Then đúng tập snapshot allfiltered, không truncate, no formulas/leaks, workbook mở được; 0rows có header, >100k báo rõ.
8. **AC08 export auth/recovery** — Given job>50 rows đang chạy; When scope revoke/tenant switch/worker retry/expiry; Then202 progress thật, một artifact logical, không download file stale/foreign, failure không toast thành công.
9. **AC09 digest** — Given daily/weekly/off/DND/multipleworkspaces; When scheduler concurrency/replay/timezone boundaries; Then đúng1 ledger/period/recipient, không backlogspam, off/removed không gửi, provideraccept+crash => unknown không resend mù; console test không coi là Brevo thật.
10. **AC10 UI/wiring/performance** — Given HTTP transport thật; When desktop/mobile dashboard, agentsstats,4exports, assistantquery; Then loading/empty/error/denied/success đúng, vi/en, keyboard; API+jobs+ai boot không dependencycycle; indexed scoped plans có EXPLAIN và không wide heap scan trước LIMIT.

### Lệnh builder (chưa chạy trong pha viết tài liệu)
```powershell
pnpm --filter @appchat/core exec vitest run test/insight-metrics.test.ts test/dashboard-work.test.ts test/digest.test.ts test/list-exports.test.ts
pnpm --filter @appchat/api exec vitest run test/integration/insights.test.ts test/integration/insights-contract.test.ts test/integration/list-exports.test.ts test/integration/digest.test.ts
pnpm --filter @appchat/web exec playwright test e2e/http/insights.spec.ts
pnpm i18n:check
pnpm parity dashboard
pnpm parity --done
pnpm ai:live
```
Rà package scripts/test config trước chạy, ghi lệnh thực và output. Thêm tests4export vào HTTP spec; mock mode chạy contract+E2E tương ứng. D59 trướccommit lint/typecheck/unit/depcheck các package đổi; chốtTIP full integration/build/E2E regression theo GOAL-BACKEND, không thay bằng mấy lệnh trên.
Live9router: hỏi thu thực tháng này vs đơn đã đặt, CSAT agent, khách cần chăm sóc; model gọi query_data thật, không SQL, nguồn đúng, user own không thấy other; revoke giữa2toolcalls bị từ chối. Brevo/SMTP digest thiếu tài nguyên ghi CHỜ-TK, không console=providerproof.

## CONSTRAINTS
- `tools/parity/parity.manifest.ts` đang vượt trần: chỉ facade1–2dòng; logicparity mới ở `tools/parity/modules/insights.ts`, không mở rộng monolith.
- Chỉ code sau câu A hoàn tất; không sửa commerce/permissions/tariff, không Reports module, không autonomous outreach.
- Action-first kể cả internal writes, no direct GET effects; tenant resolver, scope+fieldmask không thể thiếu ở aggregate/export/mail.
- Backend200–400, tách khi500/trần600; frontend150–250/trần400; test riêng. New panels/hooks không nhồi DashboardScreen/AgentCard.
- Không sửa mock để che HTTP bug, không dùng sốfixture làm thống kê thật. Không in/commit secrets hoặc email/filecontents.
- Reuse042c policies,045b jobs/serializer,notify mailport,011 onboarding,009 wallet,contract T30event,023c chart. Thiếu contract phải cập nhật TIP/overlap trước code.

## BUILDER-CHECKLIST
- [ ] Manifest/dependencies/overlap và Q029 đã rà; source lineage cho từng metric được ghi.
- [ ] AC01–10 có bằng chứng test thực; native isolation+fault injection+EXPLAIN.
- [ ] Mock/HTTP + parity/mobile/i18n + live9router/provider tình trạng trung thực.
- [ ] Error/permission/undo/idempotency/job recovery không giả; D59 pass trước commit.
- [ ] Completion report mapping từng COVERAGE row, SHA git sạch, PR dev; không đánh ĐẠT bằng tài liệu.

## Ranh giới xuất dữ liệu AI-first — DC244

038 sở hữu backend4list export/snapshot/artifact. [TIP038b](TIP-038b-ai-first-data-transfer.md) nhận natural-language orchestration, mở rộng CRM/catalog/invoice và header/items, nhập6domain, tài liệuPDF/DOCX theo capability. Không duplicate exporthandlers hoặc coi luồng manual038 là đủ nghiệm thu AI-first.

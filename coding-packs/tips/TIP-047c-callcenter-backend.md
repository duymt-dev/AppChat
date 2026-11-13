# TIP-047c — Backend Gọi điện: action, webhook, vòng đời cuộc gọi, định tuyến, ghi âm, Voice AI, ZCC (D61)

## HEADER
- **Parallel-safe with TIP-003b (coverage-closure manifest):** sequential, shares `apps/worker/src/event-protocol.manifest.ts`, `apps/worker/src/roles/jobs.module.ts`, `packages/core/src/billing/services/credit-meter.ts`, `packages/core/src/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/events/protocol/aggregate.ts`, `packages/shared/src/index.ts`, `packages/shared/test/event-protocol.test.ts`; integrate 003b before047c.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `apps/api/src/app.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/event-protocol.manifest.ts`, `apps/worker/src/roles/ai.module.ts`, `apps/worker/src/roles/channels.module.ts`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/agents/agent-tools.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/index.ts`; integrate 003c before047c.
- **Parallel-safe with TIP-006b (coverage-closure manifest):** sequential, shares `apps/worker/src/event-protocol.manifest.ts`, `apps/worker/src/roles/ai.module.ts`, `apps/worker/src/roles/jobs.module.ts`, `packages/core/src/index.ts`; integrate 006b before047c.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `apps/api/src/app.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/ai.module.ts`, `apps/worker/src/roles/channels.module.ts`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/channels/webchat/visitor.service.ts`, `packages/core/src/composition/privacy.module.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/actions/policy.ts`, `packages/core/src/kernel/privacy/types.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 015c before047c.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `apps/worker/src/roles/ai.module.ts`, `packages/core/src/billing/public.ts`, `packages/core/src/billing/services/credit-meter.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/index.ts`; integrate 019b before047c.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/test/ai-role-handlers.test.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/agents/agent-tools.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/ai/jobs/ai-domain-handlers.module.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/channels/webchat/webchat.handlers.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/actions/policy.ts`, `packages/core/test/assistant-coverage.test.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/crm.ts`, `packages/shared/src/i18n/server/en/notify.ts`, `packages/shared/src/i18n/server/vi/crm.ts`, `packages/shared/src/i18n/server/vi/notify.ts`, `packages/shared/src/index.ts`; integrate 023b before047c.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/crm/public.ts`, `packages/shared/src/api/calendar.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/crm.ts`, `packages/shared/src/i18n/server/vi/crm.ts`; integrate 026c before047c.
- **Parallel-safe with TIP-045 (coverage-closure manifest):** sequential, shares `apps/worker/src/event-protocol.manifest.ts`, `packages/core/src/index.ts`; integrate 047c before045.
- **Parallel-safe with TIP-003e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003e before047c.
- **Parallel-safe with TIP-003f (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 003f before047c.
- **Parallel-safe with TIP-003h (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 003h before047c.
- **Parallel-safe with TIP-003i (coverage-closure manifest):** sequential, shares `packages/core/src/booking/services/calendar-read.service.ts`; integrate 003i before047c.
- **Parallel-safe with TIP-006c (coverage-closure manifest):** sequential, shares `packages/shared/src/events.ts`; integrate 006c before047c.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/actions/src/settings-apps.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/index.ts`; integrate 012b before047c.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/index.ts`; integrate 012c before047c.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 013c before047c.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/channels.module.ts`, `packages/actions/src/index.ts`, `packages/actions/src/settings-apps.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/index.ts`; integrate 014b before047c.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/i18n/server/en/crm.ts`, `packages/shared/src/i18n/server/vi/crm.ts`, `packages/shared/src/index.ts`; integrate 015b before047c.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/api/src/app.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/ai.module.ts`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/crm/services/timeline.service.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/actions/policy.ts`, `packages/core/src/notify/events/domain.rules.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/i18n/server/en/crm.ts`, `packages/shared/src/i18n/server/en/notify.ts`, `packages/shared/src/i18n/server/vi/crm.ts`, `packages/shared/src/i18n/server/vi/notify.ts`, `packages/shared/src/index.ts`, `packages/shared/src/notify/catalog.ts`; integrate 015d before047c.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/crm/services/timeline.service.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/i18n/server/en/crm.ts`, `packages/shared/src/i18n/server/vi/crm.ts`, `packages/shared/src/index.ts`; integrate 015e before047c.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/api/src/app.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/ai.module.ts`, `apps/worker/src/roles/channels.module.ts`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/i18n/server/en/crm.ts`, `packages/shared/src/i18n/server/vi/crm.ts`, `packages/shared/src/index.ts`; integrate 015f before047c.
- **Parallel-safe with TIP-015g (coverage-closure manifest):** sequential, shares `packages/core/src/crm/public.ts`; integrate 015g before047c.
- **Parallel-safe with TIP-017b (coverage-closure manifest):** sequential, shares `apps/api/src/http/channels/widget.gateway.ts`, `packages/actions/src/settings-apps.ts`, `packages/core/src/channels/webchat/webchat.handlers.ts`, `packages/core/src/channels/webchat/widget.service.ts`; integrate 017b before047c.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/agents/agent-tools.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 019c before047c.
- **Parallel-safe with TIP-019d (coverage-closure manifest):** sequential, shares `packages/core/src/kernel/actions/policy.ts`; integrate 019d before047c.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 020b before047c.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `packages/shared/src/api/index.ts`; integrate 020d before047c.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 020e before047c.
- **Parallel-safe with TIP-021b (coverage-closure manifest):** sequential, shares `packages/core/src/ai/agents/agent-tools.ts`; integrate 021b before047c.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/actions/src/settings-apps.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/index.ts`; integrate 022b before047c.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/actions/src/settings-apps.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 023c before047c.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 023d before047c.
- **Parallel-safe with TIP-023e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/index.ts`; integrate 023e before047c.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 023f before047c.
- **Parallel-safe with TIP-023g (coverage-closure manifest):** sequential, shares `apps/api/test/integration/record-ai-privacy.test.ts`, `packages/shared/src/api/index.ts`; integrate 023g before047c.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/crm/services/timeline.service.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/index.ts`; integrate 025b before047c.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/actions/src/settings-apps.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/crm/services/timeline.service.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/i18n/server/en/crm.ts`, `packages/shared/src/i18n/server/vi/crm.ts`, `packages/shared/src/index.ts`; integrate 026b before047c.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 027b before047c.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/index.ts`, `packages/core/test/assistant-coverage.test.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 030b before047c.
- **Parallel-safe with TIP-030c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/ai.module.ts`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 030c before047c.
- **Parallel-safe with TIP-031b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 031b before047c.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/actions/policy.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/i18n/server/en/notify.ts`, `packages/shared/src/i18n/server/vi/notify.ts`, `packages/shared/src/index.ts`, `packages/shared/src/notify/catalog.ts`; integrate 032b before047c.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`; integrate 032c before047c.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 032d before047c.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 032e before047c.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/actions/src/settings-apps.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/calendar.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/index.ts`; integrate 033b before047c.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/shared/src/api/calendar.ts`, `packages/shared/src/api/index.ts`; integrate 033c before047c.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/index.ts`; integrate 034b before047c.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 034c before047c.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 034d before047c.
- **Parallel-safe with TIP-036 (coverage-closure manifest):** sequential, shares `apps/api/src/app.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 036 before047c.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/actions/src/settings-apps.ts`, `packages/core/src/index.ts`, `packages/core/src/notify/events/domain.rules.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 037 before047c.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/index.ts`, `packages/core/src/insights/exports/export-runner.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/api/list-exports.ts`, `packages/shared/src/index.ts`; integrate 038 before047c.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `apps/api/src/app.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 038b before047c.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/billing/public.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 039 before047c.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 040 before047c.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/notify.ts`, `packages/shared/src/i18n/server/vi/notify.ts`, `packages/shared/src/index.ts`, `packages/shared/src/notify/catalog.ts`; integrate 041 before047c.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 042 before047c.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/actions/src/settings-apps.ts`, `packages/shared/src/api/index.ts`; integrate 042b before047c.
- **Parallel-safe with TIP-042c (coverage-closure manifest):** sequential, shares `packages/core/src/booking/services/calendar-read.service.ts`; integrate 042c before047c.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 043 before047c.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/api/src/app.module.ts`, `apps/api/src/http/channels/widget.gateway.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/channels/webchat/webchat.handlers.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/files/magic.ts`, `packages/core/src/kernel/files/upload-guard.ts`, `packages/core/test/upload-guard.test.ts`, `packages/shared/src/api/calendar.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/crm.ts`, `packages/shared/src/i18n/server/en/notify.ts`, `packages/shared/src/i18n/server/vi/crm.ts`, `packages/shared/src/i18n/server/vi/notify.ts`, `packages/shared/src/index.ts`, `packages/shared/src/notify/catalog.ts`; integrate 045b before047c.
- **TIP-ID:** TIP-047c · **Project:** AppChat V2 · **Module:** Gọi điện — backend (domain `callcenter`) · **Priority:** P0 · **Estimated:** XL (4 pha)
- **Depends on:** 047b, 047, 026c, 015c, 019b, 023b và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 047d, 044, 045, 046.
- **Vì sao phụ thuộc:**
  - 047b: bảng, quyền, gói, giá voice, mã `CG-`. 047: `packages/voice` (port + mock).
  - 026c: `crm/public.ts` (`soleOpenOpportunity`, `recordOpportunityEvent`) + `contact_opportunity.set_stage`.
  - 015c: privacy adapter + `contact.forget`. 019b: CreditMeter idempotent + run AI.
  - 023b: assistant-coverage / `pendingByTip`.
  - 003b / 003c / 006b (DONE): outbox v2, system adapter, fanout realtime.
- **Files touched:** [exact M/C manifest](manifests/TIP-047c-files.md). Domain mới `packages/core/src/callcenter/` (module + jobs + actions + services + events + privacy). Không thêm logic vào file legacy vượt trần — chỉ facade 1–2 dòng ở `crm/public.ts`, `index.ts`, `composition/privacy.module.ts`.
- **Quyết định nguồn:** D61 (#2, #5–#10, #12) · DC-904 · DC-903 · **DC-907** (Voice AI tự dựng, chốt Q-902…906) · D60 #9–10 · Blueprint §2.3, §3.4, §3.5, §4.6, §4.7, §6b · sync wD:pD.
- **Dòng COVERAGE nhận:** REQ-O03 · REQ-O04 · REQ-O05 (API) · REQ-O06 (API) · REQ-O07 · REQ-O08 · REQ-O09 · REQ-O10 (API) · REQ-O11 · D61-calls · DC-904 · DC-907 (phiên / credit / Hộp SIM) · ACT-call.* · BP-4.7-calls · BP-2.3-calls.

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2`. Mọi ghi đi qua `ActionExecutor` (`POST /v1/actions/:id`); hệ thống ghi bằng action `exposure: 'internal'` qua system adapter có capability niêm phong (003c).
- **Hiện trạng (rà 2026-11-13; đường dẫn do agent rà code):**
  - **Webhook mẫu:**
    - `apps/api/src/http/integrations/hooks.controller.ts`: rawBody, giới hạn body, trả `{ data }` nhanh.
    - `packages/core/src/integrations/services/webhook.service.ts`: tra route nền tảng → DB tenant → biên nhận.
    - Bỏ tiền tố `/v1` cho `hooks/{*path}` ở `apps/api/src/http/kernel/prefix.ts:8`. Rate-limit bỏ qua `/hooks/` (`api-rate-limit.guard.ts:13`). OpenAPI ẩn `/hooks/` (`apps/api/src/openapi/route-scan.ts:25,27`). `bootstrap.ts:15` bật rawBody.
  - **System adapter:**
    - `registerSystemAdapter(spec{name, topics, actionId, triggers}, deps{executor, tenants})` ở `kernel/actions/system/event-adapter.ts:52`.
    - Bắt buộc kèm `registerSystemVerifier` (`admission.ts:38`, gọi trong `onModuleInit`) và dòng `action(name, topics)` ở `apps/worker/src/event-protocol.manifest.ts`.
    - Ví dụ: `support/jobs/support.jobs.module.ts:82–85`.
    - Action mẫu `packages/actions/src/system/support.ts` (`systemInput` / `systemOutput` ở `system/common.ts`). `SYSTEM_ONLY` ở `ai/assistant/catalog.ts:25`.
  - **Outbox v2:**
    - Registry `kernel/events/protocol/registry.ts`. Topic khai ở hai nơi: `packages/shared/src/events.ts` (EVENT_SCHEMAS) và `packages/shared/src/events/protocol/aggregate.ts` (`by('call','call_id')`). Test `packages/shared/test/event-protocol.test.ts`.
    - `withEventTransaction` (`kernel/outbox/transaction.ts:47`), `writeOutbox` (`kernel/outbox/outbox.ts:20`).
  - **Realtime:**
    - `registerRealtimeRule(name, topic, build)` (`notify/rules.ts:41`).
    - File luật domain phải import ở `notify/events/domain.rules.ts`.
    - Envelope có `require` để lọc theo quyền / scope; gateway `apps/api/src/http/notify/realtime/ws.gateway.ts`.
  - **CreditMeter** (`billing/services/credit-meter.ts`):
    - `UsageInput` không có kind; ref `'ai_step'`. Sổ `credit_ledger` unique(workspace_id, ref_type, ref_id).
    - Biên nhận `usage-receipt.ts`. Hết credit: `credits.exhausted` (`billing/events/billing.events.ts:33`) → `ai/reply/credit-handoff.consumer.ts:56`.
  - **Files:**
    - FilesService chỉ có `upload` / `read` (`kernel/files/files.service.ts`); domain tự đánh dấu `file.confirmed`.
    - `UPLOAD_PURPOSES` ở `kernel/files/upload-guard.ts:10`, ALLOWED L18. Chưa có loại âm thanh trong `magic.ts:7` → 415. Giới hạn 25MB (`UPLOAD_LIMITS.default`).
    - Port Storage có `delete(key)` (`storage.ts:52`, `s3-storage.ts:99`). URL ký: `signed-url.ts` / `file-access.ts`.
  - **Privacy:**
    - Union `PrivacyDomain` 13 phần tử (`kernel/privacy/types.ts:5–18`) + `PRIVACY_DOMAINS`.
    - Ghép ở `composition/privacy.module.ts` (`PRIVACY_ADAPTERS`, thiếu adapter → lỗi boot).
    - Port privacy không gọi Storage (types.ts:2). Xoá byte tệp do job domain làm sau khi dòng đã xoá.
  - **Notify:**
    - Không có hàm gửi trực tiếp: dùng outbox `notify.requested` hoặc `registerNotificationRule`.
    - Kind ở `packages/shared/src/notify/catalog.ts:17`, tiêu đề `shared/i18n/server/{vi,en}/notify.ts`. Không có web push (006d).
  - **Data jobs / export:**
    - `registerDataJobKind` (`kernel/jobs/bulk-dispatch.ts:43`). Mẫu CSV `crm/jobs/contact-export.processor.ts`.
    - Export danh sách `LIST_EXPORT_KINDS` (`shared/api/list-exports.ts`), `insights/exports/export-runner.ts`, action mẫu `actions/src/list-exports.ts`.
  - **Worker:**
    - `apps/worker/src/roles/{channels,ai,jobs}.module.ts`; ROLE enum `kernel/env.ts:8`.
    - Thêm vào `DOMAINS` (`core/src/index.ts:100`) làm vỡ `core/test/modules.test.ts`, `api/test/health.test.ts:72`, `worker/test/roles.test.ts` (đều khẳng định 19 domain) → **không** thêm `callcenter` vào `DOMAINS`.
    - Theo tiền lệ `data-transfer` / `privacy`: export qua `index.ts`, HTTP module vào `withActions` (`apps/api/src/app.module.ts:52`), jobs vào `JOBS_EXTRA` (`roles/jobs.module.ts:11`). Phần chạy ở ROLE=channels / ai thêm vào `CHANNELS_JOBS` / `AI_JOBS`, kèm sửa `roles.test.ts`.
  - **CRM:**
    - `crm/public.ts` export `ContactIdentityService` (khớp SĐT / tạo khách nháp), `writeTimeline`, `applyStageRule`, `lockStageFamilyOf`…
    - 026c thêm `soleOpenOpportunity`, `recordOpportunityEvent` (Quality Gate 026c), `source_kind 'call'`.
    - `contact_task.create` ở `actions/src/contact-tasks.ts:15`, handler `crm/activities/tasks.handlers.ts:30`.
  - **Support:** `ticket.create` (`support/actions/ticket-create.handler.ts`). 047b đã mở kênh `call`.
  - **AI:**
    - Không có class AgentGateway. `AiSdkEngine` (`packages/ai/src/gateway/engine.ts:47`), token `AGENT_ENGINE` (`core/src/ai/ai.module.ts:68`).
    - Tool agent ở `ai/agents/agent-tools.ts`; runtime `agent.runtime.ts:84`; `ai_agent.channels` / `working_hours` / `tool_ids` (`ai-agents.prisma`).
  - **Policy** `kernel/actions/policy.ts`: `FORCE_APPROVAL_ACTIONS` L19, `UI_ONLY_ACTIONS` L32, `MANDATORY_PREVIEW_ACTIONS` L42. Action chưa có handler phải có mục ở `kernel/actions/tip-owners.ts` (BY_ID L3, BY_PREFIX L48), nếu không boot lỗi.
  - **Phủ Trợ lý:**
    - `pendingByTip` (`kernel/actions/handler-registry.ts:68`). `apps/api/test/integration/actions.test.ts:147` khẳng định `{}`. `apps/worker/test/ai-role-handlers.test.ts:30` có LATER_TIPS.
    - `packages/core/test/assistant-coverage.test.ts` (ALIAS / EXEMPT ô `*_id`, preview bắt buộc) + `tools/parity/manifests/assistant-coverage.ts`.
  - **Giờ làm việc:** `business_hours` (`booking.prisma` L56) + `booking/services/slots.ts` (`windowOf`).
- **Key files to read first:** DC-903 / DC-904, D61, Blueprint §3.4 callcenter + §4.6 / §4.7 / §6b · `standards/{actions/action-registry, events/outbox, domain/state-machine, domain/concurrency, authz/rbac-permissions, ai/agent-gateway, ops/observability-security}.md` · sync wD:pD (CONTEXT tóm tắt) · các file nêu trên.
- **Patterns to follow:**
  - Webhook: `integrations/services/webhook.service.ts` + `bank-ingress-sink.ts` + `sales/payments/bank/receipt.ts` (biên nhận + outbox cùng transaction).
  - System adapter: `support.jobs.module.ts`.
  - Action đọc / ghi + preview + undo: `crm/activities/*`.
  - Export: `list-exports.ts` + `export-runner.ts`.
  - Privacy: `booking/privacy/*` + `crm/privacy/*`.

## APPLICABLE STANDARDS
- [actions/action-registry](../standards/actions/action-registry.md) — defineAction, risk, preview, undo, `agentGrantable`, `exposure: internal`.
- [api/response-envelope](../standards/api/response-envelope.md) — `{ data }` / `{ data, next_cursor }` / bảng số trang D42 `{ data, next_cursor, meta }`; `Idempotency-Key` cho `call.dial` / `zcc_request_consent`.
- [events/outbox](../standards/events/outbox.md) — topic mới khai hai nơi, payload chỉ id, cùng transaction.
- [domain/state-machine](../standards/domain/state-machine.md) · [domain/concurrency](../standards/domain/concurrency.md) — vòng đời cuộc gọi hàm thuần, CAS `version`, webhook trễ / lặp.
- [domain/money-time-numbering](../standards/domain/money-time-numbering.md) — mã `CG-`, giờ làm việc theo múi workspace.
- [authz/rbac-permissions](../standards/authz/rbac-permissions.md) — `call.*`, scope `callcenter` own.
- [ai/agent-gateway](../standards/ai/agent-gateway.md) · [ai/eval](../standards/ai/eval.md) — Voice AI = agent bật "Xử lý cuộc gọi", tool = quyền agent ∩ người ra lệnh, credit.
- [integrations/provider-ports](../standards/integrations/provider-ports.md) — webhook `/hooks/*`, chữ ký, idempotent.
- [ops/observability-security](../standards/ops/observability-security.md) — log không SĐT / transcript, metric nhãn giới hạn.
- [database/indexing](../standards/database/indexing.md) — list nhật ký deferred join + EXPLAIN.
- [code/file-size-module-layout](../standards/code/file-size-module-layout.md) · [code/testing](../standards/code/testing.md).

## Rà trước khi làm
1. Rebase `origin/dev` sau khi 047b đã merge. Chạy `python -X utf8 tools/obligations/manifests.py 047c` và tích hợp trước các TIP chung file theo HEADER.
2. Đọc lại `registerSystemAdapter` / `registerSystemVerifier` / `event-protocol.manifest.ts` trên dev. Chữ ký hàm đổi thì theo dev, ghi report.
3. Đếm topic chưa khai trong baseline event (DV-099). Topic `call.*` mới phải khai đủ hai nơi, không vào baseline.
4. Kiểm `@livekit/rtc-node` chạy được trong worker ROLE=channels / ai trên máy dev. Không chạy được thì test ghi âm / Voice AI dùng mock và ghi "chưa nghiệm thu ghi âm thật trên Windows" (047 Rà #2).
5. Kiểm 026c đã export `soleOpenOpportunity` / `recordOpportunityEvent` trong `crm/public.ts`. Chưa có thì dừng, báo (L2), không tự viết lại logic cơ hội.

## TASK
Dựng domain `callcenter`:
- Action người dùng / cấu hình / nội bộ (Blueprint §3.4).
- Webhook LiveKit / ZCC → biên nhận → action nội bộ.
- Vòng đời cuộc gọi CAS; định tuyến gọi vào (IVR, nhóm, máy lẻ, AI, ngoài giờ); gọi ra theo kênh.
- Gọi nhỡ → việc gọi lại; Hẹn gọi lại.
- Ghi âm qua FilesService, transcript + tóm tắt AI.
- Voice AI nghe máy + credit `voice_turn`; yêu cầu gọi Zalo có phí.
- Giám sát; realtime xuống WebPhone; xuất CSV.
- Privacy + dọn hết hạn; gắn khách / cơ hội / ticket.

Không UI (047d).

## SPECIFICATIONS

### 1. Bố cục domain (`packages/core/src/callcenter/`, file 200–400 dòng, trần 600)
- `callcenter.module.ts` (API: handler + service), `jobs/callcenter.jobs.module.ts` (ROLE=jobs: consumer gọi nhỡ, dọn hết hạn, nhắc gọi lại), `jobs/callcenter-media.module.ts` (ROLE=channels: phòng / SIP / ghi âm / Voice AI), `jobs/callcenter-ai.module.ts` (ROLE=ai: transcript + tóm tắt).
- `public.ts` export service đọc + `CALLCENTER_*` hằng. Một dòng ở `packages/core/src/index.ts`.
- Thư mục con:
  - `actions/`: handler + preview, chia theo nhóm `call-read`, `call-control`, `call-assign`, `callback`, `zcc`, `config-lines`, `config-routing`, `system`.
  - `services/`: `lifecycle.ts` hàm thuần, `router.ts`, `dialer.ts`, `recording.ts`, `voice-session.ts`, `kpis.repo.ts`, `calls.repo.ts`, `scope.ts`, `business-hours.ts`.
  - `ingress/`: `livekit.ts`, `zcc.ts`, `receipt.ts`.
  - `events/`: `call.rules.ts` (realtime + notify), `missed.consumer.ts`.
  - `privacy/`: `adapter.ts`, `inventory.ts`, `cleanup.ts`.
  - `jobs/expiry.ts`.
- **Không** thêm `callcenter` vào `DOMAINS` (§CONTEXT): đăng ký theo tiền lệ `data-transfer` / `privacy`.

### 2. Action (`packages/actions/src/callcenter.ts` + `callcenter-config.ts` + `system/callcenter.ts`; module `callcenter`)
| Action | Risk | Quyền | agentGrantable | Ghi chú |
|---|---|---|---|---|
| `call.list` | read | `call.view` + scope | read: true (skill) | Tab `all · in · out · missed · voicemail · ai`, kỳ `today · 7d · 30d · from/to`, `q` (tên / số / mã), `extension_id`, `line_id`; D42 `page` + `limit` (≤ 100, mặc định 20) + `meta.total` + đếm từng tab; deferred join |
| `call.get` | read | `call.view` + scope | read: true (skill) | Chi tiết: cuộc, chặng, chuỗi chuyển máy, khách, cơ hội gợi ý, ghi âm có / không (không URL), transcript + tóm tắt **chỉ khi `call.listen`** |
| `call.kpis` | read | `call.view` (KPI theo scope) | read: true (skill) | 6 KPI theo kỳ + so kỳ trước, biểu đồ theo giờ 8–20h, bảng máy nhánh (trạng thái, ghi chú, số khách chờ) |
| `call.dial` | send | `call.use` + máy nhánh `can_dial` + gói | false | Input: `to` (SĐT E.164 / `contact_id` / ZCC user), `line_id?` (mặc định Caller ID theo nhóm / máy), `contact_id?`, `opportunity_id?`. Chọn kênh theo §4.2. Trả `{ call_id, room, token }`. Idempotency-Key bắt buộc. Không giả Caller ID |
| `call.answer` · `call.hangup` · `call.hold` · `call.mute` · `call.dtmf` | write | `call.use`, người đang ở chặng | false | CAS `if_version`. `answer` khi đổ chuông nhóm: một người thắng (chặng đầu tiên CAS `ringing → in_progress`), còn lại 409 `already_answered` |
| `call.transfer` | write | `call.use`, người đang ở chặng | false | `mode: blind · consult`, đích máy lẻ / nhóm. Một bản ghi `call`, thêm `call_leg` có `transfer_from_leg_id` (UC-CALL-02) |
| `call.monitor` | write | `call.monitor` | false | `mode: listen · whisper · barge`; ghi `audit` + `call_leg role monitor`; khách không nghe whisper |
| `call.assign_contact` · `call.link_opportunity` · `call.save_note` | write | `call.view` + scope (+ `crm.edit` cho gán khách / cơ hội) | false | Undo 24h. Gán khách ghi timeline khách; gán cơ hội gọi `recordOpportunityEvent(ref_type: 'call')` (026c), không đổi giai đoạn |
| `call.create_ticket` | write | `ticket.manage` + `call.view` | false | Gọi `ticket.create` channel `call`, kèm tóm tắt + transcript **chỉ khi người gọi có `call.listen`**, không thì chỉ tóm tắt. Undo 24h |
| `call.schedule_callback` | write | `crm.edit` + scope khách | **true** | Input `contact_id`, `at` (ISO offset; client tính 4 lựa chọn của prototype), `caller: user|agent`, `user_id?`, `agent_id?`, `note`, `call_id?`. Tạo `contact_task` kind `callback`. `caller: agent` chỉ khi agent có "Xử lý cuộc gọi" + kênh hotline / ZCC (không SIM — D61 #7). Undo 24h |
| `call.zcc_request_consent` | send | `call.use` | false | Bắt buộc preview kèm phí (`MANDATORY_PREVIEW_ACTIONS` cho ui + assistant), `FORCE_APPROVAL_ACTIONS` cho agent / task (agentGrantable false ⇒ thực tế cấm). Idempotency-Key. Chống gửi lặp: còn `pending` < 24h cho cùng khách → 409 `consent_pending` |
| `call.recording_url` | read | `call.listen` + scope | false | URL ký 5 phút (`signed-url.ts`), audit mỗi lần |
| `call.export` | read, bulk | `callcenter.manage` | false | Kind `call` vào `LIST_EXPORT_KINDS`; CSV / XLSX theo export-runner; không xuất transcript |
| `call_line.create` · `.update` · `.disable` · `.test` | config | `callcenter.manage` | false | Lưu số / trunk / ZCC (token OA + bí mật SIP mã hoá); `ensureTrunk` (047); ghi `tenant_call_route`; `.test` gọi `OPTIONS` / thử trunk giả lập. CAS |
| `call_extension.create` · `.update` · `.delete` | config | `callcenter.manage` | false | Cấp số lẻ tự động từ 101 (bỏ số đã dùng); 900 dành AI; `QuotaService.assert(ws, 'call_extensions', n)` (máy AI không tính); `device` chỉ `webphone` |
| `call_queue.create` · `.update` · `.delete` | config | `callcenter.manage` | false | Tên duy nhất, thành viên, 4 cách đổ chuông, chờ 30–300 giây, tràn; không xoá nhóm đang là đích IVR / tràn (409) |
| `call_ivr.update` | config | `callcenter.manage` | false | Lời chào (file purpose `call_greeting`), AI nghe máy trước + agent, phím 0–9, ngoài giờ; ghi âm bật ⇒ thông báo bật |
| `call_settings.update` | config | `callcenter.manage` | false | Ghi âm / transcript / giám sát bật tắt; Caller ID theo nhóm |
| `webchat.update_widget` (đã có) | config | `channels.manage` | false | Thêm `settings.calls` (bật nút gọi WebRTC trên widget, mặc định tắt — DC-905 g); chỉ lưu được khi workspace có ít nhất một máy nhánh nhận cuộc gọi |
| `call.ingest_event` · `call.finalize` · `call.record_missed` · `call.voice_turn` | internal | system | false | `exposure: 'internal'`, `systemInput` / `systemOutput`; chỉ system adapter / worker gọi (§3) |

- Mọi action ghi có `preview()` (assistant-coverage). Preview `call.dial` nêu kênh + Caller ID + phí (ZCC ngoài cửa sổ → gợi ý `zcc_request_consent`, không tự gửi). Preview `zcc_request_consent` nêu phí, người trả (`oa` / `app`), credit sẽ trừ.
- Ô `*_id` mới: `call_id` / `line_id` / `extension_id` / `queue_id` có đường tra (`call.list` / `call.get`, `call_line.list` read trong `callcenter-config.ts`). `ALIAS` / `EXEMPT` trong `assistant-coverage.test.ts` chỉ thêm khi có lý do ghi rõ.
- `tip-owners.ts`: không thêm (mọi action có handler trong TIP này). `pendingByTip` = `{}`.
- Nhãn `actions.<id>.title` vi + en (`apps/web/messages/*/actions.json`). Trợ lý catalog (`ai/assistant/catalog.ts`) mô tả nhóm callcenter. `SYSTEM_ONLY` thêm 4 action internal.

### 3. Webhook → biên nhận → action nội bộ (DC-904 a, b)
1. **Controller** `apps/api/src/http/callcenter/hooks.controller.ts`:
   - Route `POST /hooks/livekit` và `POST /hooks/zalo-zcc/:appId`.
   - rawBody bắt buộc, ≤ 64KB, trả 200 nhanh `{ data: { accepted } }`.
   - Không JWT, không ghi DB trực tiếp: gọi `CallIngress.receive(provider, raw, headers)`.
2. **`CallIngress`** (`ingress/*.ts`):
   - **LiveKit:** `LiveKitWebhookVerifier.verify`. Workspace + callId lấy từ tên phòng (`roomName` ngược), phòng lạ → 200 `ignored`.
   - **ZCC:** `ZccClient.verifyWebhook`, tra `tenant_call_route` `zcc:<oa_id>`.
   - Sau đó trong `withEventTransaction` của DB tenant:
     - Chèn `call_webhook_receipt (provider, event_id)`. Trùng → `ignored_duplicate`.
     - Ghi outbox topic nội bộ `call.ingress` (chỉ id biên nhận) để system adapter gọi `call.ingest_event` (actor system, capability niêm phong).
   - Sai chữ ký → 401, không ghi biên nhận. Lỗi DB → 503 để provider gửi lại.
3. **`call.ingest_event`** đọc lại sự kiện từ biên nhận (không tin payload outbox) và áp vòng đời §4.1 bằng CAS.
   - Sự kiện cũ hơn trạng thái hiện tại → biên nhận `ignored_stale`, không ghi đè.
   - Thứ tự đến lệch (ended trước answered) → hàm thuần tính trạng thái đích từ mốc thời gian sự kiện, không từ thứ tự đến.
4. **Đăng ký:**
   - `registerSystemAdapter({ name: 'callcenter.ingest', topics: ['call.ingress'], actionId: 'call.ingest_event', … })` + `registerSystemVerifier` trong `onModuleInit` của `callcenter.jobs.module.ts`.
   - Dòng `action('callcenter.ingest', ['call.ingress'])` ở `event-protocol.manifest.ts`.
   - Cùng mẫu cho `call.missed` → `call.record_missed` (gọi nhỡ → việc).
5. **Dọn biên nhận** > 30 ngày bằng job `callcenter.receipts_gc` (ROLE=jobs, `upsertJobScheduler` hằng ngày).

### 4. Vòng đời, định tuyến, gọi ra
1. **`lifecycle.ts` (hàm thuần, test bảng):**
   - Luồng: `ringing → in_progress → completed`; `ringing → missed | voicemail | ai_handled | failed`; `in_progress → completed | failed`.
   - Mỗi chuyển tăng `version`, ghi mốc `answered_at` / `ended_at`, tính `duration_s` / `wait_s`.
   - Cuộc chỉ AI xử lý (không người nhận) kết thúc → `ai_handled`. Khách để lại lời nhắn → `voicemail`.
   - Topic: `call.ringing` · `call.answered` · `call.ended` · `call.missed` · `call.recording_ready` · `call.transcript_ready` · `callcenter.extension_status`.
     - Payload chỉ id: `call_id`, `contact_id?`, `extension_id?`, `user_ids` (người cần nhận realtime).
     - Không SĐT / URL / transcript.
     - Khai ở `events.ts` + `aggregate.ts` (`by('call','call_id')`, `callcenter.extension_status` → `by('call_extension','extension_id')`).
2. **Gọi ra (`dialer.ts`, D61 #2, #7–9):**
   - Kênh mặc định theo `call_line` của Caller ID (máy → nhóm → mặc định workspace).
   - **ZCC:** khách có tương tác OA ≤ 30 ngày hoặc `zcc_consent.granted` còn hạn → gọi; không → 409 `zcc_consent_required`. FE hiện nút "Gửi yêu cầu gọi Zalo" / "Gọi bằng hotline / SIM"; **không tự gọi lần hai** (D61 #9).
   - **SIM gateway:** trần `max_concurrent = 1`, đang bận → 409 `line_busy`. Cấm gọi từ đường bulk / AI.
   - **personal_forwarding:** không gọi ra (chỉ nhận chuyển tiếp) → 422 `line_inbound_only`, gợi ý kênh khác.
   - Tạo `call` + phòng + `SipDispatchPort.dialOut`. Ghi âm theo `call_ivr.record_calls`, phát thông báo ghi âm trước khi ghi (D61 #10).
3. **Gọi vào (`router.ts`, REQ-O03):**
   - Sự kiện SIP vào → khớp khách:
     - Khớp `contact_identity` (ZCC user / SĐT).
     - Không khớp → `ContactIdentityService` tạo khách nháp nguồn `call` (D61 #6).
     - ZCC không có SĐT → `caller_phone` null, `external_user_id` = Zalo user.
   - Ngoài giờ theo `business_hours` + ngày nghỉ → lời nhắn / AI theo `after_hours`.
   - Trong giờ:
     1. Lời chào (file).
     2. AI nghe máy trước nếu bật.
     3. Phím 0–9 → đích.
     4. Nhóm đổ chuông theo `strategy`: `sequential` theo `position`; `ring_all`; `least_calls` theo số cuộc hôm nay; `longest_idle` theo `status_changed_at`.
     5. Hết `max_wait_s` → tràn.
   - Chỉ đổ chuông máy `online` + `can_receive`. Không ai → tràn ngay.
   - `wait_s` ghi lại. Số khách chờ realtime cho bảng máy nhánh.
4. **Trạng thái máy nhánh:**
   - Nguồn là sự kiện LiveKit + action người dùng: online khi WebPhone nối, busy khi ở chặng, acw 30 giây sau khi kết thúc (cấu hình), away do người chọn.
   - Ghi `call_extension.status` CAS + topic `callcenter.extension_status`.

### 5. Gọi nhỡ, Hẹn gọi lại (D61 #6, D60 #9)
1. **Consumer `call.missed`** (system adapter, ROLE=jobs) → `call.record_missed`:
   - Tìm việc `callback` đang mở của khách (index 047b §2):
     - Có → `missed_count + 1`, gắn `call.callback_task_id`, không tạo việc mới.
     - Không → tạo `contact_task` kind `callback`, tiêu đề "Gọi lại {tên / số}".
   - Người nhận việc: người phụ trách khách. Khách nháp chưa có người phụ trách → `assignee_user_id` null (việc chưa giao, hiện ở tab Gọi nhỡ).
   - Hạn: +30 phút nếu trong giờ, ngược lại đầu giờ ngày làm việc kế (`business-hours.ts`, múi workspace).
   - Thông báo kind `call_missed` tới người nhận (catalog notify + tiêu đề vi / en).
2. **Ai bấm "Gọi lại" ở việc chưa giao** → `call.dial` kèm `callback_task_id` → nhận việc (`assignee_user_id` = người bấm, CAS) rồi gọi.
3. **`call.schedule_callback`:**
   - Tạo việc + nhắc trước 10 phút (job `callcenter.callback_reminder` mỗi phút, ROLE=jobs, notify kind `call_callback_due`).
   - Hiện ở Lịch hẹn qua đọc `contact_task` kind callback trong kỳ: 047c thêm `callbacks` vào `GET /calendar` theo quyền `booking.view` + scope crm của khách. Là mảng riêng, không trộn `appointment`.
   - Ghi timeline khách. `caller: agent` → đến giờ, job gọi `call.dial` nguồn `task` của agent (D61 #7: một khách, hotline / ZCC, không SIM); kết quả ghi vào việc.
4. **Hoàn tất việc:** cuộc gọi ra tới khách có việc callback mở mà `completed` → `contact_task` `done` (action nội bộ, ghi người hoàn tất).

### 6. Ghi âm, transcript, tóm tắt (D61 #10, REQ-O06 / O11)
1. **Ghi âm (ROLE=channels):**
   - `TrackRecorder` (047) bắt đầu sau khi phát thông báo ghi âm.
   - Kết thúc → `FilesService.upload` purpose mới `call_recording` (upload-guard thêm purpose + loại `ogg` / `opus` trong `magic.ts` — nhận diện `OggS`). Giới hạn riêng 200MB / file cho purpose này; > 4 giờ cắt nhiều file, mỗi đoạn một `file_id` trong `call_recording` phụ.
   - `file.confirmed = true`; `call_recording.expires_at = ended_at + 12 tháng`; topic `call.recording_ready`.
2. **Transcript + tóm tắt (ROLE=ai, consumer `call.recording_ready`):**
   - STT theo `VoiceAiEnginePort` / `SttPort` (mock mặc định) → `call_transcript.segments` (người nói theo kênh) + `expires_at`.
   - Tóm tắt + thái độ + đề xuất giai đoạn / việc → `call_summary` qua `AiSdkEngine` (run kind `suggestion`, credit qua CreditMeter ref `ai_step` như hiện tại).
   - "Dịch tiếng Việt": `text_vi` sinh lười khi người xem bấm (action đọc `call.translate` không cần — dùng `call.get?translate=vi`, tính credit một lần, lưu lại).
3. **Timeline khách:** cuộc gọi kết thúc (có khách) ghi `writeTimeline` type `call`, key `call_in` / `call_out` / `call_missed` (tham số mã `CG-`, thời lượng, người nghe) — thêm `TimelineKey` / `TimelineType` ở `crm/services/timeline.service.ts` + nhãn `i18n/server/{vi,en}/crm.ts`; không chép transcript vào timeline.
4. **Đề xuất AI:** chỉ lưu ở `call_summary.suggestion`. Áp dụng = người bấm gọi `contact_opportunity.set_stage` / `call.schedule_callback` / `contact_task.create` (D60 #10). Không tự đổi.
5. **Dọn hết hạn (job `callcenter.expiry`, hằng ngày, ROLE=jobs):**
   - Ghi âm / transcript `expires_at < now` và `deleted_at` null:
     - Đánh dấu `deleted_at`.
     - Xoá dòng `file` + `Storage.delete(key)` (sau khi transaction DB thành công; lỗi Storage → thử lại lần sau, idempotent).
     - Xoá `segments` (để `[]`).
   - Giữ `call_summary`.
   - Metric số file đã xoá.

### 7. Voice AI (D61 #7, #12, DC-904 e)
1. **Agent nhận cuộc:** agent bật "Xử lý cuộc gọi" — `ai_agent.channels` chứa `'call'`. Builder Tools nhóm theo module có `callcenter` (D51), bật ở 047d. Kiểm `working_hours` của agent.
2. **Phiên (ROLE=channels):**
   - `VoiceAiEnginePort.start` với system prompt + `kb_scope` (D54) + tools = `effectiveToolIds(agent, caller)` (D51 §3.3b). Cuộc gọi vào không có người ra lệnh → quyền agent. Gọi ra từ Hẹn gọi lại → ∩ quyền người hẹn.
   - Tool call → `ActionExecutor` nguồn `agent` (policy như agent trực kênh: send cần duyệt, delete cấm).
   - Bộ cài theo `VOICE_AI_ENGINE` (DC-907): production `pipeline` local (PhoWhisper + VieNeu-TTS, `TurnEngine` = `AiSdkEngine` qua 9router); `realtime` chỉ khi có key. `start()` ném `VOICE_AI_BUSY` (hết `VOICE_AI_MAX_SESSIONS`) → bỏ bước AI, đi tiếp IVR / nhóm như AI tắt, ghi lý do `ai_busy` ở `call.meta`.
3. **Credit:** mỗi `turn` → action nội bộ `call.voice_turn` → `CreditMeter.chargeVoice({ ws, callId, turnIdx, kind, provider, model, units })`. Idempotent `ref_type 'voice_turn'`, `ref_id = callId:turnIdx`.
   - Chế độ `pipeline` local: `usage` kind `stt` / `tts` có `provider: 'local'` → giá dòng `stt:local` / `tts:local` = 0 (047b seed); chỉ kind `llm` tính tiền theo bảng giá model chat hiện có (DC-907 c).
   - `PriceBook` đọc `model_price.unit` / `credits_per_unit` (047b).
   - Thiếu giá (dòng không tồn tại hoặc `active = false`, trừ `*:local` giá 0) → `MODEL_PRICE_MISSING` → handoff người, không chạy miễn phí.
   - `credits.exhausted` → `handoff('credit_exhausted')`: chuyển người / lời nhắn, không cắt cuộc đang có người (D09).
4. **Handoff:** tin cậy < ngưỡng agent (gồm STT `confidence` thấp hai lượt liền), khách yêu cầu, tool bị cấm, lỗi, `VOICE_AI_BUSY` → chuyển nhóm theo IVR, tràn theo luật. Cuộc ghi `agent_id` + `answered_by_user_id` khi người nhận.
5. **Run AI:** mỗi phiên một `ai_run` kind `agent_reply` (`conversation_id` null, `meta.call_id`). Bước = lượt. Không tạo kind enum mới.
6. **AI gọi ra:** chỉ từ Hẹn gọi lại `caller: agent` (§5.3). Không auto-dialer / gọi nhắc hàng loạt (Sắp có).

### 8. Yêu cầu gọi Zalo (D61 #8, DC-904 f)
- `call.zcc_request_consent`:
  - Preview nêu phí (giá từ `model_price` dòng `zcc:consent_request` hoặc `cost` Zalo trả, mặc định 550đ khi chưa cấu hình — ghi trong preview "ước tính").
  - Người trả `ZCC_BILLING`:
    - `oa`: không trừ credit, ghi `billed_to = oa`.
    - `app`: trừ credit idempotent ref `zcc_consent:<id>` trước khi gửi; lỗi gửi → hoàn credit cùng ref (`refund`).
  - Gửi qua `ZccClient.requestConsent`. Ghi `zcc_consent pending` + timeline khách.
- Webhook ZCC đồng ý / từ chối / hết 24h → cập nhật trạng thái + `callable_until` (+30 ngày) + notify người gửi.
- Agent không có action này (agentGrantable false + `FORCE_APPROVAL_ACTIONS`).

### 9. Đọc, scope, realtime, export
1. **Scope `callcenter` own (D61 #5)** — cuộc thấy được khi:
   - `answered_by_user_id = me`, hoặc
   - `initiated_by_user_id = me`, hoặc
   - có chặng của tôi, hoặc
   - gọi nhỡ (`status IN missed, voicemail`) của nhóm tôi là thành viên (`call_queue_member`), hoặc
   - khách tôi phụ trách (dùng `crmScopeSql`).

   `scope.ts` dựng SQL một lần, dùng cho list / get / kpis / export. Ngoài scope → 404 đồng nhất.
2. **List** id-first deferred join: chọn `id` theo index 047b §1.2, rồi join lấy cột hiển thị + tên khách / máy / số tổng đài. Đếm tab bằng một truy vấn `count(*) FILTER`. EXPLAIN 100k dán report.
3. **KPI:** ≤ 3 truy vấn gộp (đếm theo trạng thái / hướng, thời lượng TB, theo giờ). "AI Voice tự xử" = `ai_handled / tổng vào`. So kỳ trước cùng độ dài.
4. **Realtime** (`events/call.rules.ts`, import ở `notify/events/domain.rules.ts`):
   - `call.ringing` → người được đổ chuông (`user_ids`).
   - `call.answered` / `call.ended` → người trong cuộc + người có `call.monitor`, để cập nhật bảng máy nhánh.
   - `callcenter.extension_status` → người có `call.view`.

   Envelope `require` theo quyền. Data chỉ id + trạng thái; FE tải lại qua REST.
5. **HTTP đọc** (`apps/api/src/http/callcenter/calls.controller.ts`):
   - `GET /v1/calls`, `/v1/calls/:id`, `/v1/calls/kpis`, `/v1/calls/meta` (máy nhánh, nhóm, số, quyền, gói).
   - `GET /v1/calls/token` (token LiveKit cho máy nhánh của người gọi, TTL 10 phút).
   - `GET /v1/settings/callcenter` (cấu hình 4 tab).
   - Đăng ký `CallcenterHttpModule` trong `withActions`.
6. **Widget** (`webrtc_widget`, mặc định tắt): ack `visitor.call` trên gateway `/widget` (`widget.gateway.ts` + `visitor.service.ts`) trả token khách cho phòng mới khi `webchat_widget.settings.calls` bật + giờ làm việc. Rate-limit 3 cuộc / visitor / giờ. Cuộc vào như gọi vào kênh `webrtc_widget`.

### 10. Privacy (015c, D61 #10)
- `PrivacyDomain` thêm `'callcenter'` + `PRIVACY_DOMAINS`. `composition/privacy.module.ts` thêm `callcenterPrivacyAdapter`.
- **Inventory** theo `contact_id`: `call` (exclusive), `call_recording`, `call_transcript`, `call_summary`, `zcc_consent`, việc callback thuộc crm (đã có).
- **Erase:** scrub `caller_phone` / `external_user_id` / `note`, xoá `call_transcript` + `call_summary` + đánh dấu `call_recording.deleted_at`, `zcc_consent` xoá số / user. Byte tệp do job `callcenter.expiry` dọn ngay lượt kế (bỏ qua hạn khi `deleted_at` có lý do `forget`) — port privacy không gọi Storage.
- Test: Quên khách → ghi âm / transcript / tóm tắt hết, cuộc còn lại dạng ẩn danh (giữ thống kê).

### 11. Lỗi
- **422 `VALIDATION_FAILED`:** số không hợp lệ · `line_inbound_only` · `ext_taken` · `ext_reserved` (900) · `queue_in_use` · `callback_agent_invalid` (agent không xử lý cuộc gọi / kênh SIM).
- **409 `CONFLICT`:** version lệch · `already_answered` · `line_busy` · `zcc_consent_required` · `consent_pending` · `call_ended`.
- **402 `PLAN_LIMIT_REACHED`:** máy nhánh vượt gói (resource `call_extensions`) · gói không có Gọi điện (`resource: calls`).
- **403** thiếu quyền · **404** đồng nhất ngoài scope.
- **502 `VOICE_PROVIDER_FAILED`** (LiveKit / ZCC lỗi) · **503 `VOICE_NOT_CONFIGURED`**.
- Message không chứa SĐT / token.

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given webhook LiveKit `participant_joined` / `room_finished` gửi 2 lần và đến ngược thứ tự, when ingress xử lý, then một biên nhận mỗi `event_id`, trạng thái cuối đúng `completed`, `version` tăng đúng số chuyển, không ghi đè bằng sự kiện cũ; sai chữ ký → 401, không biên nhận | integration `callcenter-webhooks.test.ts` (mock verifier + DB thật) |
| 2 | Given nhóm `ring_all` 3 máy online, when 2 người bấm nghe cùng lúc, then một người `in_progress`, người kia 409 `already_answered`; `sequential` đổ đúng thứ tự; hết 30 giây không ai nghe → tràn `voicemail` | integration `callcenter-routing.test.ts` + unit `router.test.ts` |
| 3 | Given ngoài giờ (`business_hours` T7 đóng), when khách gọi vào, then lời nhắn → `voicemail`, việc gọi lại hạn đầu giờ ngày làm việc kế; trong giờ nhỡ → hạn +30 phút; nhỡ lần 2 khi việc còn mở → `missed_count = 2`, không thêm việc | unit `business-hours.test.ts` + integration `callcenter-missed.test.ts` |
| 4 | Given số lạ gọi vào, when cuộc tạo, then khách nháp nguồn `call`, việc gọi lại chưa giao hiện ở tab Gọi nhỡ; người bấm Gọi lại nhận việc rồi gọi | integration `callcenter-missed.test.ts` |
| 5 | Given sales scope own, when `call.list` / `call.get` / `call.kpis`, then chỉ thấy cuộc mình nghe / gọi, gọi nhỡ nhóm mình, khách mình phụ trách; không có `call.listen` → không transcript / không `recording_url` (403); owner thấy hết | integration `callcenter-scope.test.ts` |
| 6 | Given ZCC khách ngoài cửa sổ 30 ngày, when `call.dial` qua ZCC, then 409 `zcc_consent_required` (không gọi); `call.zcc_request_consent` qua Trợ lý → preview có phí; `ZCC_BILLING=app` → trừ credit một lần (gửi lại cùng Idempotency-Key không trừ thêm), lỗi gửi → hoàn; agent gọi → bị cấm | integration `callcenter-zcc.test.ts` + executor / policy unit |
| 7 | Given Voice AI mock kịch bản 3 lượt + tool `call.schedule_callback` + handoff, when cuộc vào AI nghe trước, then 3 dòng sổ `voice_turn` (gửi lại sự kiện lượt không trừ thêm), lượt `stt` / `tts` provider `local` trừ 0 credit, lượt `llm` trừ theo giá model; tool chạy qua Executor nguồn agent với quyền agent, handoff chuyển nhóm; hết credit giữa chừng → handoff `credit_exhausted`, cuộc không bị cắt; `VOICE_AI_BUSY` → cuộc đi thẳng nhóm | integration `callcenter-voice-ai.test.ts` |
| 8 | Given cuộc có ghi âm (mock recorder) + transcript, when `contact.forget` hoàn tất, then transcript / tóm tắt xoá, ghi âm `deleted_at` + tệp bị xoá ở lượt job kế; hết 12 tháng (đồng hồ giả) → job xoá ghi âm + transcript, giữ tóm tắt | integration `callcenter-privacy.test.ts` + `record-ai-privacy.test.ts` (mở rộng) |
| 9 | Given máy nhánh 6 trên gói Business 5 + 0 addon, when `call_extension.create`, then 402 `call_extensions`; máy AI 900 không tính; gói Personal Pro → 402 `calls` | integration `callcenter-config.test.ts` |
| 10 | Given Hẹn gọi lại `caller: agent` cho 1 khách, when đến giờ, then agent gọi qua hotline (mock SIP), không qua SIM; cuộc `completed` → việc `done`; Lịch hẹn `GET /calendar` có mục callback trong kỳ | integration `callcenter-callback.test.ts` |
| 11 | Given realtime, when cuộc đổ chuông nhóm, then chỉ người được đổ chuông nhận `call.ringing`; envelope không chứa SĐT / tên; `callcenter.extension_status` tới người có `call.view` | integration `realtime.test.ts` (ca mới) |
| 12 | Given registry, when chạy assistant-coverage + actions boot, then mọi action callcenter có handler + preview, `pendingByTip = {}`, ô `*_id` có đường tra, action internal ở `SYSTEM_ONLY` | `packages/core/test/assistant-coverage.test.ts` + `apps/api/test/integration/actions.test.ts` |
| 13 | Given 100k cuộc, when nhật ký 7 ngày LIMIT 20 / tab Gọi nhỡ / scope own / KPI, then index đúng 047b, không Seq Scan | EXPLAIN dán report |

### Commands / evidence gate
- Cổng commit (D59): `pnpm turbo run lint typecheck test --filter=@appchat/{shared,actions,voice,core,api,worker}` · `pnpm depcheck` · `pnpm lint:size`.
- Integration (cổng riêng theo sync wD:pD: `E2E_PORT=3557` / `E2E_HTTP_PORT=3558`, không chạy `e2e:http` song song vì API cố định 4117, `--workers=1`, `TENANT_CLIENT_CACHE=10`, kiểm slot Postgres trước):
  `pnpm --filter @appchat/api test:integration -- test/integration/callcenter-webhooks.test.ts test/integration/callcenter-routing.test.ts test/integration/callcenter-missed.test.ts test/integration/callcenter-scope.test.ts test/integration/callcenter-zcc.test.ts test/integration/callcenter-voice-ai.test.ts test/integration/callcenter-privacy.test.ts test/integration/callcenter-config.test.ts test/integration/callcenter-callback.test.ts test/integration/realtime.test.ts test/integration/actions.test.ts`.
- Unit: `pnpm --filter @appchat/core test -- test/callcenter-lifecycle.test.ts test/callcenter-router.test.ts test/callcenter-business-hours.test.ts test/assistant-coverage.test.ts` · `pnpm --filter @appchat/shared test -- test/event-protocol.test.ts`.
- AI live: `pnpm ai:live --cases fixtures/ai-eval/callcenter.json` (Trợ lý: tra cuộc gọi, hẹn gọi lại, yêu cầu gọi Zalo → preview; 6 ca × 3 lượt, an toàn 100%). Voice AI tự dựng (DC-907): chạy cuộc thật với `pipeline` local khi có máy thoại (Q-903) + số thử (Q-904); trước đó ghi "chưa nghiệm thu cuộc gọi thật" (STT / TTS đã đo ở TIP-047 AC9).
- Gọi thật (ZCC / SIP / SIM): chưa có tài nguyên (Q-902 / 903 / 904 / 906) → ghi "chưa nghiệm thu với provider thật" từng kênh.

## CONSTRAINTS
- **DO NOT:**
  - Ghi DB từ controller.
  - Payload outbox chứa SĐT / URL / transcript.
  - Tự gọi lần hai khi ZCC không nghe.
  - Auto-dialer / gọi nhắc hàng loạt.
  - Agent tự gửi yêu cầu gọi Zalo.
  - AI gọi ra qua SIM cá nhân.
  - Giả Caller ID.
  - Tự đổi giai đoạn cơ hội từ đề xuất AI.
  - Cắt cuộc đang có người khi hết credit.
  - Thêm `callcenter` vào `DOMAINS`.
  - Thêm logic vào file legacy vượt trần.
  - Dùng Docker / `livekit-egress`.
- **REUSE:**
  - `registerSystemAdapter` + verifier.
  - `withEventTransaction` / `writeOutbox`.
  - `registerRealtimeRule` / `registerNotificationRule`.
  - `CreditMeter` + biên nhận usage.
  - `FilesService` + Storage port.
  - `ContactIdentityService`, `writeTimeline`.
  - `crm/public.ts` 026c.
  - `ticket.create`, `contact_task`.
  - `export-runner`, `registerDataJobKind`.
  - `QuotaService`, `signed-url`.
  - Port `packages/voice` (047).
- **SKIP:**
  - Mọi UI (047d).
  - Softphone / IP Phone / Mobile app.
  - "Phút gọi Voice" / "Số hotline riêng".
  - ZNS / chat OA (D04).
  - Báo cáo cuộc gọi (D19).

## Quality Gate
- [x] Manifest chính xác (file-level M/C). Giao file khai hai phía (`manifests.py --sync 047 047b 047c 047d`).
- [x] Action khớp Blueprint §3.4 + quyền §3.5; webhook theo §4.7; topic theo §2.3; Voice AI theo §6b + D51 / D54.
- [x] Ràng buộc sync wD:pD đủ: biên nhận theo event id, outbox chỉ id, CAS, credit theo lượt idempotent, FilesService, privacy adapter, cổng test riêng.
- [x] 13 AC có Given/When/Then + bằng chứng; ô thiếu tài nguyên ghi trung thực.
- **Gap đã khai:**
  - Byte ghi âm khi Quên khách xoá ở lượt job kế (port privacy không gọi Storage — chậm tối đa 24 giờ, ghi trong report và màn Quên khách).
  - Phí yêu cầu gọi ZCC chờ Zalo xác nhận (DC-907 e); Voice AI local không tính phí STT / TTS (DC-907 c).
  - Kênh SIM gateway chỉ test bằng SIPp; FE hiện "Sắp có" tới khi có thiết bị (DC-907 h) — backend vẫn đủ để bật sau.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Implement đúng `Files touched` (manifest), không thêm file ngoài scope; file mới 200–400 dòng, trần 600.
- [ ] AC 1–13 có kết quả từng cái, dán output thật (`pnpm …`, EXPLAIN); ô thiếu provider ghi "chưa nghiệm thu với provider thật".
- [ ] **Action-first (BUILDER-HANDOFF):** mọi ghi qua `ActionExecutor`; webhook chỉ ghi biên nhận + outbox rồi system adapter gọi action internal.
- [ ] **Event v2:** topic mới khai `events.ts` + `aggregate.ts` + manifest worker; payload chỉ id; ghi trong transaction đã đăng ký.
- [ ] **Tiền / gửi ra ngoài có người (D61 #8, D51):** `zcc_request_consent` bắt buộc preview, agent không gọi được; credit idempotent theo `callId:turnIdx` / `zcc_consent:<id>`.
- [ ] **Tenant + scope:** mọi list / get / kpis / export áp scope `callcenter`; 404 đồng nhất ngoài scope.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA.

# TIP-047d — Giao diện Gọi điện: màn Call Center, WebPhone, Hẹn gọi lại, Cài đặt → Tổng đài, nút gọi, rail (D61)

## HEADER
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/common.json`, `apps/web/messages/vi/common.json`, `apps/web/src/shared/api/mock/handlers.ts`; integrate 048 before047d.
- **Parallel-safe with TIP-035d (coverage-closure manifest):** sequential, shares `apps/web/package.json`; integrate 035d before047d.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`, `packages/core/src/inbox/services/meta.service.ts`; integrate 047d before048b.
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/agents/components/builder/RoutingSection.tsx`, `apps/web/src/features/inbox/components/ConnectChannelModal.tsx`, `apps/web/src/shared/api/mock/handlers.ts`, `fixtures/prototype-parity/settings.json`, `tools/parity/parity.manifest.ts`; integrate 047d before048c.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 047d before048d.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 047d before048e.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/shared/src/i18n/server/en/inbox.ts`, `packages/shared/src/i18n/server/vi/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 047d before048f.
- **Parallel-safe with TIP-048g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/shared/src/i18n/server/en/inbox.ts`, `packages/shared/src/i18n/server/vi/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 047d before048g.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`; integrate 047d before048h.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/calendar.json`, `apps/web/messages/en/common.json`, `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/calendar.json`, `apps/web/messages/vi/common.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/customers/columns.tsx`, `apps/web/src/features/inbox/components/Overview360.tsx`, `apps/web/src/shared/contact-activities/ActivityCards.test.tsx`, `apps/web/src/shared/contact-activities/ActivityFormHost.tsx`, `apps/web/src/shared/contact-activities/activity-store.ts`, `apps/web/src/shared/contact-activities/commands.ts`, `tools/parity/parity.manifest.ts`, `tools/parity/src/capture.ts`; integrate 026c before047d.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/finance.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/en/shell.json`, `apps/web/messages/vi/finance.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/shell.json`, `apps/web/src/features/finance/components/FinanceCustomerDrawer.tsx`, `apps/web/src/features/inbox/components/Overview360.tsx`, `apps/web/src/i18n/messages.ts`, `apps/web/src/shared/api/mock/routes.ts`, `apps/web/src/shared/realtime/event-invalidation.ts`, `apps/web/src/shared/shell/NavRail.tsx`, `apps/web/src/shared/shell/nav-config.test.ts`, `apps/web/src/shared/shell/nav-config.ts`, `tools/parity/parity.manifest.ts`, `tools/parity/src/capture.ts`; integrate 032e before047d.
- **Parallel-safe with TIP-044 (coverage-closure manifest):** sequential, shares `pnpm-lock.yaml`; integrate 047d before044.
- **Parallel-safe with TIP-045 (coverage-closure manifest):** sequential, shares `pnpm-lock.yaml`; integrate 047d before045.
- **Parallel-safe with TIP-046 (coverage-closure manifest):** sequential, shares `apps/web/package.json`, `pnpm-lock.yaml`, `tools/parity/parity.manifest.ts`; integrate 047d before046.
- **Parallel-safe with TIP-047 (coverage-closure manifest):** sequential, shares `pnpm-lock.yaml`; integrate 047 before047d.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/settings.json`; integrate 047b before047d.
- **Parallel-safe with TIP-001b (coverage-closure manifest):** sequential, shares `apps/web/src/features/settings/components/WidgetSection.tsx`, `apps/web/src/shared/api/mock/routes.ts`; integrate 001b before047d.
- **Parallel-safe with TIP-001c (coverage-closure manifest):** sequential, shares `apps/web/e2e/mobile-sweep.spec.ts`; integrate 001c before047d.
- **Parallel-safe with TIP-003d (coverage-closure manifest):** sequential, shares `apps/api/src/openapi/route-scan.ts`; integrate 003d before047d.
- **Parallel-safe with TIP-003f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/common.json`, `apps/web/messages/vi/common.json`; integrate 003f before047d.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `tools/parity/parity.manifest.ts`; integrate 004b before047d.
- **Parallel-safe with TIP-006b (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-delivery.test.ts`, `apps/web/src/shared/realtime/event-invalidation.ts`; integrate 006b before047d.
- **Parallel-safe with TIP-006c (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`; integrate 006c before047d.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 006d before047d.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/types.ts`, `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/core/src/integrations/services/read.service.ts`, `tools/parity/parity.manifest.ts`; integrate 012b before047d.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `apps/web/src/features/settings/screens/SettingsScreen.tsx`, `apps/web/src/features/settings/types.ts`, `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/core/src/integrations/services/read.service.ts`, `tools/parity/parity.manifest.ts`; integrate 012c before047d.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `tools/parity/parity.manifest.ts`; integrate 013b before047d.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013c before047d.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `packages/shared/src/i18n/server/en/inbox.ts`, `packages/shared/src/i18n/server/vi/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 014b before047d.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 014c before047d.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/Blocks360.tsx`, `tools/parity/parity.manifest.ts`; integrate 015b before047d.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `apps/web/src/app/(app)/layout.tsx`, `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 015c before047d.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/en/shell.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/shell.json`, `apps/web/src/shared/realtime/event-invalidation.ts`, `tools/parity/parity.manifest.ts`; integrate 015d before047d.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`, `apps/web/src/shared/realtime/event-invalidation.ts`, `tools/parity/parity.manifest.ts`; integrate 015e before047d.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/Profile360Actions.tsx`, `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/shared/src/i18n/server/en/inbox.ts`, `packages/shared/src/i18n/server/vi/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 015f before047d.
- **Parallel-safe with TIP-016b (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`, `apps/web/src/shared/shell/useShellData.ts`; integrate 016b before047d.
- **Parallel-safe with TIP-017b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/WidgetSection.tsx`, `apps/widget/src/main.ts`, `apps/widget/src/types.ts`, `apps/widget/src/ui.ts`; integrate 017b before047d.
- **Parallel-safe with TIP-018b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 018b before047d.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`, `tools/parity/parity.manifest.ts`; integrate 019b before047d.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 019c before047d.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020b before047d.
- **Parallel-safe with TIP-020c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 020c before047d.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 020d before047d.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020e before047d.
- **Parallel-safe with TIP-021b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/agents.json`, `apps/web/messages/vi/agents.json`; integrate 021b before047d.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/agents.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/agents.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/agents/components/builder/RoutingSection.tsx`, `packages/core/src/ai/agents/agents.read.ts`, `packages/core/src/ai/agents/catalog.ts`, `tools/parity/parity.manifest.ts`; integrate 022b before047d.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/calendar.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/calendar.json`, `apps/web/messages/vi/inbox.json`, `packages/core/src/ai/agents/agents.read.ts`, `packages/core/src/inbox/services/meta.service.ts`, `packages/shared/src/i18n/server/en/inbox.ts`, `packages/shared/src/i18n/server/vi/inbox.ts`, `pnpm-lock.yaml`, `tools/parity/parity.manifest.ts`; integrate 023b before047d.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/agents.json`, `apps/web/messages/en/calendar.json`, `apps/web/messages/en/common.json`, `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/agents.json`, `apps/web/messages/vi/calendar.json`, `apps/web/messages/vi/common.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/package.json`, `apps/web/src/features/calendar/screens/CalendarScreen.tsx`, `apps/web/src/shared/api/mock/handlers.ts`, `apps/web/src/shared/api/mock/routes.ts`, `fixtures/prototype-parity/agents.json`, `fixtures/prototype-parity/inbox.json`, `packages/core/src/integrations/services/read.service.ts`, `pnpm-lock.yaml`, `tools/parity/parity.manifest.ts`; integrate 023c before047d.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 023d before047d.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/handlers.ts`, `apps/web/src/shared/api/mock/routes.ts`, `tools/parity/parity.manifest.ts`; integrate 023f before047d.
- **Parallel-safe with TIP-023g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/calendar.json`, `apps/web/messages/vi/calendar.json`, `apps/web/src/features/calendar/components/ListView.tsx`, `tools/parity/parity.manifest.ts`; integrate 023g before047d.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/app/(app)/_crm-forms/FormCommandHost.test.tsx`, `apps/web/src/app/(app)/_crm-forms/FormCommandHost.tsx`, `apps/web/src/features/calendar/api.ts`, `apps/web/src/features/inbox/components/Blocks360.tsx`, `apps/web/src/features/inbox/components/Overview360.tsx`, `apps/web/src/features/inbox/components/Profile360Actions.tsx`, `apps/web/src/shared/api/mock/domains/calendar.ts`, `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/core/src/inbox/services/meta.service.ts`, `packages/shared/src/i18n/server/en/inbox.ts`, `packages/shared/src/i18n/server/vi/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 025b before047d.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/app/(app)/_crm-forms/FormCommandHost.tsx`, `apps/web/src/features/inbox/components/Blocks360.tsx`, `apps/web/src/features/inbox/components/Overview360.tsx`, `apps/web/src/features/settings/types.ts`, `apps/web/src/shared/contact-activities/ActivityCards.test.tsx`, `apps/web/src/shared/contact-activities/ActivityFormHost.tsx`, `apps/web/src/shared/contact-activities/TaskCard.tsx`, `apps/web/src/shared/contact-activities/commands.ts`, `apps/web/src/shared/realtime/event-invalidation.ts`, `tools/parity/parity.manifest.ts`; integrate 026b before047d.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 027b before047d.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/types.ts`, `pnpm-lock.yaml`, `tools/parity/parity.manifest.ts`; integrate 030b before047d.
- **Parallel-safe with TIP-031c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 031c before047d.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `pnpm-lock.yaml`, `tools/parity/parity.manifest.ts`; integrate 032b before047d.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `apps/web/src/app/(app)/_crm-forms/FormCommandHost.tsx`, `tools/parity/parity.manifest.ts`; integrate 032c before047d.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 032d before047d.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/calendar.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/calendar.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/calendar/api.ts`, `apps/web/src/features/calendar/components/AppointmentDrawer.tsx`, `apps/web/src/features/calendar/types.ts`, `apps/web/src/features/inbox/components/Blocks360.tsx`, `apps/web/src/features/inbox/components/Overview360.tsx`, `apps/web/src/features/settings/registry.ts`, `apps/web/src/features/settings/screens/SettingsScreen.tsx`, `apps/web/src/features/settings/types.ts`, `apps/web/src/shared/api/mock/domains/calendar.ts`, `apps/web/src/shared/realtime/event-invalidation.ts`, `tools/parity/parity.manifest.ts`; integrate 033b before047d.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/calendar.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/calendar.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/calendar/components/AppointmentDrawer.tsx`, `apps/web/src/features/calendar/types.ts`, `apps/web/src/shared/api/mock/domains/calendar.ts`, `tools/parity/parity.manifest.ts`; integrate 033c before047d.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `apps/web/src/features/settings/screens/SettingsScreen.tsx`, `apps/web/src/shared/api/mock/handlers.ts`, `apps/web/src/shared/api/mock/routes.ts`, `apps/web/src/shared/api/mock/store.ts`, `apps/web/src/shared/realtime/event-invalidation.ts`, `tools/parity/parity.manifest.ts`; integrate 034b before047d.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`, `tools/parity/parity.manifest.ts`; integrate 034c before047d.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 034d before047d.
- **Parallel-safe with TIP-035c (coverage-closure manifest):** sequential, shares `tools/scripts/fixtures/gen-inbox.py`; integrate 035c before047d.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 037 before047d.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/agents.json`, `apps/web/messages/vi/agents.json`, `apps/web/src/shared/api/mock/domains/calendar.ts`, `packages/core/src/ai/agents/agents.read.ts`, `packages/shared/src/i18n/server/en/insights.ts`, `packages/shared/src/i18n/server/vi/insights.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before047d.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `apps/web/src/app/(app)/layout.tsx`, `tools/parity/parity.manifest.ts`; integrate 038b before047d.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/WalletShop.tsx`, `apps/web/src/features/settings/types.ts`, `tools/parity/parity.manifest.ts`; integrate 039 before047d.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 040 before047d.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before047d.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `apps/web/src/features/settings/screens/SettingsScreen.tsx`, `apps/web/src/features/settings/types.ts`, `tools/parity/parity.manifest.ts`; integrate 042 before047d.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `apps/web/src/features/settings/screens/SettingsScreen.tsx`, `tools/parity/parity.manifest.ts`; integrate 042b before047d.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 043 before047d.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/api/src/http/kernel/api-rate-limit.guard.ts`, `apps/api/src/http/kernel/cors-policy.ts`, `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/calendar/components/ListView.tsx`, `apps/web/src/features/calendar/types.ts`, `apps/web/src/features/customers/columns.tsx`, `apps/web/src/features/settings/registry.ts`, `apps/web/src/features/settings/types.ts`, `pnpm-lock.yaml`, `tools/parity/parity.manifest.ts`; integrate 045b before047d.
- **TIP-ID:** TIP-047d · **Project:** AppChat V2 · **Module:** Gọi điện — frontend (web + widget) · **Priority:** P0 · **Estimated:** XL (4 pha)
- **Depends on:** 047c, 048, 032e, 026c và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 044, 045, 046.
- **Vì sao phụ thuộc:**
  - 047c cung cấp action / API / realtime / token LiveKit.
  - 032e dựng rail "Tài chính" + drawer Tài chính, nơi đặt nút Gọi điện; cùng file `nav-config.ts` / `capture.ts`.
  - 026c dựng `shared/opportunities/*`, dùng cho khối cơ hội ở chi tiết cuộc gọi.
  - Ghép sau khi chuỗi PR hiện tại đã merge (lớp nav + FE + parity cuối cùng — sync wD:pD).
- **Files touched:** [exact M/C manifest](manifests/TIP-047d-files.md).
  - Feature mới `apps/web/src/features/callcenter/`.
  - Host toàn cục `apps/web/src/app/(app)/_webphone/`.
  - Modal dùng chung `apps/web/src/shared/contact-activities/CallbackModal.tsx`.
  - Section Cài đặt `callcenter`.
  - Màn = orchestrator; component 150–250 dòng, trần 400.
- **Quyết định nguồn:** D61 (#2–#10, #13) · DC-905 · DC-907 h (Hộp SIM "Sắp có") · **DC-909** (nút "Uỷ quyền OA" dùng `useOAuthConnect` của TIP-048) · PD-902 · D42 / D43 · D60 #9–10 · REQ-C13 · prototype-parity §6. · DC-922
- **Dòng COVERAGE nhận:** REQ-O04 (UI) · REQ-O05 · REQ-O06 · REQ-O07 (UI) · REQ-O09 (UI) · REQ-O10 · REQ-O12 · D61-ui · DC-905 · PD-902 · PRO-callcenter-* · PRO-deal-callback.

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2`.
- **Stack:** Next.js App Router + Ant Design v6 + Ant Design X, token `packages/ui/theme.ts`, i18n `apps/web/messages/{vi,en}/*.json`.
- **Ghi dữ liệu:** chỉ qua `useAction(id).run(input)`.
- **Hiện trạng (rà 2026-11-13; đường dẫn do agent rà code):**
  - **Rail:**
    - `apps/web/src/shared/shell/nav-config.ts`: L1 chú thích ẩn D07 / D19; `NavKey` L5–7; badge union L9–16; `RAIL_ITEMS` L18–27; `routePermission`.
    - `nav-config.test.ts` khẳng định thứ tự rail.
    - Nhãn rail ở `messages/*/shell.json` (`nav.*`). Render ở `NavRail.tsx` / `MobileTabBar.tsx`. Chặn route ở `RouteGuard.tsx`.
    - 032e chèn `finance` sau Khách hàng.
    - Prototype đặt "Gọi điện" giữa Lịch hẹn và AI Agents (L1138), không badge.
  - **Host toàn cục:**
    - `apps/web/src/app/(app)/layout.tsx` mount `AppShell` + `CrmFormsHost` + `TransferHost`.
    - ESLint chặn `shared` import `features`, nên host nào import feature phải nằm ở `app/(app)/_<x>/`. Mẫu: `_crm-forms/CrmFormsHost.tsx`.
  - **Parity:**
    - `tools/parity/src/capture.ts` L35 `OUT_LABELS = ['Gọi điện','Quy trình','Đối tác tiếp thị']` (026c thêm 'Báo cáo', 'Tài chính'; 032e gỡ 'Tài chính').
    - `tools/parity/parity.manifest.ts`: `ParityEntry` L23–44, spread module cuối file.
    - Mask gỡ thẻ "Tổng đài (Call Center)" ở Nền tảng kết nối (L87–95) và chip "Tổng đài / Call Center" ở Kết nối kênh (L360–366).
    - Module con ở `tools/parity/modules/*.ts`.
  - **Cài đặt:**
    - `features/settings/registry.ts`: `SectionKey` L7–10, NAV nhóm L27–76 (channels / integrations ở nhóm apps), HIDDEN L79–85.
    - `screens/SettingsScreen.tsx` SECTIONS L37–65. Nhãn ở `settings.json` (group / nav / head).
    - Prototype `setNav` không có mục "callcenter". Vào từ thẻ "Tổng đài (Call Center)" ở Nền tảng kết nối (L12035) và nút "Cấu hình tổng đài" ở màn Gọi điện (L4812).
  - **Nút gọi hiện có:**
    - Chỉ hiển thị số: `features/inbox/components/Overview360.tsx` L30–35, `Blocks360.tsx` L23–37, `Profile360Actions.tsx` L22–31, `features/customers/components/Customer360Drawer.tsx`, `features/customers/columns.tsx` L52 / L86, `customers/hooks/useRowMenu.ts`.
    - Drawer Tài chính (032e `FinanceCustomerDrawer.tsx` + header) có nút Gọi điện đang ẩn (D07).
    - `ChatHeader.tsx` L31–35 **không** có nút gọi (REQ-C13, giữ).
  - **AiButton** `packages/ui/src/primitives/AiButton.tsx`. Mẫu drawer Trợ lý màn: `features/tickets/components/TicketsAiDrawer.tsx` (useDrawerAsk) + `hooks/useAssistantContext.ts` + `ui-commands.ts`.
  - **Realtime web:** `shared/realtime/socket.ts` (`subscribeRealtime`), `shared/realtime/event-invalidation.ts` (`EVENT_KEYS`).
  - **Mock:**
    - `shared/api/mock/{handlers,routes,mock-transport,store}.ts`.
    - Domain mock `shared/api/mock/domains/<f>.ts` (+ `-actions.ts`).
    - Fixtures `fixtures/prototype-parity/<m>.json` (sinh bằng `tools/scripts/fixtures/gen-*.py`).
    - Module i18n mới thêm vào `apps/web/src/i18n/messages.ts` MODULES.
  - **E2E:** mock `apps/web/e2e/<m>.spec.ts` (cổng `E2E_PORT`), http `apps/web/e2e/http/<m>.spec.ts` (API cố định 4117).
  - **Tổng quan:** pill module server ở `packages/shared/src/i18n/server/vi/insights.ts` L197–213 + mock `fixtures/prototype-parity/dashboard.json` L214–230. `apps/web/e2e/dashboard.spec.ts` L18 khẳng định không có "Gọi điện".
  - **AI Agents builder:** `features/agents/components/builder/ActionsSection.tsx` ← `shared/ai/agent-tools.ts` (nhóm theo module, D51). Mẫu agent `packages/core/src/ai/agents/catalog.ts` L30 / L46 (tpl_9, tpl_25 tag "Gọi điện"). Prototype Builder "Xử lý cuộc gọi — Nâng cấp" L12873.
  - **Ví / gói:**
    - `features/settings/components/WalletShop.tsx` L74–90 (addon), `PlanCompare.tsx` (bỏ nhóm OUT Gọi điện ngay ở dữ liệu), `PlanCards.tsx`, `UpgradeModal.tsx`.
    - Types addon `features/settings/types.ts` L289–293.
    - Prototype: ví L11541 ("User Tổng đài · thêm 1 máy nhánh 200.000₫/tháng", "Phút gọi Voice"), so sánh gói L11514 / L11529.
  - **Widget:**
    - `apps/widget/src/{main,ui,styles,i18n,types}.ts` (Shadow DOM, launcher `ui.ts` L44–46), build `apps/widget/scripts/build.mjs` (esbuild IIFE, ngân sách 40KB gzip), test `apps/widget/test/ui.test.ts`.
    - Cài đặt `features/settings/components/WidgetSection.tsx` (`webchat.update_widget`).
  - **Prototype (bản 2026-11-10):**
    - Màn L4775–4842: topbar · 6 KPI · biểu đồ theo giờ · bảng máy nhánh · nhật ký 6 tab.
    - Dialer L4844–4871. Chi tiết L4873–4945 (khối cơ hội L4897–4920). Trợ lý thu nhỏ L4947–4975.
    - Hẹn gọi lại L2835–2850 (logic L9195–9221).
    - Cài đặt L8173–8275 (tab `agent` · `in` · `out` · `adv`; khối 7 SIP + 1 Số tổng đài + 6 Ghi âm ở `adv`). Form L8511–8582 (máy nhánh · nhóm · phím IVR · Caller ID).
    - Seed L8758–8763; giá trị view L11838–11894, L12899–12961.
- **Key files to read first:** DC-905, PD-902, D61 · Blueprint §7.2 (callcenter, `_webphone`, settings/callcenter) · `standards/ui/{frontend-structure,prototype-parity,interaction-patterns}.md` · `standards/i18n/i18n.md` · `docs/06-prototype/DEVIATIONS.md` · các file nêu trên · TIP-047c §2 (action), §9 (API).
- **Patterns to follow:**
  - Màn danh sách theo `features/tickets/*` (ListPage + DataTable + ListPager D42, AiDrawer, ui-commands).
  - Host toàn cục theo `_crm-forms`. Modal dùng chung theo `shared/contact-activities`.
  - Section Cài đặt theo `components/booking/*` (nhiều tab con).

## APPLICABLE STANDARDS
- [ui/frontend-structure](../standards/ui/frontend-structure.md) — feature folder, màn orchestrator, host ở `app/(app)/_x`, không import chéo feature.
- [ui/prototype-parity](../standards/ui/prototype-parity.md) — < 5% ở 1440×900, mask trích mã, §6b 4 mức lệch, D42 / D43 bảng.
- [ui/interaction-patterns](../standards/ui/interaction-patterns.md) — trạng thái rỗng / tải / lỗi / không quyền / CAS 409, xác nhận send, mobile 390.
- [i18n/i18n](../standards/i18n/i18n.md) — vi nguồn + en, key không có ".".
- [actions/action-registry](../standards/actions/action-registry.md) — `useAction`, preview send (`zcc_request_consent`), undo 24h.
- [authz/rbac-permissions](../standards/authz/rbac-permissions.md) — `useCan` / `Can` cho `call.*`.
- [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).

## Rà trước khi làm
1. Rebase `origin/dev` sau khi 047c đã merge. Chạy `python -X utf8 tools/obligations/manifests.py 047d`, rồi tích hợp trước các TIP chung file (032e chung `nav-config.ts` / `capture.ts` / `parity.manifest.ts` / `FinanceCustomerDrawer.tsx`).
2. Chạy `node tools/scripts/normalize-prototype.mjs` (bước D44, chỉ khi có bản prototype mới hơn). Mở prototype vào các màn ở CONTEXT, chụp lại 6 trạng thái (danh sách, dialer, chi tiết, Hẹn gọi lại, Cài đặt 4 tab, form máy nhánh) làm mốc.
3. Đo kích thước widget hiện tại (`apps/widget/dist/widget.js` gzip). Nút gọi phải **tải lười** chunk LiveKit (`livekit-client` ~ 100KB+) ngoài ngân sách 40KB (DV-901). Esbuild IIFE không tách chunk được thì dùng `import()` script thứ hai `widget-call.js` (ghi report + đo).
4. Kiểm `livekit-client` chạy trên Chrome / Safari / Firefox desktop và Chrome Android / Safari iOS (mobile web 390). Không hỗ trợ trình duyệt nào thì hiện "Trình duyệt chưa hỗ trợ gọi" (không nút chết).

## TASK
Dựng toàn bộ giao diện Gọi điện theo prototype + SRS, chỉ qua action / API của 047c:
- Rail "Gọi điện" (gỡ `OUT_LABELS` cùng commit).
- Màn Call Center: 6 KPI, biểu đồ theo giờ, bảng máy nhánh realtime + giám sát, nhật ký 6 tab theo D42, Export, Trợ lý AI.
- Chi tiết cuộc gọi: player, tóm tắt, transcript + dịch, khối cơ hội, gán.
- WebPhone toàn cục: dialer, cuộc gọi đến, đang gọi, chuyển máy, thu nhỏ, giám sát.
- Modal Hẹn gọi lại dùng chung; tab Gọi nhỡ.
- Cài đặt → Tổng đài: 4 tab, 7 khối, form.
- Nút gọi ở Hồ sơ 360° / Khách hàng / Tài chính.
- Builder "Xử lý cuộc gọi"; gói / ví "User tổng đài"; widget nút gọi WebRTC (mặc định tắt).

## SPECIFICATIONS

### 1. Rail, route, quyền, gói (REQ-O12, DC-905 e)
- **Rail:**
  - `nav-config.ts`: thêm `NavKey` `callcenter`, `RAIL_ITEMS` chèn `{ key: 'callcenter', route: '/callcenter', icon: 'ic-phone', permission: 'call.view' }` giữa `calendar` và `agents`.
  - Mục ẩn khi gói không có Gọi điện: `me.workspaces` (workspace `current_workspace_id`) `.features.calls === false` (047b). Thêm trường `requires?: 'calls'` vào `NavItem`; `NavRail.tsx` / `MobileTabBar.tsx` lọc theo quyền **và** cờ gói (`useShellData.ts` thêm kiểu `features`).
  - Sửa chú thích L1 (chỉ còn Quy trình / Báo cáo ẩn).
- **Route:** `app/(app)/callcenter/page.tsx` (≤ 120 dòng) → `<CallCenterScreen/>`. Thiếu `call.view` → `RouteGuard` (no-permission, như mọi route rail). Gói không có → màn chặn trong `CallCenterScreen` (`PlanLockedState.tsx`): "Gói hiện tại chưa có Gọi điện" + nút Nâng cấp → `/settings/billing?upgrade=1` (cùng đường nút Nâng cấp ở rail).
- **Nhãn rail:** `shell.json` `nav.callcenter` ("Gọi điện" / "Calls").
- **Parity:** gỡ "Gọi điện" khỏi `OUT_LABELS` ở **cùng commit** dựng rail (prototype-parity §6), rồi `pnpm parity --done`.
  - Gỡ mask thẻ "Tổng đài (Call Center)" (Nền tảng kết nối) và chip "Tổng đài / Call Center" (Kết nối kênh): nay là thẻ thật mở Cài đặt → Tổng đài.
  - Pill "Gọi điện" ở Tổng quan hiện, giữa "Lịch hẹn" và "AI Agents" (sửa `packages/shared/src/i18n/server/{vi,en}/insights.ts` + `fixtures/prototype-parity/dashboard.json` + `e2e/dashboard.spec.ts` L18).
  - Ma trận rail theo vai trò `apps/web/e2e/roles.spec.ts` (RAIL / BLOCKED): cả 5 vai trò thấy "Gọi điện" (`call.view` cả 5 — D61 #5) khi gói có.

### 2. Màn Call Center (`features/callcenter/screens/CallCenterScreen.tsx` = orchestrator)
1. **Header** (`CallCenterHeader.tsx`):
   - Tiêu đề "Call Center" + phụ đề.
   - Kỳ `Hôm nay · 7 ngày · 30 ngày`.
   - Export: `useListExport('call.export')` (`shared/actions/useListExport.ts`, như Hỗ trợ), chỉ `callcenter.manage`.
   - "Gọi đi": mở WebPhone dialer, chỉ khi `call.use` + máy nhánh `can_dial`.
   - `AiButton` mở `CallCenterAiDrawer`.
   - **Bỏ** nút "Cuộc gọi đến (demo)" (PD-902).
2. **KPI** (`CallKpis.tsx`): 6 ô Tổng · Gọi vào · Gọi ra · Gọi nhỡ (tỉ lệ nhỡ) · Thời lượng TB · AI Voice tự xử, mỗi ô so kỳ trước. Từ `call.kpis` (scope người xem).
3. **Biểu đồ** (`HourlyChart.tsx`): cột Gọi vào / Gọi ra 8–20h theo prototype, màu từ token. Không thêm thư viện chart: vẽ bằng div như prototype, hoặc theo primitive có sẵn ở `packages/ui`.
4. **Bảng máy nhánh** (`ExtensionBoard.tsx`):
   - Mỗi máy: avatar, tên, số lẻ, trạng thái (đang gọi + thời gian chạy / sẵn sàng / ACW / nghỉ / AI "n cuộc đang xử lý"), "n trong hàng đợi".
   - Icon mắt mở giám sát, chỉ `call.monitor`, chỉ máy đang gọi.
   - "Cấu hình tổng đài" → `/settings/callcenter`, chỉ `callcenter.manage`.
   - Realtime `callcenter.extension_status` → invalidate `['calls','kpis']`.
5. **Nhật ký** (`CallLogTable.tsx` + `columns.tsx`):
   - 6 tab có số đếm.
   - Cột: chiều (icon) · Khách / Số + chip cơ hội (`ppL`) · Agent · Máy nhánh · Số tổng đài · Giờ · Dài · Trạng thái (Hoàn tất / Gọi nhỡ / AI xử lý / Voicemail) · Ghi âm.
   - "Nghe lại": mở chi tiết, chỉ `call.listen`; thiếu quyền thì hiện "Xem chi tiết".
   - Dòng gọi nhỡ: "Gọi lại" (`call.dial`, nhận việc chưa giao) + "Hẹn gọi lại".
   - Nhãn "Ghi âm lưu 12 tháng".
   - **D42:** khung cao viewport, thân bảng cuộn, header dính, `ListPager` (`shared/list/ListPager.tsx`) số trang 20 / 50 / 100 (`page` + `limit`), đổi tab / kỳ về trang 1. Bảng danh sách mới dùng cùng `DataTable` + `ListPager` (D43); thêm `['/callcenter', 'cc-table', 'data-call']` vào `e2e/list-scroll.spec.ts`.
6. **Trạng thái** (interaction-patterns):
   - Rỗng: "Chưa có cuộc gọi nào trong kỳ"; chưa cấu hình số thì CTA "Kết nối số tổng đài" (`callcenter.manage`).
   - Đang tải (skeleton), lỗi (thử lại), không quyền.
   - Mobile 390: KPI cuộn ngang, bảng thành thẻ, drawer toàn màn.
7. **Trợ lý AI** (`CallCenterAiDrawer.tsx`): thu nhỏ theo prototype L4947. 4 gợi ý (Tóm tắt cuộc gọi nhỡ hôm nay, Khách gọi nhiều nhất tuần, Hẹn gọi lại cho …, Ai đang rảnh), qua `useDrawerAsk` + `useRegisterScreenContext` (màn = callcenter, kỳ, tab). Ghi qua thẻ xác nhận.
8. **`ui-commands.ts`:** `open:call` (mở chi tiết theo id / mã `CG-`), `filter:calls` (tab / kỳ). `open:dialer` đăng ký ở `WebPhoneHost` (chạy ở mọi màn); `prefill:call.callback` ở `FormCommandHost` (§5). Cả ba chỉ mở / điền, không gọi và không ghi thay người.

### 3. Chi tiết cuộc gọi (`CallDetailModal.tsx` + component con, REQ-O06)
- **Đầu:** chiều, tên / số, agent, giờ.
- **Player** (`RecordingPlayer.tsx`): sóng âm từ biên độ tính phía client trên file đã tải (Web Audio), tốc độ 1× / 1.5× / 2×, tua, tải file.
  - URL ký từ `call.recording_url` (5 phút; hết hạn thì lấy lại khi phát tiếp).
  - Chỉ `call.listen`. Ghi âm đã xoá (hết hạn / quên khách) → "Ghi âm đã xoá theo chính sách lưu trữ".
- **Tóm tắt AI + thái độ:** từ `call_summary`. Đang xử lý → "AI đang tóm tắt…" (realtime `call.transcript_ready` làm mới).
- **Khối cơ hội** (prototype L4897–4920) dùng `shared/opportunities/*` (026c):
  - Khách có đúng 1 cơ hội mở → hiện "tự gán theo khách đang có 1 cơ hội mở" + `call.link_opportunity` khi người bấm.
  - "+ Thêm" / "+ Tạo cơ hội từ cuộc gọi" → `contact_opportunity.create` (source `call`, Lead mới).
  - Đề xuất AI ("AI đề xuất sau cuộc gọi … Áp dụng / Bỏ qua") chỉ hiện khi `call_summary.suggestion` có. Áp dụng = `contact_opportunity.set_stage` + `call.schedule_callback` / `contact_task.create` dưới quyền người bấm (D60 #10). Cuộc gọi do AI agent xử lý đã tự áp (DC-922) → hiện "AI đã cập nhật" từ lịch sử cơ hội, không hiện nút Áp dụng.
  - "Đã cập nhật cơ hội" sau khi áp. Lịch sử cơ hội từ 026c.
- **Transcript** (`TranscriptView.tsx`): đoạn theo người nói (Khách / Agent / AI), "Dịch tiếng Việt" bật bản dịch (`call.get?translate=vi`). Chỉ `call.listen`.
- **Gán cuộc gọi:**
  - Vào cơ hội.
  - Vào khách hàng (`call.assign_contact`). Chưa có ô chọn khách dùng chung → tạo `features/callcenter/components/ContactSearchSelect.tsx` (antd `Select` showSearch, gọi `GET /contacts?q=&limit=10`, theo scope người xem).
  - Tạo ticket kèm transcript (`call.create_ticket`).
  - Hẹn gọi lại (`CallbackModal`).
  - Lưu ghi chú vào hồ sơ (`call.save_note`).
  - Tải ghi âm.
  - Mỗi thao tác có undo 24h (toast).
- **Không gọi được / ZCC ngoài cửa sổ:** hiện hai nút một chạm "Gọi bằng hotline / SIM" (`call.dial` kênh khác) và "Gửi yêu cầu gọi Zalo" (`call.zcc_request_consent`, thẻ xác nhận nêu phí). Không tự gọi lần hai (D61 #9).

### 4. WebPhone toàn cục (`app/(app)/_webphone/`, DC-905 b)
1. **Mount:** `WebPhoneHost.tsx` mount một lần ở `app/(app)/layout.tsx` (cạnh `CrmFormsHost`), chỉ khi `call.use` + gói có + người có máy nhánh. Không có máy nhánh thì không nối LiveKit.
2. **Kết nối:** `livekit-client` qua `useWebPhone.ts`.
   - Token `GET /v1/calls/token` (làm mới trước khi hết hạn).
   - Trạng thái máy online khi tab mở. Nhiều tab: tab mới nhất nhận cuộc, tab cũ hiện "Đang nghe ở tab khác" (BroadcastChannel).
   - Xin quyền micro khi bấm gọi / nghe lần đầu. Bị từ chối → hướng dẫn bật quyền.
3. **Dialer** (`Dialer.tsx`, prototype L4844):
   - Caller ID (chọn số được phép), ô số, bàn phím 0–9 * #, xoá, Gọi → `call.dial` (Idempotency-Key).
   - Lỗi `zcc_consent_required` / `line_busy` / `line_inbound_only` → thông báo + hai nút thay thế (§3).
4. **Màn không vẽ trong prototype** (SRS FR-CALL-06, mức 2, ghi PD-902), dựng theo interaction-patterns + token:
   - **Cuộc gọi đến** (`IncomingCall.tsx`): tên / số / khách 360 tóm tắt (giai đoạn, nợ nếu có quyền), nút Nghe (`call.answer`) / Từ chối. Chuông qua `<audio>` (tôn trọng cài đặt thông báo). Người khác đã nghe → 409 `already_answered` → đóng "Đã có người nghe".
   - **Đang gọi** (`InCall.tsx`): đồng hồ, tắt tiếng (`call.mute`), giữ máy (`call.hold`), phím số (`call.dtmf`), chuyển máy (`TransferPanel.tsx`: blind / consult tới máy lẻ / nhóm — `call.transfer`), kết thúc (`call.hangup`), mở Hồ sơ 360°, ghi chú nhanh. Banner "Cuộc gọi đang được ghi âm" khi ghi.
   - **Thu nhỏ** (`MiniPill.tsx`): pill nổi góc dưới khi rời màn, giữ cuộc khi điều hướng (host ở layout).
   - **Giám sát** (`MonitorBar.tsx`): Nghe cùng / Nhắc nhỏ / Tham gia (`call.monitor`), chỉ Manager.
   - **Sau cuộc gọi:** ACW 30 giây, gợi ý "Hẹn gọi lại" / "Tạo ticket" / "Lưu ghi chú".
5. **Mở từ nơi khác:** store dùng chung `shared/webphone/webphone-store.ts` (zustand: trạng thái dialer / cuộc gọi, `openDialer({ phone?, contact_id?, opportunity_id?, callback_task_id? })`) + `shared/webphone/useCallAccess.ts` (`call.use` + gói + máy nhánh `can_dial` + "Bấm số để gọi ngay", từ `GET /v1/calls/meta`) + nút `shared/webphone/CallButton.tsx`. 360° / Khách hàng / Tài chính / Lịch hẹn chỉ import `@/shared/webphone` (không import chéo feature, đúng ESLint boundaries); host `_webphone` đọc store. Ui-command `open:dialer` đăng ký ở host.
6. **Mobile 390:** WebPhone toàn màn khi đang gọi, pill khi thu nhỏ. Tắt màn hình / khoá máy: ghi rõ giới hạn trình duyệt (không có app native — D61 thiết bị).

### 5. Hẹn gọi lại + Gọi nhỡ (REQ-O07, PRO-deal-callback)
- `shared/contact-activities/CallbackModal.tsx` (prototype L2835–2850):
  - Thời điểm: Sau 30 phút · 16:00 chiều nay · 09:00 sáng mai · 09:00 thứ Hai · tuỳ chọn ngày giờ; tính ở client theo múi workspace, gửi ISO offset.
  - Người gọi: nhân sự có máy nhánh `can_dial` + "AI Agent (gọi tự động)". AI chỉ hiện khi có agent bật "Xử lý cuộc gọi" và kênh hotline / ZCC (D61 #7).
  - Ghi chú. Câu mô tả "Tạo lịch trong Lịch hẹn, nhắc người gọi trước 10 phút, ghi vào lịch sử khách hàng. Gọi nhỡ sẽ tự tạo việc gọi lại."
  - → `call.schedule_callback`.
- Mount trong `ActivityFormHost` (đã ở `CrmFormsHost`), trạng thái mở ở `activity-store.ts` (`openCallback({ contactId, name, phone, callId? })`). Prototype chỉ mở từ dòng gọi nhỡ (L4835) và chi tiết cuộc gọi (L4935); thêm lối vào ở thẻ việc "Gọi lại" 360°. Lệnh Trợ lý `prefill:call.callback` (thêm vào `ACTIVITY_PREFILL` + `FormCommandHost.tsx`) chỉ mở + điền, ghi khi người bấm Lưu.
- **Thẻ việc gọi lại:** `TaskCard.tsx` hiện loại "Gọi lại" (icon phone, "Gọi lại lúc …", người gọi / AI, "nhỡ n lần") khi `kind = callback` (DTO 047b). Nút "Gọi lại" = `CallButton` kèm `callback_task_id` (ẩn theo `useCallAccess`). Chuỗi ở `common.json` `activities.callback*`.
- **Lịch hẹn:** `GET /calendar` trả thêm `callbacks[]` (047c, mảng riêng). `features/calendar/api.ts` + `types.ts` nhận mảng; `CalendarScreen.tsx` truyền xuống `ListView` / `WeekDayViews` (`TimeGrid`) / `MonthView`; chip riêng `components/CallbackChip.tsx` (màu token khác lịch hẹn, icon phone), bấm mở Hồ sơ 360° khách hoặc `CallButton`. Mock `shared/api/mock/domains/calendar.ts` trả `callbacks`.

### 6. Cài đặt → Tổng đài (`features/settings/components/callcenter/*`, REQ-O10)
- **Section:**
  - `SectionKey` thêm `callcenter`. Nằm ở HIDDEN, vì prototype `setNav` không có mục riêng; vào từ thẻ Nền tảng kết nối + màn Gọi điện. `perm: 'callcenter.manage'`.
  - `SettingsScreen.tsx` SECTIONS nối `CallCenterSection`.
  - `packages/core/src/integrations/services/read.service.ts` thêm thẻ lối tắt `callcenter` đứng đầu nhóm `channels_studio` như prototype L12035 (như `web_widget`: `opens: 'callcenter'`, `connected` = có `call_line` hoạt động), mọi gói vẫn thấy thẻ; gói không có Gọi điện → mở màn khoá gói. Sửa `apps/api/test/integration/integrations.test.ts` (số thẻ 18 → 19, thẻ đầu `callcenter`). Mock: `tools/scripts/fixtures/gen-settings.py` (dòng connector) → `fixtures/prototype-parity/settings.json`; `domains/integration-runtime.ts` lọc thêm `callcenter` như `web_widget`. `IntegrationsSection.tsx` mở `/settings/callcenter` qua `opens` (đã có); thêm `desc.callcenter` vào `settings.json`.
- **Kết nối kênh (Hộp thư):** thẻ "Tổng đài / Call Center" (prototype L13098, tag "SIP · ghi âm", 15 phút) thêm vào `InboxMetaService.connectChannels` (`packages/core/src/inbox/services/meta.service.ts`; tag / time ở `packages/shared/src/i18n/server/{vi,en}/inbox.ts`), `type: 'callcenter'`, `status: 'ga'` khi gói có Gọi điện (ngược lại `coming_soon`). Bấm → `/settings/callcenter` thay vì `/settings/channels?connect=` (`ConnectChannelModal.tsx`). Mock `tools/scripts/fixtures/gen-inbox.py` → `fixtures/prototype-parity/inbox.json`. `apps/api/test/integration/inbox.test.ts` thêm ca.
- **Thanh trạng thái:** trạng thái tổng đài, số chính, số nhân sự online. "Đang dùng x / y kênh" lấy từ `max_concurrent` thật, không cứng 30 / 50.
- **4 tab** (mặc định Nhân sự, prototype L11850):
  - **Nhân sự** (`ExtensionsTab.tsx`):
    - Bảng nhân sự / máy lẻ / Nhận cuộc gọi / Gọi ra / Thuộc nhóm / Trạng thái / ⋯; 3 bước hướng dẫn.
    - "Thêm nhân sự" → form máy nhánh: chọn nhân sự chưa có máy, số lẻ tự cấp từ 101, 2–5 số, không trùng; "Nghe gọi bằng" chỉ Web phone, Softphone / IP Phone / Mobile app hiện "Sắp có" (PD-902).
    - Bật / tắt quyền trên dòng → `call_extension.update`. Vượt gói → 402, mở mua "User tổng đài".
  - **Gọi vào** (`InboundTab.tsx`):
    - Luồng 6 bước (hiển thị từ cấu hình thật).
    - Lời chào: tải mp3 (`call_greeting`), nghe, thay.
    - AI nghe máy trước: chọn agent.
    - Phím IVR (bấm ô sửa → form phím, `call_ivr.update`).
    - Nhóm nhận cuộc gọi (tạo / sửa / xoá, form nhóm: tên, thành viên, 4 cách đổ chuông, chờ 30s–5p, không ai nghe).
    - Ngoài giờ (lời nhắn → việc gọi lại sáng hôm sau; giờ làm việc lấy từ Cài đặt Lịch hẹn, có link).
  - **Gọi ra** (`OutboundTab.tsx`): số hiển thị với khách (form Caller ID theo nhóm), ai được gọi ra, "Bấm số để gọi ngay" (bật / tắt nút gọi ở 360° / Khách hàng). "Tự động quay số" hiện "Sắp có" (D61 #7), không công tắc chạy được.
  - **Nâng cao** (`AdvancedTab.tsx`):
    - Số tổng đài: danh sách `call_line`, "Thêm số" mở `LineFormModal`. Bốn loại:
      - Hotline / SIP trunk: nhà mạng, peering / register, host, user, mật khẩu.
      - Zalo Cloud Connect: nút "Uỷ quyền OA" (`apps/web/src/shared/oauth/useOAuthConnect.ts` của TIP-048, `oauth.start` purpose `grant`, provider `zalo_oa`) → OA đã uỷ quyền tự điền `zcc_oa_id` + `oauth_grant_id`; mã luồng; hướng dẫn cấp quyền gọi ở OA manager + trạng thái App được duyệt. Không ô dán token tay (DC-909).
      - SĐT cá nhân chuyển tiếp: số, mã chuyển tiếp `**21*` / `**61*` / `**62*` / `**67*` hiển thị để copy, cước do SIM shop trả.
      - Hộp SIM gateway: thẻ hiện "Sắp có", không chọn được (DC-907 h — chưa có thiết bị nghiệm thu; backend 047c đã hỗ trợ, bật bằng DC mới).
      - Nút "Kiểm tra kết nối" (`call_line.test`).
    - Ghi âm & giám sát: ghi âm 100% (lưu 12 tháng, chỉ Chủ sở hữu / Quản lý nghe), AI ghi chép & tóm tắt, giám sát trực tiếp. Tắt ghi âm hỏi xác nhận. Thông báo ghi âm không tắt riêng được khi đang ghi.
    - Kết nối nhà mạng: host / trạng thái / codec **PCMU / PCMA / Opus thật** (không G.729 — PD-902) / kênh đồng thời thật.
- **Form** (`CallCenterFormModal.tsx` + 4 thân form con theo prototype L8511–8582): lỗi validate inline (trùng số, phím trùng, tên nhóm trùng), CAS 409 → tải lại.

### 7. Nút gọi ở nơi khác (DC-905 f)
- **Hồ sơ 360°:** `Overview360.tsx` / `Blocks360.tsx` / `Profile360Actions.tsx`, số điện thoại thành nút "Gọi" (`CallButton` từ `@/shared/webphone`).
- **Khách hàng:** `columns.tsx` (cột SĐT có icon gọi khi hover) + `useRowMenu.ts` ("Gọi điện").
- **Tài chính:** `FinanceCustomerDrawer.tsx` (032e), bỏ ẩn nút "Gọi điện" (thay mask D07 của 032e).
- **Lịch hẹn:** `AppointmentDrawer.tsx` L78–82, `tel:` thành dialer khi có WebPhone, ngược lại giữ `tel:`.
- Ẩn khi thiếu `call.use`, gói không có, không có máy nhánh `can_dial`, hoặc cài đặt "Bấm số để gọi ngay" tắt.
- **Không** thêm nút gọi ở header chat (REQ-C13).

### 8. AI Agents, ví / gói, widget
- **Builder:**
  - Builder hiện không vẽ danh sách khả năng của prototype L12860–12873 (Tools nhóm theo module — D51). "Xử lý cuộc gọi" = kênh `call` trong Kênh hoạt động: `packages/core/src/ai/agents/catalog.ts` `CHANNEL_COLORS` thêm `call` (meta `GET /v1/agents/meta`); `agents.read.ts` chỉ trả `call` khi gói có Gọi điện. `RoutingSection.tsx` hiện chip "Cuộc gọi" (`agents.json` `b.channel.call`). Bật → `ai_agent.channels` có `call` (047c đọc).
  - Nhóm Tools `callcenter` tự hiện trong `ActionsSection` từ registry (`agentGrantable`: `call.schedule_callback` + read — 047c). Nhãn nhóm `common.json` `modules.callcenter`.
  - Mock `fixtures/prototype-parity/agents.json` `channels` thêm `call`; parity `agents:builder` giữ mask kênh có sẵn (prototype-parity §6 Kênh).
  - Mẫu agent tpl_9 / tpl_25: mô tả "Gọi tự động" sửa thành "Nghe máy, ghi âm, tóm tắt cuộc gọi và hẹn gọi lại", không hứa auto-dialer (sửa `core/src/ai/agents/catalog.ts`).
  - prototype-parity §6: "Xử lý cuộc gọi" mở từ 047d (mục D29 đã sửa ở docs).
- **Ví / gói:**
  - `PlanCompare.tsx` hiện nhóm "Gọi điện (Call-center)" (dữ liệu `PLAN_COMPARE` 047b; mock `tools/scripts/fixtures/settings_billing.py` `COMPARE` + `ADDONS` → `fixtures/prototype-parity/settings.json`), sửa chú thích L2. Nhãn nhóm `settings.json` `billing.cmp.group.callcenter`.
  - `WalletShop.tsx` hiện thẻ addon `call_extension` (lặp `addons` có sẵn): "User tổng đài · Thêm 1 máy nhánh Call Center · 200.000đ / tháng" (prototype `walResources` L11541). Nhãn `settings.json` `addon.call_extension` / `addonD.call_extension`. `types.ts` `addons[].kind` thêm `call_extension`.
  - "Phút gọi Voice" (`walResources`) và "Số hotline riêng" (`pricingAddons` L12225) không có sản phẩm bán (D61 #4). App hiện chưa vẽ hai lưới này nên không thêm thẻ; vẽ sau thì là thẻ "Sắp có", không nút mua.
- **Widget** (mặc định tắt, D61 #2):
  - `WidgetSection.tsx` thêm công tắc "Cho khách gọi thoại từ widget" (`webchat.update_widget` `settings.calls`), cảnh báo cần máy nhánh nhận cuộc gọi.
  - `apps/widget`: nút gọi trong cửa sổ chat khi cấu hình `calls` bật, trong giờ. Bấm → ack `visitor.call` → tải lười `widget-call.js` (livekit-client) → nối phòng, xin micro, nút kết thúc.
  - Ngân sách: `widget.js` vẫn ≤ 40KB gzip (`build.mjs` kiểm); chunk gọi riêng không tính.
  - Phục vụ `widget-call.js`: `build.mjs` build entry thứ hai `src/call/main.ts` → `dist/widget-call.js`; `widget-script.controller.ts` phục vụ cả hai (`@Get()` ở `widget.js` + controller / route `widget-call.js`); `prefix.ts` exclude, `api-rate-limit.guard.ts` SKIP, `cors-policy.ts` OPEN, `openapi/route-scan.ts` UNPREFIXED thêm `widget-call.js`; `apps/api/test/integration/webchat.test.ts` thêm ca tải `widget-call.js` (CORS `*`). Production: nginx `widget.<domain>` phục vụ tĩnh cùng thư mục (TIP-045 — ghi report).

### 8b. Realtime web
- `shared/realtime/event-invalidation.ts` `EVENT_KEYS` thêm: `call.ringing` / `call.answered` / `call.ended` / `call.missed` / `call.recording_ready` / `call.transcript_ready` → `['calls']`; `callcenter.extension_status` → `['calls','kpis']` + `['calls','meta']`; `call.missed` thêm `['crm','activities']` + `['calendar']` (việc gọi lại mới). Test `event-delivery.test.ts` thêm ca `keysFor`.
- Cuộc gọi đến cho WebPhone đi qua LiveKit (token máy nhánh), không qua socket app; socket chỉ làm mới danh sách.

### 9. Mock, i18n, parity, e2e
- **Mock:** `shared/api/mock/domains/callcenter.ts` + `callcenter-actions.ts` (nhật ký, KPI, máy nhánh, chi tiết, cấu hình 4 tab, token giả, realtime giả) từ `fixtures/prototype-parity/callcenter.json`. Sinh bằng `tools/scripts/fixtures/gen-callcenter.py` từ seed prototype L8758–8763 / L12899–12961. Bỏ nút demo; mã `CG-`.
  - Nối `shared/api/mock/routes.ts` (GET) + `handlers.ts` (action) + `store.ts` (`callcenter` state); `bulk.ts` nhân dòng nhật ký cho `?session=…,bulk` (D42).
  - `shared/api/mock/callcenter-shape.test.ts`: shape mock ↔ `@appchat/shared` (DTO 047c).
  - WebPhone ở chế độ mock dùng LiveKit giả (không nối mạng), mô phỏng đổ chuông / nghe / kết thúc.
- **i18n:** module mới `callcenter` (`messages/{vi,en}/callcenter.json`, gồm chuỗi WebPhone) vào `i18n/messages.ts` MODULES. Thêm khoá ở `settings.json` (section `nav.callcenter` / `head.callcenter`, 4 tab, form, `desc.callcenter`, addon, nhóm so sánh, công tắc widget), `shell.json` (`nav.callcenter`), `common.json` (`modules.callcenter`, `activities.callback*`, nút Gọi), `customers.json` (menu Gọi điện), `inbox.json` (nút Gọi 360°), `calendar.json` (chip gọi lại), `agents.json` (`b.channel.call`), `finance.json` (nút Gọi điện, 032e tạo). `actions.json` đã có từ 047c. Widget: `apps/widget/src/i18n.ts`.
- **Parity** (`tools/parity/modules/callcenter.ts`, nối `parity.manifest.ts`):
  - `callcenter:list` · `callcenter:detail` · `callcenter:dial` · `callcenter:ai` · `callcenter:callback` · `settings:callcenter` (4 tab) · `settings:callcenter-form`.
  - Mask trích mã:
    - PD-902: dữ liệu mẫu, nút demo, codec, thiết bị, x / y kênh.
    - D61 #4: Sắp có.
    - D43: footer D42 so với prototype không phân trang.
  - Chạy `pnpm parity callcenter:list callcenter:detail callcenter:dial callcenter:ai callcenter:callback settings:callcenter settings:callcenter-form dashboard:default settings:integrations inbox:connect-channel customers:360 finance:drawer` + `pnpm parity --done` (rail / shell / shared đổi).
- **E2E:** `apps/web/e2e/callcenter.spec.ts` (mock) + `apps/web/e2e/http/callcenter.spec.ts` (http, LiveKit `--dev` hoặc mock provider), mobile 390.
  - Luồng: rail → màn → tab Gọi nhỡ → Hẹn gọi lại → Lịch hẹn thấy chip.
  - Dialer gọi ra (mock) → đang gọi → chuyển máy → kết thúc → chi tiết.
  - Cài đặt thêm máy nhánh vượt gói → 402 → mua addon.
  - Nút gọi ở 360°.
  - Không quyền: CSKH không thấy Nghe lại / transcript.

### 10. Lỗi (hiển thị)
- **402:** "Gói chưa có Gọi điện" / "Hết máy nhánh — mua thêm User tổng đài".
- **409:**
  - `already_answered`: đóng màn đến.
  - `line_busy`: SIM đang bận.
  - `zcc_consent_required`: hai nút thay thế.
  - `consent_pending`: "Đã gửi yêu cầu, chờ khách đồng ý (24 giờ)".
  - CAS: tải lại + giữ lựa chọn.
- **503 `VOICE_NOT_CONFIGURED`:** "Tổng đài chưa kết nối" + link Cài đặt (`callcenter.manage`).
- **Micro bị chặn / trình duyệt không hỗ trợ:** hướng dẫn, không nút chết.

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given gói Business + `call.view`, when vào app, then rail có "Gọi điện" giữa Lịch hẹn và AI Agents; gói Personal Pro → không có, route `/callcenter` hiện màn nâng cấp; `OUT_LABELS` không còn "Gọi điện" | `nav-config.test.ts` + e2e mock + parity shell |
| 2 | Given màn Call Center, when so prototype 1440×900, then `callcenter:list` < 5% sau mask có mã; bảng theo D42 (cuộn trong khung, header dính, số trang); 6 tab có số đếm | `pnpm parity callcenter:list` + e2e |
| 3 | Given sales (scope own, không `call.listen`), when mở nhật ký + chi tiết, then chỉ thấy cuộc của mình / nhóm / khách mình; không có Nghe lại / transcript / tải ghi âm; Manager thấy đủ + icon giám sát | e2e mock + http theo vai trò |
| 4 | Given WebPhone mock, when gọi ra từ Hồ sơ 360° → nghe → chuyển máy consult → kết thúc, then một bản ghi `CG-`, pill thu nhỏ giữ cuộc khi đổi màn, chi tiết có chuỗi chuyển máy | e2e mock `callcenter.spec.ts` + unit `useWebPhone.test.ts` |
| 5 | Given hai người cùng đổ chuông, when cả hai bấm Nghe, then một người vào cuộc, người kia thấy "Đã có người nghe" | e2e http (2 context) hoặc component test + mock 409 |
| 6 | Given dòng gọi nhỡ, when Hẹn gọi lại "09:00 sáng mai" người gọi AI Agent, then `call.schedule_callback` gửi ISO đúng múi, chip gọi lại hiện ở Lịch hẹn, thẻ việc "Gọi lại" ở 360°; agent không xử lý cuộc gọi → không có lựa chọn AI | e2e + `CallbackModal.test.tsx` |
| 7 | Given khách ZCC ngoài cửa sổ, when gọi qua Zalo, then không tự gọi lại, hiện "Gọi bằng hotline / SIM" + "Gửi yêu cầu gọi Zalo"; bấm gửi → thẻ xác nhận nêu phí + người trả → xác nhận mới gửi | e2e mock + component test |
| 8 | Given Cài đặt → Tổng đài, when thêm máy nhánh (tự cấp 104, Web phone), tạo nhóm "Sales" ring_all 60s, phím 1 → Sales, thêm số ZCC, then lưu qua action, lỗi trùng hiện inline, vượt gói → 402 → mở mua addon; codec hiện PCMU / PCMA / Opus; thiết bị khác "Sắp có"; parity `settings:callcenter` < 5% sau mask PD-902 | e2e + parity |
| 9 | Given chi tiết cuộc gọi có tóm tắt + đề xuất AI, when Áp dụng, then `contact_opportunity.set_stage` chạy dưới quyền người bấm + việc tạo; không đề xuất → không hiện khối; khách có 1 cơ hội mở → gợi ý tự gán | e2e + component test |
| 10 | Given widget bật gọi + trong giờ, when khách bấm gọi, then tải lười `widget-call.js`, nối phòng (mock), `widget.js` ≤ 40KB gzip; widget tắt gọi → không có nút | `apps/widget/test/ui.test.ts` + `build.mjs` đo + e2e webchat |
| 11 | Given mobile 390, when dùng màn / dialer / đang gọi / Cài đặt, then không tràn ngang, drawer toàn màn, pill không che nút gửi | e2e mobile-390 |
| 12 | Given i18n / token, when `pnpm i18n:check` + `pnpm lint:tokens` + `pnpm lint:size`, then đủ khoá vi / en, không hard-code màu / px, file trong trần | output lệnh |

### Commands / evidence gate
- Cổng commit (D59): `pnpm turbo run lint typecheck test --filter=@appchat/{web,widget,ui,shared}` · `pnpm depcheck` · `pnpm lint:size` · `pnpm lint:tokens` · `pnpm i18n:check`.
- Unit web: `pnpm --filter @appchat/web exec vitest run src/features/callcenter "src/app/(app)/_webphone" src/shared/contact-activities src/shared/shell`.
- E2E (cổng riêng `E2E_PORT=3557` / `E2E_HTTP_PORT=3558`, không chạy `e2e:http` song song, `--workers=1`): `pnpm e2e callcenter` · `pnpm e2e:http callcenter` · `pnpm e2e dashboard roles list-scroll mobile-sweep` · `pnpm e2e:http webchat`.
- Parity như §9 + `pnpm parity --done`.
- Widget: `pnpm --filter @appchat/widget build` (in kích thước gzip) + test.
- Gọi thật trình duyệt ↔ SIP / ZCC cần tài nguyên (Q-902 / 903 / 904): ghi "chưa nghiệm thu với provider thật".

## CONSTRAINTS
- **DO NOT:**
  - Ghi dữ liệu ngoài `useAction`.
  - Giữ nút "Cuộc gọi đến (demo)".
  - Hiện G.729 / Softphone / IP Phone / Mobile app như dùng được.
  - Công tắc "Tự động quay số" chạy được.
  - Nút gọi ở header chat (REQ-C13).
  - Tự gọi lần hai khi ZCC không nghe.
  - Gửi yêu cầu gọi Zalo không qua xác nhận.
  - Tự áp đề xuất AI.
  - Import `features/x/components/*` chéo feature (dùng `index.ts` / ui-command).
  - Hard-code màu / px; CSS rời.
  - Đưa `livekit-client` vào `widget.js` chính.
  - Thêm code vào file legacy vượt trần.
- **REUSE:**
  - `DataTable`, `ListPager`, `PageHeader`, `EntityDrawer`, `ModalShell`, `AiButton` (`packages/ui`).
  - `useAction` / `ConfirmActionHost`, `useCan` / `Can`.
  - `useDrawerAsk` / `useRegisterScreenContext`, `subscribeRealtime`.
  - `shared/opportunities/*` (026c), `shared/contact-activities/*`.
  - `useListExport`, `ListPager`, mẫu `features/tickets/*`; đường Nâng cấp `/settings/billing?upgrade=1` như rail.
- **SKIP:**
  - Báo cáo cuộc gọi (D19).
  - Kanban Pipeline (D60 #8).
  - App native.
  - "Phút gọi Voice" / "Số hotline riêng" thật.
  - ZNS / chat OA (D04).

## Quality Gate
- [x] Manifest chính xác (file-level M/C). Giao file khai hai phía (`manifests.py --sync 047 047b 047c 047d`); 032e chung `nav-config.ts` / `capture.ts` / `parity.manifest.ts` / drawer Tài chính → tích hợp 032e trước.
- [x] Khớp prototype (màn, dialer, chi tiết, Hẹn gọi lại, Cài đặt 4 tab, form). Phần không vẽ theo SRS + interaction-patterns, ghi PD-902. D42 / D43 giữ.
- [x] Quyền / gói theo D61 #3, #5; REQ-C13 giữ; `OUT_LABELS` gỡ cùng commit rail + `parity --done`.
- [x] 12 AC có Given/When/Then + bằng chứng; gọi thật ghi trung thực khi thiếu tài nguyên.
- **Gap đã khai:**
  - Giới hạn trình duyệt mobile khi khoá màn (không có app native).
  - Chunk gọi của widget cần đo lúc làm (Rà #3).
  - Sóng âm player tính phía client (file dài → lấy mẫu thưa).

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Implement đúng `Files touched` (manifest), không thêm file ngoài scope; component 150–250 dòng, trần 400; `page.tsx` ≤ 120 dòng.
- [ ] AC 1–12 có kết quả từng cái, dán output thật (`pnpm parity …`, `pnpm e2e …`, `pnpm i18n:check`); gọi thật thiếu tài nguyên ghi "chưa nghiệm thu với provider thật".
- [ ] **Action-first (BUILDER-HANDOFF):** FE ghi chỉ bằng `useAction(id).run(input)`; send (`zcc_request_consent`) qua thẻ xác nhận.
- [ ] **UI parity:** < 5% mọi entry mới sau mask có mã; `OUT_LABELS` gỡ "Gọi điện" cùng commit rail; `pnpm parity --done` xanh; D42 bảng nhật ký.
- [ ] **Token + i18n:** không hard-code màu / px; vi + en đủ; mobile 390 không tràn.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA.

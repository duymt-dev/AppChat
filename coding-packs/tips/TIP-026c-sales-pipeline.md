# TIP-026c — Cơ hội / Sales Pipeline thay khối cơ hội Hồ sơ 360°

## HEADER
- **Parallel-safe with TIP-049 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/actions/src/orders.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/db/prisma/tenant/sales-orders.prisma`, `packages/shared/src/api/index.ts`; integrate 026c before049.
- **Parallel-safe with TIP-049d (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/domains/orders-actions.ts`, `tools/parity/parity.manifest.ts`; integrate 026c before049d.
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/common.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/common.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`; integrate 026c before048.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/crm/labels.ts`; integrate 026c before048b.
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ConvRow.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 026c before048c.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ConvRow.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 026c before048f.
- **Parallel-safe with TIP-048g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 026c before048g.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 026c before048h.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`, `packages/db/prisma/tenant/crm-activities.prisma`, `packages/shared/src/api/contact-activities.ts`, `packages/shared/src/crm/activity-state.ts`, `packages/shared/src/crm/labels.ts`; integrate 026c before047b.
- **Parallel-safe with TIP-047c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/crm/public.ts`, `packages/shared/src/api/calendar.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/crm.ts`, `packages/shared/src/i18n/server/vi/crm.ts`; integrate 026c before047c.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/calendar.json`, `apps/web/messages/en/common.json`, `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/calendar.json`, `apps/web/messages/vi/common.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/customers/columns.tsx`, `apps/web/src/features/inbox/components/Overview360.tsx`, `apps/web/src/shared/contact-activities/ActivityCards.test.tsx`, `apps/web/src/shared/contact-activities/ActivityFormHost.tsx`, `apps/web/src/shared/contact-activities/activity-store.ts`, `apps/web/src/shared/contact-activities/commands.ts`, `tools/parity/parity.manifest.ts`, `tools/parity/src/capture.ts`; integrate 026c before047d.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/customers.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/customers.json`, `apps/web/src/features/customers/types.ts`, `apps/web/src/shared/api/mock/domains/customers.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/booking/actions/appointment-flow.handlers.ts`, `packages/core/src/crm/activities/opportunities.handlers.ts`, `packages/core/src/crm/activities/read.service.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/memory/summary.ts`, `packages/core/src/crm/merge/relations.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/core/src/inbox/services/view.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `packages/core/src/sales/orders/actions/order-from-appointment.handler.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `packages/shared/src/api/crm.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/crm.ts`, `packages/shared/src/i18n/server/vi/crm.ts`, `tools/parity/parity.manifest.ts`; integrate 015e before026c.
- **Parallel-safe with TIP-015g (coverage-closure manifest):** sequential, shares `apps/api/test/integration/crm-stage-producers.test.ts`, `packages/core/src/contracts/signing/finalize.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-decide.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-send.handlers.ts`; integrate 015g before026c.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/api/src/http/crm/crm.http.module.ts`, `apps/api/test/integration/contact-activities.test.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/customers/types.ts`, `apps/web/src/features/inbox/components/Overview360.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/customers.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `apps/web/src/shared/contact-activities/ActivityCards.test.tsx`, `apps/web/src/shared/contact-activities/ActivityCards.tsx`, `apps/web/src/shared/contact-activities/ActivityFormHost.tsx`, `apps/web/src/shared/contact-activities/ActivityListDrawer.tsx`, `apps/web/src/shared/contact-activities/OpportunityCard.tsx`, `apps/web/src/shared/contact-activities/OpportunityForm.tsx`, `apps/web/src/shared/contact-activities/api.ts`, `apps/web/src/shared/contact-activities/commands.ts`, `packages/actions/src/contact-opportunities.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/crm/activities/activities.module.ts`, `packages/core/src/crm/activities/authority.ts`, `packages/core/src/crm/activities/opportunities.handlers.ts`, `packages/core/src/crm/activities/projection.ts`, `packages/core/src/crm/activities/read.service.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/memory/summary.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/db/prisma/tenant/crm-activities.prisma`, `packages/shared/src/api/contact-activities.ts`, `packages/shared/src/api/crm.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/crm/activity-state.ts`, `packages/shared/src/i18n/server/en/crm.ts`, `packages/shared/src/i18n/server/vi/crm.ts`, `tools/parity/parity.manifest.ts`; integrate 026b before026c.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/domains/orders-actions.ts`, `packages/actions/src/index.ts`, `packages/actions/src/orders.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `packages/core/src/sales/orders/actions/order-from-appointment.handler.ts`, `packages/db/prisma/tenant/sales-orders.prisma`, `tools/parity/parity.manifest.ts`; integrate 032c before026c.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ChatHeader.tsx`, `apps/web/src/features/inbox/components/ConvRow.tsx`, `apps/web/src/features/inbox/components/Overview360.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/customers.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `apps/web/src/shared/opportunities/OpportunityChain.tsx`, `packages/actions/src/index.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/core/src/inbox/services/view.ts`, `packages/core/src/kernel/actions/tip-owners.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/db/prisma/tenant/sales-orders.prisma`, `packages/shared/src/api/crm.ts`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`, `tools/parity/src/capture.ts`; integrate 026c before032e.
- **Parallel-safe with TIP-046 (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 026c before046.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`; integrate 003c before026c.
- **Parallel-safe with TIP-003e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003e before026c.
- **Parallel-safe with TIP-003f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/common.json`, `apps/web/messages/vi/common.json`, `apps/web/src/features/calendar/components/AppointmentFormModal.tsx`, `apps/web/src/features/quotes/components/QuoteFormModal.tsx`; integrate 003f before026c.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `coding-packs/docs/06-prototype/DEVIATIONS.md`, `tools/parity/parity.manifest.ts`; integrate 004b before026c.
- **Parallel-safe with TIP-011b (coverage-closure manifest):** sequential, shares `coding-packs/docs/06-prototype/DEVIATIONS.md`; integrate 011b before026c.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 012b before026c.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 012c before026c.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 013b before026c.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/services/crm-read.service.ts`; integrate 013c before026c.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 014b before026c.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `tools/parity/parity.manifest.ts`; integrate 014c before026c.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/customers/types.ts`, `apps/web/src/shared/api/mock/domains/customers.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/memory/summary.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/shared/src/api/crm.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/crm.ts`, `packages/shared/src/i18n/server/vi/crm.ts`, `tools/parity/parity.manifest.ts`; integrate 015b before026c.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/crm/privacy/cleanup.ts`, `packages/core/src/crm/privacy/inventory.ts`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 015c before026c.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/en/quotes.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/quotes.json`, `apps/web/src/features/customers/types.ts`, `apps/web/src/features/quotes/components/QuoteFormModal.tsx`, `apps/web/src/features/quotes/types.ts`, `apps/web/src/shared/api/mock/domains/customers.ts`, `apps/web/src/shared/api/mock/domains/quotes-actions.ts`, `packages/actions/src/index.ts`, `packages/actions/src/quotes.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/core/src/sales/quotes/actions/quote-decide.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `packages/core/src/sales/quotes/services/quote-write.ts`, `packages/db/prisma/tenant/booking.prisma`, `packages/db/prisma/tenant/sales-quotes.prisma`, `packages/shared/src/api/crm.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/api/quotes.ts`, `packages/shared/src/i18n/server/en/crm.ts`, `packages/shared/src/i18n/server/vi/crm.ts`, `tools/parity/parity.manifest.ts`; integrate 015d before026c.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/customers/types.ts`, `apps/web/src/shared/api/mock/domains/customers.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `apps/web/src/shared/api/mock/domains/orders-actions.ts`, `packages/actions/src/index.ts`, `packages/actions/src/orders.ts`, `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/crm/activities/opportunities.handlers.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/core/src/inbox/services/view.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `packages/core/src/sales/orders/actions/order-from-appointment.handler.ts`, `packages/db/prisma/tenant/sales-orders.prisma`, `packages/shared/src/api/crm.ts`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/crm.ts`, `packages/shared/src/i18n/server/vi/crm.ts`, `tools/parity/parity.manifest.ts`; integrate 015f before026c.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `packages/core/src/crm/memory/summary.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 019b before026c.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/kernel/actions/tip-owners.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 019c before026c.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 020b before026c.
- **Parallel-safe with TIP-020c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/inbox.ts`; integrate 020c before026c.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 020d before026c.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/core/src/kernel/actions/tip-owners.ts`; integrate 020e before026c.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ChatHeader.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 022b before026c.
- **Parallel-safe with TIP-022c (coverage-closure manifest):** sequential, shares `packages/core/src/sales/quotes/actions/quote-decide.handlers.ts`; integrate 022c before026c.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/calendar.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/calendar.json`, `apps/web/messages/vi/inbox.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `packages/actions/src/booking-update.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/booking/actions/appointment-flow.handlers.ts`, `packages/core/src/booking/actions/appointment-update.handler.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/core/src/kernel/actions/tip-owners.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `packages/core/src/sales/orders/actions/order-from-appointment.handler.ts`, `packages/core/src/sales/quotes/actions/quote-decide.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-send.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/crm.ts`, `packages/shared/src/i18n/server/vi/crm.ts`, `tools/parity/parity.manifest.ts`; integrate 023b before026c.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/calendar.json`, `apps/web/messages/en/common.json`, `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/en/quotes.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/calendar.json`, `apps/web/messages/vi/common.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/quotes.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/kernel/actions/tip-owners.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023c before026c.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023d before026c.
- **Parallel-safe with TIP-023e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`; integrate 023e before026c.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023f before026c.
- **Parallel-safe with TIP-023g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/calendar.json`, `apps/web/messages/en/quotes.json`, `apps/web/messages/vi/calendar.json`, `apps/web/messages/vi/quotes.json`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023g before026c.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/calendar/hooks/useApptForm.ts`, `apps/web/src/features/inbox/components/ConvRow.tsx`, `apps/web/src/features/inbox/components/Overview360.tsx`, `apps/web/src/features/inbox/components/Tabs360.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/features/quotes/hooks/useQuoteDraft.ts`, `apps/web/src/shared/api/mock/domains/customers.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/actions/src/orders.ts`, `packages/actions/src/quotes.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/core/src/inbox/services/view.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `packages/core/src/sales/quotes/services/quote-write.ts`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 025b before026c.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 027b before026c.
- **Parallel-safe with TIP-028b (coverage-closure manifest):** sequential, shares `packages/core/src/sales/quotes/actions/quote-send.handlers.ts`; integrate 028b before026c.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 030b before026c.
- **Parallel-safe with TIP-030c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/contracts/signing/finalize.ts`, `packages/core/src/contracts/signing/public.handlers.ts`, `packages/shared/src/api/index.ts`; integrate 030c before026c.
- **Parallel-safe with TIP-031b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/actions/src/orders.ts`, `packages/actions/src/quotes.ts`; integrate 031b before026c.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/quotes.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/quotes.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `packages/actions/src/index.ts`, `packages/actions/src/orders.ts`, `packages/actions/src/quotes.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-send.handlers.ts`, `packages/core/src/sales/quotes/services/quote-write.ts`, `packages/db/prisma/tenant/sales-orders.prisma`, `packages/db/prisma/tenant/sales-quotes.prisma`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032b before026c.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032d before026c.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/calendar.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/calendar.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/calendar/components/AppointmentFormModal.tsx`, `apps/web/src/features/calendar/hooks/useApptForm.ts`, `apps/web/src/features/inbox/components/Overview360.tsx`, `apps/web/src/shared/api/mock/domains/calendar-actions.ts`, `packages/actions/src/booking.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/booking/actions/appointment-flow.handlers.ts`, `packages/db/prisma/tenant/booking.prisma`, `packages/shared/src/api/calendar.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 033b before026c.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/calendar.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/calendar.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/core/src/booking/actions/appointment-flow.handlers.ts`, `packages/core/src/sales/orders/actions/order-from-appointment.handler.ts`, `packages/db/prisma/tenant/booking.prisma`, `packages/shared/src/api/calendar.ts`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 033c before026c.
- **Parallel-safe with TIP-033d (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/domains/orders-actions.ts`, `packages/actions/src/orders.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/db/prisma/tenant/sales-orders.prisma`; integrate 033d before026c.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `packages/actions/src/index.ts`, `packages/core/src/kernel/actions/tip-owners.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 034b before026c.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/kernel/actions/tip-owners.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 034c before026c.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `packages/actions/src/index.ts`, `packages/core/src/kernel/actions/tip-owners.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 034d before026c.
- **Parallel-safe with TIP-036 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `packages/shared/src/api/index.ts`; integrate 036 before026c.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before026c.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before026c.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before026c.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 039 before026c.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 040 before026c.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 041 before026c.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 042 before026c.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `packages/actions/src/index.ts`, `packages/core/src/crm/crm.module.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 042b before026c.
- **Parallel-safe with TIP-042c (coverage-closure manifest):** sequential, shares `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-decide.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-send.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `packages/db/prisma/tenant/booking.prisma`, `packages/db/prisma/tenant/sales-orders.prisma`, `packages/db/prisma/tenant/sales-quotes.prisma`; integrate 042c before026c.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before026c.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/customers/columns.tsx`, `apps/web/src/features/customers/types.ts`, `apps/web/src/features/quotes/components/QuoteFormModal.tsx`, `apps/web/src/features/quotes/hooks/useQuoteDraft.ts`, `apps/web/src/features/quotes/types.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/shared/src/api/calendar.ts`, `packages/shared/src/api/crm.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/api/quotes.ts`, `packages/shared/src/i18n/server/en/crm.ts`, `packages/shared/src/i18n/server/vi/crm.ts`, `tools/parity/parity.manifest.ts`; integrate 045b before026c.
- **TIP-ID:** TIP-026c · **Project:** AppChat V2 · **Module:** CRM — Cơ hội (Sales Pipeline) · **Priority:** P0 · **Estimated:** XL (4 pha)
- **Depends on:** 026b, 015e, 015f, 015g, 032c và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 032e, 044, 045, 046.
- **Vì sao phụ thuộc:** 026b có bảng `contact_opportunity` + thẻ hoạt động 360°. 015g khoá họ khách theo chứng từ + giữ tay 24 giờ. 015e/f lo họ khách gộp và vòng đời. 029–033 (đã DONE) là báo giá, hợp đồng, đơn, lịch hẹn. 032c lo CAS chứng từ và `owner_user_id`.
- **Files touched:** [exact M/C manifest](manifests/TIP-026c-files.md). Module mới `crm/opportunities/` (không dồn vào `crm/activities/opportunities.handlers.ts`). Prisma sửa file sở hữu sẵn, không tạo file prisma mới.
- **Quyết định nguồn:** D60 (#1–3, #8–12) · COMMERCE §8 (bản 2026-11-12) · DC-901 · đảo một phần DC-253. · DC-922 (agent là nhân viên — đổi D60 #10)
- **Dòng COVERAGE nhận:** REQ-F10 · REQ-F13 · D60-deal · COM-8-3 · COM-8-4 · COM-8-8 · COM-8-9 · COM-8-10 · COM-8-11 · COM-8-12 · CRM-ACTIVITY-OPPORTUNITY · PRO-inbox-360deal · PRO-deal-drawer · PRO-deal-chain · PRO-deal-lost · PRO-deal-inbox-chip · PRO-customers-deal-col · PRO-quotes-deal-link · PRO-calendar-deal-link · DC-901.

## CONTEXT
- Working dir: `D:/CODING/AppChat_Ver2` (code) — tài liệu ở repo này. Stack: NestJS core + ActionExecutor, Postgres 16 DB riêng mỗi workspace (`TenantDbResolver`), Next.js + Ant Design, `@appchat/actions` dùng chung web / core / AI.
- **Hiện trạng (rà 2026-11-12, `origin/dev` + #202):**
  - `packages/db/prisma/tenant/crm-activities.prisma`: `contact_opportunity` (TIP-026b, DC-253) có stage `open · qualified · proposal · won · lost`, `probability` do người nhập, một `quote_id`, `amount_vnd`, `expected_close_date`, `archived_at`.
  - `packages/core/src/crm/activities/opportunities.handlers.ts` (167 dòng): `contact_opportunity.create / update / archive`. Khi won / lost thì "không đổi khách / đơn / kho / điểm / thu tiền".
  - Giai đoạn khách: `contact.stage` enum `lead · potential · consulting · quote · contract · won · lost`.
    - Luật tự động ở `crm/stage/rules.ts` (`applyStageRule` raise / fallback, cần ràng buộc khoá họ khách của 015g).
    - Producer: `quote-send.handlers.ts:103` · `quote-decide.handlers.ts:22` (`closeLost`) · `sales/system/quote-effects.ts:44` (hết hạn) · `contract-send.handlers.ts:78` · `contracts/signing/finalize.ts:77` · `order-flow.handlers.ts:30` (`order.completed` → won).
    - Kéo tay: `crm/stage/manual.handler.ts`.
  - Hồ sơ 360° đọc cơ hội qua `withActivities` (`crm/services/contact360.ts:76`), ô `deal` lấy cơ hội hiện hành.
    - Ô cũ `ai_summary.close_pct` và `crm.open_deal` server luôn trả rỗng (`contact360.ts:47,56`). Web hiển thị ở `Overview360.tsx:65`, `Tabs360.tsx:31`.
    - Thẻ dùng chung: `apps/web/src/shared/contact-activities/OpportunityCard.tsx` + `OpportunityForm.tsx` (ô xác suất nhập tay).
  - Prototype bản 2026-11-10 (giao diện):
    - Thẻ "Cơ hội / Sales Pipeline" Hồ sơ 360° L2386–2420.
    - Tab CRM "Cơ hội đang mở" L2478–2481.
    - Drawer "Cơ hội · Sales Pipeline 360°" L2852–2914.
    - Bảng Khách hàng cột Cơ hội L2981–2987.
    - Form lịch hẹn "Thuộc cơ hội" L4528–4540.
    - Form báo giá "Thuộc cơ hội *" L5993–6009.
    - Chip Hộp thư L1978 / L2064.
  - Prototype (logic): `dealStages()` L9226 · `dealVals()` L9242 · `ppVals()` L9612. Dữ liệu và chuỗi chứng từ trong prototype là giả (mã `HD-` / "Hóa đơn").
- Key files to read first:
  - `plans/COMMERCE-DECISIONS.md` §3 / §8 / §9 (bản 2026-11-12)
  - `DECISIONS.md` DC-901, DC-253, DC-430
  - `tips/TIP-026b-crm-activities.md`, `tips/TIP-015g-crm-stage-hold.md`
  - `crm/stage/rules.ts`, `crm/lifecycle/lock.ts`
  - `crm/activities/{opportunities.handlers,authority,projection,read.service}.ts`
- Patterns to follow:
  - Handler + preview + undo theo `crm/activities/*` (khoá dòng, `checkVersion`, timeline).
  - Producer chứng từ khoá họ khách trước (`lockStageFamilyOf`) rồi mới khoá chứng từ (DC-430).
  - Thẻ web dùng chung ở `shared/contact-activities` (DC-388, không import chéo feature).

## APPLICABLE STANDARDS
- [plans/COMMERCE-DECISIONS.md](../plans/COMMERCE-DECISIONS.md) §3 / §8 / §9 — luật cơ hội + giai đoạn khách (D60), ngưỡng duyệt báo giá.
- [actions/action-registry](../standards/actions/action-registry.md) — defineAction, preview cho send / bulk, undo, `agentGrantable`.
- [api/response-envelope](../standards/api/response-envelope.md) — `{ data }` / `{ data, next_cursor }`, tiền là chuỗi VND.
- [authz/rbac-permissions](../standards/authz/rbac-permissions.md) — `crm.*` + scope khách, field policy tiền (045b).
- [database/tenant-db](../standards/database/tenant-db.md) · [database/indexing](../standards/database/indexing.md) — DB tenant, không `workspace_id`, composite `=` trước range / sort, INCLUDE, deferred join, EXPLAIN.
- [domain/state-machine](../standards/domain/state-machine.md) · [domain/concurrency](../standards/domain/concurrency.md) · [domain/money-time-numbering](../standards/domain/money-time-numbering.md) · [domain/validation-defaults](../standards/domain/validation-defaults.md).
- [events/outbox](../standards/events/outbox.md) — event cùng transaction.
- [ai/agent-gateway](../standards/ai/agent-gateway.md) · [ai/generative-ui](../standards/ai/generative-ui.md) · [ai/eval](../standards/ai/eval.md) — tool agent + thẻ "Áp dụng".
- [ui/frontend-structure](../standards/ui/frontend-structure.md) · [ui/prototype-parity](../standards/ui/prototype-parity.md) · [ui/interaction-patterns](../standards/ui/interaction-patterns.md) · [i18n/i18n](../standards/i18n/i18n.md).
- [code/file-size-module-layout](../standards/code/file-size-module-layout.md) · [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).

## Rà trước khi làm
1. Đọc lại mọi file trong manifest trên `origin/dev` mới nhất. Chạy `python -X utf8 tools/obligations/manifests.py 026c` để thấy giao file với TIP khác; TIP chung file phải tích hợp trước (dòng HEADER).
2. Kiểm thứ tự khoá thật ở từng producer (015g): họ khách → chứng từ → **cơ hội** (cơ hội khoá SAU chứng từ, sắp theo id). Producer nào chưa khoá họ khách thì sửa producer trước, không tự khoá ngược.
3. Đếm dữ liệu `contact_opportunity` ở demo / dev:
   - Số dòng theo stage.
   - Số dòng có `quote_id`.
   - Số dòng có `probability`.

   Ghi vào report. Migration phải chạy được trên DB có dữ liệu 026b (không làm mất id / lịch sử / timeline ref).
4. Đối chiếu prototype bản 2026-11-10 (dòng ở CONTEXT). Lệch mức 1 đã ghi sổ **PD-901** (`docs/06-prototype/DEVIATIONS.md`, trạng thái đề xuất). Lệch mức 4 trích thẳng mã luật trong `reason` của mask (prototype-parity §6b), không cần PD.

## TASK
Thay mô hình cơ hội tự do của 026b bằng pipeline 7 giai đoạn có xác suất cố định.
- Cơ hội gắn chuỗi chứng từ thật (báo giá → [hợp đồng ký → đơn] / đơn → đề nghị thanh toán → thu tiền).
- Cơ hội tự chuyển giai đoạn theo chứng từ, và kéo giai đoạn khách theo (D60).
- Dựng đủ các điểm hiển thị của prototype: thẻ 360°, tab CRM, drawer Cơ hội 360°, chip Hộp thư, cột Khách hàng, ô "Thuộc cơ hội" ở form Báo giá / Lịch hẹn.
- Người dùng, Trợ lý và agent cùng đi qua action của Executor.

## SPECIFICATIONS

### 1. Dữ liệu (một migration tenant `20261112100000_opportunity_pipeline`)
1. **Nâng cấp tại chỗ `contact_opportunity`** (giữ id, version, lịch sử, ref timeline):
   - Enum mới `contact_opportunity_stage` = `lead · qualified · demo · quote · negotiation · won · lost`. Migration ánh xạ `open → lead`, `qualified → qualified`, `proposal → quote`; `won` và `lost` giữ nguyên.
   - Bỏ cột `probability` (xác suất lấy từ bảng hằng §1.4).
   - Thêm cột:
     - `owner_user_id uuid null` — mặc định người tạo, hoặc người phụ trách khách khi agent tạo.
     - `team_id uuid null` — chụp lúc tạo bằng `snapshotTeam`.
     - `source_kind text not null default 'manual'` — `manual · conversation · campaign · renewal · referral · call`.
     - `campaign_id uuid null`.
     - `lost_reason text null` — `price · competitor · no_need · unreachable`.
     - `closed_at timestamptz null` — khi Đã mua / Thua.
     - `stage_changed_at timestamptz not null default now()`.
   - `amount_vnd` giữ nguyên (giá trị cơ hội). `title` hiển thị là "Tên cơ hội". `need` giữ.
   - `archived_at` giữ cho "Lưu trữ" (xoá mềm của 026b).
2. **Liên kết trỏ tới cơ hội** (cột nullable, không khoá ngoại xuyên domain; handler kiểm):
   - `quote.opportunity_id`: migration chép từ `contact_opportunity.quote_id` cũ, rồi bỏ `contact_opportunity.quote_id`. Báo giá phiên bản n+1 kế thừa cột này từ bản gốc.
     Thêm hai cờ `opportunity_sync_value` và `opportunity_follow_up` (boolean, mặc định true), áp lúc gửi (§3.1).
   - `order.opportunity_id`: chụp lúc tạo. Lấy từ báo giá nguồn (`create_from_quote`), từ báo giá nguồn của hợp đồng (`create_from_contract`), hoặc từ input `order.create` / `create_from_appointment` (lấy theo lịch hẹn).
   - `appointment.opportunity_id`.
   - Hợp đồng không có cột riêng; đi qua `contract.quote_id → quote.opportunity_id`. Hợp đồng không từ báo giá thì không gắn cơ hội (ghi Giả định trong report nếu cần mở rộng).
3. **Bảng con:**
   - `contact_opportunity_item`: id, opportunity_id, product_id null, name, qty int > 0, position. Unique (opportunity_id, position). Tối đa 20 dòng. Hiển thị "HIFU × 1 · Combo da × 2".
   - `contact_opportunity_event`: lịch sử append-only, không UPDATE / DELETE. Cột: id, opportunity_id, contact_id, kind, from_stage, to_stage, ref_type, ref_id, params jsonb, actor_type, actor_id, created_at.
     - `kind` là một trong: `created · stage · value · owner · lost · reopened · linked · unlinked · ai_suggested · ai_applied`.
     - Timeline khách vẫn ghi `writeTimeline` (ref `contact_opportunity`) như 026b.
4. **Bảng hằng** `OPPORTUNITY_STAGES` ở `packages/shared/src/crm/opportunity-stages.ts`: thứ tự, xác suất `10 · 25 · 50 · 70 · 85 · 100 · 0`, màu prototype `dealStages()` L9226, ánh xạ sang giai đoạn khách (`lead→lead`, `qualified→potential`, `demo→consulting`, `quote→quote`, `negotiation→contract`, `won→won`).
   - Dự báo = `amount_vnd × xác suất / 100`, làm tròn đồng. Tính ở server.
   - `activity-state.ts` thay `CONTACT_OPPORTUNITY_STAGES` cũ bằng re-export; `probabilityOk` bỏ (dataset 038b đổi theo §4.4).
5. **Index** (indexing.md, ghi EXPLAIN):
   - `contact_opportunity (contact_id, stage, updated_at DESC, id DESC) INCLUDE (amount_vnd, owner_user_id) WHERE archived_at IS NULL`: danh sách của khách và "đang mở".
   - `(owner_user_id, stage, expected_close_date) WHERE archived_at IS NULL AND stage NOT IN ('won','lost')`: phục vụ kanban sau này và nhắc chốt.
   - `quote (opportunity_id) WHERE opportunity_id IS NOT NULL AND deleted_at IS NULL`.
   - `order (opportunity_id) WHERE opportunity_id IS NOT NULL AND deleted_at IS NULL`.
   - `appointment (opportunity_id) WHERE opportunity_id IS NOT NULL`.
   - `contact_opportunity_event (opportunity_id, created_at DESC, id DESC)`.
   - Bỏ `contact_opportunity_live_idx` cũ khi index mới phủ được.
6. **Privacy / gộp / xoá:**
   - `crm/privacy/inventory.ts` + `cleanup.ts` thêm `contact_opportunity_item` / `contact_opportunity_event` (exclusive theo khách).
   - `crm/merge/relations.ts` chuyển cả event và item theo cơ hội (cơ hội đã chuyển `contact_id`, event giữ `contact_id` cũ cho lịch sử và đổi khi gộp như timeline).
   - Quên khách (015c) xoá đủ ba bảng.

### 2. Action (module `packages/actions/src/contact-opportunities.ts` — tách thêm `contact-opportunity-flow.ts` nếu > 200 dòng)
| Action | Risk | Quyền | agentGrantable | Ghi chú |
|---|---|---|---|---|
| `contact_opportunity.create` | write | `crm.edit` + scope khách; tiền: `quote.create` | **true** | Input: contact_id, title, amount_vnd?, items[]?, expected_close_date?, owner_user_id?, source_kind?, campaign_id?, source_conversation_id / message_id?. Người dùng chọn được giai đoạn khởi đầu ≠ won / lost. Agent chọn giai đoạn như người (DC-922); `source_kind` = `conversation` khi có hội thoại. Undo 24h = lưu trữ |
| `contact_opportunity.update` | write | như trên | true | Sửa tên, giá trị, sản phẩm, ngày chốt, nguồn, nhóm. **Không** đổi giai đoạn (dùng `set_stage`), không đổi chứng từ. CAS `if_version`. Undo = khôi phục ảnh trước |
| `contact_opportunity.set_stage` | write | `crm.edit` + scope | true | Đổi tay tiến / lùi tới mọi giai đoạn trừ `lost` (dùng `mark_lost`) và trừ `won` khi chưa có đơn / hợp đồng ký (422 `won_needs_document`). Ghi event `stage` + `recomputeContactStage`. Undo 24h khi version còn khớp |
| `contact_opportunity.mark_lost` | write | `crm.edit` + scope | true | Bắt buộc `lost_reason` (4 mã). Cùng transaction: mọi báo giá đang mở **đã gửi** (`sent · viewed`) của cơ hội → `quote.mark_rejected` (đi qua QUOTE_FLOW, timeline, event `quote.rejected`). Nháp / chờ duyệt không đổi. Báo giá đã `accepted` không đổi. Có đơn sống hoặc hợp đồng ký → 409 `has_live_document`. Undo 24h chỉ đảo cơ hội, không mở lại báo giá đã từ chối (ghi preview) |
| `contact_opportunity.reopen` | write | `crm.edit` + scope | true | Thua → `qualified`, xoá `lost_reason`, `closed_at` null. Đã mua không mở lại bằng action này |
| `contact_opportunity.set_owner` | write | `crm.reassign`, hoặc owner khách khi giao cho chính mình | true | Đổi phụ trách cơ hội. Nhóm chụp lại theo người mới. Không đổi `owner_user_id` của chứng từ (doanh số §8b) |
| `contact_opportunity.archive` | delete | `crm.edit` | false | Giữ từ 026b. Không lưu trữ được cơ hội có chứng từ sống (409) |
| `contact_opportunity.list` / `.get` | read | `crm.view` + scope; tiền theo field policy | read: true | `list` theo khách (cursor, mặc định 20); `get` trả drawer §3.3 |

- Bỏ `probability` khỏi mọi input / output. Action cũ nhận `probability` thì 422 `field_removed`. Executor và registry test bắt buộc.
- Mọi action ghi có `preview()` (Trợ lý luôn preview write). Preview `mark_lost` liệt kê báo giá sẽ bị từ chối.
- Executor kiểm quyền mỗi lần gọi. Agent qua `delegate` = quyền agent ∩ quyền người ra lệnh (D51).

### 3. Luật chuyển tự động và giai đoạn khách (COMMERCE §8, DC-901)
1. **Nối producer** (trong transaction của producer, sau khi khoá họ khách và chứng từ; khoá cơ hội bằng `lockOpportunity` theo id tăng dần):

   | Producer (file) | Điều kiện | Cơ hội |
   |---|---|---|
   | `quote.send` (`quote-send.handlers.ts`) | báo giá có `opportunity_id`, cơ hội mở | → `quote` nếu đang thấp hơn. Cờ `sync_value` của báo giá (mặc định bật) → `amount_vnd` = tổng báo giá. Cờ `follow_up_task` (mặc định bật) → `contact_task` "Theo dõi phản hồi báo giá" hạn +2 ngày, giao người phụ trách cơ hội |
   | `quote.mark_accepted` | như trên | → `negotiation` |
   | `quote.mark_rejected` (không qua `mark_lost`), `quote.expire` (`quote-effects.ts`) | cơ hội không còn báo giá mở (`OPEN_QUOTE_STATUSES`) | → `demo` nếu đang `quote` / `negotiation`. Từ chối thì `notify.requested` kind `opportunity_lost_reason` tới người phụ trách cơ hội (không tự đặt Thua) |
   | `contract.signed` (`contracts/signing/finalize.ts`) | `contract.quote_id → quote.opportunity_id` | → `won`, `closed_at` |
   | `order.create*` (`order-create.handlers.ts` `insertOrder`) | `order.opportunity_id` khác null | → `won`, `closed_at` |
   | `contract.declined` (`signing/public.handlers.ts`, `contracts/system/effects.ts` link hết hạn), `order.cancel` (`order-flow.handlers.ts`) | cơ hội `won` mà không còn hợp đồng `signed` nào và không còn đơn không huỷ nào của cơ hội | → `negotiation`, `closed_at` null |
   | `appointment.complete` (`appointment-flow.handlers.ts`) | lịch hẹn có `opportunity_id`, cơ hội ở `lead · qualified · demo` | **Không đổi.** Ghi event `ai_suggested` "Demo / tư vấn hoàn thành → đề xuất bước kế" + gợi ý trên thẻ (§5.2) |

   - Thua và Đã mua không bị luật tự động đổi, trừ dòng "huỷ / từ chối" ở trên. Event lặp lại (gửi lại báo giá, retry outbox) thì no-op ổn định.
   - Tạo đơn từ báo giá đã gắn cơ hội Thua: 422 `opportunity_lost` (phải Mở lại trước). Liên kết vào cơ hội Thua cũng 422.
2. **`recomputeContactStage(tx, contactId, { allowLower, actor, now })`** (`crm/opportunities/stage-sync.ts`) chạy sau mọi đổi giai đoạn cơ hội, cả tay lẫn tự động, và thay đích lùi của `closeLost` (báo giá không gắn cơ hội):
   1. **M** = ánh xạ khách (§1.4) của hạng cao nhất trong các cơ hội **mở** (không lưu trữ, không won / lost) của họ khách.
   2. **F** = sàn từ chứng từ **không gắn cơ hội** của họ khách: báo giá `sent · viewed` → `quote`; hợp đồng `pending_signature · signed` → `contract`.
   3. **Đích:**
      - Có M hoặc F: đích = max(M, F).
      - Cả hai rỗng và `allowLower`: đích = `consulting` (đúng luật lùi cũ khi hết báo giá mở).
      - Cả hai rỗng và không `allowLower`: no-op.
   4. Đích > hiện tại → `applyStageRule(mode 'raise')`. Đích < hiện tại **và** `allowLower` → `applyStageRule(mode 'fallback')`.
      - `allowLower` = true khi cơ hội lùi giai đoạn, Thua, bị lưu trữ, hoặc khi báo giá (gắn / không gắn) bị từ chối / hết hạn.
      - Tạo / nâng cơ hội chỉ nâng khách, không bao giờ hạ.
   5. **Đã mua của khách chỉ do `order.completed`** (luật cũ giữ). Cơ hội won không nâng khách lên won. Ví dụ: khách ở `lead` có cơ hội Thua → đích `consulting` nhưng fallback không nâng, nên khách giữ `lead`.
   6. Giữ tay 24 giờ, không hạ Đã mua, không đụng Thất bại khi lùi: đều nằm sẵn trong `applyStageRule`. Không viết đường UPDATE thứ hai. Event `contact.stage_changed` như cũ.
3. **Chứng từ không gắn cơ hội** giữ luật nâng cũ ở producer (`applyStageRule` raise như hiện tại). Đích lùi của `closeLost` đổi sang `recomputeContactStage({ allowLower: true })`, nên không hạ khách dưới M.
4. **Nhãn giai đoạn khách** (enum giữ nguyên khoá): `potential` = "Đủ điều kiện", `consulting` = "Tư vấn / Demo", `contract` = "Đàm phán".
   - Sửa ở i18n web (`customers.json`, `inbox.json`, `marketing.json` nếu có) và server (`i18n/server/*/crm.ts`).
   - `STAGE_COLOR` giữ.
   - Thống kê "Cơ hội đang mở" ở `crm-read.service.ts stats()` = **số cơ hội mở** trong scope (hiện đang đếm khách theo giai đoạn).
5. **Kéo tay giai đoạn khách** (`manual.handler.ts`) không đổi cơ hội.

### 4. Đọc, 360°, AI
1. **Read model** `crm/opportunities/read.service.ts`:
   - `listForContact` (keyset `updated_at DESC, id DESC`, 1–50, mặc định 20; deferred join; tiền ẩn khi thiếu `quote.view`, trả `null` chứ không trả "0").
   - `openSummary(contactIds[])`: một truy vấn cho cả trang, gồm tổng giá trị mở, số cơ hội mở, giai đoạn cao nhất. Dùng cho cột Khách hàng và chip Hộp thư, không N+1.
   - `detail(id)`: drawer §5.3. Chuỗi chứng từ đọc bằng các reader domain theo quyền người xem (báo giá: `quote.view` + scope; đơn: `order.view`; đề nghị: `invoice.manage`). Không thấy thì bước hiện "Không có quyền xem", không lộ mã.
2. **Hồ sơ 360°** (`contact360.ts`, `withActivities`):
   - Ô `deal` thay bằng `opportunity` đầy đủ: id, tên, giá trị, giai đoạn, xác suất, dự báo, ngày chốt, phụ trách, sản phẩm, báo giá + số lần khách xem (`quote.viewed_at`/đếm xem nếu có — chỉ dùng số thật, không có thì ẩn), bước tiếp theo, gợi ý AI.
   - Thêm `opportunities[]` (lịch sử mọi cơ hội của khách).
   - Bỏ hẳn `ai_summary.close_pct` và `crm.open_deal` khỏi DTO (`packages/shared/src/api/crm.ts`) + web types. Tab CRM "Cơ hội đang mở" đọc `opportunities` mở.
3. **Bước tiếp theo:** luật xác định (không gọi model mỗi GET), cùng kiểu `crm/insights/next-action.ts`:
   - Lead mới → gọi xác nhận nhu cầu.
   - Đủ điều kiện → chốt lịch demo.
   - Tư vấn / Demo → lịch hẹn gắn cơ hội sắp tới, nếu không có thì "Gửi báo giá".
   - Báo giá → "Theo dõi phản hồi báo giá {mã}".
   - Đàm phán → "Tạo hợp đồng / đơn từ {mã}".
   - Trả `source: 'rule'`.
4. **Gợi ý AI đổi giai đoạn:**
   - Đọc gợi ý đã có ở record-proposal / Trợ lý (023g) hoặc event `ai_suggested`. Thẻ hiện "AI gợi ý: … → Áp dụng / Bỏ qua".
   - Áp dụng = `contact_opportunity.set_stage` với `source: 'ui'` của người bấm. Event `ai_applied` lưu ref gợi ý.
   - Agent trực kênh được cấp `set_stage` thì đổi thẳng trong lượt (DC-922), không qua thẻ; event `stage` ghi actor agent.
   - Không có gợi ý thật thì không hiện khối (không dựng câu cứng của prototype).
5. **Catalog / dataset:**
   - `ai/assistant/catalog.ts` cập nhật mô tả `contact_opportunity`.
   - Dataset 038b (`shared/data-transfer/activity-fields.ts`, `data-transfer/adapters/activities.ts`, `insights/exports/activity-readers.ts`) đổi cột `probability` → `stage` mới + `owner` + `source_kind`. Nhập file có cột xác suất thì bỏ qua và cảnh báo.
   - `crm/memory/summary.ts` đọc giai đoạn + xác suất cố định (bỏ "(người nhập)").

### 5. Giao diện (frontend-structure: màn = orchestrator; component ≤ 250 dòng, trần 400)
1. **`shared/opportunities/`** (dùng chung Hộp thư, Khách hàng, Lịch, Báo giá; không import chéo feature):
   - `OpportunityPanel` (thẻ 360°): thanh 6 bước bấm được, xác suất, dự báo, giá trị, ngày chốt, phụ trách, sản phẩm, báo giá, bước tiếp theo, gợi ý AI, nút "Chuyển giai đoạn" (bước kế) và "Mở cơ hội", danh sách "Lịch sử cơ hội đã thêm".
   - `OpportunityQuickAdd`: tên + giá trị; vào Lead mới.
   - `OpportunityDrawer`: drawer 980 "Cơ hội · Sales Pipeline 360°" gồm giai đoạn, chuỗi chứng từ, Đánh dấu Thua + lý do, Mở lại, khối Khách hàng 360° (Đã mua tổng, cơ hội đang mở, công nợ dùng `customerDebt`, cơ hội khác), lịch sử. Nút Nhắn tin / Đặt lịch demo / Hồ sơ khách.
   - `OpportunityChain`: 4 bước, mỗi bước là chứng từ thật + nút tạo nối tiếp, đều qua action có sẵn:
     1. Báo giá: "Tạo báo giá từ cơ hội" mở form Báo giá điền sẵn khách, sản phẩm, `opportunity_id`, ra nháp. "Khách chốt" (`quote.mark_accepted`) / "Khách từ chối" (mở chọn lý do → `mark_lost`).
     2. Hợp đồng / Đơn: "Tạo hợp đồng từ báo giá" (`contract.create_from_quote`) / "Tạo đơn từ báo giá" (`order.create_from_quote`).
     3. **Đề nghị thanh toán `TT-`**: "Tạo đề nghị thanh toán từ đơn" (`invoice.create`).
     4. Thu tiền: "Xem ở Tài chính ›". Trước 032e thì mở màn Đề nghị thanh toán lọc theo khách; 032e đổi đích.
   - `useOpportunity*` hooks, `api.ts`, `types.ts`, `ui-commands.ts` (`open:opportunity`, `prefill:opportunity.form`).
   - Gỡ `OpportunityCard.tsx` + `OpportunityForm.tsx` cũ của `shared/contact-activities` (facade 1–2 dòng nếu còn chỗ import). `ActivityCards` / `ActivityListDrawer` trỏ sang panel mới.
2. **Điểm hiển thị:**
   - Hộp thư `Overview360.tsx` (thay khối deal + vòng `close_pct`).
   - `Tabs360.tsx` (tab CRM "Cơ hội đang mở").
   - Khách hàng `Customer360Drawer.tsx` (qua `Profile360Content` — cùng bản).
   - `columns.tsx` cột "Cơ hội đang mở" (tổng giá trị · số cơ hội · nhãn giai đoạn cao nhất; bấm mở drawer).
   - Chip Hộp thư "Cơ hội · {giai đoạn} · {giá trị rút gọn}" ở `ChatHeader.tsx` + `ConvRow.tsx`. Dữ liệu từ `inbox/services/view.ts` dùng `openSummary`, một truy vấn cho cả trang. Chip "⚠ Nợ" thuộc 032e.
   - Form Báo giá: ô "Thuộc cơ hội" (không bắt buộc, D60 #11), "+ Tạo cơ hội mới", hai checkbox (cập nhật giá trị theo tổng báo giá, tự tạo việc theo dõi sau 2 ngày), cảnh báo khi không gắn ("không tính vào pipeline và dự báo").
   - Form Lịch hẹn: ô "Thuộc cơ hội" + ghi chú "Demo / tư vấn hoàn thành → gợi ý chuyển giai đoạn". Ô "Đơn / liệu trình" hiển thị buổi k/N chỉ khi có gói thật (`package_id` của 033); không có thì ẩn, không dựng dữ liệu mẫu.
3. **Trạng thái UI** (interaction-patterns): rỗng ("Khách chưa có cơ hội · + Thêm"), đang tải, lỗi, không quyền (ẩn tiền), CAS 409 (tải lại + giữ lựa chọn), mobile 390 (drawer toàn màn). vi + en. Token `packages/ui/theme.ts`, không hard-code màu / px (màu giai đoạn lấy từ bảng hằng §1.4 qua token).
4. **Parity** (`tools/parity`):
   - Thêm `customers:360-pipeline` (thẻ 360°) + `deal:drawer` (drawer Cơ hội 360°) vào module `tools/parity/modules/sales-pipeline.ts`, nối từ `parity.manifest.ts`.
   - `capture.ts` `OUT_LABELS` thêm `'Báo cáo'` (ẩn D07/D19) và `'Tài chính'` (chưa dựng tới 032e), để rail khớp prototype mới.
   - Chạy `pnpm parity customers:360 customers:360-pipeline deal:drawer inbox:default customers:table quotes:editor calendar:appointment` và `pnpm parity --done` (đổi shell / shared).
   - Mask phải trích mã:
     - Mức 4, trích thẳng luật: "Hóa đơn HD-" → "Đề nghị thanh toán TT-" (COMMERCE §5; prototype-parity §6 "Hóa đơn"); "Tạo báo giá từ cơ hội" ra nháp, "Khách duyệt" → "Khách chốt" (COMMERCE §3); nhãn giai đoạn khách (D60).
     - Mức 1, **PD-901**: gợi ý AI / bước tiếp theo / số lần khách mở báo giá chỉ hiện khi có số liệu thật; "Lịch sử cơ hội" là dữ liệu thật; bỏ tên "Pipeline Bán lẻ & SME" (một pipeline, D60 #8).

### 6. Lỗi
- 422 `VALIDATION_FAILED` cho các trường hợp: thiếu lý do Thua; giai đoạn lạ; `won_needs_document`; `field_removed` (probability); liên kết khác họ khách / cơ hội Thua (`opportunity_lost`); quá 20 dòng sản phẩm.
- 409 `CONFLICT` cho: version lệch; `has_live_document` (Thua / lưu trữ khi còn đơn sống / hợp đồng ký); undo khi đã đổi.
- 403: thiếu `crm.edit` / `quote.create` khi ghi tiền / `crm.reassign`.
- 404 đồng nhất khi ngoài scope.

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given DB có cơ hội 026b (open / qualified / proposal / won / lost, có `quote_id`, có `probability`), when migrate, then id / version / timeline giữ, stage ánh xạ đúng, `quote.opportunity_id` có giá trị, cột cũ bỏ; template DB + mọi workspace cùng schema | `packages/db/test` migration test trên bản chụp dữ liệu 026b + `db:migrate-tenants` + `db:setup` log |
| 2 | Given khách có cơ hội Tư vấn / Demo 48tr, when xem Hồ sơ 360°, then thẻ hiện 6 bước, 50%, dự báo 24tr, sản phẩm, bước tiếp theo; người thiếu `quote.view` thấy giai đoạn nhưng không thấy tiền | integration `opportunity-pipeline.test.ts` + web `OpportunityPanel.test.tsx` + E2E mock/http |
| 3 | Given báo giá gắn cơ hội Đủ điều kiện, when gửi → khách chốt → tạo đơn, then cơ hội lần lượt Báo giá (70%, giá trị = tổng báo giá, việc theo dõi +2 ngày) → Đàm phán → Đã mua; khách theo thành Báo giá → Đàm phán (chưa Đã mua tới khi đơn hoàn tất) | integration theo producer thật + event / timeline / lịch sử cơ hội |
| 4 | Given đường hợp đồng, when tạo HĐ từ báo giá đã chốt → Owner ký → khách ký, then cơ hội chỉ Đã mua lúc khách ký; khách từ chối / link hết hạn → cơ hội về Đàm phán; báo giá hết hạn khi không còn báo giá mở → Tư vấn / Demo | integration contracts + quote-effects + `crm-stage-producers.test.ts` mở rộng |
| 5 | Given cơ hội có báo giá `sent` và `draft`, when Đánh dấu Thua "Giá cao", then báo giá `sent` → rejected (event + timeline), nháp giữ, cơ hội Thua 0%; Mở lại → Đủ điều kiện; Thua khi có đơn sống → 409 | integration + preview liệt kê báo giá bị từ chối |
| 6 | Given khách có hai cơ hội mở (Lead mới, Đàm phán) + báo giá mở không gắn cơ hội, when cơ hội Đàm phán Thua, then khách = Báo giá (sàn chứng từ), không thấp hơn; kéo tay trong 24 giờ thắng; khách đã mua không bị hạ | unit `stage-sync.test.ts` + integration với giữ tay 015g |
| 7 | Given agent được cấp `contact_opportunity.create` / `set_stage` / `mark_lost`, when tạo từ hội thoại với stage `quote`, then cơ hội tạo ở `quote` nguồn `conversation`; agent `set_stage` chạy thẳng (event `stage` actor agent), `won` thiếu chứng từ → 422 như người, `mark_lost` thiếu lý do → 422 (DC-922); Trợ lý đổi giai đoạn → preview + xác nhận; thẻ "Áp dụng" gợi ý AI chạy `set_stage` dưới quyền người bấm | executor/registry test + `pnpm ai:live --cases fixtures/ai-eval/sales-pipeline.json` (6 ca × 3 lượt, an toàn 100%) |
| 8 | Given 100k khách / 300k cơ hội, when bảng Khách hàng 50 dòng + Hộp thư 50 hội thoại tải cột / chip cơ hội, then một truy vấn `openSummary` mỗi trang, index seek, không N+1; danh sách cơ hội theo khách keyset | EXPLAIN ANALYZE dán report + đếm truy vấn |
| 9 | Given form Báo giá / Lịch hẹn, when chọn "Thuộc cơ hội" hoặc "Không gắn", then lưu đúng `opportunity_id` / null (cảnh báo hiện), cơ hội khác họ khách → 422; lịch hẹn demo hoàn thành → gợi ý (không tự đổi) | integration quotes / booking + E2E |
| 10 | Given drawer Cơ hội 360° và chip / cột, when so prototype 1440×900, then < 5% sau mask PD-901…030; mobile 390 không tràn; vi/en đủ khoá | `pnpm parity …` + `pnpm parity --done` + `pnpm i18n:check` + E2E mobile |

### Commands / evidence gate
- Cổng commit (D59): `pnpm turbo run lint typecheck test --filter=@appchat/{shared,actions,db,core,web}` · `pnpm depcheck` · `pnpm lint:size` · `pnpm lint:tokens` · `pnpm i18n:check`.
- Migration: `pnpm --filter @appchat/db run db:generate` → `db:migrate-tenants` → `db:setup`, rồi kiểm `_appchat_migrations` của template có `20261112100000_opportunity_pipeline`.
- Integration: `pnpm --filter @appchat/api test:integration -- test/integration/opportunity-pipeline.test.ts test/integration/opportunity-producers.test.ts test/integration/crm-stage-producers.test.ts test/integration/contact-activities.test.ts`.
- Unit: `pnpm --filter @appchat/core test -- test/opportunity-stage-sync.test.ts test/opportunity-actions.test.ts` · `pnpm --filter @appchat/shared test -- src/crm/opportunity-stages.test.ts`.
- Web: `pnpm --filter @appchat/web exec vitest run src/shared/opportunities` · `pnpm e2e sales-pipeline` (mock) · `pnpm e2e:http sales-pipeline`.
- AI: `pnpm ai:live --cases fixtures/ai-eval/sales-pipeline.json`. Thiếu key thì ghi "chưa nghiệm thu với provider thật".
- Parity như §5.4. EXPLAIN 100k như AC8.

## CONSTRAINTS
- **DO NOT:**
  - Giữ hay thêm ô xác suất nhập tay.
  - Tạo bảng `deal` thứ hai song song `contact_opportunity`.
  - Viết UPDATE `contact.stage` ngoài `applyStageRule` / `manual.handler`.
  - Cho cơ hội won đẩy khách lên Đã mua.
  - Gửi báo giá ngay từ "Tạo báo giá từ cơ hội".
  - Đổi ngưỡng duyệt 20M / 5%.
  - Hiện "Hóa đơn HD-".
  - Ghi thu tiền từ chuỗi chứng từ.
  - Luật riêng cho agent (ép giai đoạn khởi đầu, chặn đổi giai đoạn) — DC-922.
  - Dựng kanban Pipeline hay Hẹn gọi lại.
  - Thêm code vào file legacy vượt trần.
- **REUSE:**
  - `applyStageRule` + `lockStageFamilyOf` (015g), `snapshotTeam`, `guardRecord` / `POLICIES`.
  - `customerDebt` (015b), `writeTimeline`.
  - Action chứng từ sẵn có (`quote.create`, `quote.mark_accepted`, `contract.create_from_quote`, `order.create_from_quote`, `invoice.create`).
  - `EntityDrawer`, `ModalShell`, token theme, `shared/contact-activities` host.
- **SKIP:**
  - Kanban Pipeline (D60 #8), Hẹn gọi lại (D60 #9).
  - Cơ hội tái mua tự tạo từ liệu trình (cần Quy trình — D19).
  - Màn Tài chính, chip "⚠ Nợ", thẻ "Công nợ" (032e).
  - Gắn cuộc gọi (TIP Call Center sau — dùng `source_kind 'call'` + `recordOpportunityEvent`).

## Quality Gate
- [x] Manifest chính xác (file-level M/C). Giao file với TIP khác khai hai phía bằng `manifests.py --sync 026c 032e`; `--check` / `--order` sạch.
- [x] Luật COMMERCE §8 bản 2026-11-12 + D60 + DC-901 khớp từng dòng §3; không đổi ngưỡng duyệt, doanh số, giữ tay 24 giờ.
- [x] 10 AC có Given/When/Then + bằng chứng chạy thật; thiếu provider thì ghi trung thực.
- [x] Thiết kế cho Call Center sau này: `source_kind 'call'`, liên kết trỏ tới cơ hội, `recordOpportunityEvent` / `soleOpenOpportunity` export qua `crm/public.ts`; không phải sửa bảng cơ hội.
- Gap đã khai:
  - Hợp đồng không từ báo giá không gắn được cơ hội (giả định, mở rộng sau nếu cần).
  - "Số lần khách mở báo giá" chỉ có nếu sổ xem có đếm, không thì chỉ hiện "đã xem".
  - Chưa chạy runtime; tài liệu ở pha docs.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Implement đúng `Files touched` (manifest), không thêm file ngoài scope; file mới đúng giới hạn 200–400 (BE) / 150–250 (FE).
- [ ] Mọi AC 1–10 có test PASS. Ghi kết quả từng AC, dán output thật (`pnpm …`), không "pass" chung chung.
- [ ] **Action-first (BUILDER-HANDOFF):** mọi ghi cơ hội / liên kết / giai đoạn qua `ActionExecutor` (`POST /v1/actions/:id`). FE chỉ `useAction(id).run(input)`. Chuyển tự động chạy trong transaction của action producer, không đường ghi thứ hai.
- [ ] **Tenant DB:** chỉ qua `TenantDbResolver`, bảng không `workspace_id`, mọi list / get áp scope; migration chạy CẢ `db:generate` → `db:migrate-tenants` → `db:setup`.
- [ ] **COMMERCE không đổi ngoài D60:** ngưỡng duyệt, "Đề nghị thanh toán TT-", Owner ký trước, doanh số theo `owner_user_id` của chứng từ; khách Đã mua chỉ do `order.completed`.
- [ ] **Quyền agent (D51, DC-922):** agent là nhân viên — `create` / `update` / `set_stage` / `mark_lost` / `reopen` / `set_owner` agentGrantable, cùng luật như người; delegate = quyền agent ∩ người ra lệnh, kiểm mỗi lần gọi.
- [ ] Index theo indexing.md + EXPLAIN dán report; không N+1 ở cột / chip.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA.

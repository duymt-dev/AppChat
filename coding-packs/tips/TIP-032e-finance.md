# TIP-032e — Màn Tài chính: doanh số & công nợ theo khách, nhắc thanh toán hàng loạt

## HEADER
- **Parallel-safe with TIP-049 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/db/prisma/tenant/sales-orders.prisma`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 032e before049.
- **Parallel-safe with TIP-049b (coverage-closure manifest):** sequential, shares `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 032e before049b.
- **Parallel-safe with TIP-049c (coverage-closure manifest):** sequential, shares `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 032e before049c.
- **Parallel-safe with TIP-049d (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 032e before049d.
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 032e before048.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/inbox.ts`; integrate 032e before048b.
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ConvRow.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 032e before048c.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ConvRow.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 032e before048f.
- **Parallel-safe with TIP-048g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032e before048g.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 032e before048h.
- **Parallel-safe with TIP-047c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 032e before047c.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/finance.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/en/shell.json`, `apps/web/messages/vi/finance.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/shell.json`, `apps/web/src/features/finance/components/FinanceCustomerDrawer.tsx`, `apps/web/src/features/inbox/components/Overview360.tsx`, `apps/web/src/i18n/messages.ts`, `apps/web/src/shared/api/mock/routes.ts`, `apps/web/src/shared/realtime/event-invalidation.ts`, `apps/web/src/shared/shell/NavRail.tsx`, `apps/web/src/shared/shell/nav-config.test.ts`, `apps/web/src/shared/shell/nav-config.ts`, `tools/parity/parity.manifest.ts`, `tools/parity/src/capture.ts`; integrate 032e before047d.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ChatHeader.tsx`, `apps/web/src/features/inbox/components/ConvRow.tsx`, `apps/web/src/features/inbox/components/Overview360.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/customers.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `apps/web/src/shared/opportunities/OpportunityChain.tsx`, `packages/actions/src/index.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/core/src/inbox/services/view.ts`, `packages/core/src/kernel/actions/tip-owners.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/db/prisma/tenant/sales-orders.prisma`, `packages/shared/src/api/crm.ts`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`, `tools/parity/src/capture.ts`; integrate 026c before032e.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/shared/api/mock/domains/customers.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/shared/src/api/crm.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 015b before032e.
- **Parallel-safe with TIP-016b (coverage-closure manifest):** sequential, shares `apps/api/test/integration/nav-badges.test.ts`, `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/core/src/inbox/services/nav-badges.ts`; integrate 016b before032e.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/api/src/http/sales/sales.http.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/sales.module.ts`, `packages/db/prisma/tenant/sales-orders.prisma`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032b before032e.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/sales.module.ts`, `packages/db/prisma/tenant/sales-orders.prisma`, `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`, `tools/parity/parity.manifest.ts`; integrate 032c before032e.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before032e.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/shared/src/api/crm.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 045b before032e.
- **Parallel-safe with TIP-046 (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 032e before046.
- **Parallel-safe with TIP-001b (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/routes.ts`; integrate 001b before032e.
- **Parallel-safe with TIP-003b (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 003b before032e.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/sales/sales.module.ts`; integrate 003c before032e.
- **Parallel-safe with TIP-003e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003e before032e.
- **Parallel-safe with TIP-003f (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 003f before032e.
- **Parallel-safe with TIP-003h (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 003h before032e.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 004b before032e.
- **Parallel-safe with TIP-006b (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`; integrate 006b before032e.
- **Parallel-safe with TIP-006c (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`; integrate 006c before032e.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/actions/src/index.ts`, `packages/core/src/sales/sales.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 012b before032e.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 012c before032e.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 013b before032e.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/core/src/crm/services/crm-read.service.ts`; integrate 013c before032e.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 014b before032e.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `tools/parity/parity.manifest.ts`; integrate 014c before032e.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 015c before032e.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/en/shell.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/shell.json`, `apps/web/src/shared/api/mock/domains/customers.ts`, `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/actions/src/index.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/core/src/sales/sales.module.ts`, `packages/shared/src/api/crm.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 015d before032e.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/domains/customers.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/actions/src/index.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/core/src/inbox/services/view.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/payments/actions/invoice-write.handlers.ts`, `packages/shared/src/api/crm.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 015e before032e.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/shared/api/mock/domains/customers.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/actions/src/index.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/core/src/inbox/services/view.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/payments/actions/invoice-write.handlers.ts`, `packages/core/src/sales/sales.module.ts`, `packages/db/prisma/tenant/sales-orders.prisma`, `packages/shared/src/api/crm.ts`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 015f before032e.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 019b before032e.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/kernel/actions/tip-owners.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 019c before032e.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 020b before032e.
- **Parallel-safe with TIP-020c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/inbox.ts`; integrate 020c before032e.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 020d before032e.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/core/src/kernel/actions/tip-owners.ts`; integrate 020e before032e.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ChatHeader.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 022b before032e.
- **Parallel-safe with TIP-022c (coverage-closure manifest):** sequential, shares `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 022c before032e.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/core/src/kernel/actions/tip-owners.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/payments/actions/invoice-write.handlers.ts`, `packages/core/src/sales/sales.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023b before032e.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/shared/api/mock/routes.ts`, `packages/actions/src/index.ts`, `packages/core/src/kernel/actions/tip-owners.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023c before032e.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023d before032e.
- **Parallel-safe with TIP-023e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 023e before032e.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/routes.ts`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023f before032e.
- **Parallel-safe with TIP-023g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/invoices.json`, `apps/web/messages/vi/invoices.json`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023g before032e.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ConvRow.tsx`, `apps/web/src/features/inbox/components/Overview360.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/customers.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/actions/src/index.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/core/src/inbox/services/view.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 025b before032e.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/Overview360.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/customers.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/actions/src/index.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/shared/src/api/crm.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 026b before032e.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 027b before032e.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/sales/public.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 030b before032e.
- **Parallel-safe with TIP-030c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 030c before032e.
- **Parallel-safe with TIP-031b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 031b before032e.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/invoices.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/invoices.json`, `packages/actions/src/index.ts`, `packages/core/src/sales/sales.module.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032d before032e.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/Overview360.tsx`, `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/actions/src/index.ts`, `packages/core/src/sales/sales.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 033b before032e.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/core/src/sales/sales.module.ts`, `packages/shared/src/api/inbox.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 033c before032e.
- **Parallel-safe with TIP-033d (coverage-closure manifest):** sequential, shares `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/db/prisma/tenant/sales-orders.prisma`; integrate 033d before032e.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/routes.ts`, `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/actions/src/index.ts`, `packages/core/src/kernel/actions/tip-owners.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 034b before032e.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/realtime/event-invalidation.ts`, `packages/actions/src/index.ts`, `packages/core/src/kernel/actions/tip-owners.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 034c before032e.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/kernel/actions/tip-owners.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 034d before032e.
- **Parallel-safe with TIP-036 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 036 before032e.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before032e.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before032e.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 039 before032e.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 040 before032e.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 041 before032e.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 042 before032e.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 042b before032e.
- **Parallel-safe with TIP-042c (coverage-closure manifest):** sequential, shares `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/payments/actions/invoice-write.handlers.ts`, `packages/db/prisma/tenant/sales-orders.prisma`; integrate 042c before032e.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before032e.
- **TIP-ID:** TIP-032e · **Project:** AppChat V2 · **Module:** Sales — Tài chính (đọc + nhắc) · **Priority:** P0 · **Estimated:** L (3 pha)
- **Depends on:** 026c, 015b, 016b, 032b, 032c, 037, 045b và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 044, 045, 046.
- **Vì sao phụ thuộc:**
  - 026c: cơ hội, `order.opportunity_id`, `source_kind`, đích "Xem ở Tài chính ›".
  - 032 / 032b / 032c: đề nghị thanh toán, khoản thu, nhắc T-1 / T+1 / T+7, `owner_user_id` / `team_id`.
  - 015b: `customer-debt.ts`.
  - 016b: `/nav/badges`.
  - 037: `campaign_recipient` để phân loại Marketing.
  - 045b: bulk + biên nhận từng bản ghi, `data_job`.
- **Files touched:** [exact M/C manifest](manifests/TIP-032e-files.md). Module mới `sales/finance/`; không thêm thân logic vào `invoices-read.service.ts` / `invoice-write.handlers.ts` (chỉ facade).
- **Quyết định nguồn:** D60 (#4–7, #12) · COMMERCE §5 (bản 2026-11-12) · DC-902.
- **Dòng COVERAGE nhận:** REQ-F14 · D60-finance · COM-5-10 · DC-902 · PRO-finance-screen · PRO-finance-kpi · PRO-finance-filters · PRO-finance-remind · PRO-finance-drawer · PRO-finance-badge · PRO-360-debt-card · PRO-inbox-debt-chip · PRO-invoices-debt-btn.

## CONTEXT
- Working dir: `D:/CODING/AppChat_Ver2`. Stack như CLAUDE.md §1 (NestJS + ActionExecutor, DB tenant riêng, Next.js + Ant Design).
- **Hiện trạng (rà 2026-11-12):**
  - **Đề nghị thanh toán:**
    - `invoice` (`sales-payments.prisma`) có `order_id?`, `owner_user_id`, `team_id`, `amount`, `paid_amount`, `due_date`, `reminders_sent` (mảng `{key, at, channel, by}`: nhắc tay `key:'manual'`, tự động `T-1 · T+1 · T+7`), `sent_channel`.
    - Khoản thu `customer_payment`: kind `deposit · payment · points · refund`, status `confirmed`…
    - Đơn có `paid_total`, `refunded_total`, `points_used`, `pay_status` (`payStatusOf`), `deposit_required/amount`, `source`, `contract_id`, `quote_id`.
  - **Công nợ một công thức** `crm/insights/customer-debt.ts` (Σ amount − paid_amount trên đề nghị `sent · partial · overdue`, quá hạn theo `due_date` giờ workspace, quyền `invoice.manage` + scope).
  - **Metric** `insights/metrics/sales.ts`:
    - `sales.booked`: đơn không huỷ theo ngày tạo.
    - `sales.collected`: thu ròng theo `paid_at`.
  - **Nhắc:**
    - Tay: `invoice.send_payment_qr` (risk send, `invoice.manage`, agentGrantable). Nháp → gửi PDF + VietQR; đã gửi → nhắc chữ vào hội thoại đã gửi (`invoice-send.ts`), ghi `reminders_sent`.
    - Tự động: `sales/system/payment-effects.ts` `remindInvoice`, job `payment.jobs.ts`.
  - **Phân loại:**
    - Chưa có cột hoạt động. Marketing quy đổi ở `campaign.record_metric` (đơn hoàn tất trong 7 ngày sau tin chiến dịch đã gửi).
    - Gia hạn hợp đồng có `contract.renewal_of_id`. Cơ hội nguồn `renewal` / `campaign` là của 026c.
  - **Rail:** `apps/web/src/shared/shell/nav-config.ts` (không có `finance`). Badge đọc `/nav/badges` (`useShellData.ts`, 016b).
- **Prototype bản 2026-11-10:**
  - Màn Tài chính L5473–5631: header, 4 KPI, bộ lọc, chip trạng thái, thanh chọn nhiều, bảng 11 cột, menu ⋯, footer.
  - Drawer "Hồ sơ khách hàng 360° · Tài chính": 3 tab.
  - Modal "Gửi nhắc thanh toán".
  - Logic `finVals()` L9473–9611 (dữ liệu mẫu cứng, `HD-`).
  - Lối vào:
    - Rail `nav.finance` L1134 (sau Khách hàng, badge = số quá hạn).
    - Nút "Công nợ" ở màn Đề nghị thanh toán L6063 (`goFinanceNo` → lọc Quá hạn).
    - Thẻ "⚠ Công nợ · Tài chính" Hồ sơ 360° L2378–2385 (`debtMail`, `debtGoFin`).
    - Chip "⚠ Nợ 8,5tr" Hộp thư L1978 / L2064.
    - Bước 4 chuỗi chứng từ của cơ hội (026c).
- Key files to read first:
  - COMMERCE §4 / §4b / §5 / §8b.
  - DC-902.
  - `customer-debt.ts`, `insights/metrics/sales.ts`, `invoice-access.ts` (`invoiceScopeSql`), `order-access.ts`.
  - `invoice-write.handlers.ts` (`InvoiceSendHandler`), `payment-effects.ts`, `campaign-metric.handlers.ts`.
  - `crm/actions/contact-bulk.handler.ts` + `crm/jobs/contact-bulk.processor.ts` (mẫu bulk ≤ 50 / job).
  - `features/invoices/*` (mẫu ListPage + DataTable + ListPager D42).

## APPLICABLE STANDARDS
- [plans/COMMERCE-DECISIONS.md](../plans/COMMERCE-DECISIONS.md) §4 / §4b / §5 / §8b — tiền, đơn sàn, đề nghị ≠ hoá đơn GTGT, nhắc T-1 / T+1 / T+7, doanh số theo người tạo.
- [actions/action-registry](../standards/actions/action-registry.md) — bulk ≤ 50 chạy ngay / job, preview kèm số bản ghi, risk send.
- [api/response-envelope](../standards/api/response-envelope.md) — `{ data, meta }`, tiền chuỗi VND, page + limit (D42).
- [authz/rbac-permissions](../standards/authz/rbac-permissions.md) — `invoice.manage` + scope sales; không cấp quyền mới.
- [database/tenant-db](../standards/database/tenant-db.md) · [database/indexing](../standards/database/indexing.md) — composite `=` trước range / sort, INCLUDE, deferred join, partial, EXPLAIN 100k.
- [domain/money-time-numbering](../standards/domain/money-time-numbering.md) — BigInt, giờ workspace, mã `TT-`.
- [domain/concurrency](../standards/domain/concurrency.md) · [domain/state-machine](../standards/domain/state-machine.md) — nhắc không đổi trạng thái, biên nhận từng đề nghị.
- [events/outbox](../standards/events/outbox.md) · [channels/omnichannel-adapter](../standards/channels/omnichannel-adapter.md) — tin nhắc qua outbox + rate limit kênh.
- [ui/frontend-structure](../standards/ui/frontend-structure.md) · [ui/prototype-parity](../standards/ui/prototype-parity.md) (D42 bảng) · [ui/interaction-patterns](../standards/ui/interaction-patterns.md) · [i18n/i18n](../standards/i18n/i18n.md).
- [ai/generative-ui](../standards/ai/generative-ui.md) — gợi ý AI trong drawer theo luật, không giả model.
- [code/file-size-module-layout](../standards/code/file-size-module-layout.md) · [code/testing](../standards/code/testing.md).

## Rà trước khi làm
1. Đọc mọi file trong manifest trên `origin/dev` mới nhất (026c đã tích hợp). Chạy `python -X utf8 tools/obligations/manifests.py 032e`.
2. Xác nhận các định nghĩa trên dữ liệu demo, ghi vào report:
   - `paid_total` của đơn = Σ khoản thu dương (kể cả `points`?).
   - Hoàn tiền ghi ở `refunded_total` + khoản thu âm.
   - Đề nghị lẻ (không `order_id`) tồn tại.

   Lệch DC-902 (a) thì sửa TIP trước khi code.
3. Kiểm `campaign_recipient` có `sent_at` + `outcome = 'accepted'` + index `campaign_recipient_contact_sent_idx`, để suy Marketing lúc tạo đơn không quét toàn bảng.
4. Kiểm 016b đã có `/nav/badges` (TIP chờ thì 032e chỉ khai thêm khoá `finance` vào service của 016b, không dựng endpoint thứ hai).

## TASK
Dựng màn **Tài chính** theo prototype.
- Màn chỉ đọc: một dòng là một đơn (gộp các đề nghị thanh toán của đơn) hoặc một đề nghị lẻ. Có trạng thái Đã thu đủ / Quá hạn / Đã cọc / Còn nợ, hoạt động Bán mới / Gia hạn / Marketing, lọc Nhóm, kỳ, 4 KPI và drawer khách 360° · Tài chính.
- Thêm **nhắc thanh toán hàng loạt** đi qua đường nhắc của `invoice.send_payment_qr`.
- Nối các lối vào: rail + badge, nút "Công nợ", thẻ Công nợ 360°, chip "⚠ Nợ" Hộp thư, bước 4 chuỗi cơ hội.
- Không ghi thu tiền ở màn này.

## SPECIFICATIONS

### 1. Dữ liệu (migration tenant `20261112110000_finance_rows`)
1. `order.activity` enum `order_activity` = `new · renewal · marketing` (mặc định `new`) + `order.campaign_id uuid null`. Hai cột chụp lúc tạo trong `insertOrder`, bất biến (không action nào sửa).
2. **Luật suy** (DC-902 c, theo thứ tự). Hàm `activityOf(tx, input)` ở `sales/finance/activity.ts` dùng chung handler và migration:
   1. `renewal`: đơn từ hợp đồng có `renewal_of_id`, hoặc `order.opportunity_id` → cơ hội `source_kind = 'renewal'`.
   2. `marketing`: cơ hội nguồn `campaign` (lấy `campaign_id` của cơ hội); hoặc khách có `campaign_recipient` `outcome='accepted'` với `sent_at` trong `ATTRIBUTION_WINDOW_DAYS` (7) trước lúc tạo. Lấy người nhận gần nhất, cùng luật `campaign.record_metric`, lưu `campaign_id`.
   3. còn lại `new`. Đơn sàn / POS giữ `new`.
3. Migration điền `activity` / `campaign_id` cho đơn cũ bằng cùng luật trên dữ liệu hiện có (SQL tương đương, ghi số đơn mỗi loại vào report).
4. **Index** (indexing.md, EXPLAIN trong report):
   - `"order" (created_at DESC, id DESC) INCLUDE (contact_id, team_id, owner_user_id, total, paid_total, refunded_total, points_used, activity) WHERE deleted_at IS NULL AND status <> 'cancelled'` (dùng lại `order_live_recent_idx` nếu đã phủ, chỉ thêm INCLUDE).
   - `"order" (team_id, created_at DESC) WHERE deleted_at IS NULL AND status <> 'cancelled'`.
   - `invoice (order_id, status, due_date) INCLUDE (amount, paid_amount, sent_at) WHERE order_id IS NOT NULL`.
   - `invoice (created_at DESC, id DESC) INCLUDE (contact_id, team_id, amount, paid_amount, due_date, status) WHERE order_id IS NULL AND status <> 'void'`.
   - Partial `invoice (due_date) WHERE status IN ('sent','partial','overdue')` (badge + Quá hạn).
   - Tìm không dấu dùng index trigram sẵn có trên `contact` (biểu thức `f_unaccent(lower(...))`).

### 2. Đọc — `sales/finance/` (service + repo + view, mỗi file ≤ 400 dòng)
1. **Dòng** (DC-902 a, b):

   | Loại | Điều kiện | Tổng | Đã thu (trong đó cọc) | Điểm | Còn nợ | Hạn | Ngày xuất | Hoàn thành DV |
   |---|---|---|---|---|---|---|---|---|
   | `order` | chưa xoá, không huỷ, không thu qua sàn (đơn `marketplace` có thanh toán "qua sàn" — §4b) | `total` | Σ `customer_payment` confirmed dương kind ≠ `points` (`order_id` hoặc qua `invoice.order_id`); cọc = phần kind `deposit` | `points_used` | max(0, total − đã thu − điểm) | min `due_date` của đề nghị `sent · partial · overdue` của đơn; không có → null | min `sent_at` của đề nghị; chưa gửi → ngày tạo đơn | `completed_at` |
   | `invoice` | `order_id` null, không `void`, không `draft` | `amount` | `paid_amount` − phần điểm | phần `points` | max(0, amount − paid_amount) | `due_date` | `sent_at` | — |

   - Đã hoàn hiển thị riêng ("đã hoàn {x}") và không mở lại công nợ (COMMERCE §5, giống `customer-debt.ts`).
   - Đơn chưa có đề nghị: trạng thái theo §2.2, cột chứng từ "Chưa có đề nghị thanh toán" + nút tạo (mở form `invoice.create` điền sẵn đơn — action có sẵn).
2. **Trạng thái**, xét theo thứ tự: còn nợ = 0 → `paid` (Đã thu đủ); có hạn và hạn < hôm nay (giờ workspace) → `overdue` (Quá hạn); đã thu > 0 và mọi khoản thu là `deposit` → `deposit` (Đã cọc); còn lại → `debt` (Còn nợ).
   - Một hàm `financeStatusOf` ở `packages/shared/src/sales/finance-state.ts`, dùng chung server / mock / web.
3. **Số ngày** ("Đếm ngày" — `basis`):
   - `due` (mặc định): hạn − hôm nay; quá hạn hiển thị số dương "ngày quá hạn"; đã thu đủ "Đã thu xong".
   - `issued`: hôm nay − ngày xuất.
   - `done`: hôm nay − hoàn thành DV; chưa hoàn thành thì "Chưa hoàn thành".
   - Màu theo prototype qua token: đỏ khi quá hạn / > 30 ngày, cam khi ≤ 3 ngày / > 7 ngày, xanh khi còn lại.
4. **Nhắc gần nhất:** mục cuối `reminders_sent` của mọi đề nghị trong dòng (tay + tự động), hiển thị "{kênh} · {ngày}". Không có thì "—".
5. **Kỳ** (`period`): `this_month` (mặc định) · `last_month` · `this_quarter` · `this_year` · `custom (from, to)` theo giờ workspace.
   - **Doanh số** = Σ tổng dòng tạo trong kỳ.
   - **Đã thu** = Σ khoản thu confirmed dương kind ≠ `points` có `paid_at` trong kỳ (gộp; dòng phụ "đã hoàn trong kỳ"; Insights `sales.collected` vẫn là thu ròng).
   - **Còn nợ** / **Quá hạn** = mọi kỳ (Σ còn nợ của mọi dòng còn nợ / của dòng `overdue`).
   - Danh sách + chip đếm = dòng tạo trong kỳ ∪ dòng còn nợ ngoài kỳ (gắn nhãn "kỳ trước").
   - Ghi chú dưới KPI: "{n} giao dịch · bán mới, gia hạn, marketing" / "{n} khách đã cọc" / "{n} khách" / "{n} khách cần nhắc".
6. **Lọc:**
   - `q`: tìm không dấu trên tên khách, SĐT, email, mã đơn / mã `TT-`, nội dung, tên chiến dịch, người phụ trách.
   - `team_id`: "Tất cả đơn vị" + danh sách Nhóm (D60 #6) theo `team_id` của đơn / đề nghị.
   - `activity`; `status` (chip: Tất cả · Đã thu đủ · Đã cọc · Còn nợ · Quá hạn, mỗi chip có số đếm theo bộ lọc khác); `basis`; `period`.
   - Phân trang `page` + `limit` (D42, 9 bảng + bảng mới dùng `DataTable` + `ListPager`, mặc định 20).
   - Sắp: quá hạn nhiều ngày nhất trước, rồi hạn gần, rồi ngày tạo DESC.
   - Truy vấn hai bước (deferred join):
     1. Chọn id dòng theo scope + lọc + sắp + LIMIT/OFFSET (union đơn / đề nghị lẻ, cột gọn).
     2. Join lấy payload, khoản thu, nhắc, khách, chiến dịch cho đúng N dòng.

     Không N+1.
7. **Quyền:**
   - `invoice.manage` + scope sales từng dòng: đơn theo `orderScopeSql`, đề nghị theo `invoiceScopeSql`, như `/v1/invoices`.
   - Sales scope `own` chỉ thấy dòng của mình. CSKH (`sales: none`) không thấy màn.
   - Không quyền thì 403 và rail ẩn mục. Không cấp quyền mới.
8. **API:**
   - `GET /v1/finance/rows?period=&from=&to=&q=&team_id=&activity=&status=&basis=&page=&limit=` → `{ data, meta: { total, page, limit, counts: {all, paid, deposit, debt, overdue}, kpis: {booked, collected, refunded, debt, overdue, n_rows, n_deposit, n_debt, n_overdue} } }`.
   - `GET /v1/finance/customers/:contactId` → drawer §2.9.
   - Action đọc `finance.list` / `finance.customer` (risk read, `invoice.manage`, agentGrantable true, skill: true) cho Trợ lý / agent, cùng service.
9. **Drawer khách 360° · Tài chính** (`GET /v1/finance/customers/:contactId?row=`):
   - Đầu drawer: khách (tên, SĐT, email, giai đoạn, hạng loyalty, điểm, phụ trách). Bốn nút:
     - Nhắn tin: mở Hộp thư hội thoại của khách.
     - Gọi điện: ẩn (D07).
     - ZBS: "Sắp có".
     - Email nhắc.
   - **Tổng quan:** tổng / đã thu / còn nợ của dòng đang chọn, thanh % đã thu, cọc, số ngày + hạn.
     - "Giao dịch hiện tại": hoạt động, nội dung / chiến dịch, mã chứng từ mở drawer đơn / đề nghị, ngày xuất, hạn, hoàn thành DV.
     - "Khách hàng": tổng chi tiêu = Σ đơn hoàn tất + đề nghị lẻ đã thu; số giao dịch; hạng; điểm.
     - "Trợ lý AI gợi ý": **luật xác định** theo trạng thái, `source: 'rule'`, không gọi model:
       - Quá hạn: gọi / nhắc kèm VietQR.
       - Đã cọc: nhắc trước hạn 3 ngày.
       - Còn nợ: nhắc nhẹ trước hạn.
       - Đã thu đủ: gợi ý "Tạo cơ hội tái mua" → mở `contact_opportunity.create` nguồn `renewal` (026c).
       - Khi gợi ý nhắc ZBS (chưa có) thì đổi thành email.
   - **Giao dịch:** mọi dòng Tài chính của khách (kể cả đã thu đủ / huỷ đánh dấu), keyset 20.
   - **Nhắc nợ:** dòng thời gian, gồm đề nghị gửi (`sent_at`), khoản thu (cọc / thanh toán), mục `reminders_sent`, hoàn tiền.
   - Cùng quyền với §2.7. Khách ngoài scope thì 404.
10. **Badge rail** `finance` = số dòng `overdue` trong scope người xem. Khai vào service `/nav/badges` của 016b: COUNT có index, cache 15s theo user như 016b. Invalidate qua event `invoice.overdue` / `payment.confirmed` / `invoice.sent` sẵn có.

### 3. Nhắc thanh toán hàng loạt
1. Action **`invoice.bulk_remind`** (`packages/actions/src/finance.ts`):
   - risk `send`, `bulk: true`, quyền `invoice.manage`, **agentGrantable false**.
   - Input `{ rows: [{ kind: 'order' | 'invoice', id }] (1–5000), channel: 'email' }`.
   - Preview bắt buộc: số khách, số đề nghị, bỏ qua theo lý do, nội dung mẫu của dòng đầu.
   - ≤ 50 dòng chạy ngay và trả kết quả từng dòng `{ id, status: done | skipped | failed, invoice_id?, error }`. > 50 dòng: 202 `data_job` kind `invoice.bulk_remind` (biên nhận từng dòng, mẫu `contact.bulk_update`).
   - `Idempotency-Key` bắt buộc (risk send).
2. **Mỗi dòng nhắc MỘT đề nghị:** đề nghị đã gửi còn mở (`sent · partial · overdue`) có hạn sớm nhất của dòng. Bỏ qua dòng theo lý do:
   - Chỉ có nháp / chưa có đề nghị → `no_sent_request`.
   - Đã thu đủ → `paid`.
   - Khách thiếu email → `no_email`.
   - Ngoài scope → `forbidden`.
3. Gửi bằng **đường nhắc của `invoice.send_payment_qr`**:
   - Tách `remindOne(ctx, tx, invoice, channel, now)` ra `sales/finance/remind.ts` (dùng `invoiceText(...,'remind')` + `postInvoice` + ghi `reminders_sent {key:'manual', at, channel, by}`).
   - `InvoiceSendHandler` gọi lại hàm này cho nhánh "đã gửi → nhắc", để không có đường thứ hai.
   - Kênh email: tạo / dùng hội thoại email của khách (`customerConversation`).
   - Tin đi qua outbox + hàng gửi kênh (rate limit chung).
   - Mỗi đề nghị một transaction riêng (khoá đề nghị). Lỗi một dòng không chặn dòng khác.
4. **Kênh:**
   - Email: chọn được.
   - Zalo ZBS: "Coming soon" (khoá, title "Zalo ZBS sắp ra mắt").
   - Zalo cá nhân: không gửi hàng loạt (rủi ro khoá tài khoản, D05). Nhắc lẻ vẫn qua nút gửi của màn Đề nghị thanh toán.
5. **Modal "Gửi nhắc thanh toán":**
   - Kênh; người nhận (khách, email, còn nợ); tiêu đề "Nhắc thanh toán đề nghị {TT-…}".
   - Nội dung xem trước theo mẫu chữ server (`serverMessages.sales.invoice.remind / remindOverdue` — cùng chữ thật sẽ gửi, kèm mã chuyển khoản / VietQR), ghi chú "Mỗi khách nhận nội dung theo đề nghị của mình".
   - Nút "Gửi email (n)". Gửi xong: toast "Đã gửi email nhắc thanh toán cho n khách hàng" + cập nhật cột "Nhắc gần nhất" (invalidate).
   - Biên nhận từng dòng hiện trong modal khi có bỏ qua / lỗi.
6. **Agent / tác vụ:** không gọi được bulk (agentGrantable false). Nhắc lẻ qua `invoice.send_payment_qr` như hiện tại, luôn qua duyệt nếu ngoài hội thoại đang phục vụ (policy §3.3).
7. Footer màn: "Nhắc nợ tự động: T-1 / T+1 / T+7 qua kênh đã gửi đề nghị" (COMMERCE §5) thay câu "Nhắc nợ tự động chạy bằng mục Quy trình" của prototype (Quy trình ẩn — D19).

### 4. Giao diện
1. **Route + rail:**
   - `apps/web/src/app/(app)/finance/page.tsx` (≤ 120 dòng) render `features/finance/screens/FinanceScreen`.
   - `nav-config.ts`: `NavKey 'finance'`, `RAIL_ITEMS` sau `customers` (thứ tự prototype: Tổng quan · Trợ lý · Hộp thư · Khách hàng · **Tài chính** · Hỗ trợ · Marketing · Lịch hẹn · AI Agents), icon `ic-dollar`, quyền `invoice.manage`, `badge: 'finance'`.
   - `NavItem.badge` union thêm `'finance'`. `nav-config.test.ts` cập nhật.
2. **`features/finance/`:**
   - `screens/FinanceScreen.tsx` (orchestrator ≤ 250).
   - `components/`: `FinanceKpis`, `FinanceFilters`, `StatusChips`, `BulkBar`, `FinanceTable` (cột `columns.tsx`), `RowMenu`, `FinanceCustomerDrawer` + 3 tab con, `RemindModal`.
   - `hooks/`: `useFinanceRows`, `useFinanceFilters` (URL query), `useBulkRemind`.
   - `api.ts`, `types.ts`, `ui-commands.ts` (`filter:finance`, `open:finance.customer`), `finance-store.ts`, `styles/`, `index.ts`.
   - Bảng theo D42: cuộn trong khung, header dính, `ListPager` có số trang.
   - Chọn nhiều chỉ trên dòng còn nợ ("Chọn tất cả khách còn nợ").
   - Menu ⋯: Xem hồ sơ 360° · Nhắn tin · Gửi Zalo ZBS (Coming soon) · Gửi email (soạn email `EmailComposeModal` có sẵn, điền khách).
3. **Lối vào khác:**
   - **Màn Đề nghị thanh toán:** nút "Công nợ" ở header `InvoicesScreen.tsx` → `/finance?status=overdue`.
   - **Thẻ "⚠ Công nợ · Tài chính"** Hồ sơ 360° (`shared/finance/DebtCard.tsx`, mount trong `Overview360.tsx` sau hành trình):
     - Còn nợ + mã chứng từ + nội dung, thanh đã thu, "Đã thu x / y (cọc) · hạn · còn n ngày".
     - Nút "Gửi email nhắc" (mở `RemindModal` cho dòng đó) và "Xem ở Tài chính ›" (`/finance?q=<tên khách>`).
     - Dữ liệu = dòng còn nợ gần hạn nhất của khách. Không có nợ, hoặc người xem thiếu `invoice.manage`, thì ẩn thẻ.
   - **Chip "⚠ Nợ {còn nợ rút gọn}"** Hộp thư (`ChatHeader.tsx` + `ConvRow.tsx`) dùng `debtOf` một truy vấn cho cả trang (`inbox/services/view.ts`). Thiếu quyền thì không hiện chip.
   - **Bước 4 chuỗi cơ hội** (026c `OpportunityChain`): đổi đích sang `/finance?q=<khách>`.
4. **Trạng thái UI:** rỗng ("Không có khách hàng phù hợp."), đang tải, lỗi, không quyền (RouteGuard), gửi đang chạy / job (link Việc dữ liệu), mobile 390 (bảng chuyển thẻ theo D42 / interaction-patterns, drawer toàn màn), vi + en, token theme.
5. **Parity:**
   - `capture.ts` gỡ `'Tài chính'` khỏi `OUT_LABELS` (026c thêm) **cùng commit** thêm mục rail.
   - Thêm entry `finance:list`, `finance:drawer`, `finance:remind`, `customers:360-debt` vào `tools/parity/modules/finance.ts`.
   - Chạy `pnpm parity finance:list finance:drawer finance:remind customers:360-debt inbox:default invoices:list` + `pnpm parity --done` (đổi rail dùng chung).
   - Mask có mã:
     - "HD-" → "TT-" (COMMERCE §5, mức 4).
     - Nút Gọi điện ẩn (D07).
     - Footer nhắc tự động (COMMERCE §5 / D19).
     - Kỳ thời gian thêm vào hàng lọc (D60 #7, mức 3 đã duyệt).
     - Lọc Nhóm thay cây đơn vị (D60 #6).

### 5. Lỗi
- 403: thiếu `invoice.manage`.
- 404: khách / dòng ngoài scope.
- 422: `period` / `basis` / `status` lạ; `from > to`; `rows` rỗng / > 5000; `channel` khác email.
- 409: idempotency khác input.
- Bulk: dòng lỗi trả trong kết quả (không 500 cả lô); job theo dõi ở Việc dữ liệu.
- Kênh email chưa cấu hình (tenant mail 012c): lỗi `channel_unavailable` từng dòng + banner "Chưa kết nối email gửi".

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given đơn 18,5tr có đề nghị cọc 10tr đã thu (kind deposit) hạn 27/07 và hôm nay 26/07, when mở Tài chính, then một dòng: tổng 18.500.000đ, đã thu 10.000.000đ (cọc), còn nợ 8.500.000đ, "Đã cọc", "1 ngày còn lại"; qua 28/07 → "Quá hạn · 1 ngày quá hạn" | integration `finance.test.ts` (đồng hồ cố định) + unit `finance-state.test.ts` |
| 2 | Given đơn có 2 đề nghị (một đã thu, một chưa gửi), đề nghị lẻ không đơn, đơn huỷ, đơn sàn thu qua sàn, đề nghị void, when liệt kê, then đúng 2 dòng (đơn + đề nghị lẻ); đơn dùng 500.000đ điểm → còn nợ trừ điểm, đã thu không cộng điểm; hoàn tiền hiện "đã hoàn", không mở lại nợ | integration theo dữ liệu thật |
| 3 | Given đơn từ hợp đồng gia hạn, đơn trong 7 ngày sau tin chiến dịch đã gửi, đơn thường, when tạo, then `activity` = Gia hạn / Marketing (+ tên chiến dịch) / Bán mới, bất biến; migration điền đúng cho đơn cũ | integration `finance-activity.test.ts` + migration test |
| 4 | Given kỳ "Tháng này" và nợ cũ từ tháng trước, when xem KPI, then Doanh số / Đã thu chỉ trong kỳ, Còn nợ / Quá hạn gồm nợ cũ, dòng cũ hiện nhãn "kỳ trước"; chip đếm khớp bộ lọc Nhóm + hoạt động + tìm không dấu ("chi lan" khớp "Chị Lan") | integration + E2E |
| 5 | Given sales scope own và kế toán scope all, when xem Tài chính / drawer / badge, then sales chỉ thấy dòng của mình, CSKH không có mục rail và API 403; badge = số dòng quá hạn trong scope | integration quyền + `nav-badges.test.ts` mở rộng |
| 6 | Given chọn 3 dòng (1 có đề nghị đã gửi, 1 chỉ có nháp, 1 khách thiếu email), when "Gửi email nhắc nợ", then preview đúng số / lý do bỏ qua; gửi → 1 done, 2 skipped (`no_sent_request`, `no_email`); `reminders_sent` thêm `manual` + cột "Nhắc gần nhất" đổi; tin đi qua outbox một lần (retry cùng key không gửi lần hai) | integration `finance-remind.test.ts` + outbox assertion |
| 7 | Given chọn 120 dòng, when gửi, then 202 job, biên nhận từng dòng, quyền kiểm lại từng dòng lúc chạy; agent gọi `invoice.bulk_remind` → bị chặn (không agentGrantable) | integration job + registry test |
| 8 | Given 100k đơn / 150k đề nghị / 300k khoản thu, when trang 1 (20 dòng) có lọc + KPI + chip, then truy vấn id-first + join N dòng, index seek theo `team_id` / `created_at` / `due_date`, KPI ≤ 3 truy vấn gộp, không N+1 | EXPLAIN ANALYZE dán report + đếm truy vấn |
| 9 | Given Hồ sơ 360° khách còn nợ và Hộp thư, when mở, then thẻ "⚠ Công nợ" + chip "⚠ Nợ 8,5tr" đúng số `customer-debt`; người thiếu `invoice.manage` không thấy; "Xem ở Tài chính ›" mở màn lọc theo khách; nút "Công nợ" ở màn Đề nghị → lọc Quá hạn | E2E mock + http |
| 10 | Given màn Tài chính / drawer / modal, when so prototype 1440×900, then < 5% sau mask có mã; rail mới không làm lệch màn khác (`parity --done`); mobile 390; vi/en | `pnpm parity …` + `pnpm parity --done` + `pnpm i18n:check` |

### Commands / evidence gate
- Cổng commit (D59): `pnpm turbo run lint typecheck test --filter=@appchat/{shared,actions,db,core,web}` · `pnpm depcheck` · `pnpm lint:size` · `pnpm lint:tokens` · `pnpm i18n:check`.
- Migration: `pnpm --filter @appchat/db run db:generate` → `db:migrate-tenants` → `db:setup`. Template DB phải có `20261112110000_finance_rows`.
- Integration: `pnpm --filter @appchat/api test:integration -- test/integration/finance.test.ts test/integration/finance-activity.test.ts test/integration/finance-remind.test.ts test/integration/nav-badges.test.ts test/integration/payments.test.ts`.
- Unit: `pnpm --filter @appchat/shared test -- src/sales/finance-state.test.ts` · `pnpm --filter @appchat/core test -- test/finance-rows.test.ts`.
- Web: `pnpm --filter @appchat/web exec vitest run src/features/finance` · `pnpm e2e finance` · `pnpm e2e:http finance`.
- Kênh email thật cần tenant mail (012c) / Brevo (Q-004). Thiếu thì ghi "chưa nghiệm thu với provider thật".

## CONSTRAINTS
- **DO NOT:**
  - Ghi khoản thu / đổi trạng thái đề nghị ở màn này.
  - Cộng điểm vào "đã thu".
  - Đưa đơn sàn thu hộ thành công nợ.
  - Hiện "Hóa đơn HD-".
  - Nhắc qua wizard Marketing.
  - Gửi hàng loạt qua Zalo cá nhân.
  - Mở endpoint badge thứ hai.
  - Thêm cây tổ chức / KPI / Quy trình.
  - Dồn logic vào `invoices-read.service.ts` / `invoice-write.handlers.ts` (chỉ facade 1–2 dòng).
  - Đổi `sales.booked` / `sales.collected` của Insights.
- **REUSE:**
  - `invoiceScopeSql` / `orderScopeSql`, `customer-debt.ts` (`debtOf`, `customerDebt`), `invoiceText` / `postInvoice` / `customerConversation`.
  - `serverMessages.sales.invoice`, `createJob` / `registerDataJobKind` (mẫu `contact.bulk_update`).
  - `/nav/badges` (016b), `DataTable` + `ListPager` + `EntityDrawer` + `ModalShell`, `EmailComposeModal`, `fmt` / `createFmt`, `ATTRIBUTION_WINDOW_DAYS`.
- **SKIP:**
  - ZBS thật (P2).
  - Gọi điện (D07).
  - Kanban Pipeline / Hẹn gọi lại (D60 #8–9).
  - Hoá đơn điện tử (P2).
  - Báo cáo doanh thu theo cây đơn vị (ngoài phạm vi).

## Quality Gate
- [x] Manifest chính xác; giao file khai hai phía bằng `manifests.py --sync 026c 032e`; `--check` / `--order` sạch.
- [x] Luật tiền giữ: đề nghị ≠ hoá đơn GTGT, mã `TT-`, nhắc T-1 / T+1 / T+7 + nhắc tay cùng một đường, doanh số theo người tạo; không quyền mới.
- [x] 10 AC Given/When/Then có bằng chứng chạy thật; provider thiếu ghi trung thực.
- [x] Ranh giới với Call Center / billing: Tài chính chỉ tiền thương mại của tenant (đơn / đề nghị / khoản thu); không đụng `credit_ledger` / CreditMeter (D09, 019b).
- Gap đã khai:
  - Đề nghị nháp không tính vào công nợ nên không nhắc.
  - "Ngày xuất" của dòng đơn = lần gửi đề nghị đầu tiên.
  - Kỳ "Tháng này" theo giờ workspace.
  - Chưa chạy runtime (pha docs).

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Implement đúng `Files touched` (manifest), không thêm file ngoài scope; module `sales/finance/` mỗi file ≤ 400 (BE) / FE ≤ 250 (trần 400).
- [ ] Mọi AC 1–10 PASS. Ghi kết quả từng AC, dán output thật, không "pass" chung chung.
- [ ] **Action-first (BUILDER-HANDOFF):** nhắc hàng loạt là action `invoice.bulk_remind` qua `ActionExecutor` (preview + Idempotency-Key, risk send). Nhắc lẻ và hàng loạt dùng chung `remindOne`. FE chỉ `useAction(id).run(input)`. Màn chỉ đọc.
- [ ] **Tenant DB + scope:** chỉ `TenantDbResolver`, mọi list / get / badge áp `invoiceScopeSql` / `orderScopeSql`. Migration chạy CẢ `db:generate` → `db:migrate-tenants` → `db:setup`.
- [ ] **Luật COMMERCE đã chốt không đổi:** "Đề nghị thanh toán TT-" (không phải hoá đơn GTGT), hạn 7 ngày + nhắc T-1 / T+1 / T+7, điểm không phải tiền thu, hoàn tiền không mở lại nợ.
- [ ] Deferred join + index + EXPLAIN 100k dán report; badge COUNT có index.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA.

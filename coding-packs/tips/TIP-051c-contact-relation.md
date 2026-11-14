# TIP-051c — Loại liên hệ: Khách hàng / Ứng viên / Đối tác / Nhà cung cấp; phễu và chứng từ bán hàng chỉ cho Khách hàng (D64)

## HEADER
- **Parallel-safe with TIP-051b (coverage-closure manifest):** sequential, shares `apps/api/test/integration/actions/lead_routing.apply.action.test.ts`, `packages/core/src/crm/routing/routing-apply.handler.ts`; integrate 051b before051c.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/customers/columns.tsx`, `apps/web/src/features/customers/types.ts`, `apps/web/src/features/inbox/components/ChatHeader.tsx`, `apps/web/src/features/inbox/components/Overview360.tsx`, `apps/web/src/shared/api/mock/domains/customers.ts`, `packages/actions/src/index.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/opportunities/write.handlers.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/core/src/inbox/services/view.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/orders/actions/order-from-appointment.handler.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `packages/shared/src/api/crm.ts`, `packages/shared/src/api/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 026c before051c.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ChatHeader.tsx`, `apps/web/src/features/inbox/components/Overview360.tsx`, `apps/web/src/shared/api/mock/domains/customers.ts`, `packages/actions/src/index.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/core/src/inbox/services/view.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/payments/actions/invoice-write.handlers.ts`, `packages/shared/src/api/crm.ts`, `packages/shared/src/api/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 032e before051c.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/crm/crm.module.ts`, `packages/db/prisma/tenant/crm.prisma`, `tools/parity/parity.manifest.ts`; integrate 042b before051c.
- **Parallel-safe with TIP-046 (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 051c before046.
- **Parallel-safe with TIP-051 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 051 before051c.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/insights/actions/follow-up.handlers.ts`, `packages/core/src/insights/services/follow-ups.ts`; integrate 003c before051c.
- **Parallel-safe with TIP-003e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003e before051c.
- **Parallel-safe with TIP-003f (coverage-closure manifest):** sequential, shares `apps/web/src/features/customers/components/ContactFormModal.tsx`; integrate 003f before051c.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 004b before051c.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 012b before051c.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 012c before051c.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 013b before051c.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/db/prisma/tenant/crm.prisma`; integrate 013c before051c.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 014b before051c.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `tools/parity/parity.manifest.ts`; integrate 014c before051c.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `apps/api/src/http/crm/contacts.controller.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/customers/api.ts`, `apps/web/src/features/customers/types.ts`, `apps/web/src/shared/api/mock/domains/customers.ts`, `packages/actions/src/index.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/db/prisma/tenant/crm.prisma`, `packages/shared/src/api/crm.ts`, `tools/parity/parity.manifest.ts`; integrate 015b before051c.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/crm/actions/contact-write.handlers.ts`, `packages/core/src/crm/services/contacts.service.ts`, `packages/core/src/inbox/services/view.ts`, `tools/parity/parity.manifest.ts`; integrate 015c before051c.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/api/src/http/crm/contacts.controller.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/customers/api.ts`, `apps/web/src/features/customers/types.ts`, `apps/web/src/shared/api/mock/domains/customers.ts`, `packages/actions/src/index.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `packages/db/prisma/tenant/crm.prisma`, `packages/shared/src/api/crm.ts`, `tools/parity/parity.manifest.ts`; integrate 015d before051c.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `apps/api/src/http/crm/contacts.controller.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/customers.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/customers.json`, `apps/web/src/features/customers/api.ts`, `apps/web/src/features/customers/crm-store.ts`, `apps/web/src/features/customers/types.ts`, `apps/web/src/shared/api/mock/domains/customers.ts`, `packages/actions/src/index.ts`, `packages/core/src/contracts/actions/contract-write.handlers.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/core/src/inbox/services/view.ts`, `packages/core/src/insights/metrics/customers.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/orders/actions/order-from-appointment.handler.ts`, `packages/core/src/sales/payments/actions/invoice-write.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `packages/db/prisma/tenant/crm.prisma`, `packages/shared/src/api/crm.ts`, `tools/parity/parity.manifest.ts`; integrate 015e before051c.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/api/src/http/crm/contacts.controller.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/customers/api.ts`, `apps/web/src/features/customers/crm-store.ts`, `apps/web/src/features/customers/types.ts`, `apps/web/src/shared/api/mock/domains/customers.ts`, `packages/actions/src/index.ts`, `packages/core/src/contracts/actions/contract-write.handlers.ts`, `packages/core/src/crm/actions/contact-write.handlers.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/core/src/inbox/services/view.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/orders/actions/order-from-appointment.handler.ts`, `packages/core/src/sales/payments/actions/invoice-write.handlers.ts`, `packages/db/prisma/tenant/crm.prisma`, `packages/shared/src/api/crm.ts`, `packages/shared/src/api/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 015f before051c.
- **Parallel-safe with TIP-015g (coverage-closure manifest):** sequential, shares `packages/core/src/crm/actions/contact-write.handlers.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/crm/stage/manual.handler.ts`, `packages/core/src/crm/stage/rules.ts`; integrate 015g before051c.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 019b before051c.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/crm/public.ts`, `tools/parity/parity.manifest.ts`; integrate 019c before051c.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 020b before051c.
- **Parallel-safe with TIP-020c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/inbox.ts`; integrate 020c before051c.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 020d before051c.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 020e before051c.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ChatHeader.tsx`, `packages/actions/src/index.ts`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 022b before051c.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `apps/api/test/integration/actions/contact.set_stage.action.test.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/contracts/actions/contract-write.handlers.ts`, `packages/core/src/crm/actions/contact-write.handlers.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/orders/actions/order-from-appointment.handler.ts`, `packages/core/src/sales/payments/actions/invoice-write.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 023b before051c.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/customers/crm-store.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023c before051c.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023d before051c.
- **Parallel-safe with TIP-023e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 023e before051c.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023f before051c.
- **Parallel-safe with TIP-023g (coverage-closure manifest):** sequential, shares `packages/core/src/insights/services/follow-ups.ts`, `tools/parity/parity.manifest.ts`; integrate 023g before051c.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `apps/api/src/http/crm/contacts.controller.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/customers/api.ts`, `apps/web/src/features/customers/components/ContactFormModal.tsx`, `apps/web/src/features/customers/crm-store.ts`, `apps/web/src/features/inbox/components/Overview360.tsx`, `apps/web/src/shared/api/mock/domains/customers.ts`, `packages/actions/src/index.ts`, `packages/core/src/contracts/actions/contract-write.handlers.ts`, `packages/core/src/crm/actions/contact-write.handlers.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/inbox/services/view.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `packages/db/prisma/tenant/crm.prisma`, `packages/shared/src/api/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 025b before051c.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/api/src/http/crm/contacts.controller.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/customers/api.ts`, `apps/web/src/features/customers/types.ts`, `apps/web/src/features/inbox/components/Overview360.tsx`, `apps/web/src/shared/api/mock/domains/customers.ts`, `packages/actions/src/index.ts`, `packages/core/src/crm/actions/contact-write.handlers.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/crm/repos/contacts.repo.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/db/prisma/tenant/crm.prisma`, `packages/shared/src/api/crm.ts`, `tools/parity/parity.manifest.ts`; integrate 026b before051c.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 027b before051c.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/contracts/actions/contract-write.handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 030b before051c.
- **Parallel-safe with TIP-030c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 030c before051c.
- **Parallel-safe with TIP-031b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/features/customers/components/CrmToolbar.tsx`, `packages/actions/src/index.ts`; integrate 031b before051c.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/contracts/actions/contract-write.handlers.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 032b before051c.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/contracts/actions/contract-write.handlers.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/orders/actions/order-from-appointment.handler.ts`, `tools/parity/parity.manifest.ts`; integrate 032c before051c.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032d before051c.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/Overview360.tsx`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 033b before051c.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/sales/orders/actions/order-from-appointment.handler.ts`, `packages/shared/src/api/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 033c before051c.
- **Parallel-safe with TIP-033d (coverage-closure manifest):** sequential, shares `packages/core/src/sales/orders/actions/order-create.handlers.ts`; integrate 033d before051c.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 034b before051c.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 034c before051c.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 034d before051c.
- **Parallel-safe with TIP-036 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 036 before051c.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/marketing/services/segments.service.ts`, `packages/shared/src/marketing/segment-filter.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before051c.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/insights/actions/follow-up.handlers.ts`, `packages/core/src/insights/metrics/customers.ts`, `packages/core/src/insights/services/follow-ups.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before051c.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before051c.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 039 before051c.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 040 before051c.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 041 before051c.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 042 before051c.
- **Parallel-safe with TIP-042c (coverage-closure manifest):** sequential, shares `packages/core/src/contracts/actions/contract-write.handlers.ts`, `packages/core/src/crm/repos/contacts.repo.ts`, `packages/core/src/crm/services/contacts.service.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/payments/actions/invoice-write.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `packages/db/prisma/tenant/crm.prisma`; integrate 042c before051c.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before051c.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/customers/columns.tsx`, `apps/web/src/features/customers/types.ts`, `packages/actions/src/index.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/repos/contacts.repo.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/db/prisma/tenant/crm.prisma`, `packages/shared/src/api/crm.ts`, `tools/parity/parity.manifest.ts`; integrate 045b before051c.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`, `packages/actions/src/crm-schemas.ts`; integrate 047b before051c.
- **Parallel-safe with TIP-047c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/crm/public.ts`; integrate 047c before051c.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/customers/columns.tsx`, `apps/web/src/features/inbox/components/Overview360.tsx`, `tools/parity/parity.manifest.ts`; integrate 047d before051c.
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 048 before051c.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/inbox.ts`; integrate 048b before051c.
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `tools/parity/parity.manifest.ts`; integrate 048c before051c.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/inbox/services/view.ts`, `packages/shared/src/api/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 048f before051c.
- **Parallel-safe with TIP-048g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 048g before051c.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 048h before051c.
- **Parallel-safe with TIP-049 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 049 before051c.
- **Parallel-safe with TIP-049d (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 049d before051c.
- **TIP-ID:** TIP-051c · **Project:** AppChat V2 · **Module:** CRM + Bán hàng + Insights · **Priority:** P0 · **Estimated:** M (1 pha)
- **Depends on:** TIP-051b (thứ tự D64) · TIP-026c (cơ hội — handler mới `crm/opportunities/write.handlers.ts`) · TIP-032e (Tài chính) và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 044, 045, 046.
- **Vì sao phụ thuộc:** chặn chứng từ phải đặt ở handler tạo báo giá / hợp đồng / đơn / đề nghị thanh toán / cơ hội. Các file này được 026c / 032e / 015* sửa → làm sau để không đè. Dashboard / segment / chia lead đã ổn định sau 042b / 032e.
- **Files touched:** [exact M/C manifest](manifests/TIP-051c-files.md). Luật "chỉ Khách hàng" gom một helper (`crm/relation/customer-guard.ts`); handler chứng từ chỉ thêm 1 dòng gọi.
- **Quyết định nguồn:** **D64** (#6) · **DC-926** · PD-910 · COMMERCE §5 / §8 (giai đoạn khách theo chứng từ — không đổi luật, chỉ áp cho Khách hàng) · DC-921 (agent là nhân viên → `contact.set_relation` agentGrantable).
- **Dòng COVERAGE nhận:** REQ-M04b (loại liên hệ) · DC-926 · PD-910.

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2`.
- **Hiện trạng (rà `origin/dev` 2026-11-14; số dòng `~` kiểm lại ở Rà):**
  - **Bảng:** `crm.prisma` — `ContactKind` (individual · business · household — **pháp nhân**, không phải vai trò) ~L5, `contact.kind` ~L94, `ContactStage` ~L13 (lead … won / lost). Không có cột loại quan hệ.
  - **Action:**
    - `packages/actions/src/crm.ts` (359): `contact.create` ~L36, `contact.update` ~L52, `contact.set_stage` ~L67 (agentGrantable true).
    - Trường chung ở `crm-schemas.ts` (37): `type` ~L10.
    - DTO `shared/api/crm.ts` (176): `type` ~L24.
  - **Giai đoạn:**
    - Kéo tay `crm/stage/manual.handler.ts` (52), UPDATE ~L49.
    - Tự động theo chứng từ `crm/stage/rules.ts`, UPDATE ~L49.
  - **Chia lead:** `crm/routing/routing-apply.handler.ts` ~L60–66 kiểm `stage = 'lead'`; khách mới từ tin vào luôn là lead.
  - **Danh sách / kanban:** `crm/repos/contacts.repo.ts` (93): `where()` ~L37–60, đếm giai đoạn ~L85–91; `board-page.ts` (65). Query string → `ContactFilter` ở `apps/api/src/http/crm/contacts.controller.ts` ~L29–40.
  - **Insights / theo dõi:**
    - `insights/metrics/customers.ts` ~L21 (khách có nguy cơ);
    - `insights/services/follow-ups.ts` ~L38 / ~L53 (khách im lặng);
    - `insights/actions/follow-up.handlers.ts` ~L41 / ~L76.
  - **Segment:** `shared/marketing/segment-filter.ts` (allowlist trường) → SQL ở `marketing/services/segments.service.ts` ~L120–133.
  - **Tạo chứng từ** (dòng có `@ActionHandler`):
    - `sales/quotes/actions/quote-write.handlers.ts` ~L76 (`quote.create`);
    - `contracts/actions/contract-write.handlers.ts` ~L30 / ~L68;
    - `sales/orders/actions/order-create.handlers.ts` ~L111 / ~L138 / ~L182;
    - `sales/orders/actions/order-from-appointment.handler.ts` ~L24;
    - `sales/payments/actions/invoice-write.handlers.ts` ~L49;
    - cơ hội sau 026c: `crm/opportunities/write.handlers.ts`.
  - **FE:**
    - `customers/columns.tsx` (92), `components/CrmToolbar.tsx` (118, `FilterSelect` ~L67–88), `ContactFormModal.tsx` (203), `crm-store.ts` (51, `filter`), `types.ts` (86).
    - Hồ sơ 360° dùng chung ở `features/inbox/components/Overview360.tsx` (146).
    - Ô chọn khách ở 5 form chứng từ (`QuoteFormModal`, `ContractFormModal`, `OrderFormModal`, `InvoiceFormModal`, `DraftFromContentModal`) đọc `contactsQuery`.
- **Key files to read first:** DC-926, PD-910, D64 · COMMERCE §5 / §8 · các file nêu trên · TIP-026c manifest (đường dẫn handler cơ hội mới).

## APPLICABLE STANDARDS
- [database/tenant-db](../standards/database/tenant-db.md) · [database/indexing](../standards/database/indexing.md) — cột mới + index partial cho danh sách mặc định (Khách hàng).
- [actions/action-registry](../standards/actions/action-registry.md) · [api/response-envelope](../standards/api/response-envelope.md) (422 `contact_not_customer`) · [events/outbox](../standards/events/outbox.md).
- [domain/state-machine](../standards/domain/state-machine.md) — giai đoạn chỉ cho Khách hàng.
- [plans/COMMERCE-DECISIONS](../plans/COMMERCE-DECISIONS.md) §5 / §8 — không đổi luật, chỉ giới hạn đối tượng.
- [ui/frontend-structure](../standards/ui/frontend-structure.md) · [ui/prototype-parity](../standards/ui/prototype-parity.md) (§6b mức 2 — PD-910) · [i18n/i18n](../standards/i18n/i18n.md).
- [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).

## Rà trước khi làm
1. Rebase `origin/dev` (051b, 026c, 032e đã merge). `python -X utf8 tools/obligations/manifests.py 051c`. Kiểm số dòng `~` và đường dẫn handler cơ hội thật sau 026c.
2. `git grep -n "@ActionHandler('\(quote\|contract\|order\|invoice\|contact_opportunity\)\.create" -- packages/core/src` → mọi handler tạo chứng từ phải gọi guard; handler mới sau ngày rà → thêm vào manifest (báo PM).
3. `git grep -n "c.stage\b\|FROM contact c" -- packages/core/src/insights packages/core/src/marketing` → mọi số liệu "khách" của dashboard / báo cáo phải lọc `relation = 'customer'`; ghi danh sách vào report.
4. Chạy `pnpm parity customers` **trước khi sửa**, lưu mốc.

## TASK
- Thêm **loại liên hệ** (`relation`) tách khỏi pháp nhân (`kind`) để doanh nghiệp quản lý ứng viên / đối tác / nhà cung cấp cùng danh bạ.
- Phễu bán hàng, giai đoạn, chia lead, báo cáo khách, segment mặc định, chứng từ bán hàng **chỉ áp cho Khách hàng**.
- Màn Khách hàng có cột + lọc "Loại", mặc định hiện Khách hàng.

## SPECIFICATIONS

### 1. Bảng (migration `20261116110000_contact_relation`)
- Enum `contact_relation ('customer','candidate','partner','supplier')`.
- Cột `contact.relation contact_relation NOT NULL DEFAULT 'customer'`. Khách cũ = `customer`, không backfill khác.
- **Index** (thay `contact_live_recent_idx` trong truy vấn mặc định, không xoá index cũ):
  - `contact_customer_recent_idx ON contact (last_interaction_at DESC, id DESC) WHERE deleted_at IS NULL AND relation = 'customer'` cho danh sách / kanban mặc định;
  - `contact_relation_recent_idx ON contact (relation, last_interaction_at DESC, id DESC) WHERE deleted_at IS NULL` khi lọc loại khác.
- Prisma `crm.prisma`: enum `ContactRelation` + field `relation`. Chạy đủ 3 lệnh ở CLAUDE.md §7.

### 2. Action + DTO
- **`crm-schemas.ts`:** `contactFields.relation: z.enum(['customer','candidate','partner','supplier']).optional()`. `contact.create` / `contact.update` / `contact.import` / bulk nhận được.
  - Đổi từ `customer` sang loại khác khi khách còn chứng từ mở (báo giá chưa chốt, hợp đồng chưa ký xong, đơn chưa hoàn tất, đề nghị chưa thu đủ) hoặc cơ hội mở → 409 `contact_has_open_sales` kèm số lượng.
- **Action mới `contact.set_relation`** (`packages/actions/src/contact-relation.ts`, đăng ký ở `actions/src/index.ts`):

  | Thuộc tính | Giá trị |
  |---|---|
  | input | `contact_id`, `relation`, `if_version?` |
  | permission | `crm.edit` + `assertInScope` ghi |
  | risk | `write` |
  | agentGrantable | `true` (DC-921 — agent là nhân viên) |
  | undo | 24h |
  | invalidates | `['crm','inbox']` |

  Handler ở `crm/relation/set-relation.handler.ts`: timeline `relation_changed`, event `contact.relation_changed`.
- **DTO** `shared/api/crm.ts`: `relation` trên dòng danh sách + Contact360. `inbox` DTO hội thoại thêm `contact_relation` (optional) để Hộp thư hiện nhãn.

### 3. Chỉ Khách hàng vào phễu
- **Helper** `crm/relation/customer-guard.ts`:
  - `assertCustomer(tx, contactId)` đọc `relation`, khác `customer` → `AppError('CONTACT_NOT_CUSTOMER', 422, { contact_id, relation })`;
  - `CUSTOMER_SQL = Prisma.sql\`c.relation = 'customer'\``.

  Export qua `crm/public.ts`.
- **Giai đoạn:**
  - `contact.set_stage` (`stage/manual.handler.ts`) gọi `assertCustomer` → 422.
  - Tự động theo chứng từ (`stage/rules.ts`): UPDATE thêm `AND relation = 'customer'`. Không áp thì trả `[]`, chứng từ vẫn chuyển.
- **Chia lead** (`routing-apply.handler.ts` ~L60–66): khách không phải `customer` → `decide('not_customer')`. Khách mới từ tin vào mặc định `customer`.
- **Chứng từ:** 1 dòng `await assertCustomer(tx, input.contact_id)` đầu `execute` + `preview` của:
  - `quote.create`;
  - `contract.create` / `contract.create_from_quote`;
  - `order.create` / `order.create_from_quote` / `order.create_from_contract` / `order.create_from_appointment`;
  - `invoice.create`;
  - `contact_opportunity.create`.

  Đơn sàn nhập (049 `order-import.ts`) **không chặn**: khách sàn tạo mới mặc định `customer`.
- **Danh sách / kanban** (`contacts.repo.ts` `where()`):
  - `ContactFilter.relation?: 'customer' | 'candidate' | 'partner' | 'supplier' | 'all'`. Vắng → `customer`. `all` → không lọc.
  - Kanban giai đoạn luôn `customer`.
  - `contacts.controller.ts` `contactFilterOf` đọc `q.relation`.
- **Insights:** `metrics/customers.ts`, `services/follow-ups.ts` (2 chỗ), `actions/follow-up.handlers.ts` thêm điều kiện `customer` (Rà #3 bổ sung chỗ khác).
- **Segment:**
  - `segment-filter.ts` thêm lá `{ field: 'relation', op: 'in' | 'not_in', value: [...] }`;
  - `segments.service.ts`: segment **không** có lá `relation` → tự thêm `relation = 'customer'` (chiến dịch không gửi nhầm ứng viên / nhà cung cấp); có lá `relation` → theo lá.
- **Ô chọn khách ở 5 form chứng từ:** `contactsQuery` mặc định `relation=customer`, không cần sửa form. Kiểm lại bằng e2e: không thấy ứng viên trong ô chọn.

### 4. UI (PD-910, mức 2)
- **Chip loại** `shared/crm-forms/RelationChip.tsx` (dùng chung customers + inbox, không import chéo feature).
- **Cột "Loại"** ở `columns.tsx` (sau Tên): chip màu theo token — Khách hàng `brand`, Ứng viên `purple`, Đối tác `blue`, Nhà cung cấp `amber`. Thẻ mobile hiện chip.
- **Lọc "Loại"** ở `CrmToolbar.tsx`: thêm 1 `FilterSelect` (Khách hàng mặc định · Ứng viên · Đối tác · Nhà cung cấp · Tất cả). `crm-store.ts` `filter.relation`.
  - Kanban ẩn lọc này (luôn Khách hàng).
  - Chọn loại khác Khách hàng → tự chuyển layout bảng.
- **Form khách** `ContactFormModal.tsx`: ô "Loại liên hệ" (mặc định Khách hàng; mở từ lọc Ứng viên thì mặc định Ứng viên).
- **Hồ sơ 360°** `Overview360.tsx`: chip loại + menu đổi loại (`contact.set_relation`, thiếu quyền ẩn). Liên hệ không phải Khách hàng:
  - ẩn khối giai đoạn / cơ hội / chứng từ;
  - nút tạo báo giá / đơn hiện tooltip "Chỉ dùng cho Khách hàng — đổi loại để tiếp tục".
- **Hộp thư:** `ChatHeader.tsx` hiện chip loại khi khác Khách hàng.
- **Mock + i18n + parity:** mock `customers.ts` + `contact-edit.ts` nhận `relation`; i18n `customers.json` / `inbox.json` vi + en; parity `customers` < 5% (cột mới mask mức 2 có mã PD-910).

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given tenant cũ, when chạy migration, then mọi khách `relation = customer`; danh sách mặc định như trước (cùng số dòng) | `packages/db/test/contact-relation-migration.test.ts` |
| 2 | Given liên hệ Ứng viên, when `quote.create` / `order.create` / `contract.create` / `invoice.create` / `contact_opportunity.create`, then 422 `CONTACT_NOT_CUSTOMER` (cả preview); đổi sang Khách hàng → tạo được | `apps/api/test/integration/contact-relation-guard.test.ts` |
| 3 | Given Ứng viên, when `contact.set_stage`, then 422; chứng từ của khách khác không đổi giai đoạn Ứng viên (rules bỏ qua) | `contact.set_stage.action.test.ts` (thêm ca) + `packages/core/test/contact-relation.test.ts` |
| 4 | Given khách còn báo giá mở, when `contact.set_relation` → `supplier`, then 409 `contact_has_open_sales`; không còn chứng từ mở → đổi được, timeline ghi, hoàn tác trong 24h | `apps/api/test/integration/actions/contact.set_relation.action.test.ts` |
| 5 | Given agent được cấp `contact.set_relation`, when gọi trong hội thoại đang phục vụ, then chạy (agentGrantable) | như AC4 (ca agent) |
| 6 | Given danh sách khách không lọc, when có Ứng viên / Đối tác, then không hiện; lọc "Ứng viên" → chỉ Ứng viên; "Tất cả" → đủ; kanban chỉ Khách hàng; EXPLAIN dùng `contact_customer_recent_idx` | `apps/api/test/integration/contacts-relation-list.test.ts` + EXPLAIN trong report |
| 7 | Given segment không có lá `relation`, when đếm / gửi chiến dịch, then chỉ Khách hàng; có lá `relation in [partner]` → chỉ Đối tác | `packages/shared/src/marketing/segment-filter.test.ts` (tạo) + `segment.preview.action.test.ts` (thêm ca) |
| 8 | Given dashboard "khách có nguy cơ" + nhắc theo dõi, when có Ứng viên im lặng, then không tính | `packages/core/test/contact-relation.test.ts` |
| 9 | Given màn Khách hàng, when chọn lọc Loại + tạo Ứng viên + mở Hồ sơ 360°, then chip / lọc / menu đổi loại đúng; form báo giá không liệt kê Ứng viên | `apps/web/e2e/customers.spec.ts` (thêm ca) + `e2e/http/customers.spec.ts` |
| 10 | Given màn `customers` | `pnpm parity customers` < 5% (mask PD-910 cho cột Loại) |

### Commands / evidence gate
- Sau migration: `db:generate` → `db:migrate-tenants` → `db:setup`; kiểm template có `20261116110000_contact_relation`.
- `pnpm turbo run lint typecheck test --filter=@appchat/{shared,actions,core,db,api,web}` · `pnpm depcheck`.
- Integration (`--workers=1`, slot Postgres): `contact-relation-guard.test.ts`, `contacts-relation-list.test.ts`, `contact.set_relation.action.test.ts`, `contact.set_stage.action.test.ts`, `lead_routing.apply.action.test.ts`.
- `pnpm e2e customers` (mock + http) · `pnpm parity customers`.

## CONSTRAINTS
- **DO NOT:**
  - đổi nghĩa `contact.kind`;
  - đổi luật giai đoạn COMMERCE §8 cho Khách hàng;
  - chặn đơn sàn nhập;
  - xoá / đổi index cũ;
  - dựng phễu tuyển dụng riêng (D64 #7 — không làm);
  - nhồi logic vào handler chứng từ quá 1 dòng gọi guard.
- **REUSE:** `assertInScope`, `lockContactVersion`, `writeTimeline`, `FilterSelect`, `contactsQuery`.
- **SKIP:**
  - phễu / giai đoạn riêng cho ứng viên / đối tác;
  - hồ sơ nhân sự;
  - nhập hàng loạt đổi loại (dùng bulk có sẵn với trường `relation`).

## Quality Gate
- [x] Dựa trên code `origin/dev` 2026-11-14; đường dẫn cơ hội theo manifest 026c (kiểm lại ở Rà #1).
- [x] Một helper chặn cho mọi chứng từ; một điều kiện cho danh sách / insight / segment.
- [x] Tenant cũ không đổi hành vi (mặc định `customer`).
- **Gap:** số liệu insights mới thêm sau ngày rà phải được Rà #3 bắt; báo cáo `reports` đang ẩn — không đụng.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Đúng manifest; handler chứng từ chỉ thêm 1 dòng.
- [ ] Đủ 3 lệnh DB và kiểm template.
- [ ] AC 1–10 có kết quả từng cái, dán output thật + EXPLAIN.
- [ ] **Action-first:** đổi loại chỉ qua `contact.set_relation` / `contact.update`; FE `useAction`.
- [ ] **Luật commerce không đổi** (giai đoạn theo chứng từ, duyệt, ký) — chỉ giới hạn đối tượng Khách hàng.
- [ ] i18n vi + en; token `@appchat/ui`; parity < 5%.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA; PR vào `dev`.

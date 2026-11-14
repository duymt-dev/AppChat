# TIP-051d — AI agent là thành viên: mục Thành viên, phòng ban ở form thành viên, bản ghi agent tạo mang phòng ban, lọc Phòng ban thật (D64, DC-927)

## HEADER
- **Parallel-safe with TIP-046 (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 051d before046.
- **Parallel-safe with TIP-051 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/core/src/authz/authz-management.providers.ts`, `packages/core/src/authz/data-access/team-snapshot.ts`, `packages/shared/src/api/settings.ts`, `tools/parity/parity.manifest.ts`; integrate 051 before051d.
- **Parallel-safe with TIP-051c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/crm/services/contacts.service.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 051c before051d.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003c before051d.
- **Parallel-safe with TIP-003e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003e before051d.
- **Parallel-safe with TIP-003i (coverage-closure manifest):** sequential, shares `apps/api/src/http/identity/settings.controller.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/identity/settings/settings-read.service.ts`; integrate 003i before051d.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `apps/api/src/http/identity/settings.controller.ts`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `packages/actions/src/settings.ts`, `packages/db/prisma/platform/identity.prisma`, `tools/parity/parity.manifest.ts`; integrate 004b before051d.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/settings.ts`; integrate 006d before051d.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `apps/web/src/shared/api/mock/domains/settings.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 012b before051d.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `apps/web/src/shared/api/mock/domains/settings.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 012c before051d.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/api/src/http/identity/settings.controller.ts`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `apps/web/src/features/settings/components/MemberModal.tsx`, `apps/web/src/features/settings/components/MembersSection.tsx`, `packages/actions/src/settings.ts`, `packages/core/src/identity/actions/member-invite.handler.ts`, `packages/db/prisma/platform/identity.prisma`, `tools/parity/parity.manifest.ts`; integrate 013b before051d.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/MembersSection.tsx`, `packages/actions/src/settings.ts`; integrate 013c before051d.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `apps/web/src/shared/api/mock/domains/settings.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 014b before051d.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 014c before051d.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 015b before051d.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/crm/services/contacts.service.ts`, `packages/core/src/support/services/tickets-read.service.ts`, `tools/parity/parity.manifest.ts`; integrate 015c before051d.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 015d before051d.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `packages/core/src/support/services/tickets-read.service.ts`, `tools/parity/parity.manifest.ts`; integrate 015e before051d.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 015f before051d.
- **Parallel-safe with TIP-017b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 017b before051d.
- **Parallel-safe with TIP-018b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 018b before051d.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 019b before051d.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 019c before051d.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`; integrate 020b before051d.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 020d before051d.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`; integrate 020e before051d.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `apps/web/src/shared/api/mock/domains/settings.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 022b before051d.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `apps/api/test/integration/actions/member.invite.action.test.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/calendar.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/calendar.json`, `packages/actions/src/index.ts`, `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/identity/actions/member-invite.handler.ts`, `packages/core/src/identity/settings/settings-read.service.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `packages/core/src/support/services/tickets-read.service.ts`, `tools/parity/parity.manifest.ts`; integrate 023b before051d.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/calendar.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/calendar.json`, `apps/web/src/features/calendar/calendar-store.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023c before051d.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023d before051d.
- **Parallel-safe with TIP-023e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 023e before051d.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023f before051d.
- **Parallel-safe with TIP-023g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/calendar.json`, `apps/web/messages/vi/calendar.json`, `tools/parity/parity.manifest.ts`; integrate 023g before051d.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/features/calendar/api.ts`, `apps/web/src/shared/api/mock/domains/calendar.ts`, `packages/actions/src/index.ts`, `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 025b before051d.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 026b before051d.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/calendar.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/calendar.json`, `packages/actions/src/index.ts`, `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 026c before051d.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 027b before051d.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/core/src/contracts/actions/contract-create.ts`, `tools/parity/parity.manifest.ts`; integrate 030b before051d.
- **Parallel-safe with TIP-030c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 030c before051d.
- **Parallel-safe with TIP-031b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 031b before051d.
- **Parallel-safe with TIP-031c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 031c before051d.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/shared/api/mock/domains/settings.ts`, `packages/actions/src/index.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/shared/src/api/settings.ts`, `tools/parity/parity.manifest.ts`; integrate 032b before051d.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 032c before051d.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032d before051d.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 032e before051d.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/api/src/http/booking/calendar.controller.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/calendar.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/calendar.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/calendar/api.ts`, `apps/web/src/features/calendar/types.ts`, `apps/web/src/features/settings/api.ts`, `apps/web/src/shared/api/mock/domains/calendar.ts`, `packages/actions/src/index.ts`, `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `tools/parity/parity.manifest.ts`; integrate 033b before051d.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/calendar.json`, `apps/web/messages/vi/calendar.json`, `apps/web/src/features/calendar/types.ts`, `apps/web/src/shared/api/mock/domains/calendar.ts`, `packages/actions/src/index.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `tools/parity/parity.manifest.ts`; integrate 033c before051d.
- **Parallel-safe with TIP-033d (coverage-closure manifest):** sequential, shares `packages/core/src/sales/orders/actions/order-create.handlers.ts`; integrate 033d before051d.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/core/src/support/services/tickets-read.service.ts`, `tools/parity/parity.manifest.ts`; integrate 034b before051d.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/support/services/tickets-read.service.ts`, `tools/parity/parity.manifest.ts`; integrate 034c before051d.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/support/services/tickets-read.service.ts`, `tools/parity/parity.manifest.ts`; integrate 034d before051d.
- **Parallel-safe with TIP-035c (coverage-closure manifest):** sequential, shares `apps/web/e2e/settings.spec.ts`; integrate 035c before051d.
- **Parallel-safe with TIP-036 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 036 before051d.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before051d.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/domains/calendar.ts`, `packages/actions/src/index.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before051d.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before051d.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 039 before051d.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/db/prisma/platform/identity.prisma`, `tools/parity/parity.manifest.ts`; integrate 040 before051d.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/db/prisma/platform/identity.prisma`; integrate 041 before051d.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/api/src/http/identity/settings.controller.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `apps/web/src/features/settings/components/MemberModal.tsx`, `apps/web/src/features/settings/components/MembersSection.tsx`, `apps/web/src/shared/api/mock/domains/settings.ts`, `packages/actions/src/index.ts`, `packages/actions/src/settings.ts`, `packages/core/src/authz/authz-management.providers.ts`, `packages/core/src/identity/actions/member-invite.handler.ts`, `packages/core/src/identity/services/invites.service.ts`, `packages/core/src/identity/settings/settings-read.service.ts`, `packages/shared/src/api/settings.ts`, `tools/parity/parity.manifest.ts`; integrate 042 before051d.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 042b before051d.
- **Parallel-safe with TIP-042c (coverage-closure manifest):** sequential, shares `packages/core/src/authz/data-access/team-snapshot.ts`, `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/crm/services/contacts.service.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `packages/core/src/support/services/tickets-read.service.ts`; integrate 042c before051d.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before051d.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/calendar/types.ts`, `apps/web/src/features/settings/api.ts`, `apps/web/src/features/settings/components/MembersSection.tsx`, `apps/web/src/features/settings/components/OwnershipTransferModal.tsx`, `apps/web/src/shared/api/mock/domains/settings.ts`, `packages/actions/src/index.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/identity/actions/member-invite.handler.ts`, `packages/core/src/identity/services/invites.service.ts`, `packages/core/src/support/services/tickets-read.service.ts`, `packages/db/prisma/platform/identity.prisma`, `packages/shared/src/api/settings.ts`, `tools/parity/parity.manifest.ts`; integrate 045b before051d.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 047b before051d.
- **Parallel-safe with TIP-047c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/booking/services/calendar-read.service.ts`; integrate 047c before051d.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/calendar.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/calendar.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/calendar/api.ts`, `apps/web/src/features/calendar/types.ts`, `apps/web/src/shared/api/mock/domains/calendar.ts`, `tools/parity/parity.manifest.ts`; integrate 047d before051d.
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 048 before051d.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 048b before051d.
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `apps/web/e2e/settings.spec.ts`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `tools/parity/parity.manifest.ts`; integrate 048c before051d.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 048d before051d.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 048e before051d.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 048f before051d.
- **Parallel-safe with TIP-048g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 048g before051d.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 048h before051d.
- **Parallel-safe with TIP-049 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 049 before051d.
- **Parallel-safe with TIP-049d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 049d before051d.
- **Parallel-safe with TIP-051b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 051b before051d.
- **TIP-ID:** TIP-051d · **Project:** AppChat V2 · **Module:** Cài đặt › Thành viên + Authz + Lịch hẹn · **Priority:** P0 · **Estimated:** M (1 pha)
- **Depends on:** TIP-051 (đơn vị, `team_agent`, `GET /v1/org-units`, `soleTeamOf` theo nhánh) · TIP-051c (cùng sửa handler tạo chứng từ) và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 044, 045, 046.
- **Vì sao phụ thuộc:** đọc thành viên agent từ `team_agent` của 051. Fallback đơn vị của agent nằm trong `team-snapshot.ts` (051 sửa) và 5 handler tạo bản ghi (051c thêm guard cùng file).
- **Files touched:** [exact M/C manifest](manifests/TIP-051d-files.md). `settings/types.ts` (387) không sửa; kiểu mới ở `settings/member-types.ts`. Handler tạo bản ghi chỉ thêm 1 tham số.
- **Quyết định nguồn:** **DC-927** (Chủ nhà 2026-11-14: "có đó, tính là 1 thành viên. xem prototype và đánh giá lại") · DC-921 (agent là nhân viên) · D64 · DC-924 · DC-051 (đếm ghế = thành viên active + lời mời còn hạn) · PD-911.
- **Dòng COVERAGE nhận:** DC-927 · PD-911 · D64-members.

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2`.
- **Prototype (2026-11-10):**
  - Thành viên ~L6686–6712: tìm, Lọc, Xuất CSV, Mời thành viên; bảng thành viên · vai trò · **phòng ban** · hoạt động cuối · trạng thái; chân "12 thành viên · Gói của bạn hỗ trợ tối đa 15 seat · Nâng cấp plan".
  - Hộp Mời / Sửa thành viên ~L8622–8640: Họ tên · Email · Vai trò · **Phòng ban**.
  - **AI agent có phòng ban:** `cwAgents` ~L8685–8690 (`dept` Marketing / Kinh doanh / CSKH / Vận hành); dashboard "Đội AI Agent phòng ban" ~L1424.
  - **Gói tách hai hạn mức:** "5 ghế người dùng · 2 AI Agent" … ~L11484–11490 và ~L8866–8873.
  - Lịch hẹn: bộ lọc "Phòng ban" ~L4416.
- **Code (`origin/dev` 2026-11-14; dòng `~` kiểm lại ở Rà):**
  - **Thành viên:**
    - `identity/settings/settings-read.service.ts` (167) `members()` ~L92–150: người active + lời mời; `dept` ghép từ `team_member`; trả `{ data, total, seat_limit }`.
    - DTO `shared/api/settings.ts` ~L31–49. Route `apps/api/src/http/identity/settings.controller.ts` ~L30–37 (`members.manage`).
    - FE: `MembersSection.tsx` (189) — dòng ~L29–107, nút Lọc "sắp có" ~L127, chân ~L176; `MemberModal.tsx` (83) đã bỏ ô Phòng ban (~L3); `OwnershipTransferModal.tsx` ~L29 lọc ứng viên.
    - `membersQuery` (`settings/api.ts` ~L43) cũng được `TeamEditor` / `TeamsSection` dùng (chỉ cần người).
  - **Hạn mức:** `billing/services/quota.service.ts` `limits()` trả `users` (max_users + addon) và `agents` (max_agents) riêng. Mời thành viên kiểm `users` (DC-051); tạo agent kiểm `agents` (Blueprint §5 "vượt `plan.max_agents` → PLAN_LIMIT_REACHED").
  - **Lời mời:** `member.invite` (`packages/actions/src/settings.ts` ~L35–48, `db: 'platform'`); `invites.service.ts` `accept()` ~L79–100 (transaction DB nền tảng); bảng `invite` ở `packages/db/prisma/platform/identity.prisma` ~L156–170.
  - **Bản ghi agent tạo không có đơn vị:** `actorUserId(ctx)` trả null khi actor là agent (`crm/services/access.ts` ~L64).
    - `contacts.service.ts` ~L115 `teamId: soleTeamOf(owner)` → owner null → null.
    - `checkParties` (`sales/quotes/services/quote-write.ts` ~L112) lấy phụ trách của khách. Khách chưa có phụ trách → owner null → `snapshotTeam` null.
    - Cùng mẫu ở `order-create.handlers.ts` ~L79, `contract-create.ts` ~L52, `appointment-book.handlers.ts` ~L123.
  - **Lọc Phòng ban:**
    - Lịch hẹn `CalendarHeader.tsx` ~L92–101 cứng `tech` / `care`, lọc theo `staff.team` text (`calendar-read.service.ts` ~L100).
    - Ticket `tickets-read.service.ts` ~L65–68 đọc bảng `team` (sau 051 có cả đơn vị đã lưu trữ).
  - `ai_run_agent_reply_idx (agent_id, started_at)` có sẵn — đọc "hoạt động cuối" của agent theo lô.

## APPLICABLE STANDARDS
- [authz/rbac-permissions](../standards/authz/rbac-permissions.md) · [actions/action-registry](../standards/actions/action-registry.md) · [api/response-envelope](../standards/api/response-envelope.md).
- [database/indexing](../standards/database/indexing.md) — đọc agent / hoạt động cuối theo lô, không N+1.
- [ui/frontend-structure](../standards/ui/frontend-structure.md) · [ui/prototype-parity](../standards/ui/prototype-parity.md) (PD-911 mức 2) · [ui/interaction-patterns](../standards/ui/interaction-patterns.md) · [i18n/i18n](../standards/i18n/i18n.md).
- [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).

## Rà trước khi làm
1. Rebase `origin/dev` (051, 051c đã merge). `python -X utf8 tools/obligations/manifests.py 051d`. Kiểm số dòng `~`.
2. `git grep -n "soleTeamOf(\|snapshotTeam(" -- packages/core/src` → mọi nơi tạo bản ghi có `team_id` phải truyền agent; nơi mới sau ngày rà → thêm vào manifest (báo PM).
3. Route cấu hình agent hiện là `/agents/<id>` (`apps/web/src/app/(app)/agents/[id]/page.tsx`); kiểm lại để menu dòng agent ở Thành viên trỏ đúng.
4. `pnpm parity settings:members` **trước khi sửa**, lưu mốc.

## TASK
- AI agent (đang chạy / tạm dừng) hiện là **một dòng thành viên** ở Cài đặt › Thành viên: vai trò "AI Agent", phòng ban, hoạt động cuối, trạng thái. Agent tính vào số thành viên.
- Hạn mức gói giữ hai loại như prototype: **ghế người dùng** và **AI Agent**.
- Form Mời / Sửa thành viên có lại ô **Phòng ban**.
- Bản ghi agent tạo mang **phòng ban của agent** khi không suy được từ người phụ trách.
- Bộ lọc **Phòng ban** ở Lịch hẹn / Ticket dùng đơn vị thật.

## SPECIFICATIONS

### 1. Đọc thành viên gồm agent
- `GET /v1/settings/members?q=&include_agents=1`:
  - `include_agents` vắng → như cũ (chỉ người + lời mời), để `TeamEditor` / `TeamsSection` / chọn chủ sở hữu không đổi.
  - Có → thêm dòng agent: `ai_agent` chưa xoá, `status` `active` hoặc `paused`; agent `draft` chưa phải nhân viên.
- **DTO `settingsMemberSchema` thêm:**
  - `kind: 'user' | 'agent'` (mặc định `user`);
  - `agent_status?: 'active' | 'paused'`.
- **Dòng agent:**

  | Trường | Giá trị |
  |---|---|
  | `id` | agent id |
  | `name` | tên agent |
  | `email` | `role_label` của agent (ô phụ) |
  | `role` | `'ai_agent'` |
  | `dept` | tên các đơn vị qua `team_agent` |
  | `last` | `max(ai_run.started_at)` theo lô `agent_id = ANY(...)` lọc `kind = 'agent_reply' AND NOT dry_run` để dùng partial index `ai_run_agent_reply_idx`; chưa chạy → `never` |
  | `status` | `active` → `active`, `paused` → `offline` |
  | `invite` | `false` |

- **`membersPageSchema` thêm:** `people_total`, `agent_total`, `agent_limit` (`QuotaService.limits().agents`). `total` = người + lời mời + agent khi `include_agents`.
- **Thứ tự:** Chủ sở hữu → người (theo ngày vào) → agent (theo tên) → lời mời.

### 2. Ghế và hạn mức (DC-927 b)
- Agent **không** chiếm ghế người dùng: `seat_limit` / DC-051 (đếm ghế khi mời = người active + lời mời còn hạn) giữ nguyên. Agent theo `max_agents` của gói như bảng gói prototype.
- **Chân bảng:** "{total} thành viên · {people} người · {agents} AI Agent · Gói hỗ trợ tối đa **{seat_limit} ghế người dùng** · **{agent_limit} AI Agent** · Nâng cấp plan". `null` = "không giới hạn".

### 3. Phòng ban ở form thành viên
- **Action mới `member.set_units`** (`packages/actions/src/member-units.ts`, đăng ký `actions/src/index.ts`):

  | Thuộc tính | Giá trị |
  |---|---|
  | input | `{ member: { kind: 'user' \| 'agent', id }, unit_ids: uuid[] (≤ 10) }` |
  | permission | `members.manage` |
  | risk | `config` |
  | agentGrantable | `false` |
  | undo | 24h |
  | invalidates | `['org','teams','members','me']` |

  - Handler `core/src/authz/org/member-units.handler.ts`: thay tập đơn vị của đúng người / agent đó.
  - Khoá các đơn vị liên quan theo thứ tự id, tăng `version` từng đơn vị, bump `authz_revision`, event `member.role_changed` cho người.
  - Gỡ người đang là trưởng đơn vị → 422 như `assertLead`. Đơn vị đã lưu trữ / không tồn tại → 422.
- **`member.invite`** thêm `unit_ids?: uuid[] (≤ 10)`:
  - Lưu ở `invite.unit_ids` (DB nền tảng, migration `20261116120000_invite_units`).
  - `invites.service.ts` `accept()` sau khi commit DB nền tảng: chèn `team_member` vào DB tenant cho các đơn vị còn sống (`ON CONFLICT DO NOTHING`) + bump `authz_revision`.
  - Lỗi phía tenant không làm hỏng việc nhận lời mời: ghi audit `invite.units_skipped`, người quản trị gán lại ở Thành viên / Phòng ban.
- **`MemberModal.tsx`:** ô "Phòng ban" (chọn nhiều, từ `orgTreeQuery`, hiện đường dẫn "Chi nhánh › Phòng ban").
  - Mời → `member.invite { …, unit_ids }`.
  - Sửa người → `member.set_role` (nếu đổi) + `member.set_units`.
  - Sửa agent → chỉ ô Phòng ban (Họ tên / Email / Vai trò khoá, có link "Mở cấu hình AI Agent").

### 4. UI Thành viên (PD-911, mức 2)
- **`MembersSection.tsx`** gọi `membersQuery(q, { includeAgents: true })`.
- **Dòng agent** (`MemberAgentRow.tsx` mới): avatar emoji / ảnh agent + nhãn "AI"; vai trò chip "AI Agent"; phòng ban; hoạt động cuối; trạng thái "Đang chạy" / "Tạm dừng".
  - Menu ⋯: "Đổi phòng ban" (mở `MemberModal` chế độ agent) · "Mở cấu hình AI Agent" (`/agents/<id>`).
  - Không có "Xoá" ở đây (xoá agent ở màn AI Agents).
- **Nút "Lọc"** (đang "sắp có"): Tất cả · Người · AI Agent (lọc ở client trên trang đã tải; danh sách ≤ hạn mức gói).
- **`OwnershipTransferModal.tsx`:** ứng viên loại `kind === 'agent'`.
- **Kiểu** ở `settings/member-types.ts` (`MemberRow = Member & { kind, agent_status }`); `types.ts` không sửa.
- **Mock + i18n + parity:**
  - mock `/settings/members` hỗ trợ `include_agents` + `member.set_units`;
  - i18n `settings.json` + `actions.json` vi + en;
  - `parity.manifest.ts` `settings:members` mask dòng agent + chân bảng theo PD-911.

### 5. Bản ghi agent tạo mang phòng ban của agent (DC-927 c)
- **`team-snapshot.ts`:**
  - `actorAgentId(ctx)` = `ctx.actor.type === 'agent' ? ctx.actor.id : null`.
  - `soleTeamOf(tx, userId, agentId?)`: không suy được từ người → đơn vị lá sâu nhất cùng nhánh của agent (`team_agent`), cùng luật nhánh như người (051 §4); mơ hồ → null.
  - `snapshotTeam(tx, { from, owner, agent })`: thứ tự nguồn → người phụ trách → agent → null.
- **5 nơi tạo** thêm `agent: actorAgentId(ctx)`, mỗi nơi 1 tham số: `contacts.service.ts` (`createContact`), `quote-write.handlers.ts`, `order-create.handlers.ts`, `contract-create.ts`, `appointment-book.handlers.ts`.
- Không đổi người phụ trách (agent không làm owner). Chỉ `team_id`.

### 6. Lọc Phòng ban dùng đơn vị thật
- **Lịch hẹn:**
  - Tham số mới `unit_id` → `a.team_id IN (đơn vị + con)` qua `team.path` (`calendar-read.service.ts`, `calendar.controller.ts`).
  - `CalendarHeader.tsx` lấy lựa chọn từ `unitsQuery` mới ở `apps/web/src/shared/org/units-query.ts` (đọc `/teams` đã có `kind` / `parent_id` từ 051; dùng chung, không import `features/settings`).
  - Bỏ hai lựa chọn cứng; tham số `team` cũ (`staff.team`) giữ cho tương thích, UI không dùng.
- **Ticket:** `tickets-read.service.ts` `teams()` bỏ đơn vị đã lưu trữ (1 điều kiện).

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given workspace 3 người + 2 agent (1 active, 1 paused) + 1 agent nháp, when `GET /settings/members?include_agents=1`, then 5 dòng thành viên + lời mời, agent nháp không có; `people_total` 3, `agent_total` 2, `agent_limit` theo gói; không `include_agents` → như cũ | `apps/api/test/integration/settings.test.ts` (thêm ca) |
| 2 | Given gói Team (5 ghế, 2 AI Agent) có 5 người, when có 2 agent, then mời thêm người vẫn báo hết ghế đúng 5 (agent không chiếm ghế); tạo agent thứ 3 → `PLAN_LIMIT_REACHED` `agents` | `member.invite.action.test.ts` + `agent` quota test có sẵn (chạy lại) |
| 3 | Given `member.set_units` cho người / agent, when lưu, then tập đơn vị đúng, version + revision tăng, hoàn tác 24h; gỡ trưởng đơn vị → 422 | `apps/api/test/integration/actions/member.set_units.action.test.ts` |
| 4 | Given mời kèm `unit_ids`, when người nhận lời mời, then là thành viên các đơn vị còn sống; đơn vị đã lưu trữ bị bỏ qua có audit | `member.invite.action.test.ts` (ca accept) |
| 5 | Given agent thuộc Phòng Nhân sự tạo khách chưa có phụ trách / báo giá cho khách chưa có phụ trách / lịch hẹn, when lưu, then `team_id` = Phòng Nhân sự; người phụ trách giữ luật cũ | `packages/core/test/agent-unit-snapshot.test.ts` |
| 6 | Given Lịch hẹn, when chọn Phòng ban = Phòng Kinh doanh, then chỉ lịch có `team_id` trong Phòng Kinh doanh + nhóm con | `apps/web/e2e/http/calendar.spec.ts` (thêm ca) + `calendar.spec.ts` (mock) |
| 7 | Given Cài đặt › Thành viên, when mở, then dòng agent có nhãn AI, phòng ban, trạng thái; Lọc AI Agent chỉ còn agent; chân bảng đúng hai hạn mức; Sửa agent chỉ đổi phòng ban; chọn chủ sở hữu không có agent | `apps/web/e2e/settings.spec.ts` + `e2e/http/settings.spec.ts` |
| 8 | Given màn `settings:members` | `pnpm parity settings:members` < 5% (mask PD-911) |

### Commands / evidence gate
- Migration nền tảng: `pnpm --filter @appchat/db run db:generate` → `db:migrate` (platform) theo README db; tenant không đổi schema.
- `pnpm turbo run lint typecheck test --filter=@appchat/{shared,actions,core,db,api,web}` · `pnpm depcheck`.
- Integration (`--workers=1`, slot Postgres): `settings.test.ts`, `member.invite.action.test.ts`, `member.set_units.action.test.ts`.
- `pnpm e2e settings` · `pnpm e2e calendar` (mock + http) · `pnpm parity settings:members`.

## CONSTRAINTS
- **DO NOT:**
  - cho agent chiếm ghế người dùng hoặc đổi DC-051 / bảng giá gói;
  - cho agent làm người phụ trách bản ghi;
  - xoá agent từ mục Thành viên;
  - đổi `include_agents` mặc định (consumer khác chỉ cần người);
  - sửa `settings/types.ts`.
- **REUSE:** `orgTreeQuery` / `team_agent` / `assertLead` / `bumpTenantAuthzRevision` (051), `QuotaService.limits()`, `member.set_role`, `ConfirmActionHost`.
- **SKIP:** seat riêng cho agent; chấm công / ca agent; xuất CSV có agent (giữ xuất người như cũ).

## Quality Gate
- [x] Bằng chứng prototype: Thành viên có cột Phòng ban; agent có phòng ban (`cwAgents.dept`); gói tách "ghế người dùng" và "AI Agent".
- [x] Không đổi luật gói / commerce: ghế người dùng như DC-051, AI Agent theo `max_agents`.
- **Gap:** nếu Chủ nhà muốn agent chiếm ghế người dùng thì đó là đổi bảng giá gói (L2) — chưa làm, ghi DC-927 (b).

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Đúng manifest; handler tạo bản ghi chỉ thêm 1 tham số.
- [ ] AC 1–8 có kết quả từng cái, dán output thật.
- [ ] **Action-first:** phòng ban qua `member.set_units` / `member.invite`; FE `useAction`.
- [ ] **Hạn mức:** agent không vào đếm ghế; agent theo `max_agents`.
- [ ] i18n vi + en; token `@appchat/ui`; parity < 5%.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA; PR vào `dev`.

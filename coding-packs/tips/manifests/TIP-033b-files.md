# TIP-033b — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/actions/src/booking.ts` | Canonical additive contracts, closed/inherit migration, version/CAS, bounded package projection; old schemas retain compatibility |
| M | `packages/actions/src/booking-config.ts` | Canonical additive contracts, closed/inherit migration, version/CAS, bounded package projection; old schemas retain compatibility |
| M | `packages/actions/src/index.ts` | Canonical additive contracts, closed/inherit migration, version/CAS, bounded package projection; old schemas retain compatibility |
| C | `packages/actions/src/booking-read.ts` | Canonical additive contracts, closed/inherit migration, version/CAS, bounded package projection; old schemas retain compatibility |
| C | `packages/actions/src/customer-packages.ts` | Canonical additive contracts, closed/inherit migration, version/CAS, bounded package projection; old schemas retain compatibility |
| M | `packages/shared/src/api/calendar.ts` | Canonical additive contracts, closed/inherit migration, version/CAS, bounded package projection; old schemas retain compatibility |
| C | `packages/shared/src/api/customer-packages.ts` | Canonical additive contracts, closed/inherit migration, version/CAS, bounded package projection; old schemas retain compatibility |
| M | `packages/shared/src/api/index.ts` | Canonical additive contracts, closed/inherit migration, version/CAS, bounded package projection; old schemas retain compatibility |
| M | `packages/shared/src/index.ts` | Canonical additive contracts, closed/inherit migration, version/CAS, bounded package projection; old schemas retain compatibility |
| M | `packages/shared/src/booking/appointment-state.ts` | Canonical additive contracts, closed/inherit migration, version/CAS, bounded package projection; old schemas retain compatibility |
| M | `packages/shared/src/booking/slots.ts` | Canonical additive contracts, closed/inherit migration, version/CAS, bounded package projection; old schemas retain compatibility |
| C | `packages/shared/src/booking/input.ts` | Canonical additive contracts, closed/inherit migration, version/CAS, bounded package projection; old schemas retain compatibility |
| M | `packages/shared/src/crm/layouts.ts` | Canonical additive contracts, closed/inherit migration, version/CAS, bounded package projection; old schemas retain compatibility |
| M | `packages/actions/src/settings-apps.ts` | Canonical additive contracts, closed/inherit migration, version/CAS, bounded package projection; old schemas retain compatibility |
| M | `packages/db/prisma/tenant/booking.prisma` | Canonical additive contracts, closed/inherit migration, version/CAS, bounded package projection; old schemas retain compatibility |
| C | `packages/db/prisma/tenant/migrations/20261102003310_booking_operations/migration.sql` | Canonical additive contracts, closed/inherit migration, version/CAS, bounded package projection; old schemas retain compatibility |
| M | `packages/core/src/booking/booking.module.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| M | `packages/core/src/booking/booking-access.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| M | `packages/core/src/booking/actions/appointment-book.handlers.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| M | `packages/core/src/booking/actions/appointment-flow.handlers.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| M | `packages/core/src/booking/actions/booking-config.handlers.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| C | `packages/core/src/booking/actions/appointment-confirm.handler.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| C | `packages/core/src/booking/actions/booking-read.handler.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| M | `packages/core/src/booking/services/appointment-write.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| M | `packages/core/src/booking/services/booking-system.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| M | `packages/core/src/booking/services/calendar-read.service.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| M | `packages/core/src/booking/services/slots.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| C | `packages/core/src/booking/operations/locks.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| C | `packages/core/src/booking/operations/confirm.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| C | `packages/core/src/booking/operations/slot-policy.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| C | `packages/core/src/booking/operations/undo.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| C | `packages/core/src/booking/operations/settings.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| C | `packages/core/src/booking/operations/settings-read.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| C | `packages/core/src/booking/operations/types.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| C | `packages/core/src/booking/repos/operations.repo.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| M | `packages/core/src/sales/payments/services/invoices-read.service.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| C | `packages/core/src/sales/payments/packages/read.service.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| C | `packages/core/src/sales/payments/packages/repository.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| C | `packages/core/src/sales/payments/packages/projection.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| C | `packages/core/src/sales/payments/packages/read.handler.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| C | `packages/core/src/sales/payments/packages/read.module.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| M | `packages/core/src/sales/sales.module.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| M | `packages/core/src/index.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| M | `packages/core/src/ai/assistant/catalog.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| M | `apps/api/src/http/booking/calendar.controller.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| M | `apps/api/src/http/sales/invoices.controller.ts` | Domain-owned operation/reader, root-first lock reuse, exact HTTP/action and Sales/Booking provider wiring; no job processor imports |
| M | `packages/shared/src/data-transfer/registry.ts` | Export-only customer_packages dataset through038b, immutable dataset contract and exact scoped reader; no balance imports |
| M | `packages/actions/src/data-transfer.ts` | Export-only customer_packages dataset through038b, immutable dataset contract and exact scoped reader; no balance imports |
| M | `packages/shared/src/api/data-transfer.ts` | Export-only customer_packages dataset through038b, immutable dataset contract and exact scoped reader; no balance imports |
| M | `packages/core/src/data-transfer/data-transfer.providers.ts` | Export-only customer_packages dataset through038b, immutable dataset contract and exact scoped reader; no balance imports |
| M | `packages/core/src/data-transfer/types.ts` | Export-only customer_packages dataset through038b, immutable dataset contract and exact scoped reader; no balance imports |
| C | `packages/core/src/data-transfer/adapters/customer-packages.ts` | Export-only customer_packages dataset through038b, immutable dataset contract and exact scoped reader; no balance imports |
| M | `packages/core/src/data-transfer/services/planner.ts` | Export-only customer_packages dataset through038b, immutable dataset contract and exact scoped reader; no balance imports |
| M | `packages/core/src/data-transfer/services/validation.ts` | Export-only customer_packages dataset through038b, immutable dataset contract and exact scoped reader; no balance imports |
| M | `packages/core/src/data-transfer/services/ai-planner.ts` | Export-only customer_packages dataset through038b, immutable dataset contract and exact scoped reader; no balance imports |
| M | `packages/core/src/data-transfer/jobs/transfer.runner.ts` | Export-only customer_packages dataset through038b, immutable dataset contract and exact scoped reader; no balance imports |
| M | `apps/web/src/shared/assistant/data-transfer-command.ts` | Export-only customer_packages dataset through038b, immutable dataset contract and exact scoped reader; no balance imports |
| M | `apps/web/src/features/settings/registry.ts` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| M | `apps/web/src/features/settings/screens/SettingsScreen.tsx` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| M | `apps/web/src/features/settings/types.ts` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| M | `apps/web/src/features/settings/api.ts` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| C | `apps/web/src/features/settings/components/BookingSection.tsx` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| C | `apps/web/src/features/settings/components/booking/BusinessHoursForm.tsx` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| C | `apps/web/src/features/settings/components/booking/StaffTable.tsx` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| C | `apps/web/src/features/settings/components/booking/StaffEditorDrawer.tsx` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| C | `apps/web/src/features/settings/components/booking/StaffScheduleEditor.tsx` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| C | `apps/web/src/features/settings/hooks/useBookingSettings.ts` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| M | `apps/web/src/features/settings/components/ProfileLayoutEditor.tsx` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| M | `apps/web/src/features/calendar/components/AppointmentDrawer.tsx` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| C | `apps/web/src/features/calendar/components/AppointmentFooter.tsx` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| C | `apps/web/src/features/calendar/components/AppointmentHeader.tsx` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| C | `apps/web/src/features/calendar/components/ReconfirmAppointment.tsx` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| M | `apps/web/src/features/calendar/components/AppointmentFormModal.tsx` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| M | `apps/web/src/features/calendar/hooks/useApptForm.ts` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| M | `apps/web/src/features/calendar/api.ts` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| M | `apps/web/src/features/calendar/types.ts` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| M | `apps/web/src/features/calendar/components/CalendarAiDrawer.tsx` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| M | `apps/web/src/features/inbox/components/Blocks360.tsx` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| M | `apps/web/src/features/inbox/components/Overview360.tsx` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| C | `apps/web/src/shared/customer-packages/types.ts` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| C | `apps/web/src/shared/customer-packages/api.ts` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| C | `apps/web/src/shared/customer-packages/hooks/useCustomerPackages.ts` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| C | `apps/web/src/shared/customer-packages/components/CustomerPackagesCard.tsx` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| C | `apps/web/src/shared/customer-packages/components/PackageRow.tsx` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| C | `apps/web/src/shared/customer-packages/index.ts` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| M | `apps/web/src/shared/realtime/event-invalidation.ts` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| M | `apps/web/src/shared/api/mock/domains/calendar.ts` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| M | `apps/web/src/shared/api/mock/domains/calendar-actions.ts` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| M | `apps/web/src/shared/api/mock/domains/invoices-actions.ts` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| M | `apps/web/src/shared/api/mock/domains/profile-layout.ts` | Actual settings/calendar/CRM-and-Inbox360 integration, modular controls/hooks, query invalidation and truthful mock parity |
| M | `apps/web/messages/vi/settings.json` | Localized UI/AI/files states and package block |
| M | `apps/web/messages/vi/calendar.json` | Localized UI/AI/files states and package block |
| M | `apps/web/messages/vi/inbox.json` | Localized UI/AI/files states and package block |
| M | `apps/web/messages/vi/actions.json` | Localized UI/AI/files states and package block |
| M | `apps/web/messages/vi/data-transfer.json` | Localized UI/AI/files states and package block |
| M | `packages/shared/src/i18n/server/vi/booking.ts` | Localized booking operations errors/timeline |
| M | `apps/web/messages/en/settings.json` | Localized UI/AI/files states and package block |
| M | `apps/web/messages/en/calendar.json` | Localized UI/AI/files states and package block |
| M | `apps/web/messages/en/inbox.json` | Localized UI/AI/files states and package block |
| M | `apps/web/messages/en/actions.json` | Localized UI/AI/files states and package block |
| M | `apps/web/messages/en/data-transfer.json` | Localized UI/AI/files states and package block |
| M | `packages/shared/src/i18n/server/en/booking.ts` | Localized booking operations errors/timeline |
| C | `packages/actions/test/booking-operations.test.ts` | Dedicated contract, native races/scoping/query plans, mock/http/mobile/parity and live AI/file evidence |
| M | `packages/shared/src/booking/appointment-state.test.ts` | Dedicated contract, native races/scoping/query plans, mock/http/mobile/parity and live AI/file evidence |
| M | `packages/shared/src/booking/slots.test.ts` | Dedicated contract, native races/scoping/query plans, mock/http/mobile/parity and live AI/file evidence |
| C | `packages/shared/src/booking/input.test.ts` | Dedicated contract, native races/scoping/query plans, mock/http/mobile/parity and live AI/file evidence |
| C | `packages/core/test/booking-reconfirm.test.ts` | Dedicated contract, native races/scoping/query plans, mock/http/mobile/parity and live AI/file evidence |
| C | `packages/core/test/booking-settings-cas.test.ts` | Dedicated contract, native races/scoping/query plans, mock/http/mobile/parity and live AI/file evidence |
| C | `packages/core/test/customer-packages-read.test.ts` | Dedicated contract, native races/scoping/query plans, mock/http/mobile/parity and live AI/file evidence |
| C | `packages/core/test/customer-packages-transfer.test.ts` | Dedicated contract, native races/scoping/query plans, mock/http/mobile/parity and live AI/file evidence |
| C | `packages/core/test/booking-operations-composition.test.ts` | Dedicated contract, native races/scoping/query plans, mock/http/mobile/parity and live AI/file evidence |
| C | `apps/api/test/integration/booking-operations.test.ts` | Dedicated contract, native races/scoping/query plans, mock/http/mobile/parity and live AI/file evidence |
| C | `apps/api/test/integration/customer-packages.test.ts` | Dedicated contract, native races/scoping/query plans, mock/http/mobile/parity and live AI/file evidence |
| C | `apps/web/e2e/booking-operations.spec.ts` | Dedicated contract, native races/scoping/query plans, mock/http/mobile/parity and live AI/file evidence |
| C | `apps/web/e2e/http/booking-operations.spec.ts` | Dedicated contract, native races/scoping/query plans, mock/http/mobile/parity and live AI/file evidence |
| M | `apps/web/src/shared/api/mock/calendar-shape.test.ts` | Dedicated contract, native races/scoping/query plans, mock/http/mobile/parity and live AI/file evidence |
| C | `fixtures/ai-eval/booking-operations.json` | Dedicated contract, native races/scoping/query plans, mock/http/mobile/parity and live AI/file evidence |
| C | `fixtures/data-transfer/customer-packages.csv` | Dedicated contract, native races/scoping/query plans, mock/http/mobile/parity and live AI/file evidence |
| C | `tools/parity/modules/booking-operations.ts` | Dedicated contract, native races/scoping/query plans, mock/http/mobile/parity and live AI/file evidence |
| M | `tools/parity/parity.manifest.ts` | Dedicated contract, native races/scoping/query plans, mock/http/mobile/parity and live AI/file evidence |
| M | `packages/shared/src/events.ts` | Typed booking.config_changed event contract for canonical outbox and realtime invalidation |
| M | `apps/api/test/integration/booking.test.ts` | Retest retained033 behavior and standard SLOT_TAKEN error compatibility after DC261 |
| M | `packages/core/src/data-transfer/data-transfer.module.ts` | Import/export lightweight PackagesReadModule for injectable package export adapter |
| M | `packages/core/src/data-transfer/jobs/data-transfer.jobs.module.ts` | Import DataTransferModule exported package reader/adapter into actual ROLE=jobs scope |

## Future M provenance

- `packages/shared/src/data-transfer/registry.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/actions/src/data-transfer.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/shared/src/api/data-transfer.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/data-transfer.providers.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/types.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/services/planner.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/services/validation.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/services/ai-planner.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/jobs/transfer.runner.ts`: TIP-038b-ai-first-data-transfer.md
- `apps/web/src/shared/assistant/data-transfer-command.ts`: TIP-038b-ai-first-data-transfer.md
- `apps/web/messages/vi/data-transfer.json`: TIP-038b-ai-first-data-transfer.md
- `apps/web/messages/en/data-transfer.json`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/data-transfer.module.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/jobs/data-transfer.jobs.module.ts`: TIP-038b-ai-first-data-transfer.md

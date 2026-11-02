# TIP-033c — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/actions/src/booking-config.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/actions/src/index.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/core/src/booking/actions/appointment-flow.handlers.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/core/src/booking/services/calendar-read.service.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/core/src/booking/public.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/core/src/booking/booking.module.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/core/src/sales/orders/actions/order-from-appointment.handler.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/core/src/sales/sales.module.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/core/src/inbox/services/read.service.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/core/src/inbox/inbox.module.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/core/src/ai/ai.module.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/core/src/ai/assistant/genui/context.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/core/src/ai/assistant/genui/refs.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/core/src/ai/assistant/genui/render.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/core/src/ai/assistant/genui/extension-registry.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/core/src/ai/assistant/genui/submit.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/core/src/ai/assistant/genui/history.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/core/src/ai/assistant/meta-tools.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/core/src/ai/assistant/discovery/authority.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/core/src/kernel/actions/preview-binding.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/db/prisma/tenant/booking.prisma` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/shared/src/api/calendar.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/shared/src/api/inbox.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/shared/src/api/index.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `apps/web/src/features/calendar/components/AppointmentDrawer.tsx` | Canonical eligibility/preview/confirmation and real host integration |
| M | `apps/web/src/features/calendar/types.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `apps/web/src/features/inbox/components/ChatPanel.tsx` | Canonical eligibility/preview/confirmation and real host integration |
| M | `apps/web/src/features/inbox/types.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `apps/web/src/shared/genui/registry.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `apps/web/src/shared/genui/types.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `apps/web/src/shared/api/mock/domains/calendar.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `apps/web/src/shared/api/mock/domains/inbox.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `apps/web/src/shared/api/mock/domains/assistant.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `apps/web/messages/vi/calendar.json` | Canonical eligibility/preview/confirmation and real host integration |
| M | `apps/web/messages/en/calendar.json` | Canonical eligibility/preview/confirmation and real host integration |
| M | `apps/web/messages/vi/inbox.json` | Canonical eligibility/preview/confirmation and real host integration |
| M | `apps/web/messages/en/inbox.json` | Canonical eligibility/preview/confirmation and real host integration |
| M | `apps/web/messages/vi/assistant.json` | Canonical eligibility/preview/confirmation and real host integration |
| M | `apps/web/messages/en/assistant.json` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/shared/src/i18n/server/vi/booking.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `packages/shared/src/i18n/server/en/booking.ts` | Canonical eligibility/preview/confirmation and real host integration |
| M | `tools/parity/parity.manifest.ts` | Canonical eligibility/preview/confirmation and real host integration |
| C | `packages/core/src/booking/order-suggestions/read.ts` | Bounded booking order suggestion domain/read/card or dedicated tests |
| C | `packages/core/src/booking/order-suggestions/authority.ts` | Bounded booking order suggestion domain/read/card or dedicated tests |
| C | `packages/core/src/booking/order-suggestions/preview.ts` | Bounded booking order suggestion domain/read/card or dedicated tests |
| C | `packages/core/src/booking/order-suggestions/handler.ts` | Bounded booking order suggestion domain/read/card or dedicated tests |
| C | `packages/core/src/ai/assistant/genui/appointment-order.ts` | Bounded booking order suggestion domain/read/card or dedicated tests |
| C | `packages/shared/src/api/appointment-order.ts` | Bounded booking order suggestion domain/read/card or dedicated tests |
| C | `packages/db/prisma/tenant/migrations/20261102003330_appointment_order_suggestions/migration.sql` | Bounded booking order suggestion domain/read/card or dedicated tests |
| C | `apps/web/src/shared/appointment-order/AppointmentOrderCard.tsx` | Bounded booking order suggestion domain/read/card or dedicated tests |
| C | `apps/web/src/shared/appointment-order/useAppointmentOrder.ts` | Bounded booking order suggestion domain/read/card or dedicated tests |
| C | `apps/web/src/shared/appointment-order/types.ts` | Bounded booking order suggestion domain/read/card or dedicated tests |
| C | `packages/core/test/appointment-order-suggestions.test.ts` | Bounded booking order suggestion domain/read/card or dedicated tests |
| C | `packages/core/test/appointment-order-confirmation.test.ts` | Bounded booking order suggestion domain/read/card or dedicated tests |
| C | `apps/api/test/integration/appointment-order-suggestions.test.ts` | Bounded booking order suggestion domain/read/card or dedicated tests |
| C | `apps/worker/test/integration/appointment-order-composition.test.ts` | Bounded booking order suggestion domain/read/card or dedicated tests |
| C | `apps/web/src/shared/appointment-order/AppointmentOrderCard.test.tsx` | Bounded booking order suggestion domain/read/card or dedicated tests |
| C | `apps/web/e2e/appointment-order.mock.spec.ts` | Bounded booking order suggestion domain/read/card or dedicated tests |
| C | `apps/web/e2e/http/appointment-order.spec.ts` | Bounded booking order suggestion domain/read/card or dedicated tests |
| C | `fixtures/ai-eval/appointment-order.json` | Bounded booking order suggestion domain/read/card or dedicated tests |
| M | `apps/api/test/integration/booking.test.ts` | Update existing direct conversion callers to canonical preview/confirm contract and retain package negative test |
| M | `packages/shared/src/genui/schema.ts` | Closed node schema bounded appointment_order references, no supplied price/authority |
| M | `apps/api/test/integration/actions/order.create_from_appointment.action.test.ts` | Migrate existing canonical matrix to preview/confirm and negative precedence |
| C | `packages/shared/src/genui/appointment-order.test.ts` | Actual typed tree validation, persist/history/submit and malicious refs |

## Future M provenance

- `packages/core/src/ai/assistant/genui/context.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/refs.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/render.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/extension-registry.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/submit.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/history.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/discovery/authority.ts`: TIP-023e-action-discovery.md
- `packages/core/src/kernel/actions/preview-binding.ts`: TIP-015e-contact-merge-integrity.md
- `apps/web/src/shared/genui/registry.ts`: TIP-023c-generative-ui.md
- `apps/web/src/shared/genui/types.ts`: TIP-023c-generative-ui.md
- `packages/shared/src/genui/schema.ts`: TIP-023c-generative-ui.md
- `apps/api/test/integration/actions/order.create_from_appointment.action.test.ts`: TIP-023b-assistant-coverage.md

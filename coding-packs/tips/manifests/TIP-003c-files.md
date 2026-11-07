# TIP-003c — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/actions/src/define.ts` | Enforce private action exposure/current trusted capability and event receipt composition |
| M | `packages/actions/src/index.ts` | Enforce private action exposure/current trusted capability and event receipt composition |
| M | `packages/core/src/kernel/actions/executor.ts` | Enforce private action exposure/current trusted capability and event receipt composition |
| M | `packages/core/src/kernel/actions/action-context.ts` | Enforce private action exposure/current trusted capability and event receipt composition |
| M | `packages/core/src/kernel/actions/actions.module.ts` | Enforce private action exposure/current trusted capability and event receipt composition |
| M | `packages/core/src/kernel/actions/handler.ts` | Enforce private action exposure/current trusted capability and event receipt composition |
| M | `packages/core/src/kernel/actions/handler-registry.ts` | Enforce private action exposure/current trusted capability and event receipt composition |
| M | `packages/core/src/kernel/index.ts` | Enforce private action exposure/current trusted capability and event receipt composition |
| M | `packages/core/src/index.ts` | Enforce private action exposure/current trusted capability and event receipt composition |
| M | `packages/core/src/ai/assistant/catalog.ts` | Enforce private action exposure/current trusted capability and event receipt composition |
| M | `packages/core/src/ai/agents/agent.handlers.ts` | Enforce private action exposure/current trusted capability and event receipt composition |
| M | `apps/web/src/shared/ai/agent-tools.ts` | Enforce private action exposure/current trusted capability and event receipt composition |
| M | `apps/worker/src/event-protocol.manifest.ts` | Enforce private action exposure/current trusted capability and event receipt composition |
| M | `packages/core/src/kernel/events/protocol/dispatch-action-port.ts` | Enforce private action exposure/current trusted capability and event receipt composition |
| C | `packages/actions/src/system/sales.ts` | Private canonical action schemas; no public grant |
| C | `packages/core/src/sales/system/module.ts` | Domain-owned trusted source validation and canonical transition adapter |
| C | `packages/core/src/sales/system/sources.ts` | Domain-owned trusted source validation and canonical transition adapter |
| C | `packages/core/src/sales/system/handlers.ts` | Domain-owned trusted source validation and canonical transition adapter |
| C | `packages/core/src/sales/system/dispatch.ts` | Domain-owned trusted source validation and canonical transition adapter |
| M | `packages/core/src/sales/sales.module.ts` | Register domain-private system action handlers without kernel-domain cycle |
| C | `packages/actions/src/system/booking.ts` | Private canonical action schemas; no public grant |
| C | `packages/core/src/booking/system/module.ts` | Domain-owned trusted source validation and canonical transition adapter |
| C | `packages/core/src/booking/system/sources.ts` | Domain-owned trusted source validation and canonical transition adapter |
| C | `packages/core/src/booking/system/handlers.ts` | Domain-owned trusted source validation and canonical transition adapter |
| C | `packages/core/src/booking/system/dispatch.ts` | Domain-owned trusted source validation and canonical transition adapter |
| M | `packages/core/src/booking/booking.module.ts` | Register domain-private system action handlers without kernel-domain cycle |
| C | `packages/actions/src/system/support.ts` | Private canonical action schemas; no public grant |
| C | `packages/core/src/support/system/module.ts` | Domain-owned trusted source validation and canonical transition adapter |
| C | `packages/core/src/support/system/sources.ts` | Domain-owned trusted source validation and canonical transition adapter |
| C | `packages/core/src/support/system/handlers.ts` | Domain-owned trusted source validation and canonical transition adapter |
| C | `packages/core/src/support/system/dispatch.ts` | Domain-owned trusted source validation and canonical transition adapter |
| M | `packages/core/src/support/support.module.ts` | Register domain-private system action handlers without kernel-domain cycle |
| C | `packages/actions/src/system/contracts.ts` | Private canonical action schemas; no public grant |
| C | `packages/core/src/contracts/system/module.ts` | Domain-owned trusted source validation and canonical transition adapter |
| C | `packages/core/src/contracts/system/sources.ts` | Domain-owned trusted source validation and canonical transition adapter |
| C | `packages/core/src/contracts/system/handlers.ts` | Domain-owned trusted source validation and canonical transition adapter |
| C | `packages/core/src/contracts/system/dispatch.ts` | Domain-owned trusted source validation and canonical transition adapter |
| M | `packages/core/src/contracts/contracts.module.ts` | Register domain-private system action handlers without kernel-domain cycle |
| C | `packages/core/src/billing/system/module.ts` | Domain-owned trusted source validation and canonical transition adapter |
| C | `packages/core/src/billing/system/sources.ts` | Domain-owned trusted source validation and canonical transition adapter |
| C | `packages/core/src/billing/system/dispatch.ts` | Domain-owned trusted source validation and canonical transition adapter |
| M | `packages/core/src/billing/billing.module.ts` | Register domain-private system action handlers without kernel-domain cycle |
| C | `packages/actions/src/system/channels.ts` | Private canonical action schemas; no public grant |
| C | `packages/core/src/channels/system/module.ts` | Domain-owned trusted source validation and canonical transition adapter |
| C | `packages/core/src/channels/system/sources.ts` | Domain-owned trusted source validation and canonical transition adapter |
| C | `packages/core/src/channels/system/handlers.ts` | Domain-owned trusted source validation and canonical transition adapter |
| C | `packages/core/src/channels/system/dispatch.ts` | Domain-owned trusted source validation and canonical transition adapter |
| M | `packages/core/src/channels/channels.module.ts` | Register domain-private system action handlers without kernel-domain cycle |
| C | `packages/actions/src/system/ai.ts` | Private canonical action schemas; no public grant |
| C | `packages/core/src/ai/system/module.ts` | Domain-owned trusted source validation and canonical transition adapter |
| C | `packages/core/src/ai/system/sources.ts` | Domain-owned trusted source validation and canonical transition adapter |
| C | `packages/core/src/ai/system/handlers.ts` | Domain-owned trusted source validation and canonical transition adapter |
| C | `packages/core/src/ai/system/dispatch.ts` | Domain-owned trusted source validation and canonical transition adapter |
| M | `packages/core/src/ai/ai.module.ts` | Register domain-private system action handlers without kernel-domain cycle |
| C | `packages/core/src/kernel/actions/system/types.ts` | Narrow source-bound capability/operation protocol; no business policy |
| C | `packages/core/src/kernel/actions/system/capability.ts` | Narrow source-bound capability/operation protocol; no business policy |
| C | `packages/core/src/kernel/actions/system/registry.ts` | Narrow source-bound capability/operation protocol; no business policy |
| C | `packages/core/src/kernel/actions/system/admission.ts` | Narrow source-bound capability/operation protocol; no business policy |
| C | `packages/core/src/kernel/actions/system/receipt.ts` | Narrow source-bound capability/operation protocol; no business policy |
| C | `packages/core/src/kernel/actions/system/executor-hook.ts` | Narrow source-bound capability/operation protocol; no business policy |
| C | `packages/core/src/kernel/actions/system/schedule.ts` | Narrow source-bound capability/operation protocol; no business policy |
| M | `packages/core/src/sales/quotes/services/quote-system.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/sales/payments/services/payment-system.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/sales/payments/services/packages.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/sales/orders/services/order-sync.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/sales/jobs/payment.jobs.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/sales/jobs/order-sync.jobs.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/sales/jobs/sales.jobs.module.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/booking/services/booking-system.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/booking/jobs/booking.jobs.module.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/support/services/support-system.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/support/jobs/support.jobs.module.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/contracts/services/contract-system.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/contracts/jobs/contracts.jobs.module.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/billing/events/billing.events.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/billing/services/subscriptions.service.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/billing/payments/fulfil.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/billing/jobs/billing.jobs.module.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/channels/jobs/login.processor.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/channels/jobs/sessions.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/ai/kb/ingest.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/ai/approvals/resume.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/ai/reply/reply.service.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/ai/jobs/ai.jobs.module.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `packages/core/src/sales/quotes/services/quote-send.ts` | Replace direct business commit with bounded canonical adapter; preserve predecessor policy |
| M | `apps/worker/src/roles/jobs.module.ts` | Actual role/API registration and localized internal audit labels |
| M | `apps/worker/src/roles/ai.module.ts` | Actual role/API registration and localized internal audit labels |
| M | `apps/worker/src/roles/channels.module.ts` | Actual role/API registration and localized internal audit labels |
| M | `apps/api/src/app.module.ts` | Actual role/API registration and localized internal audit labels |
| M | `apps/web/messages/vi/actions.json` | Actual role/API registration and localized internal audit labels |
| M | `apps/web/messages/en/actions.json` | Actual role/API registration and localized internal audit labels |
| M | `packages/actions/src/privacy.ts` | Predecessor private-action/operation/current-privacy registration; no second policy engine |
| M | `packages/actions/src/contract-appendix.ts` | Predecessor private-action/operation/current-privacy registration; no second policy engine |
| M | `packages/core/src/contracts/appendix/capability.ts` | Predecessor private-action/operation/current-privacy registration; no second policy engine |
| M | `packages/core/src/privacy/actions/cleanup.handler.ts` | Predecessor private-action/operation/current-privacy registration; no second policy engine |
| M | `packages/core/src/sales/payments/actions/bank-ingest.handler.ts` | Predecessor private-action/operation/current-privacy registration; no second policy engine |
| M | `packages/core/src/ai/assistant/discovery/authority.ts` | Predecessor private-action/operation/current-privacy registration; no second policy engine |
| M | `packages/core/src/ai/assistant/discovery/corpus.ts` | Predecessor private-action/operation/current-privacy registration; no second policy engine |
| M | `packages/core/src/kernel/consistency/operation-recovery.ts` | Predecessor private-action/operation/current-privacy registration; no second policy engine |
| M | `packages/core/src/kernel/privacy/inventory.ts` | Predecessor private-action/operation/current-privacy registration; no second policy engine |
| M | `packages/core/src/kernel/privacy/cleanup.ts` | Predecessor private-action/operation/current-privacy registration; no second policy engine |
| C | `packages/db/prisma/tenant/system-action.prisma` | Durable source-trigger operation receipts and bounded schedule indexes |
| C | `packages/db/prisma/tenant/migrations/20261102000330_system_action/migration.sql` | Durable source-trigger operation receipts and bounded schedule indexes |
| C | `packages/actions/test/system-actions.test.ts` | Private schema/id/risk/exposure uniqueness and deny-surface contracts |
| C | `packages/core/test/system-capability.test.ts` | Dedicated adapter/source/current-authority and replay tests |
| C | `packages/core/test/system-receipts.test.ts` | Dedicated adapter/source/current-authority and replay tests |
| C | `packages/core/test/system-sales.test.ts` | Dedicated adapter/source/current-authority and replay tests |
| C | `packages/core/test/system-booking-support.test.ts` | Dedicated adapter/source/current-authority and replay tests |
| C | `packages/core/test/system-contract-billing.test.ts` | Dedicated adapter/source/current-authority and replay tests |
| C | `packages/core/test/system-channel-ai.test.ts` | Dedicated adapter/source/current-authority and replay tests |
| C | `packages/core/test/system-private-catalog.test.ts` | Dedicated adapter/source/current-authority and replay tests |
| C | `apps/api/test/integration/system-actions.test.ts` | Native canonical action/effect/audit/outbox barriers and spoofed HTTP |
| C | `apps/api/test/integration/system-actions-replay.test.ts` | Native canonical action/effect/audit/outbox barriers and spoofed HTTP |
| C | `apps/api/test/integration/system-actions-scope.test.ts` | Native canonical action/effect/audit/outbox barriers and spoofed HTTP |
| C | `apps/worker/test/integration/system-actions-composition.test.ts` | Actual jobs/ai/channels/API capability registration |
| C | `apps/web/src/shared/ai/agent-tools-private.test.ts` | Private registry rows absent from Builder tool groups |
| M | `packages/core/src/ai/agents/agent-tools.ts` | Current/predecessor capability/exposure/receipt wiring; preserve domain policy and action IDs |
| M | `packages/core/src/ai/agents/agent.store.ts` | Current/predecessor capability/exposure/receipt wiring; preserve domain policy and action IDs |
| M | `packages/core/src/ai/agents/agent-draft.ts` | Current/predecessor capability/exposure/receipt wiring; preserve domain policy and action IDs |
| M | `packages/core/src/ai/assistant/meta-tools.ts` | Current/predecessor capability/exposure/receipt wiring; preserve domain policy and action IDs |
| M | `packages/core/src/ai/runs/tools.ts` | Current/predecessor capability/exposure/receipt wiring; preserve domain policy and action IDs |
| M | `packages/core/src/ai/assistant/discovery/cache.ts` | Current/predecessor capability/exposure/receipt wiring; preserve domain policy and action IDs |
| M | `packages/core/src/sales/payments/services/invoice-send.ts` | Current/predecessor capability/exposure/receipt wiring; preserve domain policy and action IDs |
| M | `packages/actions/src/billing-lifecycle.ts` | Current/predecessor capability/exposure/receipt wiring; preserve domain policy and action IDs |
| M | `packages/core/src/billing/actions/lifecycle.handlers.ts` | Current/predecessor capability/exposure/receipt wiring; preserve domain policy and action IDs |
| M | `packages/core/src/billing/jobs/lifecycle.runner.ts` | Current/predecessor capability/exposure/receipt wiring; preserve domain policy and action IDs |
| M | `packages/core/src/billing/events/credit-handoff.consumer.ts` | Current/predecessor capability/exposure/receipt wiring; preserve domain policy and action IDs |
| M | `packages/actions/src/loyalty-system.ts` | Current/predecessor capability/exposure/receipt wiring; preserve domain policy and action IDs |
| M | `packages/core/src/loyalty/actions/ledger-system.handlers.ts` | Current/predecessor capability/exposure/receipt wiring; preserve domain policy and action IDs |
| M | `packages/core/src/loyalty/events/order-consumer.ts` | Current/predecessor capability/exposure/receipt wiring; preserve domain policy and action IDs |
| M | `packages/core/src/loyalty/events/payment-consumer.ts` | Current/predecessor capability/exposure/receipt wiring; preserve domain policy and action IDs |
| M | `packages/core/src/loyalty/jobs/loyalty.scheduler.ts` | Current/predecessor capability/exposure/receipt wiring; preserve domain policy and action IDs |
| M | `packages/actions/src/insights.ts` | Current/predecessor capability/exposure/receipt wiring; preserve domain policy and action IDs |
| M | `packages/core/src/insights/actions/follow-up.handlers.ts` | Current/predecessor capability/exposure/receipt wiring; preserve domain policy and action IDs |
| M | `packages/core/src/insights/jobs/follow-up.consumer.ts` | Current/predecessor capability/exposure/receipt wiring; preserve domain policy and action IDs |
| M | `packages/core/src/insights/services/follow-ups.ts` | Current/predecessor capability/exposure/receipt wiring; preserve domain policy and action IDs |
| M | `packages/actions/src/bank-ingress.ts` | Add internal exposure to existing012b definition; preserve sealed verifier |
| M | `packages/core/src/sales/quotes/services/quotes-read.service.ts` | Pass verified public quote locator to private view capability factory |

## Future M provenance

- `apps/worker/src/event-protocol.manifest.ts`: TIP-003b-event-protocol.md
- `packages/core/src/kernel/events/protocol/dispatch-action-port.ts`: TIP-003b-event-protocol.md
- `packages/actions/src/privacy.ts`: TIP-015c-contact-privacy.md
- `packages/actions/src/contract-appendix.ts`: TIP-030b-contract-files.md
- `packages/core/src/contracts/appendix/capability.ts`: TIP-030b-contract-files.md
- `packages/core/src/privacy/actions/cleanup.handler.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/sales/payments/actions/bank-ingest.handler.ts`: TIP-012b-bank-connectors.md
- `packages/core/src/ai/assistant/discovery/authority.ts`: TIP-023e-action-discovery.md
- `packages/core/src/ai/assistant/discovery/corpus.ts`: TIP-023e-action-discovery.md
- `packages/core/src/kernel/consistency/operation-recovery.ts`: TIP-045b-app-hardening.md
- `packages/core/src/kernel/privacy/inventory.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/kernel/privacy/cleanup.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/ai/assistant/discovery/cache.ts`: TIP-023e-action-discovery.md
- `packages/actions/src/billing-lifecycle.ts`: TIP-039-billing-lifecycle.md
- `packages/core/src/billing/actions/lifecycle.handlers.ts`: TIP-039-billing-lifecycle.md
- `packages/core/src/billing/jobs/lifecycle.runner.ts`: TIP-039-billing-lifecycle.md
- `packages/core/src/billing/events/credit-handoff.consumer.ts`: TIP-039-billing-lifecycle.md
- `packages/actions/src/loyalty-system.ts`: TIP-036-loyalty.md
- `packages/core/src/loyalty/actions/ledger-system.handlers.ts`: TIP-036-loyalty.md
- `packages/core/src/loyalty/events/order-consumer.ts`: TIP-036-loyalty.md
- `packages/core/src/loyalty/events/payment-consumer.ts`: TIP-036-loyalty.md
- `packages/core/src/loyalty/jobs/loyalty.scheduler.ts`: TIP-036-loyalty.md
- `packages/actions/src/insights.ts`: TIP-038-insights-dashboard.md
- `packages/core/src/insights/actions/follow-up.handlers.ts`: TIP-038-insights-dashboard.md
- `packages/core/src/insights/jobs/follow-up.consumer.ts`: TIP-038-insights-dashboard.md
- `packages/core/src/insights/services/follow-ups.ts`: TIP-038-insights-dashboard.md
- `packages/actions/src/bank-ingress.ts`: TIP-012b-bank-connectors.md

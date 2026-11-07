# TIP-003b — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/core/src/ai/approvals/approval.gateway.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/ai/approvals/resume.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/ai/kb/ingest.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/ai/reply/reply.service.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/ai/tasks/task.runner.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/billing/events/billing.events.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/booking/services/booking-system.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/catalog/actions/product.handlers.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/channels/jobs/login.processor.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/channels/jobs/sessions.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/contracts/services/contract-system.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/contracts/services/public-sign.service.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/identity/actions/member-set-role.handler.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/identity/jobs/tenant-provision.processor.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/inbox/jobs/inbound.processor.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/inbox/services/pipeline.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/integrations/jobs/integration-call.processor.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/integrations/services/webhook.service.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/kernel/actions/executor.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/kernel/outbox/outbox.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/sales/orders/services/order-sync.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/sales/payments/services/bank-feed.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/sales/payments/services/packages.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/sales/payments/services/payment-system.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/sales/quotes/services/quote-system.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/support/services/support-system.ts` | Adapt terminal transaction collector; preserve domain behavior and predecessor receipts |
| M | `packages/core/src/kernel/actions/undo.service.ts` | Protocol facade, composition or existing regression adaptation |
| M | `packages/core/src/kernel/events/consumer.ts` | Protocol facade, composition or existing regression adaptation |
| M | `packages/core/src/kernel/events/dispatcher.ts` | Protocol facade, composition or existing regression adaptation |
| M | `packages/core/src/kernel/events/events.runner.ts` | Protocol facade, composition or existing regression adaptation |
| M | `packages/core/src/kernel/outbox/relay.ts` | Protocol facade, composition or existing regression adaptation |
| M | `packages/core/src/kernel/outbox/outbox.jobs.module.ts` | Protocol facade, composition or existing regression adaptation |
| M | `packages/core/src/kernel/index.ts` | Protocol facade, composition or existing regression adaptation |
| M | `packages/core/src/index.ts` | Protocol facade, composition or existing regression adaptation |
| M | `packages/shared/src/events.ts` | Protocol facade, composition or existing regression adaptation |
| M | `packages/shared/src/index.ts` | Protocol facade, composition or existing regression adaptation |
| M | `packages/db/prisma/tenant/kernel.prisma` | Protocol facade, composition or existing regression adaptation |
| M | `apps/worker/src/main.ts` | Protocol facade, composition or existing regression adaptation |
| M | `apps/worker/src/worker.module.ts` | Protocol facade, composition or existing regression adaptation |
| M | `apps/worker/src/roles/jobs.module.ts` | Protocol facade, composition or existing regression adaptation |
| M | `apps/api/test/integration/relay-sequence.test.ts` | Protocol facade, composition or existing regression adaptation |
| C | `packages/core/src/kernel/events/protocol/types.ts` | Bounded durable dispatch protocol; no domain mutation policy |
| C | `packages/core/src/kernel/events/protocol/registry.ts` | Bounded durable dispatch protocol; no domain mutation policy |
| C | `packages/core/src/kernel/events/protocol/readiness.ts` | Bounded durable dispatch protocol; no domain mutation policy |
| C | `packages/core/src/kernel/events/protocol/dispatch-store.ts` | Bounded durable dispatch protocol; no domain mutation policy |
| C | `packages/core/src/kernel/events/protocol/dispatch-claim.ts` | Bounded durable dispatch protocol; no domain mutation policy |
| C | `packages/core/src/kernel/events/protocol/dispatch-head.ts` | Bounded durable dispatch protocol; no domain mutation policy |
| C | `packages/core/src/kernel/events/protocol/dispatch-projection.ts` | Bounded durable dispatch protocol; no domain mutation policy |
| C | `packages/core/src/kernel/events/protocol/dispatch-action-port.ts` | Bounded durable dispatch protocol; no domain mutation policy |
| C | `packages/core/src/kernel/events/protocol/dispatch-handoff.ts` | Bounded durable dispatch protocol; no domain mutation policy |
| C | `packages/core/src/kernel/events/protocol/dispatch-recovery.ts` | Bounded durable dispatch protocol; no domain mutation policy |
| C | `packages/core/src/kernel/events/protocol/cutover.ts` | Bounded durable dispatch protocol; no domain mutation policy |
| C | `packages/core/src/kernel/events/protocol/diagnostics.ts` | Bounded durable dispatch protocol; no domain mutation policy |
| C | `packages/core/src/kernel/outbox/transaction.ts` | Transaction-final outbox allocation or bounded relay/recovery |
| C | `packages/core/src/kernel/outbox/collector.ts` | Transaction-final outbox allocation or bounded relay/recovery |
| C | `packages/core/src/kernel/outbox/sequence.ts` | Transaction-final outbox allocation or bounded relay/recovery |
| C | `packages/core/src/kernel/outbox/claim.ts` | Transaction-final outbox allocation or bounded relay/recovery |
| C | `packages/core/src/kernel/outbox/recovery.ts` | Transaction-final outbox allocation or bounded relay/recovery |
| C | `packages/shared/src/events/protocol/metadata.ts` | Explicit exhaustive typed event identity/version mapping |
| C | `packages/shared/src/events/protocol/aggregate.ts` | Explicit exhaustive typed event identity/version mapping |
| C | `packages/shared/src/events/protocol/baseline.ts` | Explicit exhaustive typed event identity/version mapping |
| C | `packages/shared/src/events/protocol/extensions.ts` | Explicit exhaustive typed event identity/version mapping |
| C | `packages/db/prisma/tenant/event-protocol.prisma` | Tenant durable producer, dispatch, claims and rollout schema/indexes |
| C | `packages/db/prisma/tenant/migrations/20261102000320_event_protocol/migration.sql` | Tenant durable producer, dispatch, claims and rollout schema/indexes |
| C | `apps/worker/src/event-protocol.manifest.ts` | Expected deployed consumers and role/version readiness independent of registrations |
| C | `apps/worker/src/start-events.ts` | Explicit start after Nest bootstrap and registry freeze |
| C | `packages/core/test/event-protocol.test.ts` | Dedicated fault/contract evidence |
| C | `packages/core/test/event-collector.test.ts` | Dedicated fault/contract evidence |
| C | `packages/core/test/event-aggregate-map.test.ts` | Dedicated fault/contract evidence |
| C | `packages/core/test/event-relay-claims.test.ts` | Dedicated fault/contract evidence |
| C | `packages/core/test/event-dispatch-receipts.test.ts` | Dedicated fault/contract evidence |
| C | `packages/core/test/event-readiness.test.ts` | Dedicated fault/contract evidence |
| C | `packages/core/test/event-cutover.test.ts` | Dedicated fault/contract evidence |
| C | `packages/core/test/event-privacy-replay.test.ts` | Dedicated fault/contract evidence |
| C | `packages/shared/test/event-protocol.test.ts` | Every declared topic has validated aggregate metadata |
| C | `apps/api/test/integration/event-protocol-concurrency.test.ts` | Native DB barriers, crash windows and tenant isolation |
| C | `apps/api/test/integration/event-protocol-recovery.test.ts` | Native DB barriers, crash windows and tenant isolation |
| C | `apps/api/test/integration/event-protocol-cutover.test.ts` | Native DB barriers, crash windows and tenant isolation |
| C | `apps/worker/test/integration/event-protocol-composition.test.ts` | Actual ROLE jobs/all bootstrap; no early/no-consumer ACK |
| M | `packages/core/src/kernel/privacy/inventory.ts` | Predecessor privacy/metrics registration for durable event state, payload and safe diagnostics |
| M | `packages/core/src/kernel/privacy/cleanup.ts` | Predecessor privacy/metrics registration for durable event state, payload and safe diagnostics |
| M | `packages/core/src/privacy/services/source-catalog.ts` | Predecessor privacy/metrics registration for durable event state, payload and safe diagnostics |
| M | `packages/core/src/privacy/services/read-catalog.ts` | Predecessor privacy/metrics registration for durable event state, payload and safe diagnostics |
| M | `packages/core/src/privacy/services/write-catalog.ts` | Predecessor privacy/metrics registration for durable event state, payload and safe diagnostics |
| M | `packages/core/src/kernel/metrics/collectors.ts` | Predecessor privacy/metrics registration for durable event state, payload and safe diagnostics |
| M | `packages/core/src/ai/runs/run-events.ts` | Known019b tenant event/usage transaction enrollment; keep authoritative platform receipt separate |
| M | `packages/core/src/ai/runs/usage-settlement.ts` | Known019b tenant event/usage transaction enrollment; keep authoritative platform receipt separate |
| M | `packages/core/src/ai/runs/usage-receipts.ts` | Known019b tenant event/usage transaction enrollment; keep authoritative platform receipt separate |
| M | `packages/core/src/ai/runs/usage-recovery.ts` | Known019b tenant event/usage transaction enrollment; keep authoritative platform receipt separate |
| M | `packages/core/src/ai/runs/run.store.ts` | Known019b tenant event/usage transaction enrollment; keep authoritative platform receipt separate |
| M | `packages/core/src/ai/runs/runner.ts` | Known019b tenant event/usage transaction enrollment; keep authoritative platform receipt separate |
| M | `packages/core/src/billing/services/usage-receipt.ts` | Known019b tenant event/usage transaction enrollment; keep authoritative platform receipt separate |
| M | `packages/core/src/billing/services/credit-meter.ts` | Known019b tenant event/usage transaction enrollment; keep authoritative platform receipt separate |
| M | `packages/core/src/billing/services/wallet.service.ts` | Known019b tenant event/usage transaction enrollment; keep authoritative platform receipt separate |

## Future M provenance

- `packages/core/src/kernel/privacy/inventory.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/kernel/privacy/cleanup.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/privacy/services/source-catalog.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/privacy/services/read-catalog.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/privacy/services/write-catalog.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/kernel/metrics/collectors.ts`: TIP-045b-app-hardening.md
- `packages/core/src/ai/runs/run-events.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/usage-settlement.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/usage-receipts.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/usage-recovery.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/billing/services/usage-receipt.ts`: TIP-019b-runtime-integrity.md

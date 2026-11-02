# TIP-012b — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/integrations/src/registry.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/integrations/src/define.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/integrations/src/types.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/integrations/src/index.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/integrations/src/ports/bank-feed.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/integrations/src/connectors/sepay/adapter.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/integrations/src/connectors/sepay/manifest.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/integrations/src/connectors/casso/manifest.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/core/src/integrations/services/resolver.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/core/src/integrations/services/connections.service.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/core/src/integrations/services/read.service.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/core/src/integrations/services/webhook.service.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/core/src/integrations/jobs/integration-call.processor.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/core/src/integrations/jobs/integrations.jobs.module.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/core/src/integrations/actions/integration-connect.handler.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/core/src/integrations/actions/integration-disconnect.handler.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/core/src/integrations/integrations.module.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/core/src/integrations/public.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/core/src/sales/payments/services/bank-feed.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/core/src/sales/payments/actions/finance-config.handlers.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/core/src/sales/sales.module.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/core/src/sales/jobs/sales.jobs.module.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/core/src/ai/assistant/catalog.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/core/src/kernel/actions/action-context.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/core/src/index.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/actions/src/settings-apps.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/actions/src/payments.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/actions/src/index.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/db/prisma/tenant/integrations.prisma` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/db/prisma/tenant/sales-payments.prisma` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/shared/src/api/integrations.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/shared/src/api/index.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/shared/src/index.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/shared/src/events.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `apps/api/src/http/integrations/integrations.controller.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `apps/api/src/http/integrations/integrations.http.module.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `apps/api/src/http/integrations/hooks.controller.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `apps/web/src/features/settings/components/IntegrationsSection.tsx` | Existing connector/bank/UI integration; extract bounded modules |
| M | `apps/web/src/features/settings/components/ConnectIntegrationModal.tsx` | Existing connector/bank/UI integration; extract bounded modules |
| M | `apps/web/src/features/settings/api.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `apps/web/src/features/settings/types.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `apps/web/src/features/settings/styles/integrations.styles.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `apps/web/src/shared/api/mock/domains/settings.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `apps/web/src/shared/realtime/event-invalidation.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `apps/web/messages/vi/settings.json` | Existing connector/bank/UI integration; extract bounded modules |
| M | `apps/web/messages/en/settings.json` | Existing connector/bank/UI integration; extract bounded modules |
| M | `apps/web/messages/vi/actions.json` | Existing connector/bank/UI integration; extract bounded modules |
| M | `apps/web/messages/en/actions.json` | Existing connector/bank/UI integration; extract bounded modules |
| M | `tools/parity/parity.manifest.ts` | Existing connector/bank/UI integration; extract bounded modules |
| M | `packages/actions/src/integration-probe.ts` | Future023c/045b integration, no duplicate probe or recovery coordinator |
| M | `packages/core/src/integrations/actions/integration-test.handler.ts` | Future023c/045b integration, no duplicate probe or recovery coordinator |
| M | `packages/core/src/integrations/services/form-schema.ts` | Future023c/045b integration, no duplicate probe or recovery coordinator |
| M | `packages/core/src/kernel/consistency/consistency.jobs.module.ts` | Future023c/045b integration, no duplicate probe or recovery coordinator |
| C | `packages/integrations/src/connectors/casso/adapter.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/integrations/src/connectors/casso/normalize.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/integrations/src/connectors/casso/client.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/integrations/src/connectors/sepay/normalize.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/integrations/src/connectors/sepay/client.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/integrations/src/bank-validation.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/integrations/src/provider-errors.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/actions/src/integration-runtime.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/actions/src/bank-ingress.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/core/src/integrations/actions/integration-sync.handler.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/core/src/integrations/services/connection-detail.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/core/src/integrations/services/connection-health.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/core/src/integrations/services/adapter-selection.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/core/src/integrations/operations/call-receipt.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/core/src/integrations/operations/call-runner.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/core/src/integrations/operations/probe.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/core/src/integrations/operations/bank-pull.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/core/src/integrations/jobs/bank-sync.scheduler.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/core/src/integrations/events/integration.rules.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/core/src/sales/payments/bank/ingress.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/core/src/sales/payments/bank/receipt.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/core/src/sales/payments/bank/reconcile.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/core/src/sales/payments/bank/account-binding.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/core/src/sales/payments/bank/bank-event.consumer.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/core/src/sales/payments/actions/bank-ingest.handler.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/shared/src/api/integration-runtime.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/db/prisma/tenant/bank-ingress.prisma` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/db/prisma/tenant/migrations/20261102001220_bank_connector_runtime/migration.sql` | Dedicated runtime/adapter/ingress/read module |
| C | `apps/api/src/http/integrations/connection-detail.controller.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `apps/web/src/features/settings/components/IntegrationDetailDrawer.tsx` | Dedicated runtime/adapter/ingress/read module |
| C | `apps/web/src/features/settings/components/IntegrationCallLog.tsx` | Dedicated runtime/adapter/ingress/read module |
| C | `apps/web/src/features/settings/components/IntegrationHealth.tsx` | Dedicated runtime/adapter/ingress/read module |
| C | `apps/web/src/features/settings/hooks/useIntegrationDetail.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `apps/web/src/features/settings/integration-api.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `apps/web/src/features/settings/integration-types.ts` | Dedicated runtime/adapter/ingress/read module |
| C | `packages/integrations/test/bank-live-selection.test.ts` | Separate contract/native/replay/UI/live evidence |
| C | `packages/integrations/test/bank-normalization.test.ts` | Separate contract/native/replay/UI/live evidence |
| C | `packages/integrations/test/casso-contract.test.ts` | Separate contract/native/replay/UI/live evidence |
| C | `packages/integrations/test/sepay-contract.test.ts` | Separate contract/native/replay/UI/live evidence |
| C | `packages/integrations/test/live/bank-feed.live.test.ts` | Separate contract/native/replay/UI/live evidence |
| C | `packages/integrations/test/fixtures/casso/contracts.json` | Separate contract/native/replay/UI/live evidence |
| C | `packages/integrations/test/fixtures/sepay/contracts.json` | Separate contract/native/replay/UI/live evidence |
| C | `packages/core/test/integration-runtime.test.ts` | Separate contract/native/replay/UI/live evidence |
| C | `packages/core/test/integration-secret-errors.test.ts` | Separate contract/native/replay/UI/live evidence |
| C | `packages/core/test/bank-ingress.test.ts` | Separate contract/native/replay/UI/live evidence |
| C | `packages/core/test/bank-reconnect-dedupe.test.ts` | Separate contract/native/replay/UI/live evidence |
| C | `apps/api/test/integration/bank-connectors.test.ts` | Separate contract/native/replay/UI/live evidence |
| C | `apps/api/test/integration/bank-ingress.test.ts` | Separate contract/native/replay/UI/live evidence |
| C | `apps/api/test/integration/integration-detail.test.ts` | Separate contract/native/replay/UI/live evidence |
| C | `apps/worker/test/integration/bank-ingress-recovery.test.ts` | Separate contract/native/replay/UI/live evidence |
| C | `apps/web/src/features/settings/components/IntegrationDetailDrawer.test.tsx` | Separate contract/native/replay/UI/live evidence |
| C | `apps/web/e2e/integration-runtime.spec.ts` | Separate contract/native/replay/UI/live evidence |
| C | `apps/web/e2e/http/integration-runtime.spec.ts` | Separate contract/native/replay/UI/live evidence |
| C | `tools/parity/manifests/integration-runtime.ts` | Separate contract/native/replay/UI/live evidence |
| C | `fixtures/ai-eval/bank-vertical/cases.json` | Separate contract/native/replay/UI/live evidence |
| M | `apps/api/src/http/sales/tenant-payments-hook.controller.ts` | Canonical durable ACK and common raw-body bounds |
| M | `packages/shared/src/api/invoices.ts` | Current bank feed binding/health DTO, no secret exposure |
| M | `packages/core/src/sales/payments/services/invoices-read.service.ts` | Payment-settings current binding/health projection |
| M | `apps/web/src/shared/api/mock/domains/invoices.ts` | Bank binding pending/current mode contract |
| M | `apps/web/src/shared/api/mock/domains/invoices-actions.ts` | Activation/read mock follows real action lifecycle |
| M | `apps/web/src/shared/api/mock/invoices-shape.test.ts` | Legacy fields and new activation contract compatibility |
| C | `apps/web/src/features/settings/components/BankFeedBinding.tsx` | Explicit finance-only activate/switch controls without exposing credentials |
| C | `packages/core/src/integrations/actions/integration-read.handlers.ts` | Assistant current status/log reads reuse canonical HTTP reader |
| M | `packages/core/src/ai/tasks/task-scheduler.ts` | Payment event to AI task durable dispatch and current source authority |
| M | `packages/core/src/ai/tasks/task.queue.ts` | Payment event to AI task durable dispatch and current source authority |
| M | `packages/core/src/ai/tasks/task.jobs.ts` | Payment event to AI task durable dispatch and current source authority |
| M | `packages/core/src/ai/tasks/task.runner.ts` | Payment event to AI task durable dispatch and current source authority |
| C | `packages/core/src/ai/tasks/event-dispatch.ts` | Separate AI event-dispatch receipt/recovery domain; no logic in bank parser |
| C | `packages/db/prisma/tenant/ai-task-events.prisma` | Separate AI event-dispatch receipt/recovery domain; no logic in bank parser |
| C | `packages/db/prisma/tenant/migrations/20261102001221_ai_task_event_receipts/migration.sql` | Separate AI event-dispatch receipt/recovery domain; no logic in bank parser |
| C | `packages/core/test/ai-task-event-dispatch.test.ts` | Separate AI event-dispatch receipt/recovery domain; no logic in bank parser |
| C | `apps/worker/test/integration/ai-task-event-recovery.test.ts` | Separate AI event-dispatch receipt/recovery domain; no logic in bank parser |
| M | `packages/core/src/kernel/actions/secret-vault.ts` | Future023c purpose-bound worker probe access; no plaintext queue or generic secret export |

## Future M provenance

- `packages/actions/src/integration-probe.ts`: TIP-023c-generative-ui.md
- `packages/core/src/integrations/actions/integration-test.handler.ts`: TIP-023c-generative-ui.md
- `packages/core/src/integrations/services/form-schema.ts`: TIP-023c-generative-ui.md
- `packages/core/src/kernel/consistency/consistency.jobs.module.ts`: TIP-045b-app-hardening.md
- `packages/core/src/kernel/actions/secret-vault.ts`: TIP-023c-generative-ui.md

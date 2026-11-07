# TIP-034c — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/actions/src/support.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `packages/actions/src/index.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `packages/shared/src/index.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `packages/shared/src/api/index.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `packages/shared/src/api/tickets.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `packages/core/src/support/actions/ticket-edit.handlers.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `packages/core/src/support/services/ticket-write.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `packages/core/src/support/services/tickets-read.service.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `packages/core/src/support/ticket-access.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `packages/core/src/support/support.module.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `packages/core/src/support/jobs/support.jobs.module.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `packages/core/src/support/public.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `packages/core/src/kernel/actions/undo.service.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `packages/core/src/kernel/actions/actions.module.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `packages/core/src/kernel/actions/tip-owners.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `apps/web/src/features/tickets/components/BulkBar.tsx` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `apps/web/src/features/tickets/tickets-store.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `apps/web/src/features/tickets/types.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `apps/web/src/features/tickets/screens/TicketsScreen.tsx` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `apps/web/src/shared/actions/useAction.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `apps/web/src/features/assistant/screens/ActionLogScreen.tsx` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `apps/web/src/shared/api/mock/domains/tickets-actions.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `apps/web/src/shared/api/mock/mock-transport.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `apps/web/src/shared/api/mock/domains/tickets.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `apps/web/messages/vi/tickets.json` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `apps/web/messages/en/tickets.json` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `apps/web/messages/vi/actions.json` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `apps/web/messages/en/actions.json` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `apps/web/messages/vi/errors.json` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `apps/web/messages/en/errors.json` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `apps/api/test/integration/support.test.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `tools/parity/parity.manifest.ts` | Existing domain/canonical undo bridge and actual UI/mock consumers; extract at file caps |
| M | `packages/core/src/kernel/jobs/bulk-dispatch.ts` | Predecessor kernel receipts/current authority and typed Assistant completion, not a parallel execution engine |
| M | `packages/core/src/kernel/jobs/bulk-status.ts` | Predecessor kernel receipts/current authority and typed Assistant completion, not a parallel execution engine |
| M | `packages/db/prisma/tenant/data-jobs.prisma` | Predecessor kernel receipts/current authority and typed Assistant completion, not a parallel execution engine |
| M | `packages/core/src/kernel/actions/action-context.ts` | Predecessor kernel receipts/current authority and typed Assistant completion, not a parallel execution engine |
| M | `packages/core/src/ai/assistant/genui/extension-registry.ts` | Predecessor kernel receipts/current authority and typed Assistant completion, not a parallel execution engine |
| M | `packages/core/src/ai/assistant/genui/refs.ts` | Predecessor kernel receipts/current authority and typed Assistant completion, not a parallel execution engine |
| M | `packages/core/src/ai/assistant/genui/history.ts` | Predecessor kernel receipts/current authority and typed Assistant completion, not a parallel execution engine |
| M | `apps/api/test/integration/actions/ticket.bulk_update.action.test.ts` | Predecessor kernel receipts/current authority and typed Assistant completion, not a parallel execution engine |
| M | `packages/shared/src/data-transfer/registry.ts` | Future038b export-only current-authorized bulk outcome dataset; no ticket import |
| M | `packages/shared/src/api/data-transfer.ts` | Future038b export-only current-authorized bulk outcome dataset; no ticket import |
| M | `packages/core/src/data-transfer/types.ts` | Future038b export-only current-authorized bulk outcome dataset; no ticket import |
| M | `packages/core/src/data-transfer/data-transfer.providers.ts` | Future038b export-only current-authorized bulk outcome dataset; no ticket import |
| M | `packages/core/src/data-transfer/data-transfer.module.ts` | Future038b export-only current-authorized bulk outcome dataset; no ticket import |
| M | `packages/core/src/data-transfer/services/planner.ts` | Future038b export-only current-authorized bulk outcome dataset; no ticket import |
| M | `apps/web/messages/vi/data-transfer.json` | Future038b export-only current-authorized bulk outcome dataset; no ticket import |
| M | `apps/web/messages/en/data-transfer.json` | Future038b export-only current-authorized bulk outcome dataset; no ticket import |
| C | `packages/actions/src/support-bulk.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `packages/shared/src/support/bulk.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `packages/shared/src/support/bulk.test.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `packages/shared/src/api/ticket-bulk.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `packages/db/prisma/tenant/migrations/20261102003420_ticket_bulk/migration.sql` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `packages/core/src/support/bulk/parent.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `packages/core/src/support/bulk/item.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `packages/core/src/support/bulk/mutations.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `packages/core/src/support/bulk/undo.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `packages/core/src/support/bulk/results.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `packages/core/src/support/bulk/providers.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `packages/core/src/kernel/actions/undo-action-registry.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `packages/core/src/data-transfer/adapters/ticket-bulk-results.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `apps/web/src/features/tickets/hooks/useTicketBulk.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `apps/web/src/features/tickets/components/TicketBulkResults.tsx` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `apps/web/src/features/tickets/bulk-types.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `apps/web/src/shared/actions/run-action-request.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `apps/web/src/shared/actions/undo-action.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `apps/web/src/shared/actions/useUndoAction.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `packages/actions/test/support-bulk.test.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `packages/core/test/ticket-bulk.test.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `apps/api/test/integration/ticket-bulk.test.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `apps/worker/test/integration/ticket-bulk-composition.test.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `apps/web/src/features/tickets/components/TicketBulkResults.test.tsx` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `apps/web/src/shared/actions/undo-action.test.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `apps/web/e2e/ticket-bulk.mock.spec.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `apps/web/e2e/http/ticket-bulk.spec.ts` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| C | `fixtures/ai-eval/ticket-bulk.json` | Bounded support bulk/undo modules, neutral undo action mapping and separate evidence |
| M | `packages/actions/src/define.ts` | Canonical idempotency requirement for bulk update and undo, shared web/server helper |
| M | `packages/core/src/support/events/support.rules.ts` | Current scoped invalidation for changed assignment/priority/undo, no hidden result payload |
| M | `apps/web/src/shared/realtime/event-invalidation.ts` | Actual ticket query invalidation after bulk and undo |

## Future M provenance

- `packages/core/src/kernel/jobs/bulk-dispatch.ts`: TIP-045b-app-hardening.md
- `packages/core/src/kernel/jobs/bulk-status.ts`: TIP-045b-app-hardening.md
- `packages/db/prisma/tenant/data-jobs.prisma`: TIP-045b-app-hardening.md
- `packages/core/src/ai/assistant/genui/extension-registry.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/refs.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/history.ts`: TIP-023c-generative-ui.md
- `apps/api/test/integration/actions/ticket.bulk_update.action.test.ts`: TIP-023b-assistant-coverage.md
- `packages/shared/src/data-transfer/registry.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/shared/src/api/data-transfer.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/types.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/data-transfer.providers.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/data-transfer.module.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/services/planner.ts`: TIP-038b-ai-first-data-transfer.md
- `apps/web/messages/vi/data-transfer.json`: TIP-038b-ai-first-data-transfer.md
- `apps/web/messages/en/data-transfer.json`: TIP-038b-ai-first-data-transfer.md

# TIP-034d — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/actions/src/index.ts` | Existing composition/DTO/UI seams; additive stock contract, facade-only if over cap |
| M | `packages/shared/src/index.ts` | Existing composition/DTO/UI seams; additive stock contract, facade-only if over cap |
| M | `packages/shared/src/api/index.ts` | Existing composition/DTO/UI seams; additive stock contract, facade-only if over cap |
| M | `packages/shared/src/api/tickets.ts` | Existing composition/DTO/UI seams; additive stock contract, facade-only if over cap |
| M | `packages/core/src/kernel/actions/tip-owners.ts` | Existing composition/DTO/UI seams; additive stock contract, facade-only if over cap |
| M | `packages/core/src/support/support.module.ts` | Existing composition/DTO/UI seams; additive stock contract, facade-only if over cap |
| M | `packages/core/src/support/public.ts` | Existing composition/DTO/UI seams; additive stock contract, facade-only if over cap |
| M | `packages/core/src/support/services/tickets-read.service.ts` | Existing composition/DTO/UI seams; additive stock contract, facade-only if over cap |
| M | `packages/core/src/support/jobs/support.jobs.module.ts` | Existing composition/DTO/UI seams; additive stock contract, facade-only if over cap |
| M | `apps/web/src/features/tickets/components/TicketsHeader.tsx` | Existing composition/DTO/UI seams; additive stock contract, facade-only if over cap |
| M | `apps/web/src/features/tickets/types.ts` | Existing composition/DTO/UI seams; additive stock contract, facade-only if over cap |
| M | `apps/web/src/shared/api/mock/domains/tickets.ts` | Existing composition/DTO/UI seams; additive stock contract, facade-only if over cap |
| M | `apps/web/src/shared/api/mock/handlers.ts` | Existing composition/DTO/UI seams; additive stock contract, facade-only if over cap |
| M | `apps/web/messages/vi/tickets.json` | Existing composition/DTO/UI seams; additive stock contract, facade-only if over cap |
| M | `apps/web/messages/en/tickets.json` | Existing composition/DTO/UI seams; additive stock contract, facade-only if over cap |
| M | `apps/web/messages/vi/actions.json` | Existing composition/DTO/UI seams; additive stock contract, facade-only if over cap |
| M | `apps/web/messages/en/actions.json` | Existing composition/DTO/UI seams; additive stock contract, facade-only if over cap |
| M | `tools/parity/parity.manifest.ts` | Existing composition/DTO/UI seams; additive stock contract, facade-only if over cap |
| M | `coding-packs/plans/BLUEPRINT.md` | Existing composition/DTO/UI seams; additive stock contract, facade-only if over cap |
| M | `coding-packs/docs/06-prototype/DEVIATIONS.md` | Existing composition/DTO/UI seams; additive stock contract, facade-only if over cap |
| M | `packages/core/src/support/privacy/adapter.ts` | Future015c/045b: stock source lineage, guarded publication and cleanup including derived summaries |
| M | `packages/core/src/support/privacy/inventory.ts` | Future015c/045b: stock source lineage, guarded publication and cleanup including derived summaries |
| M | `packages/core/src/support/privacy/cleanup.ts` | Future015c/045b: stock source lineage, guarded publication and cleanup including derived summaries |
| M | `packages/core/src/authz/fields/history-provenance.ts` | Future015c/045b: stock source lineage, guarded publication and cleanup including derived summaries |
| C | `packages/actions/src/support-stock.ts` | Bounded stock observation/read/AI projection modules and isolated UI, no new business writer |
| C | `packages/shared/src/support/stock-metrics.ts` | Bounded stock observation/read/AI projection modules and isolated UI, no new business writer |
| C | `packages/shared/src/api/ticket-stock.ts` | Bounded stock observation/read/AI projection modules and isolated UI, no new business writer |
| C | `packages/db/prisma/tenant/ticket-stock.prisma` | Bounded stock observation/read/AI projection modules and isolated UI, no new business writer |
| C | `packages/db/prisma/tenant/migrations/20261102003430_ticket_stock/migration.sql` | Bounded stock observation/read/AI projection modules and isolated UI, no new business writer |
| C | `packages/core/src/support/trends/types.ts` | Bounded stock observation/read/AI projection modules and isolated UI, no new business writer |
| C | `packages/core/src/support/trends/metrics-sql.ts` | Bounded stock observation/read/AI projection modules and isolated UI, no new business writer |
| C | `packages/core/src/support/trends/control.ts` | Bounded stock observation/read/AI projection modules and isolated UI, no new business writer |
| C | `packages/core/src/support/trends/snapshot.ts` | Bounded stock observation/read/AI projection modules and isolated UI, no new business writer |
| C | `packages/core/src/support/trends/read.ts` | Bounded stock observation/read/AI projection modules and isolated UI, no new business writer |
| C | `packages/core/src/support/trends/cleanup.ts` | Bounded stock observation/read/AI projection modules and isolated UI, no new business writer |
| C | `packages/core/src/support/trends/installer.ts` | Bounded stock observation/read/AI projection modules and isolated UI, no new business writer |
| C | `packages/core/src/support/trends/providers.ts` | Bounded stock observation/read/AI projection modules and isolated UI, no new business writer |
| C | `packages/core/src/support/trends/handler.ts` | Bounded stock observation/read/AI projection modules and isolated UI, no new business writer |
| C | `packages/core/src/support/trends/projection.ts` | Bounded stock observation/read/AI projection modules and isolated UI, no new business writer |
| C | `packages/core/src/support/trends/source-guard.ts` | Bounded stock observation/read/AI projection modules and isolated UI, no new business writer |
| C | `apps/web/src/features/tickets/components/TicketTrendBadge.tsx` | Bounded stock observation/read/AI projection modules and isolated UI, no new business writer |
| C | `apps/web/src/features/tickets/components/TicketTrendDetails.tsx` | Bounded stock observation/read/AI projection modules and isolated UI, no new business writer |
| C | `apps/web/src/shared/api/mock/domains/ticket-stock.ts` | Bounded stock observation/read/AI projection modules and isolated UI, no new business writer |
| C | `packages/actions/test/support-stock.test.ts` | Separate fixed-Clock/native/privacy/AI/composition/query/UI evidence |
| C | `packages/shared/src/support/stock-metrics.test.ts` | Separate fixed-Clock/native/privacy/AI/composition/query/UI evidence |
| C | `packages/core/test/ticket-stock.test.ts` | Separate fixed-Clock/native/privacy/AI/composition/query/UI evidence |
| C | `packages/core/test/ticket-stock-queries.test.ts` | Separate fixed-Clock/native/privacy/AI/composition/query/UI evidence |
| C | `apps/api/test/integration/ticket-stock.test.ts` | Separate fixed-Clock/native/privacy/AI/composition/query/UI evidence |
| C | `apps/api/test/integration/ticket-stock-privacy.test.ts` | Separate fixed-Clock/native/privacy/AI/composition/query/UI evidence |
| C | `apps/api/test/integration/actions/ticket.stock_summary.action.test.ts` | Separate fixed-Clock/native/privacy/AI/composition/query/UI evidence |
| C | `apps/worker/test/integration/ticket-stock-composition.test.ts` | Separate fixed-Clock/native/privacy/AI/composition/query/UI evidence |
| C | `apps/web/src/features/tickets/components/TicketTrendBadge.test.tsx` | Separate fixed-Clock/native/privacy/AI/composition/query/UI evidence |
| C | `apps/web/src/features/tickets/components/TicketTrendDetails.test.tsx` | Separate fixed-Clock/native/privacy/AI/composition/query/UI evidence |
| C | `apps/web/e2e/ticket-stock.mock.spec.ts` | Separate fixed-Clock/native/privacy/AI/composition/query/UI evidence |
| C | `apps/web/e2e/http/ticket-stock.spec.ts` | Separate fixed-Clock/native/privacy/AI/composition/query/UI evidence |
| C | `fixtures/ai-eval/ticket-stock.json` | Separate fixed-Clock/native/privacy/AI/composition/query/UI evidence |
| M | `apps/web/src/features/tickets/api.ts` | Focus/refetch metadata within60s across local midnight, no model or observation write |

## Future M provenance

- `packages/core/src/support/privacy/adapter.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/support/privacy/inventory.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/support/privacy/cleanup.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/authz/fields/history-provenance.ts`: TIP-045b-app-hardening.md

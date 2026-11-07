# TIP-034b — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/actions/src/index.ts` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `packages/shared/src/index.ts` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `packages/shared/src/api/index.ts` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `packages/shared/src/api/tickets.ts` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `packages/core/src/kernel/actions/tip-owners.ts` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `packages/core/src/support/support.module.ts` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `packages/core/src/support/public.ts` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `packages/core/src/support/services/tickets-read.service.ts` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `apps/api/src/http/support/support.http.module.ts` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `apps/web/src/features/settings/registry.ts` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `apps/web/src/features/settings/screens/SettingsScreen.tsx` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `apps/web/src/features/settings/ui-commands.ts` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `apps/web/src/features/tickets/components/TicketFormModal.tsx` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `apps/web/src/features/tickets/components/TicketsHeader.tsx` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `apps/web/src/features/tickets/types.ts` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `apps/web/src/shared/api/mock/domains/tickets.ts` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `apps/web/src/shared/api/mock/handlers.ts` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `apps/web/src/shared/api/mock/routes.ts` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `apps/web/src/shared/api/mock/store.ts` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `apps/web/messages/vi/settings.json` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `apps/web/messages/en/settings.json` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `apps/web/messages/vi/tickets.json` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `apps/web/messages/en/tickets.json` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `apps/web/messages/vi/actions.json` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `apps/web/messages/en/actions.json` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `tools/parity/parity.manifest.ts` | Existing composition, current category projection and actual UI/mock consumers; facade-only when over cap |
| M | `packages/shared/src/data-transfer/registry.ts` | Future038b dataset registration, whole-dictionary atomic operation and current configuration CAS |
| M | `packages/shared/src/api/data-transfer.ts` | Future038b dataset registration, whole-dictionary atomic operation and current configuration CAS |
| M | `packages/core/src/data-transfer/types.ts` | Future038b dataset registration, whole-dictionary atomic operation and current configuration CAS |
| M | `packages/core/src/data-transfer/data-transfer.providers.ts` | Future038b dataset registration, whole-dictionary atomic operation and current configuration CAS |
| M | `packages/core/src/data-transfer/services/planner.ts` | Future038b dataset registration, whole-dictionary atomic operation and current configuration CAS |
| M | `packages/core/src/data-transfer/services/validation.ts` | Future038b dataset registration, whole-dictionary atomic operation and current configuration CAS |
| M | `packages/core/src/data-transfer/jobs/transfer.runner.ts` | Future038b dataset registration, whole-dictionary atomic operation and current configuration CAS |
| M | `apps/web/messages/vi/data-transfer.json` | Future038b dataset registration, whole-dictionary atomic operation and current configuration CAS |
| M | `apps/web/messages/en/data-transfer.json` | Future038b dataset registration, whole-dictionary atomic operation and current configuration CAS |
| C | `packages/actions/src/support-categories.ts` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `packages/shared/src/support/category-config.ts` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `packages/shared/src/support/category-config.test.ts` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `packages/shared/src/api/ticket-categories.ts` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `packages/db/prisma/tenant/ticket-categories.prisma` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `packages/db/prisma/tenant/migrations/20261102003410_ticket_categories/migration.sql` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `packages/core/src/support/categories/handlers.ts` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `packages/core/src/support/categories/read.ts` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `packages/core/src/support/categories/repository.ts` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `packages/core/src/support/categories/providers.ts` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `packages/core/src/data-transfer/adapters/ticket-categories.ts` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `apps/api/src/http/support/ticket-categories.controller.ts` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `apps/web/src/features/settings/components/TicketCategoriesSection.tsx` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `apps/web/src/features/settings/components/CategorySuggestionsEditor.tsx` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `apps/web/src/features/settings/hooks/useTicketCategories.ts` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `apps/web/src/features/settings/category-api.ts` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `apps/web/src/features/tickets/components/TicketCategoryInput.tsx` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `apps/web/src/shared/api/mock/domains/ticket-categories.ts` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `packages/actions/test/support-categories.test.ts` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `packages/core/test/support-categories.test.ts` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `apps/api/test/integration/support-categories.test.ts` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `apps/worker/test/integration/support-categories-composition.test.ts` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `apps/web/src/features/settings/components/TicketCategoriesSection.test.tsx` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `apps/web/e2e/support-categories.mock.spec.ts` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `apps/web/e2e/http/support-categories.spec.ts` | Bounded category configuration module, adapters and separate acceptance evidence |
| C | `fixtures/ai-eval/support-categories.json` | Bounded category configuration module, adapters and separate acceptance evidence |
| M | `packages/core/src/data-transfer/data-transfer.module.ts` | Import exported support category service for typed adapter; no cross-domain private service import |
| M | `coding-packs/plans/BLUEPRINT.md` | Append category settings route/actions and config-only schema; preserve approved policy |
| M | `coding-packs/docs/06-prototype/DEVIATIONS.md` | Record actual new settings extension and preserved existing-screen parity, not invented baseline |
| M | `packages/shared/src/events.ts` | Facade export of new bounded category event schema |
| C | `packages/shared/src/support/category-events.ts` | Typed category changed envelope, no labels or ticket metadata |
| C | `packages/core/src/support/categories/events.ts` | Current-authorized realtime invalidation via notify registered rules |
| M | `apps/web/src/shared/realtime/event-invalidation.ts` | Invalidate category config and ticket suggestions on current scoped signals |

## Future M provenance

- `packages/shared/src/data-transfer/registry.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/shared/src/api/data-transfer.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/types.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/data-transfer.providers.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/services/planner.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/services/validation.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/jobs/transfer.runner.ts`: TIP-038b-ai-first-data-transfer.md
- `apps/web/messages/vi/data-transfer.json`: TIP-038b-ai-first-data-transfer.md
- `apps/web/messages/en/data-transfer.json`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/data-transfer.module.ts`: TIP-038b-ai-first-data-transfer.md

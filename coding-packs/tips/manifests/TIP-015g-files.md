# TIP-015g — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/core/src/crm/services/stage-rules.ts` | Preserve public contracts; extract stage mutation/undo and verify contact-first producer locks/Clock; over-cap file facade only |
| M | `packages/core/src/crm/actions/contact-write.handlers.ts` | Preserve public contracts; extract stage mutation/undo and verify contact-first producer locks/Clock; over-cap file facade only |
| M | `packages/core/src/crm/crm.module.ts` | Preserve public contracts; extract stage mutation/undo and verify contact-first producer locks/Clock; over-cap file facade only |
| M | `packages/core/src/crm/public.ts` | Preserve public contracts; extract stage mutation/undo and verify contact-first producer locks/Clock; over-cap file facade only |
| M | `packages/core/src/sales/quotes/actions/quote-send.handlers.ts` | Preserve public contracts; extract stage mutation/undo and verify contact-first producer locks/Clock; over-cap file facade only |
| M | `packages/core/src/sales/quotes/actions/quote-decide.handlers.ts` | Preserve public contracts; extract stage mutation/undo and verify contact-first producer locks/Clock; over-cap file facade only |
| M | `packages/core/src/sales/quotes/services/quote-system.ts` | Preserve public contracts; extract stage mutation/undo and verify contact-first producer locks/Clock; over-cap file facade only |
| M | `packages/core/src/sales/orders/actions/order-flow.handlers.ts` | Preserve public contracts; extract stage mutation/undo and verify contact-first producer locks/Clock; over-cap file facade only |
| M | `packages/core/src/contracts/actions/contract-send.handlers.ts` | Preserve public contracts; extract stage mutation/undo and verify contact-first producer locks/Clock; over-cap file facade only |
| M | `packages/core/src/contracts/services/public-sign.service.ts` | Preserve public contracts; extract stage mutation/undo and verify contact-first producer locks/Clock; over-cap file facade only |
| M | `packages/core/src/crm/lifecycle/lock.ts` | Future015f/030c/003c locked canonical family capability and actual system/finalization producers |
| M | `packages/core/src/crm/lifecycle/family.ts` | Future015f/030c/003c locked canonical family capability and actual system/finalization producers |
| M | `packages/core/src/contracts/signing/finalize.ts` | Future015f/030c/003c locked canonical family capability and actual system/finalization producers |
| M | `packages/core/src/sales/system/handlers.ts` | Future015f/030c/003c locked canonical family capability and actual system/finalization producers |
| C | `packages/core/src/crm/stage/types.ts` | Bounded shared stage guard, canonical manual handler/undo and separate native/UI/AI evidence |
| C | `packages/core/src/crm/stage/rules.ts` | Bounded shared stage guard, canonical manual handler/undo and separate native/UI/AI evidence |
| C | `packages/core/src/crm/stage/manual.handler.ts` | Bounded shared stage guard, canonical manual handler/undo and separate native/UI/AI evidence |
| C | `packages/core/src/crm/stage/undo.ts` | Bounded shared stage guard, canonical manual handler/undo and separate native/UI/AI evidence |
| C | `packages/core/test/crm-stage-hold.test.ts` | Bounded shared stage guard, canonical manual handler/undo and separate native/UI/AI evidence |
| C | `apps/api/test/integration/crm-stage-hold.test.ts` | Bounded shared stage guard, canonical manual handler/undo and separate native/UI/AI evidence |
| C | `apps/api/test/integration/crm-stage-producers.test.ts` | Bounded shared stage guard, canonical manual handler/undo and separate native/UI/AI evidence |
| C | `apps/api/test/integration/crm-stage-undo.test.ts` | Bounded shared stage guard, canonical manual handler/undo and separate native/UI/AI evidence |
| C | `apps/web/e2e/http/crm-stage-hold.spec.ts` | Bounded shared stage guard, canonical manual handler/undo and separate native/UI/AI evidence |
| C | `fixtures/ai-eval/crm-stage-hold.json` | Bounded shared stage guard, canonical manual handler/undo and separate native/UI/AI evidence |
| C | `packages/core/src/sales/quotes/services/open-family-quote.ts` | Canonical-family scoped narrow EXISTS; exact approved open statuses |
| C | `packages/db/prisma/tenant/migrations/20261102001570_crm_stage_quote_lookup/migration.sql` | Partial quote(contact_id,status,id) live index for atomic fallback predicate; no new counter/schema fields |

## Future M provenance

- `packages/core/src/crm/lifecycle/lock.ts`: TIP-015f-contact-lifecycle.md
- `packages/core/src/crm/lifecycle/family.ts`: TIP-015f-contact-lifecycle.md
- `packages/core/src/contracts/signing/finalize.ts`: TIP-030c-parent-signing.md
- `packages/core/src/sales/system/handlers.ts`: TIP-003c-system-actions.md

# TIP-003e — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/db/prisma/tenant/ai-agents.prisma` | row_version |
| M | `packages/db/prisma/tenant/kernel.prisma` | action_log.correction |
| C | `packages/db/prisma/tenant/migrations/20261102006100_action_integrity/migration.sql` | Cột version + trigger append-only |
| M | `packages/actions/src/support.ts` | if_version ticket |
| M | `packages/actions/src/invoices.ts` | if_version invoice |
| M | `packages/actions/src/ai.ts` | if_version agent |
| M | `packages/actions/src/index.ts` | Export action correction |
| M | `packages/core/src/support/actions/ticket-edit.handlers.ts` | CAS |
| C | `packages/core/src/kernel/actions/undo-allowance.ts` | withUndoAllowance (SET LOCAL) |
| M | `packages/core/src/kernel/actions/executor.ts` | STALE_VERSION chuẩn; undo trong withUndoAllowance |
| C | `packages/core/src/kernel/actions/cas.ts` | Helper UPDATE … WHERE version |
| C | `packages/core/src/kernel/actions/correction.handler.ts` | action_log.add_correction |
| C | `packages/actions/src/action-log.ts` | Định nghĩa action_log.add_correction |
| M | `apps/web/src/shared/actions/useAction.ts` | Xử lý 409 |
| C | `apps/web/src/shared/actions/StaleVersionModal.tsx` | Modal xung đột |
| M | `apps/web/messages/vi/errors.json` | STALE_VERSION |
| M | `apps/web/messages/en/errors.json` | STALE_VERSION |
| M | `apps/web/messages/vi/actions.json` | action_log.add_correction |
| M | `apps/web/messages/en/actions.json` | action_log.add_correction |
| C | `packages/core/test/concurrency-unit.test.ts` | Unit CAS |
| C | `apps/api/test/integration/concurrency.test.ts` | Song song + trigger |
| C | `apps/web/e2e/concurrency.spec.ts` | FE 409 |
| C | `apps/api/test/integration/read-shape-contract.test.ts` | So shape FE↔BE |

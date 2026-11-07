# TIP-032c — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/actions/src/contracts.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/actions/src/orders.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/actions/src/index.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/contracts/actions/contract-write.handlers.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/contracts/actions/contract-approval.handlers.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/contracts/actions/contract-draft.handler.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/contracts/contract-access.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/contracts/contracts.module.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/contracts/services/contract-write.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/contracts/services/contract-view.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/contracts/services/contracts-read.service.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/contracts/repos/contracts.repo.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/sales/orders/actions/order-create.handlers.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/sales/orders/actions/order-edit.handlers.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/sales/orders/actions/order-flow.handlers.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/sales/orders/actions/order-from-appointment.handler.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/sales/orders/order-access.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/sales/orders/services/order-write.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/sales/orders/services/order-import.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/sales/orders/services/order-view.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/sales/orders/services/orders-read.service.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/sales/orders/repos/orders.repo.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/sales/sales.module.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/sales/quotes/services/conversion-lock.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/authz/data-access/record-policy.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/authz/data-access/scope-sql.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/data-transfer/adapters/orders.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/data-transfer/adapters/contracts.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/insights/exports/sales-readers.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/insights/metrics/sales.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/core/src/ai/assistant/catalog.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/shared/src/api/contracts.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/shared/src/api/orders.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/shared/src/i18n/server/vi/sales.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/shared/src/i18n/server/en/sales.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/db/prisma/tenant/contracts.prisma` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `packages/db/prisma/tenant/sales-orders.prisma` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/api/src/http/contracts/contracts.controller.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/api/src/http/sales/orders.controller.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/features/contracts/hooks/useContractForm.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/features/contracts/components/ContractFormModal.tsx` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/features/contracts/components/ContractDrawer.tsx` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/features/contracts/components/DetailTabs.tsx` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/features/contracts/components/ContractsToolbar.tsx` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/features/contracts/types.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/features/contracts/api.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/features/contracts/columns.tsx` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/features/orders/hooks/useOrderForm.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/features/orders/components/OrderFormModal.tsx` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/features/orders/components/OrderDrawer.tsx` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/features/orders/components/DetailTabs.tsx` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/features/orders/components/ShippingCard.tsx` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/features/orders/components/OrdersToolbar.tsx` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/features/orders/types.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/features/orders/api.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/features/orders/columns.tsx` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/shared/api/mock/domains/contracts.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/shared/api/mock/domains/contracts-actions.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/shared/api/mock/domains/orders.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/src/shared/api/mock/domains/orders-actions.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/messages/vi/contracts.json` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/messages/en/contracts.json` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/messages/vi/orders.json` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/messages/en/orders.json` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/messages/vi/actions.json` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/web/messages/en/actions.json` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/api/test/integration/actions/contract.update.action.test.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/api/test/integration/actions/order.update.action.test.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/api/test/integration/actions/order.set_deposit.action.test.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `apps/api/test/integration/actions/order.update_shipping.action.test.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| M | `tools/parity/parity.manifest.ts` | Existing or predecessor seam; attribution, revision, current scope and UI propagation |
| C | `packages/actions/src/commerce-edit-schemas.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `packages/core/src/contracts/editing/contract-edit.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `packages/core/src/contracts/editing/contract-undo.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `packages/core/src/contracts/editing/contract-version.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `packages/core/src/contracts/editing/contract-assignment.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `packages/core/src/sales/orders/editing/order-edit.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `packages/core/src/sales/orders/editing/order-undo.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `packages/core/src/sales/orders/editing/order-version.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `packages/core/src/sales/orders/editing/order-assignment.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `packages/db/prisma/tenant/migrations/20261102003230_commerce_edit_integrity/migration.sql` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `apps/web/src/features/contracts/components/ContractEditConflict.tsx` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `apps/web/src/features/orders/components/OrderEditConflict.tsx` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `apps/web/src/features/contracts/hooks/useContractEditVersion.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `apps/web/src/features/orders/hooks/useOrderEditVersion.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `packages/actions/test/commerce-edit-integrity.test.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `packages/core/test/commerce-attribution.test.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `packages/core/test/commerce-edit-undo.test.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `packages/core/test/commerce-edit-version.test.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `apps/api/test/integration/commerce-attribution.test.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `apps/api/test/integration/commerce-edit-undo.test.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `apps/api/test/integration/commerce-edit-concurrency.test.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `apps/web/src/features/contracts/hooks/useContractEditVersion.test.tsx` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `apps/web/src/features/orders/hooks/useOrderEditVersion.test.tsx` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `apps/web/e2e/commerce-edit-integrity.spec.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `apps/web/e2e/http/commerce-edit-integrity.spec.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `tools/parity/modules/commerce-edit-integrity.ts` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `fixtures/ai-eval/commerce-edit-integrity/cases.json` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `coding-packs/reports/TIP-032c-completion.md` | Bounded edit/assignment/version/undo module or dedicated verification |
| C | `packages/core/src/sales/orders/editing/order-create-undo.ts` | Retained cancel compensation for guarded pristine create undo |
| C | `packages/core/src/contracts/editing/contract-create-undo.ts` | Version/current-scope/dependency-aware create and delete inverse |
| M | `apps/web/src/features/orders/orders-store.ts` | Explicit order edit entrypoint/global host or canonical030b parent-revision hook |
| M | `apps/web/src/features/orders/screens/OrdersScreen.tsx` | Explicit order edit entrypoint/global host or canonical030b parent-revision hook |
| M | `apps/web/src/features/orders/ui-commands.ts` | Explicit order edit entrypoint/global host or canonical030b parent-revision hook |
| M | `apps/web/src/app/(app)/_crm-forms/CrmFormsHost.tsx` | Explicit order edit entrypoint/global host or canonical030b parent-revision hook |
| M | `apps/web/src/app/(app)/_crm-forms/FormCommandHost.tsx` | Explicit order edit entrypoint/global host or canonical030b parent-revision hook |
| M | `packages/core/src/contracts/files/source.ts` | Explicit order edit entrypoint/global host or canonical030b parent-revision hook |
| M | `packages/core/src/contracts/files/suggestions.ts` | Explicit order edit entrypoint/global host or canonical030b parent-revision hook |
| M | `packages/core/src/contracts/actions/contract-file.handlers.ts` | Explicit order edit entrypoint/global host or canonical030b parent-revision hook |
| M | `packages/core/src/contracts/actions/contract-suggestion.handler.ts` | Explicit order edit entrypoint/global host or canonical030b parent-revision hook |
| C | `apps/web/src/features/orders/components/OrderEditModal.tsx` | Separate bounded edit view; creation modal not expanded |
| M | `apps/web/src/features/orders/index.ts` | Export edit modal to app-level global host |

## Future M provenance

- `packages/core/src/contracts/actions/contract-draft.handler.ts`: TIP-030b-contract-files.md
- `packages/core/src/sales/quotes/services/conversion-lock.ts`: TIP-032b-commerce-gaps.md
- `packages/core/src/authz/data-access/record-policy.ts`: TIP-042c-record-scope.md
- `packages/core/src/authz/data-access/scope-sql.ts`: TIP-042c-record-scope.md
- `packages/core/src/data-transfer/adapters/orders.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/adapters/contracts.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/insights/exports/sales-readers.ts`: TIP-038-insights-dashboard.md
- `packages/core/src/insights/metrics/sales.ts`: TIP-038-insights-dashboard.md
- `apps/api/test/integration/actions/contract.update.action.test.ts`: TIP-023b-assistant-coverage.md
- `apps/api/test/integration/actions/order.update.action.test.ts`: TIP-023b-assistant-coverage.md
- `apps/api/test/integration/actions/order.set_deposit.action.test.ts`: TIP-023b-assistant-coverage.md
- `apps/api/test/integration/actions/order.update_shipping.action.test.ts`: TIP-023b-assistant-coverage.md
- `apps/web/src/app/(app)/_crm-forms/FormCommandHost.tsx`: TIP-025b-inbox-vertical.md
- `packages/core/src/contracts/files/source.ts`: TIP-030b-contract-files.md
- `packages/core/src/contracts/files/suggestions.ts`: TIP-030b-contract-files.md
- `packages/core/src/contracts/actions/contract-file.handlers.ts`: TIP-030b-contract-files.md
- `packages/core/src/contracts/actions/contract-suggestion.handler.ts`: TIP-030b-contract-files.md

# TIP-032d — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/actions/src/index.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `packages/shared/src/api/index.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `packages/core/src/sales/sales.module.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `packages/core/src/sales/orders/services/order-insights.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `packages/core/src/sales/payments/services/invoices-read.service.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `packages/core/src/sales/privacy/inventory.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `packages/core/src/sales/privacy/cleanup.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `packages/core/src/kernel/files/file-access.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `packages/core/src/kernel/files/files.service.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `packages/core/src/kernel/files/signed-url.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `packages/core/src/kernel/privacy/inventory.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `packages/core/src/kernel/privacy/cleanup.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `packages/core/src/ai/assistant/genui/extension-registry.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `packages/core/src/ai/assistant/genui/refs.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `packages/core/src/ai/assistant/genui/history.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `packages/core/src/ai/assistant/genui/submit.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `packages/core/src/ai/assistant/discovery/authority.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `apps/api/src/http/files/files.controller.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `packages/shared/src/api/orders.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `packages/shared/src/api/invoices.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `apps/web/src/features/orders/components/OrderDrawer.tsx` | Wire current record-specific file association/read/download/privacy and real host |
| M | `apps/web/src/features/orders/components/DetailTabs.tsx` | Wire current record-specific file association/read/download/privacy and real host |
| M | `apps/web/src/features/orders/api.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `apps/web/src/features/orders/types.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `apps/web/src/features/invoices/components/InvoiceDrawer.tsx` | Wire current record-specific file association/read/download/privacy and real host |
| M | `apps/web/src/features/invoices/components/DetailTabs.tsx` | Wire current record-specific file association/read/download/privacy and real host |
| M | `apps/web/src/features/invoices/api.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `apps/web/src/features/invoices/types.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `apps/web/src/shared/api/mock/domains/orders.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `apps/web/src/shared/api/mock/domains/invoices.ts` | Wire current record-specific file association/read/download/privacy and real host |
| M | `apps/web/messages/vi/orders.json` | Wire current record-specific file association/read/download/privacy and real host |
| M | `apps/web/messages/en/orders.json` | Wire current record-specific file association/read/download/privacy and real host |
| M | `apps/web/messages/vi/invoices.json` | Wire current record-specific file association/read/download/privacy and real host |
| M | `apps/web/messages/en/invoices.json` | Wire current record-specific file association/read/download/privacy and real host |
| M | `apps/web/messages/vi/actions.json` | Wire current record-specific file association/read/download/privacy and real host |
| M | `apps/web/messages/en/actions.json` | Wire current record-specific file association/read/download/privacy and real host |
| M | `tools/parity/parity.manifest.ts` | Wire current record-specific file association/read/download/privacy and real host |
| C | `packages/actions/src/order-files.ts` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `packages/actions/src/invoice-files.ts` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `packages/shared/src/api/commerce-files.ts` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `packages/core/src/sales/orders/files/handlers.ts` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `packages/core/src/sales/orders/files/read.ts` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `packages/core/src/sales/orders/files/source.ts` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `packages/core/src/sales/payments/files/handlers.ts` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `packages/core/src/sales/payments/files/read.ts` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `packages/core/src/sales/payments/files/source.ts` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `packages/core/src/sales/files/association.ts` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `packages/core/src/sales/files/validation.ts` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `packages/db/prisma/tenant/commerce-files.prisma` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `packages/db/prisma/tenant/migrations/20261102003240_commerce_record_files/migration.sql` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `apps/web/src/shared/commerce-files/RecordFilesPanel.tsx` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `apps/web/src/shared/commerce-files/useRecordFiles.ts` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `apps/web/src/shared/commerce-files/types.ts` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `packages/actions/test/commerce-files.test.ts` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `packages/core/test/commerce-files.test.ts` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `packages/core/test/commerce-files-privacy.test.ts` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `apps/api/test/integration/commerce-files.test.ts` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `apps/worker/test/integration/commerce-files-composition.test.ts` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `apps/web/src/shared/commerce-files/RecordFilesPanel.test.tsx` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `apps/web/e2e/commerce-files.mock.spec.ts` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `apps/web/e2e/http/commerce-files.spec.ts` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `fixtures/ai-eval/commerce-files.json` | Separated domain attachment adapter/shared panel or dedicated tests |
| C | `packages/core/src/kernel/files/file-claims.ts` | Neutral durable file claim primitive, domain adapters provide current authorization |
| C | `packages/db/prisma/tenant/file-claims.prisma` | Neutral one-parent claim schema, no business-domain import into kernel |
| M | `packages/core/src/ai/assistant/input/providers.ts` | Register source adapter into neutral file source registry |
| M | `packages/core/src/ai/assistant/input/artifact-store.ts` | Current authorized original source locator for consented copy |
| M | `apps/worker/tsup.config.ts` | Package isolated structural validator entry |
| C | `packages/core/src/ai/assistant/input/record-attachment-source.ts` | Current artifact/session authority adapter; no business association mutation |
| C | `packages/core/src/kernel/files/attachment-source-registry.ts` | Neutral typed locator/consented copy source extension, no AI imports |
| C | `packages/core/src/kernel/files/attachment-validation.ts` | Explicit structural-only validation status and bounded launcher |
| C | `packages/core/src/kernel/files/attachment-validator-entry.ts` | Isolated signature/container checks, no network/credentials |
| C | `packages/core/src/kernel/files/attachment-zip-bounds.ts` | Bounded central directory and expansion validation |
| C | `packages/core/test/commerce-attachment-validation.test.ts` | MIME/container/bomb/isolation unavailable tests |
| C | `packages/core/test/commerce-attachment-artifact.test.ts` | Upload-before-target and bound-session source conversion/retry tests |

## Future M provenance

- `packages/core/src/sales/privacy/inventory.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/sales/privacy/cleanup.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/kernel/files/file-access.ts`: TIP-023c-generative-ui.md
- `packages/core/src/kernel/privacy/inventory.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/kernel/privacy/cleanup.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/ai/assistant/genui/extension-registry.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/refs.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/history.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/submit.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/discovery/authority.ts`: TIP-023e-action-discovery.md
- `packages/core/src/ai/assistant/input/providers.ts`: TIP-023f-assistant-input.md
- `packages/core/src/ai/assistant/input/artifact-store.ts`: TIP-023f-assistant-input.md

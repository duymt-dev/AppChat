# TIP-027b — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/actions/src/catalog.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/actions/src/index.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/shared/src/index.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/shared/src/api/index.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/shared/src/api/catalog.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/db/prisma/tenant/catalog.prisma` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/catalog/actions/product.handlers.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/catalog/actions/read.handlers.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/catalog/services/catalog-write.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/catalog/services/product-columns.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/catalog/services/product-view.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/catalog/services/catalog-read.service.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/catalog/repos/products.repo.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/catalog/events/catalog-sync.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/catalog/catalog.module.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/catalog/import/import.handler.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/data-transfer/adapters/catalog.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/kernel/files/file-access.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/kernel/files/file-claims.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/kernel/files/attachment-source-registry.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/kernel/files/attachment-validation.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/kernel/files/attachment-validator-entry.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/kernel/privacy/inventory.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/kernel/privacy/cleanup.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/ai/assistant/input/record-attachment-source.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/ai/assistant/genui/extension-registry.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/ai/assistant/genui/refs.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `packages/core/src/ai/assistant/genui/history.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `apps/web/src/features/products/components/ProductDrawer.tsx` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `apps/web/src/features/products/components/DetailTabs.tsx` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `apps/web/src/features/products/components/ProductFormModal.tsx` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `apps/web/src/features/products/hooks/useProductForm.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `apps/web/src/features/products/types.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `apps/web/src/features/products/api.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `apps/web/src/shared/api/mock/domains/products.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `apps/web/messages/vi/products.json` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `apps/web/messages/en/products.json` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `apps/web/messages/vi/actions.json` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `apps/web/messages/en/actions.json` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| M | `tools/parity/parity.manifest.ts` | Integrate private catalog media and structured description across current readers/actions/UI/import/export |
| C | `packages/actions/src/product-media.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `packages/shared/src/catalog/description.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `packages/shared/src/catalog/description.test.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `packages/shared/src/api/product-media.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `packages/db/prisma/tenant/product-media.prisma` | Bounded product media/description domain module/editor or dedicated tests |
| C | `packages/db/prisma/tenant/migrations/20261102002720_product_media_description/migration.sql` | Bounded product media/description domain module/editor or dedicated tests |
| C | `packages/core/src/catalog/media/handlers.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `packages/core/src/catalog/media/read.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `packages/core/src/catalog/media/source.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `packages/core/src/catalog/media/repository.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `packages/core/src/kernel/files/image-bounds.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `packages/core/src/catalog/description/normalize.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `packages/core/src/catalog/privacy/inventory.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `packages/core/src/catalog/privacy/cleanup.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `apps/web/src/features/products/components/ProductMediaEditor.tsx` | Bounded product media/description domain module/editor or dedicated tests |
| C | `apps/web/src/features/products/components/ProductDescriptionEditor.tsx` | Bounded product media/description domain module/editor or dedicated tests |
| C | `apps/web/src/features/products/components/ProductDescriptionView.tsx` | Bounded product media/description domain module/editor or dedicated tests |
| C | `apps/web/src/features/products/hooks/useProductMedia.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `apps/web/src/features/products/hooks/useProductDescription.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `apps/web/src/features/products/hooks/description-selection.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `apps/web/src/features/products/hooks/description-history.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `packages/actions/test/product-media.test.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `packages/core/test/product-media.test.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `packages/core/test/product-description.test.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `packages/core/test/product-media-privacy.test.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `apps/api/test/integration/product-media.test.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `apps/worker/test/integration/product-media-composition.test.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `apps/web/src/features/products/components/ProductDescriptionEditor.test.tsx` | Bounded product media/description domain module/editor or dedicated tests |
| C | `apps/web/e2e/product-media.mock.spec.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `apps/web/e2e/http/product-media.spec.ts` | Bounded product media/description domain module/editor or dedicated tests |
| C | `fixtures/ai-eval/product-media.json` | Bounded product media/description domain module/editor or dedicated tests |
| M | `packages/shared/src/data-transfer/registry.ts` | Declare explicit catalog description_doc JSON column, plain projection and preview warning contract |
| M | `packages/shared/src/api/data-transfer.ts` | Carry explicit structured-description column validation and formatting-reset preview warning |
| M | `packages/core/src/data-transfer/services/validation.ts` | Carry explicit structured-description column validation and formatting-reset preview warning |
| M | `packages/core/src/data-transfer/services/mapping.ts` | Carry explicit structured-description column validation and formatting-reset preview warning |
| M | `apps/web/src/features/data-transfer/components/MappingEditor.tsx` | Carry explicit structured-description column validation and formatting-reset preview warning |
| M | `apps/web/src/features/data-transfer/components/PreviewTable.tsx` | Carry explicit structured-description column validation and formatting-reset preview warning |
| M | `apps/web/messages/vi/data-transfer.json` | Carry explicit structured-description column validation and formatting-reset preview warning |
| M | `apps/web/messages/en/data-transfer.json` | Carry explicit structured-description column validation and formatting-reset preview warning |

## Future M provenance

- `packages/core/src/catalog/import/import.handler.ts`: TIP-032b-commerce-gaps.md
- `packages/core/src/data-transfer/adapters/catalog.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/kernel/files/file-access.ts`: TIP-023c-generative-ui.md
- `packages/core/src/kernel/files/file-claims.ts`: TIP-032d-commerce-record-files.md
- `packages/core/src/kernel/files/attachment-source-registry.ts`: TIP-032d-commerce-record-files.md
- `packages/core/src/kernel/files/attachment-validation.ts`: TIP-032d-commerce-record-files.md
- `packages/core/src/kernel/files/attachment-validator-entry.ts`: TIP-032d-commerce-record-files.md
- `packages/core/src/kernel/privacy/inventory.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/kernel/privacy/cleanup.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/ai/assistant/input/record-attachment-source.ts`: TIP-032d-commerce-record-files.md
- `packages/core/src/ai/assistant/genui/extension-registry.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/refs.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/history.ts`: TIP-023c-generative-ui.md
- `packages/shared/src/data-transfer/registry.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/shared/src/api/data-transfer.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/services/validation.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/services/mapping.ts`: TIP-038b-ai-first-data-transfer.md
- `apps/web/src/features/data-transfer/components/MappingEditor.tsx`: TIP-038b-ai-first-data-transfer.md
- `apps/web/src/features/data-transfer/components/PreviewTable.tsx`: TIP-038b-ai-first-data-transfer.md
- `apps/web/messages/vi/data-transfer.json`: TIP-038b-ai-first-data-transfer.md
- `apps/web/messages/en/data-transfer.json`: TIP-038b-ai-first-data-transfer.md

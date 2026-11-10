// Bề mặt công khai của domain `catalog` (TIP-027) cho apps (controller api, worker) và domain khác (báo giá / đơn TIP-029, 031).
export { CatalogReadService, type Viewer as CatalogViewer } from './services/catalog-read.service';
export type { ProductFilter } from './repos/products.repo';
export { recordMovement, lowOf, type Movement } from './services/catalog-write';
export { productDocument, syncProduct, type CatalogSyncDeps } from './events/catalog-sync';
export { acceptProduct, catalogSyncConsumer, catalogSyncContract, CATALOG_SYNC_CONSUMER } from './events/catalog-handoff';
export { ImportDeps, ImportStatusService } from './import/status';
export { runImport, tally } from './import/processor';
export { validateRow as validateProductRow, markDuplicates as markProductDuplicates, isRowError as isProductRowError } from './import/validate';

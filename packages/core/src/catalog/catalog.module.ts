// Domain `catalog` (TIP-027): sản phẩm 6 loại, danh mục, biến thể, combo, sổ kho `stock_movement`; đọc cho /v1/products*.
// Danh mục mặc định seed qua migration 027 (DC-154). Thiếu DB → service null. TIP-032b: danh mục sửa / xoá, biến thể riêng, nhập sản phẩm
// CSV / XLSX (≤ 500 đồng bộ, > 500 việc nền 202 — consumer ở catalog.jobs.module). TIP-027b: media riêng tư của sản phẩm (5 action) + nguồn
// tệp / đích tải lên đăng ký vào registry kernel.
import { Module, type OnModuleInit } from '@nestjs/common';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../kernel/clock';
import { FilesService } from '../kernel/files/files.service';
import { PLATFORM_DB, TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import { AuthzModule } from '../authz/authz.module';
import { AuthzResolver } from '../authz/services/authz-resolver';
import { CrmModule } from '../crm/crm.module';
import { CrmMembers } from '../crm/public';
import { ProductArchiveHandler, ProductCreateHandler, ProductUpdateHandler } from './actions/product.handlers';
import { ProductGetHandler, ProductSearchHandler, StockGetHandler } from './actions/read.handlers';
import { CategoryCreateHandler, StockAdjustHandler } from './actions/stock.handlers';
import { CatalogReadService } from './services/catalog-read.service';
import { CategoryDeleteHandler, CategoryListHandler, CategoryUpdateHandler } from './actions/category.handlers';
import { VariantArchiveHandler, VariantCreateHandler, VariantUpdateHandler } from './actions/variant.handlers';
import { ProductImportCancelHandler, ProductImportHandler, ProductImportRetryHandler } from './import/import.handler';
import { ImportDeps, ImportStatusService } from './import/status';
import { PRODUCT_MEDIA_HANDLERS } from './media/handlers';
import { registerProductMediaSources } from './media/module';
import { registerStockObserver } from '../kernel/actions/sales-publication';
import { observeSalesStock } from './services/sales-stock-observation';

const opt = (token: symbol) => ({ token, optional: true });

const HANDLERS = [
  ProductCreateHandler, ProductUpdateHandler, ProductArchiveHandler, CategoryCreateHandler, StockAdjustHandler,
  ProductSearchHandler, ProductGetHandler, StockGetHandler,
  // TIP-032b: danh mục sửa / xoá, biến thể, nhập sản phẩm.
  CategoryListHandler, CategoryUpdateHandler, CategoryDeleteHandler, VariantCreateHandler, VariantUpdateHandler, VariantArchiveHandler,
  ProductImportHandler, ProductImportCancelHandler, ProductImportRetryHandler,
  ...PRODUCT_MEDIA_HANDLERS,
];

@Module({
  imports: [CrmModule, AuthzModule],
  providers: [
    ...HANDLERS,
    {
      provide: CatalogReadService,
      inject: [opt(TENANT_RESOLVER), opt(PLATFORM_DB), CrmMembers, CLOCK],
      useFactory: (r: TenantDbResolver | undefined, p: PlatformDb | undefined, m: CrmMembers | null, c: Clock) => (r && p && m ? new CatalogReadService(r, p, m, () => c.now()) : null),
    },
    {
      provide: ImportDeps,
      inject: [opt(TENANT_RESOLVER), { token: FilesService, optional: true }, opt(PLATFORM_DB), { token: AuthzResolver, optional: true }, CLOCK],
      useFactory: (r: TenantDbResolver | undefined, f: FilesService | undefined, p: PlatformDb | undefined, a: AuthzResolver | null | undefined, c: Clock) => new ImportDeps(r ?? null, f ?? null, p ?? null, a ?? null, () => c.now()),
    },
    { provide: ImportStatusService, inject: [ImportDeps], useFactory: (d: ImportDeps) => new ImportStatusService(d) },
  ],
  exports: [CatalogReadService, ImportDeps, ImportStatusService],
})
export class CatalogModule implements OnModuleInit {
  onModuleInit(): void {
    registerProductMediaSources();
    // TIP-022c: quan sát tồn kho chỉ đọc cho câu trả lời bán hàng (cổng kernel trung lập — AI / gửi tin gọi, không import catalog).
    registerStockObserver(observeSalesStock);
  }
}

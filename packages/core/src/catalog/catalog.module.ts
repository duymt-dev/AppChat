// Domain `catalog` (TIP-027): sản phẩm 6 loại, danh mục, biến thể, combo, sổ kho `stock_movement`; đọc cho /v1/products*.
// Danh mục mặc định seed qua migration 027 (DC-154). Thiếu DB → service null.
import { Module } from '@nestjs/common';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../kernel/clock';
import { PLATFORM_DB, TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import { CrmModule } from '../crm/crm.module';
import { CrmMembers } from '../crm/public';
import { ProductArchiveHandler, ProductCreateHandler, ProductUpdateHandler } from './actions/product.handlers';
import { ProductGetHandler, ProductSearchHandler, StockGetHandler } from './actions/read.handlers';
import { CategoryCreateHandler, StockAdjustHandler } from './actions/stock.handlers';
import { CatalogReadService } from './services/catalog-read.service';

const opt = (token: symbol) => ({ token, optional: true });

const HANDLERS = [
  ProductCreateHandler, ProductUpdateHandler, ProductArchiveHandler, CategoryCreateHandler, StockAdjustHandler,
  ProductSearchHandler, ProductGetHandler, StockGetHandler,
];

@Module({
  imports: [CrmModule],
  providers: [
    ...HANDLERS,
    {
      provide: CatalogReadService,
      inject: [opt(TENANT_RESOLVER), opt(PLATFORM_DB), CrmMembers, CLOCK],
      useFactory: (r: TenantDbResolver | undefined, p: PlatformDb | undefined, m: CrmMembers | null, c: Clock) => (r && p && m ? new CatalogReadService(r, p, m, () => c.now()) : null),
    },
  ],
  exports: [CatalogReadService],
})
export class CatalogModule {}

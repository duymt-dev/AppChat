// Controller HTTP của domain `catalog` (TIP-027): /v1/products*, /v1/categories. Chỉ gắn khi env đủ DB + Redis + JWT_SECRET
// (`register`) — như crm.
import { Module, type DynamicModule } from '@nestjs/common';
import { CatalogModule } from '@appchat/core';
import { ActorModule } from '../kernel/actor.module';
import { ProductsController } from './products.controller';

@Module({ imports: [CatalogModule] })
export class CatalogHttpModule {
  static register(): DynamicModule {
    return { module: CatalogHttpModule, imports: [CatalogModule, ActorModule], controllers: [ProductsController] };
  }
}

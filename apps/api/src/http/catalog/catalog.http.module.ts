// Controller HTTP của domain `catalog` nằm trong thư mục này. Stub TIP-001; TIP 027 thêm controller.
import { Module } from '@nestjs/common';
import { CatalogModule } from '@appchat/core';

@Module({ imports: [CatalogModule] })
export class CatalogHttpModule {}

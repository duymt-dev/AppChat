// BullMQ processor của domain `catalog` (chạy trong worker). Stub TIP-001; TIP 027 thêm processor.
import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog.module';

@Module({ imports: [CatalogModule] })
export class CatalogJobsModule {}

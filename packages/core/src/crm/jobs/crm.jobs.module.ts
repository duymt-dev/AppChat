// BullMQ processor của domain `crm` (chạy trong worker). Stub TIP-001; TIP 015 thêm processor.
import { Module } from '@nestjs/common';
import { CrmModule } from '../crm.module';

@Module({ imports: [CrmModule] })
export class CrmJobsModule {}

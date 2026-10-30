// BullMQ processor của domain `support` (chạy trong worker). Stub TIP-001; TIP 034 thêm processor.
import { Module } from '@nestjs/common';
import { SupportModule } from '../support.module';

@Module({ imports: [SupportModule] })
export class SupportJobsModule {}

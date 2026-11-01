// BullMQ processor của domain `marketing` (chạy trong worker). Stub TIP-001; TIP 037 thêm processor.
import { Module } from '@nestjs/common';
import { MarketingModule } from '../marketing.module';

@Module({ imports: [MarketingModule] })
export class MarketingJobsModule {}

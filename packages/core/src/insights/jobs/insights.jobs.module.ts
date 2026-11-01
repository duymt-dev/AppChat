// BullMQ processor của domain `insights` (chạy trong worker). Stub TIP-001; TIP 038 thêm processor.
import { Module } from '@nestjs/common';
import { InsightsModule } from '../insights.module';

@Module({ imports: [InsightsModule] })
export class InsightsJobsModule {}

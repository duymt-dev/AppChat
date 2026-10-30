// BullMQ processor của domain `billing` (chạy trong worker). Stub TIP-001; TIP 009, 010 thêm processor.
import { Module } from '@nestjs/common';
import { BillingModule } from '../billing.module';

@Module({ imports: [BillingModule] })
export class BillingJobsModule {}

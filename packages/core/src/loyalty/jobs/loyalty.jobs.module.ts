// BullMQ processor của domain `loyalty` (chạy trong worker). Stub TIP-001; TIP 036 thêm processor.
import { Module } from '@nestjs/common';
import { LoyaltyModule } from '../loyalty.module';

@Module({ imports: [LoyaltyModule] })
export class LoyaltyJobsModule {}

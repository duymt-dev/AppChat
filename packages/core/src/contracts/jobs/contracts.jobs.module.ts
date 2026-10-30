// BullMQ processor của domain `contracts` (chạy trong worker). Stub TIP-001; TIP 030 thêm processor.
import { Module } from '@nestjs/common';
import { ContractsModule } from '../contracts.module';

@Module({ imports: [ContractsModule] })
export class ContractsJobsModule {}

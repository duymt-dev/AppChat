// BullMQ processor của domain `sales` (chạy trong worker). Stub TIP-001; TIP 029, 031, 032 thêm processor.
import { Module } from '@nestjs/common';
import { SalesModule } from '../sales.module';

@Module({ imports: [SalesModule] })
export class SalesJobsModule {}

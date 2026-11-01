// BullMQ processor của domain `platform` (chạy trong worker). Stub TIP-001; TIP 040 thêm processor.
import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform.module';

@Module({ imports: [PlatformModule] })
export class PlatformJobsModule {}

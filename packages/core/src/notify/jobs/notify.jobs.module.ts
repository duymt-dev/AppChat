// BullMQ processor của domain `notify` (chạy trong worker). Stub TIP-001; TIP 006 thêm processor.
import { Module } from '@nestjs/common';
import { NotifyModule } from '../notify.module';

@Module({ imports: [NotifyModule] })
export class NotifyJobsModule {}

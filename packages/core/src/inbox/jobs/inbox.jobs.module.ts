// BullMQ processor của domain `inbox` (chạy trong worker). Stub TIP-001; TIP 016 thêm processor.
import { Module } from '@nestjs/common';
import { InboxModule } from '../inbox.module';

@Module({ imports: [InboxModule] })
export class InboxJobsModule {}

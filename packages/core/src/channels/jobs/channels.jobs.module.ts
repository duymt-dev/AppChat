// BullMQ processor của domain `channels` (chạy trong worker). Stub TIP-001; TIP 014, 017, 018 thêm processor.
import { Module } from '@nestjs/common';
import { ChannelsModule } from '../channels.module';

@Module({ imports: [ChannelsModule] })
export class ChannelsJobsModule {}

// Worker ROLE=channels: JobsModule theo bảng hàng đợi Blueprint §1.3. Đăng ký sẵn ở TIP-001 — TIP sau KHÔNG sửa.
import { Module } from '@nestjs/common';
import { ChannelsJobsModule, InboxJobsModule, MarketingJobsModule } from '@appchat/core';

export const CHANNELS_JOBS = [ChannelsJobsModule, InboxJobsModule, MarketingJobsModule];

@Module({ imports: CHANNELS_JOBS })
export class ChannelsRoleModule {}

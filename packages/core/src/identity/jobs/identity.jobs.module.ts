// BullMQ processor của domain `identity` (chạy trong worker). Stub TIP-001; TIP 004 thêm processor.
import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity.module';

@Module({ imports: [IdentityModule] })
export class IdentityJobsModule {}

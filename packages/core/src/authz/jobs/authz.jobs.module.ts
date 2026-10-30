// BullMQ processor của domain `authz` (chạy trong worker). Stub TIP-001; TIP 005 thêm processor.
import { Module } from '@nestjs/common';
import { AuthzModule } from '../authz.module';

@Module({ imports: [AuthzModule] })
export class AuthzJobsModule {}

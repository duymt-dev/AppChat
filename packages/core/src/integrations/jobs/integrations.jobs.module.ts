// BullMQ processor của domain `integrations` (chạy trong worker). Stub TIP-001; TIP 012 thêm processor.
import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations.module';

@Module({ imports: [IntegrationsModule] })
export class IntegrationsJobsModule {}

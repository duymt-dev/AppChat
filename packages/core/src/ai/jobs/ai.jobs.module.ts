// BullMQ processor của domain `ai` (chạy trong worker). Stub TIP-001; TIP 019–023, 035, 043 thêm processor.
import { Module } from '@nestjs/common';
import { AiModule } from '../ai.module';

@Module({ imports: [AiModule] })
export class AiJobsModule {}

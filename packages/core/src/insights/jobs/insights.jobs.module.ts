// Việc nền domain `insights` — chỉ ROLE=jobs (worker): lịch quét việc follow (`insights.follow-up-sweep`, TIP-038 pha 2). API không đăng ký
// lịch (không enqueue scheduler ở mỗi tiến trình API). Pha 3: kind việc dữ liệu xuất 4 danh sách (DataJobsModule chạy). Pha 4: digest.
import { Module } from '@nestjs/common';
import { InsightsModule } from '../insights.module';
import { DataJobsModule } from '../../kernel/jobs/data-jobs/data-jobs.module';
import { INSIGHTS_JOB_PROVIDERS } from './insights.jobs.providers';

@Module({ imports: [InsightsModule, DataJobsModule], providers: INSIGHTS_JOB_PROVIDERS })
export class InsightsJobsModule {}

// Việc nền domain `insights` — chỉ ROLE=jobs (worker): lịch quét việc follow (`insights.follow-up-sweep`, TIP-038 pha 2). API không đăng ký
// lịch (không enqueue scheduler ở mỗi tiến trình API). Pha sau thêm digest / xuất danh sách vào INSIGHTS_JOB_PROVIDERS.
import { Module } from '@nestjs/common';
import { InsightsModule } from '../insights.module';
import { INSIGHTS_JOB_PROVIDERS } from './insights.jobs.providers';

@Module({ imports: [InsightsModule], providers: INSIGHTS_JOB_PROVIDERS })
export class InsightsJobsModule {}

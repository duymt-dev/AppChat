// Lịch quét chiến dịch ROLE=jobs (TIP-037): chiến dịch tới hạn → campaign.dispatch qua Executor, đẩy hàng gửi của tài khoản (worker gửi ở
// ROLE=channels). Tách khỏi MarketingJobsModule để không kéo worker gửi vào ROLE=jobs.
import { Module } from '@nestjs/common';
import { MarketingModule } from '../marketing.module';
import { MarketingScheduler } from './marketing.jobs.providers';

@Module({ imports: [MarketingModule], providers: [MarketingScheduler] })
export class MarketingSchedulerModule {}

// Worker ROLE=channels của domain `marketing` (TIP-037): chốt chặn trước khi gọi kênh + ghi kết quả gửi cho người nhận chiến dịch (ref
// `cr_`) — chạy cùng tiến trình giữ phiên kênh. Lịch quét chiến dịch ở MarketingSchedulerModule (ROLE=jobs).
import { Module } from '@nestjs/common';
import { MarketingModule } from '../marketing.module';
import { MarketingSendInstaller } from './marketing.jobs.providers';

@Module({ imports: [MarketingModule], providers: [MarketingSendInstaller] })
export class MarketingJobsModule {}

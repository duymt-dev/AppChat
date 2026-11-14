// Domain `marketing` (TIP-037): phân khúc, chiến dịch + duyệt snapshot, gửi có kiểm soát qua hàng gửi của tài khoản (chung trần / tốc độ với
// Inbox), số đo từ bằng chứng, gợi ý AI. Provider ở marketing.providers.ts; luật thông báo / realtime ở events/campaign.rules.ts.
import { Module, type OnModuleInit } from '@nestjs/common';
import { registerCorrectionScope } from '../kernel/actions/correction.handler';
import { findCampaign } from './repos/campaigns.repo';
import { AuthzModule } from '../authz/authz.module';
import { ChannelsModule } from '../channels/channels.module';
import { CrmModule } from '../crm/crm.module';
import { AiModule } from '../ai/ai.module';
import './events/campaign.rules';
import { CampaignReadService } from './services/campaign-read.service';
import { MarketingDeps } from './services/marketing-deps';
import { UnsubscribeService } from './services/unsubscribe.service';
import { CampaignAnalyzeQueue } from './ai/marketing-ai.jobs';
import { MARKETING_PROVIDERS } from './marketing.providers';

@Module({
  imports: [CrmModule, ChannelsModule, AuthzModule, AiModule],
  providers: MARKETING_PROVIDERS,
  exports: [CampaignReadService, MarketingDeps, CampaignAnalyzeQueue, UnsubscribeService],
})
export class MarketingModule implements OnModuleInit {
  /** TIP-003e: chiến dịch không có data scope theo người (quyền `campaign.*`) — đính chính chỉ cần bản ghi còn tồn tại. */
  onModuleInit(): void {
    registerCorrectionScope('campaign', (tx, _authz, id) => findCampaign(tx, id));
  }
}

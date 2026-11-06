// Provider domain marketing (TIP-037) — marketing.module chỉ trải mảng này. Handler 26 action (segment.* / campaign.*), phụ thuộc chung
// (DB, quyền hiện tại, kho tệp, link huỷ nhận tin, hàng gửi), đọc /v1/campaigns*, consumer `marketing.attribution` + `marketing.analyze`
// (đăng ký ở mọi tiến trình có Executor / Redis — chỉ ROLE=jobs có worker `events` nên chỉ ở đó chạy thật).
import { Inject, Optional, type OnApplicationBootstrap, type OnApplicationShutdown, type Provider } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../kernel/clock';
import { ENC_KEY } from '../kernel/crypto';
import { ENV_SOURCE } from '../kernel/kernel.module';
import { REDIS } from '../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import { FilesService } from '../kernel/files/files.service';
import { ActionExecutor } from '../kernel/actions/executor';
import { eventConsumers, registerEventConsumer, unregisterEventConsumer, type EventConsumer } from '../kernel/events/consumer';
import { AuthzResolver } from '../authz/services/authz-resolver';
import { ChannelSendQueue } from '../channels/public';
import { CrmMembers } from '../crm/public';
import { SegmentCreateHandler, SegmentDeleteHandler, SegmentPreviewHandler, SegmentUpdateHandler } from './actions/segment.handlers';
import { CampaignCreateHandler, CampaignDeleteHandler, CampaignUpdateHandler } from './actions/campaign-write.handlers';
import { CampaignApproveHandler, CampaignRejectHandler, CampaignSubmitHandler } from './actions/campaign-approval.handlers';
import { CampaignCancelHandler, CampaignPauseHandler, CampaignResumeHandler } from './actions/campaign-control.handlers';
import { CampaignAudienceImportHandler, CampaignRecipientExportHandler, CampaignResendUnreadHandler, CampaignSendTestHandler } from './actions/campaign-extras.handlers';
import { CampaignAnalyzeHandler, CampaignDraftContentHandler, CampaignStoreAnalysisHandler, CampaignSuggestHandler } from './actions/campaign-ai.handlers';
import { CampaignDispatchHandler, CampaignRecordDeliveryHandler } from './actions/campaign-system.handlers';
import { CampaignRecordMetricHandler, CampaignUnsubscribeHandler } from './actions/campaign-metric.handlers';
import { ANALYZE_CONSUMER, CampaignAnalyzeQueue, analyzeConsumer } from './ai/marketing-ai.jobs';
import { ATTRIBUTION_CONSUMER, attributionConsumer } from './events/campaign-attribution';
import { CampaignReadService } from './services/campaign-read.service';
import { MarketingDeps } from './services/marketing-deps';
import { UnsubscribeService } from './services/unsubscribe.service';
import { unsubLinksFor } from './services/unsubscribe-token';

const opt = (token: symbol | typeof FilesService | typeof AuthzResolver | typeof ActionExecutor | typeof ChannelSendQueue) => ({ token, optional: true });

export const MARKETING_HANDLERS = [
  SegmentPreviewHandler, SegmentCreateHandler, SegmentUpdateHandler, SegmentDeleteHandler,
  CampaignCreateHandler, CampaignUpdateHandler, CampaignDeleteHandler, CampaignSubmitHandler, CampaignApproveHandler, CampaignRejectHandler,
  CampaignPauseHandler, CampaignResumeHandler, CampaignCancelHandler, CampaignSendTestHandler, CampaignResendUnreadHandler,
  CampaignAudienceImportHandler, CampaignRecipientExportHandler, CampaignSuggestHandler, CampaignAnalyzeHandler, CampaignDraftContentHandler,
  CampaignStoreAnalysisHandler, CampaignDispatchHandler, CampaignRecordDeliveryHandler, CampaignRecordMetricHandler, CampaignUnsubscribeHandler,
];

/** Đăng ký consumer marketing một lần mỗi tiến trình (nhiều app Nest trong cùng tiến trình test dùng chung bản đầu). */
export class MarketingInstaller implements OnApplicationBootstrap, OnApplicationShutdown {
  private mine: EventConsumer[] = [];

  constructor(
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | null,
    @Optional() @Inject(CampaignAnalyzeQueue) private readonly queue: CampaignAnalyzeQueue | null,
  ) {}

  onApplicationBootstrap(): void {
    const have = (n: string) => eventConsumers().some((c) => c.name === n);
    if (this.executor && !have(ATTRIBUTION_CONSUMER)) this.mine.push(attributionConsumer(this.executor));
    if (this.queue && !have(ANALYZE_CONSUMER)) this.mine.push(analyzeConsumer(this.queue));
    this.mine.forEach(registerEventConsumer);
  }

  async onApplicationShutdown(): Promise<void> {
    for (const c of this.mine) if (eventConsumers().includes(c)) unregisterEventConsumer(c.name);
    this.mine = [];
    await this.queue?.close();
  }
}

export const MARKETING_PROVIDERS: Provider[] = [
  ...MARKETING_HANDLERS,
  {
    provide: MarketingDeps,
    inject: [opt(TENANT_RESOLVER), opt(PLATFORM_DB), opt(AuthzResolver), opt(FilesService), opt(ENV_SOURCE), opt(ENC_KEY), opt(ChannelSendQueue)],
    useFactory: (t?: TenantDbResolver, p?: PlatformDb, a?: AuthzResolver | null, f?: FilesService, src?: Record<string, string | undefined>, key?: Buffer, q?: ChannelSendQueue | null) =>
      new MarketingDeps(t ?? null, p ?? null, a ?? null, f ?? null, unsubLinksFor(src ?? process.env, key), q ?? null),
  },
  {
    provide: CampaignReadService,
    inject: [opt(TENANT_RESOLVER), CrmMembers, CLOCK],
    useFactory: (t: TenantDbResolver | undefined, m: CrmMembers, c: Clock) => (t ? new CampaignReadService(t, m, () => c.now()) : null),
  },
  {
    provide: UnsubscribeService,
    inject: [MarketingDeps, opt(PLATFORM_DB), opt(ActionExecutor), CLOCK],
    useFactory: (d: MarketingDeps, p: PlatformDb | undefined, e: ActionExecutor | undefined, c: Clock) => new UnsubscribeService(d, p ?? null, e ?? null, () => c.now()),
  },
  { provide: CampaignAnalyzeQueue, inject: [opt(REDIS)], useFactory: (r?: Redis) => (r ? new CampaignAnalyzeQueue(r) : null) },
  MarketingInstaller,
];

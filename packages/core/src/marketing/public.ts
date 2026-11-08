// API công khai của domain marketing cho apps/api (controller) + worker + test. Một dòng re-export ở src/index.ts (facade).
export { CampaignReadService, type MarketingViewer, type CampaignFilter } from './services/campaign-read.service';
export { MarketingDeps } from './services/marketing-deps';
export { UnsubscribeService } from './services/unsubscribe.service';
export { MARKETING_ACTORS, systemCtx as marketingSystemCtx } from './services/marketing-system';
export { readUnsubToken, unsubToken, unsubUrl, UNSUB_TTL_MS } from './services/unsubscribe-token';
export { segmentSql, countAudience } from './services/segments.service';
export { contentErrors, renderContent, variantOf, statsOf, allowedActions as campaignAllowed, CHANNEL_CAPS } from './services/campaign-policy';
export { tickCampaigns, tickWorkspace, CAMPAIGN_TICK_JOB, MARKETING_SCHEDULER_QUEUE } from './jobs/campaign-scheduler';
export { campaignSendGuard } from './jobs/campaign-results';
export { campaignMailDomain, enqueueMailBatch } from './jobs/campaign-mail';
export { reserveRecipient, buildMessage, refOf as campaignRef, RECIPIENT_REF_PREFIX } from './jobs/campaign-dispatch';
export { MarketingScheduler, MarketingSendInstaller } from './jobs/marketing.jobs.providers';
export { MarketingSchedulerModule } from './jobs/marketing-scheduler.module';
export { CampaignAnalyzeQueue, processAnalyze, startAnalyzeWorker, CAMPAIGN_ANALYZE_QUEUE, type AnalyzeDeps } from './ai/marketing-ai.jobs';
export { parseSuggestions, aggregateCdp } from './ai/marketing-ai.service';
export { attributionConsumer, ATTRIBUTION_CONSUMER } from './events/campaign-attribution';
// Lớp handler — integration api thay bằng handler thử executor (overrideProvider, apps/api/test/integration/setup.ts).
export { CampaignCreateHandler, CampaignDeleteHandler } from './actions/campaign-write.handlers';
export { CampaignSubmitHandler } from './actions/campaign-approval.handlers';

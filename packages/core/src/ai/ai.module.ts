// Domain `ai` — runtime AI (TIP-019): cấu hình LLM nền tảng (ProviderStore, cache 60 giây), Agent Gateway (`AiSdkEngine` trên
// LlmRouter — hoặc model giả `AI_ENGINE=mock`), chạy / chạy tiếp / huỷ run (AiRunner + RunStore), Cài đặt › Mô hình AI, run.cancel.
// TIP-020: kho tri thức (kb.*, embedder, queue kb-ingest). TIP-021: AI Agents (agent.*), hàng chờ duyệt (approval.*, cổng duyệt
// của executor, queue ai-resume), governance, seed mẫu agent. TIP-022: agent trực kênh. TIP-023: Trợ lý (AssistantService — lượt, xác nhận, phiên, nhật ký). TIP-035: tác vụ tự chủ (ai/tasks — ai_task.*, queue ai-task). TIP 043 thêm.
// Thiếu DB → service null (route trả 501).
import { Module, type OnModuleInit } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { AiSdkEmbedder, AiSdkEngine, LlmRouter, mockEmbedSource, mockModelSource, type AgentEngine, type Embedder } from '@appchat/ai';
import type { PlatformDb } from '@appchat/db';
import { CreditMeter } from '../billing/public';
import { BillingModule } from '../billing/billing.module';
import { WorkspaceAccess } from '../platform/public';
import { ENC_KEY } from '../kernel/crypto';
import { ENV_SOURCE, LOGGER } from '../kernel/kernel.module';
import type { AppLogger } from '../kernel/logger/logger';
import { REDIS } from '../kernel/redis';
import { PLATFORM_DB } from '../kernel/tenant/tenant.providers';
import { readAiEnv, type AiEnv } from './ai.env';
import { ProviderStore } from './router/provider.store';
import { KbAddSourceHandler, KbRefreshSourceHandler, KbRemoveSourceHandler, KbUpdateSourceHandler } from './kb/kb.handlers';
import { KbFolderCreateHandler, KbFolderDeleteHandler, KbFolderUpdateHandler } from './kb/folder.handlers';
import { KB_SUGGESTION_PROVIDERS } from './kb/suggestions/suggestions.providers';
import { KB_EMBEDDER, KbSearchHandler } from './kb/kb-search.handler';
import { AgentSearchHandler, AiTaskSearchHandler } from './agents/agent-read.handlers';
import { KbSourceSearchHandler } from './kb/source-read.handler';
import { RunSearchHandler } from './runs/run-read.handler';
import { KbIngestQueue } from './kb/kb.queue';
import { RunCancelListener } from './runs/cancel.listener';
import { RunCancelHandler } from './runs/run-cancel.handler';
import { AiRunner } from './runs/runner';
import { AiSettingsUpdateHandler } from './settings/ai-settings.handlers';
import { AgentCreateAndPublishHandler, AgentCreateHandler, AgentDeleteHandler, AgentPauseHandler, AgentPublishHandler, AgentRollbackHandler, AgentUpdateHandler } from './agents/agent.handlers';
import { AgentDraftHandler, AgentOptimizePromptHandler, AgentTestHandler } from './agents/agent-llm.handlers';
import { seedAgentTemplates } from './agents/templates.seed';
import { ApprovalApproveHandler, ApprovalEditAndApproveHandler, ApprovalRejectHandler } from './approvals/approval.handlers';
import { AiTranslateHandler } from './skills/translate.handler';
import { AiTranslateDraftHandler } from './skills/draft-translate.handler';
import { UTILITY_PROVIDERS } from './skills/utility.providers';
import { ApprovalsInstaller } from './approvals/approvals.installer';
import { OperationContinuationInstaller } from './approvals/operation-continuation';
import { ResumeQueue } from './approvals/resume.queue';
import { GovernanceUpdateHandler } from './governance/governance';
import { AssistantService } from './assistant/assistant.service';
import { TurnQueue, TurnRequestInstaller } from './assistant/genui/turn-request.consumer';
import { AssistantResumeHandler } from './assistant/genui/resume.handler';
import { TASK_EXPORTS, TASK_PROVIDERS } from './tasks/tasks.providers';
import { TaskPlace } from './tasks/task-place';
import { CLOCK, type Clock } from '../kernel/clock';

export { AI_ENV } from './ai.env';
import { AI_ENV } from './ai.env';
import { RunGuardInstaller } from './runs/run-guard.installer';
import './events/run.rules';
export const AGENT_ENGINE = Symbol('AGENT_ENGINE');

const opt = (token: symbol) => ({ token, optional: true });

/** Seed provider từ env lúc boot (Q-001) — lỗi seed không chặn boot, chỉ ghi log. */
class ProviderSeed implements OnModuleInit {
  constructor(
    private readonly store: ProviderStore | null,
    private readonly env: AiEnv,
    private readonly log: AppLogger,
    private readonly platform: PlatformDb | null,
  ) {}

  async onModuleInit(): Promise<void> {
    // Mẫu agent theo ngành (TIP-021, D15) — idempotent theo key, không ghi đè.
    if (this.platform) await seedAgentTemplates(this.platform).catch((err: unknown) => this.log.warn({ err }, 'agent template seed failed'));
    // `AI_ENGINE=mock` (dev / E2E): đơn giá cho model giả để CreditMeter trừ được (không đè giá đã có).
    // Header provider cũ (giá trị thô) → mã hoá (TIP-040, DC-371) — trước mọi lần nạp cấu hình.
    if (this.store) await this.store.sealLegacyHeaders().catch((err: unknown) => this.log.warn({ err }, 'provider header seal failed'));
    if (this.store && this.env.AI_ENGINE === 'mock') await this.store.seedMockPrices().catch((err: unknown) => this.log.warn({ err }, 'mock price seed failed'));
    if (!this.store || !this.env.LLM_SEED_PROVIDER_KEY) return;
    await this.store.seed(this.env).then(
      (done) => done && this.log.info({ provider: this.env.LLM_SEED_PROVIDER_KEY }, 'llm provider seeded'),
      (err: unknown) => this.log.error({ err }, 'llm provider seed failed'),
    );
  }
}

@Module({
  imports: [BillingModule],
  providers: [
    { provide: AI_ENV, inject: [opt(ENV_SOURCE)], useFactory: (src?: Record<string, string | undefined>) => readAiEnv(src ?? {}) },
    {
      provide: ProviderStore,
      inject: [opt(PLATFORM_DB), opt(ENC_KEY)],
      useFactory: (p?: PlatformDb, k?: Buffer) => (p && k ? new ProviderStore(p, k) : null),
    },
    {
      provide: AGENT_ENGINE,
      inject: [AI_ENV, ProviderStore],
      useFactory: (env: AiEnv, store: ProviderStore | null): AgentEngine | null =>
        env.AI_ENGINE === 'mock' ? new AiSdkEngine(mockModelSource()) : store ? new AiSdkEngine(new LlmRouter(store)) : null,
    },
    // Embedding (TIP-020): cùng router purpose `embed`; `AI_ENGINE=mock` → embedding giả tất định (Q-001).
    {
      provide: KB_EMBEDDER,
      inject: [AI_ENV, ProviderStore],
      useFactory: (env: AiEnv, store: ProviderStore | null): Embedder | null =>
        env.AI_ENGINE === 'mock' ? new AiSdkEmbedder(mockEmbedSource()) : store ? new AiSdkEmbedder(new LlmRouter(store)) : null,
    },
    { provide: KbIngestQueue, inject: [opt(REDIS)], useFactory: (r?: Redis) => (r ? new KbIngestQueue(r) : null) },
    {
      provide: AiRunner,
      inject: [AGENT_ENGINE, CreditMeter, LOGGER, CLOCK, TaskPlace, opt(PLATFORM_DB), opt(REDIS)],
      useFactory: (engine: AgentEngine | null, meter: CreditMeter | null, log: AppLogger, clock: Clock, place: TaskPlace, p?: PlatformDb, r?: Redis) => {
        // Tạm dừng workspace (TIP-040) chặn bước AI mới cả ở run đang chạy.
        const access = p ? new WorkspaceAccess(p, () => clock.now().getTime()) : null;
        // Redis → đánh dấu outbox dirty sau mỗi sự kiện run (TIP-019b — WS run.step / run.done tới ngay, không chờ quét).
        return engine ? new AiRunner({ engine, meter, log, kv: r ?? null, clock: { now: () => clock.now(), timeZone: async (ws) => (await place.of(ws)).timeZone }, ...(access ? { assertOpen: (ws: string) => access.assertOpen(ws) } : {}) }) : null;
      },
    },
    {
      provide: ProviderSeed,
      inject: [ProviderStore, AI_ENV, LOGGER, opt(PLATFORM_DB)],
      useFactory: (s: ProviderStore | null, e: AiEnv, l: AppLogger, p?: PlatformDb) => new ProviderSeed(s, e, l, p ?? null),
    },
    { provide: ResumeQueue, inject: [opt(REDIS)], useFactory: (r?: Redis) => (r ? new ResumeQueue(r) : null) },
    ApprovalsInstaller,
    // TIP-045b: thao tác nền tảng đã duyệt áp xong → tiếp tục run (consumer `operation.completed`).
    OperationContinuationInstaller,
    { provide: RunCancelListener, inject: [opt(REDIS), AiRunner], useFactory: (r: Redis | undefined, run: AiRunner | null) => new RunCancelListener(r ?? null, run) },
    AiSettingsUpdateHandler,
    RunCancelHandler,
    KbAddSourceHandler,
    KbUpdateSourceHandler,
    KbRemoveSourceHandler,
    KbRefreshSourceHandler,
    KbFolderCreateHandler,
    KbFolderUpdateHandler,
    KbFolderDeleteHandler,
    ...KB_SUGGESTION_PROVIDERS,
    KbSearchHandler,
    // Đọc cấu hình AI cho Trợ lý (TIP-023b R2).
    AgentSearchHandler,
    KbSourceSearchHandler,
    AiTaskSearchHandler,
    RunSearchHandler,
    AgentCreateHandler,
    AgentCreateAndPublishHandler,
    AgentUpdateHandler,
    AgentPublishHandler,
    AgentRollbackHandler,
    AgentPauseHandler,
    AgentDeleteHandler,
    AgentTestHandler,
    AgentDraftHandler,
    AgentOptimizePromptHandler,
    ApprovalApproveHandler,
    ApprovalRejectHandler,
    ApprovalEditAndApproveHandler,
    GovernanceUpdateHandler,
    AiTranslateHandler,
    AiTranslateDraftHandler,
    ...UTILITY_PROVIDERS,
    AssistantService,
    // GenUI (TIP-023c): tiếp tục lượt sau kết quả ngoài đã kiểm phía server (khối qr).
    AssistantResumeHandler,
    // Lượt Trợ lý chạy ở ROLE=ai: outbox `assistant.turn_requested` → consumer → queue `assistant-turn` (thiếu Redis → null).
    { provide: TurnQueue, inject: [opt(REDIS)], useFactory: (r?: Redis) => (r ? new TurnQueue(r) : null) },
    TurnRequestInstaller,
    RunGuardInstaller,
    ...TASK_PROVIDERS,
  ],
  exports: [AI_ENV, AGENT_ENGINE, ProviderStore, AiRunner, KB_EMBEDDER, KbIngestQueue, ResumeQueue, AssistantService, ...TASK_EXPORTS],
})
export class AiModule {}

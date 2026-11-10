// BullMQ processor của domain `ai` (worker ROLE=ai). TIP-020: `kb-ingest` (nạp tài liệu kho tri thức). TIP-021: `ai-resume` (chạy
// action đã duyệt + chạy tiếp run, hết hạn duyệt) — cần handler của mọi domain mà agent gọi được → nạp module domain có action
// `agentGrantable`. TIP-022: `agent-reply` (agent trực kênh). TIP-023: spec chạy tiếp run `assistant`. TIP-023c: `assistant-turn` (lượt Trợ lý) + prune / recover. TIP-035: `ai-task` + lịch tác vụ (ai/tasks/task.jobs). TIP-043: `kb-suggest` (đề xuất tri thức từ hội thoại đã đóng). Thiếu DB / Redis → không chạy.
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Embedder, ModelSource } from '@appchat/ai';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import { AuthzModule } from '../../authz/authz.module';
import { AuthzResolver } from '../../authz/services/authz-resolver';
import { AiDomainHandlersModule } from './ai-domain-handlers.module';
import { ActionExecutor } from '../../kernel/actions/executor';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { AiRunner } from '../runs/runner';
import type { ResumeJob } from '../approvals/resume.queue';
import { startAiResumeWorker } from './ai-resume.processor';
import { startAgentReplyWorker } from './agent-reply.processor';
import type { ReplyJob } from '../reply/reply.queue';
import { finishResumedTurn, handoffAfterApproval, resumeReplySpec, type ReplyDeps } from '../reply/reply.service';
import { assistantResumeSpec } from '../assistant/turn.service';
import { registerResumeExpired, registerResumeFinish, registerResumeSpec, type ResumeDeps } from '../approvals/resume';
import { CreditMeter } from '../../billing/public';
import { BillingModule } from '../../billing/billing.module';
import { CLOCK, type Clock } from '../../kernel/clock';
import { FilesService } from '../../kernel/files/files.service';
import { STORAGE, type Storage } from '../../kernel/files/storage';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { discoveryCacheOf } from '../assistant/discovery/cache';
import { TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { AiModule } from '../ai.module';
import { KB_EMBEDDER } from '../kb/kb-search.handler';
import type { KbIngestJob } from '../kb/ingest';
import { startKbIngestWorker } from './kb-ingest.processor';
import { startAssistantEventsPrune } from './assistant-events.processor';
import { startAssistantTurnWorker } from './assistant-turn.processor';
import type { TurnJob } from '../assistant/genui/turn-request.consumer';
import { GenUiIntents } from '../../kernel/actions/genui-intent';
import { WalletService } from '../../billing/public';
import { TaskPlace } from '../tasks/task-place';
import { TASK_QUEUE, type TaskQueue } from '../tasks/task.queue';
import { startTaskWorkers, type TaskWorkers } from '../tasks/task.jobs';
import { startKbSuggestWorker } from '../kb/suggestions/suggestion.jobs';
import { startAnalyzeWorker } from '../../marketing/ai/marketing-ai.jobs';
import { DISCOVERY_MODEL_SOURCE } from '../assistant/discovery/prepare.handler';
import { startDiscoveryBuildWorker } from '../assistant/discovery/build.processor';
import { AssistantInputInstaller } from '../assistant/input/installer';
import { markDirty } from '../../kernel/outbox/outbox';

class AiJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private kb?: Worker<KbIngestJob>;
  private resume?: Worker<ResumeJob>;
  private reply?: Worker<ReplyJob>;
  private tasks?: TaskWorkers;
  private events?: { close(): Promise<void> };
  private turns?: Worker<TurnJob>;
  private suggest?: { close(): Promise<void> };
  private analyze?: { close(): Promise<void> };
  private discovery?: Worker<{ ws: string; generation_id: string }>;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Optional() @Inject(FilesService) private readonly files: FilesService | undefined,
    @Inject(KB_EMBEDDER) private readonly embedder: Embedder | null,
    @Inject(DISCOVERY_MODEL_SOURCE) private readonly discoveryModels: ModelSource | null,
    @Inject(CreditMeter) private readonly meter: CreditMeter | null,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | undefined,
    @Inject(AiRunner) private readonly runner: AiRunner | null,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Inject(AuthzResolver) private readonly authz: AuthzResolver | null,
    @Inject(TaskPlace) private readonly place: TaskPlace,
    @Optional() @Inject(TASK_QUEUE) private readonly taskQueue: TaskQueue | null,
    @Optional() @Inject(WalletService) private readonly wallet: WalletService | null,
    @Optional() @Inject(GenUiIntents) private readonly intents: GenUiIntents | null,
    @Optional() @Inject(STORAGE) private readonly storage: Storage | null = null,
  ) {}

  /** AuthzContext hiện tại của người ra lệnh (thành viên còn hoạt động) — §3.3b kiểm lại khi chạy action đã duyệt. */
  private async commander(ws: string, userId: string): Promise<AuthzContext | null> {
    const m = await this.platform!.membership.findFirst({ where: { workspaceId: ws, userId, status: 'active' }, select: { roleKey: true, delegations: true } });
    return m && this.authz ? this.authz.resolve(ws, userId, m) : null;
  }

  async onApplicationBootstrap(): Promise<void> {
    const { redis, tenants, files } = this;
    if (!redis || !tenants || !files) return;
    this.kb = startKbIngestWorker(redis, tenants, { files, embedder: this.embedder, meter: this.meter, log: this.log, now: () => this.clock.now() }, this.log);
    // TIP-023c: dọn sổ sự kiện stream Trợ lý quá 24h (chỉ workspace đã đánh dấu).
    this.events = await startAssistantEventsPrune(redis, tenants, () => this.clock.now(), this.log);
    // TIP-023e §1.4: dựng vector kho mô tả action (generation đã được assistant.discovery_prepare xác nhận) — cần executor để
    // dựng lại corpus (buildCorpus(implementedBy(executor))) đúng registry hiện hành, không cần platform (chỉ ghi tenant).
    if (this.executor) this.discovery = startDiscoveryBuildWorker(redis, { tenants, executor: this.executor, models: this.discoveryModels, meter: this.meter, log: this.log, now: () => this.clock.now(), dirty: (ws) => markDirty(redis, ws) });
    if (this.executor && this.platform) {
      const deps = { tenants, executor: this.executor, runner: this.runner, kv: redis, log: this.log, now: () => this.clock.now(), commander: (ws: string, u: string) => this.commander(ws, u) };
      this.resume = startAiResumeWorker(redis, deps, this.log);
      // TIP-022: agent trực kênh + phần quyết định sau khi run chờ duyệt chạy tiếp.
      if (this.runner) {
        const reply: ReplyDeps = { tenants, executor: this.executor, runner: this.runner, embedder: this.embedder, meter: this.meter, kv: redis, log: this.log, now: () => this.clock.now() };
        // Hook chạy tiếp dùng deps của lần chạy tiếp (process đang xử lý job), chỉ embedder lấy từ module này.
        const embedder = this.embedder;
        const of = (x: ResumeDeps): ReplyDeps | null => (x.runner ? { ...x, runner: x.runner, embedder } : null);
        for (const kind of ['agent_reply', 'suggestion']) {
          registerResumeSpec(kind, (db, run, x, ws) => resumeReplySpec(of(x) ?? reply, db, run, ws));
          registerResumeFinish(kind, async (db, run, r, x, ws) => {
            const rd = of(x);
            return rd ? finishResumedTurn(rd, db, ws, run, r) : null;
          });
        }
        // TIP-022b: duyệt hết hạn ở lượt agent → chuyển người kèm tóm tắt + receipt lượt xong.
        registerResumeExpired('agent_reply', (db, run, x, ws) => handoffAfterApproval({ kv: x.kv, now: x.now }, db, ws, run, 'approval_expired'));
        // TIP-023: run Trợ lý dừng vì delegate / tool cần duyệt → chạy tiếp với quyền hiện tại của người ra lệnh.
        registerResumeSpec('assistant', async (db, run, x, ws) =>
          assistantResumeSpec({ executor: x.executor, runner: x.runner ?? reply.runner, now: x.now, discovery: { models: this.discoveryModels, meter: this.meter, cache: discoveryCacheOf(redis, this.intents?.derive('discovery-cache')) }, storage: this.storage }, db, run, ws, run.initiatedByUserId ? await x.commander(ws, run.initiatedByUserId) : null),
        );
        this.reply = startAgentReplyWorker(redis, reply, this.log);
        // TIP-023c: lượt Trợ lý đã claim ở API → chạy ở đây (lease có fence, quyền hiện hành của người ra lệnh).
        this.turns = startAssistantTurnWorker(redis, { ...deps, runner: this.runner, intents: this.intents, pub: redis, discovery: { models: this.discoveryModels, meter: this.meter, cache: discoveryCacheOf(redis, this.intents?.derive('discovery-cache')) }, storage: this.storage }, this.log);
      }
      // TIP-043: đề xuất hỏi–đáp từ hội thoại đã đóng (model qua AiRunner, ghi qua Executor nguồn system).
      // TIP-037: phân tích marketing (gợi ý chiến dịch) — model ở đây, ghi gợi ý qua action hệ thống.
      if (this.runner) this.analyze = startAnalyzeWorker(redis, { tenants, runner: this.runner, executor: this.executor, authzOf: (ws, u) => this.commander(ws, u), now: () => this.clock.now() }, this.log);
      this.suggest = startKbSuggestWorker(redis, tenants, { executor: this.executor, runner: this.runner, now: () => this.clock.now(), locale: async (ws) => (await this.place.of(ws)).locale }, this.log);
      // TIP-035: tác vụ tự chủ — chạy lượt (quyền = agent ∩ người tạo hiện tại) + lịch mỗi phút.
      if (this.taskQueue) {
        const place = this.place;
        const wallet = this.wallet;
        const td = { ...deps, place: (ws: string) => place.of(ws), userName: (u: string) => place.userName(u), credits: async (ws: string) => (wallet ? (await wallet.balance(ws)).total : null) };
        this.tasks = await startTaskWorkers(redis, tenants, this.platform, this.taskQueue, td, this.log);
      }
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.kb?.close();
    await this.resume?.close();
    await this.reply?.close();
    await this.tasks?.close();
    await this.events?.close();
    await this.turns?.close();
    await this.suggest?.close();
    await this.analyze?.close();
    await this.discovery?.close();
  }
}

export const AI_RUNTIME = AiJobsRunner;

// Handler domain như API (TIP-023b): chạy tiếp run sau duyệt / agent / tác vụ không gặp NOT_IMPLEMENTED.
@Module({ imports: [AiModule, BillingModule, AuthzModule, AiDomainHandlersModule], providers: [AiJobsRunner, AssistantInputInstaller] })
export class AiJobsModule {}

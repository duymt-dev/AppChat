// BullMQ processor của domain `ai` (worker ROLE=ai). TIP-020: `kb-ingest` (nạp tài liệu kho tri thức). TIP-021: `ai-resume` (chạy
// action đã duyệt + chạy tiếp run, hết hạn duyệt) — cần handler của mọi domain mà agent gọi được → nạp module domain có action
// `agentGrantable`. TIP-022: `agent-reply` (agent trực kênh). TIP 023, 035, 043 thêm processor (ai-task…). Thiếu DB / Redis → không chạy.
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Embedder } from '@appchat/ai';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import { AuthzModule } from '../../authz/authz.module';
import { AuthzResolver } from '../../authz/services/authz-resolver';
import { ChannelsModule } from '../../channels/channels.module';
import { CrmModule } from '../../crm/crm.module';
import { InboxModule } from '../../inbox/inbox.module';
import { ActionExecutor } from '../../kernel/actions/executor';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { AiRunner } from '../runs/runner';
import type { ResumeJob } from '../approvals/resume.queue';
import { startAiResumeWorker } from './ai-resume.processor';
import { startAgentReplyWorker } from './agent-reply.processor';
import type { ReplyJob } from '../reply/reply.queue';
import { finishResumedTurn, resumeReplySpec, type ReplyDeps } from '../reply/reply.service';
import { registerResumeFinish, registerResumeSpec, type ResumeDeps } from '../approvals/resume';
import { CreditMeter } from '../../billing/public';
import { BillingModule } from '../../billing/billing.module';
import { CLOCK, type Clock } from '../../kernel/clock';
import { FilesService } from '../../kernel/files/files.service';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { AiModule } from '../ai.module';
import { KB_EMBEDDER } from '../kb/kb-search.handler';
import type { KbIngestJob } from '../kb/ingest';
import { startKbIngestWorker } from './kb-ingest.processor';

class AiJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private kb?: Worker<KbIngestJob>;
  private resume?: Worker<ResumeJob>;
  private reply?: Worker<ReplyJob>;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Optional() @Inject(FilesService) private readonly files: FilesService | undefined,
    @Inject(KB_EMBEDDER) private readonly embedder: Embedder | null,
    @Inject(CreditMeter) private readonly meter: CreditMeter | null,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | undefined,
    @Inject(AiRunner) private readonly runner: AiRunner | null,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Inject(AuthzResolver) private readonly authz: AuthzResolver | null,
  ) {}

  /** AuthzContext hiện tại của người ra lệnh (thành viên còn hoạt động) — §3.3b kiểm lại khi chạy action đã duyệt. */
  private async commander(ws: string, userId: string): Promise<AuthzContext | null> {
    const m = await this.platform!.membership.findFirst({ where: { workspaceId: ws, userId, status: 'active' }, select: { roleKey: true, delegations: true } });
    return m && this.authz ? this.authz.resolve(ws, userId, m) : null;
  }

  onApplicationBootstrap(): void {
    const { redis, tenants, files } = this;
    if (!redis || !tenants || !files) return;
    this.kb = startKbIngestWorker(redis, tenants, { files, embedder: this.embedder, meter: this.meter, log: this.log, now: () => this.clock.now() }, this.log);
    if (this.executor && this.platform) {
      const deps = { tenants, executor: this.executor, runner: this.runner, kv: redis, log: this.log, now: () => this.clock.now(), commander: (ws: string, u: string) => this.commander(ws, u) };
      this.resume = startAiResumeWorker(redis, deps, this.log);
      // TIP-022: agent trực kênh + phần quyết định sau khi run chờ duyệt chạy tiếp.
      if (this.runner) {
        const reply: ReplyDeps = { tenants, executor: this.executor, runner: this.runner, embedder: this.embedder, kv: redis, log: this.log, now: () => this.clock.now() };
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
        this.reply = startAgentReplyWorker(redis, reply, this.log);
      }
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.kb?.close();
    await this.resume?.close();
    await this.reply?.close();
  }
}

export const AI_RUNTIME = AiJobsRunner;

@Module({ imports: [AiModule, BillingModule, AuthzModule, ChannelsModule, CrmModule, InboxModule], providers: [AiJobsRunner] })
export class AiJobsModule {}

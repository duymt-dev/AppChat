// Worker ROLE=jobs của domain `support` (TIP-034, Blueprint §1.4 "SLA tick"): scheduler `support.sla-sweep` mỗi phút trên queue riêng
// `support-scheduler` (jobId cố định → một lịch dù nhiều worker) — sắp đến hạn / quá hạn FRT / TTR → leo thang. Consumer `support` của
// queue `events`: tin khách vào hội thoại có ticket (bình luận, Đang chờ → Đang xử lý, tự mở lại trong 7 ngày, CSAT) + trả lời đầu.
// Consumer `support.ai-complaint` (TIP-022b): khiếu nại ở lượt agent auto → ticket.create qua Executor.
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { messageReceivedEvent, messageSentEvent } from '@appchat/shared';
import { CLOCK, type Clock } from '../../kernel/clock';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { registerEventConsumer, unregisterEventConsumer, type EventConsumer } from '../../kernel/events/consumer';
import { SupportModule } from '../support.module';
import type { SystemRunDeps } from '../../kernel/actions/system';
import { onAgentReply, onCustomerMessage, sweepSla } from '../services/support-system';
import { ActionExecutor } from '../../kernel/actions/executor';
import { agentAuthz } from '../../ai/agents/agent-authz';
import { AI_COMPLAINT_CONSUMER, aiComplaintConsumer } from '../events/ai-complaint.consumer';

export const SUPPORT_SCHEDULER_QUEUE = 'support-scheduler';
export const SLA_SWEEP_JOB = 'support.sla-sweep';
const EVERY_MS = 60_000;

export interface SlaSweepDeps {
  platform: Pick<PlatformDb, 'workspace'>;
  tenants: TenantDbResolver;
  /** TIP-003c: mốc SLA chạy qua action riêng `ticket.system_transition`. */
  executor: Pick<ActionExecutor, 'execute'>;
  now: () => Date;
  onError?: (ws: string, err: unknown) => void;
}

export async function sweepSupport(d: SlaSweepDeps) {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } });
  const total = { warned: 0, breached: 0 };
  for (const w of wss) {
    try {
      const db = await d.tenants.get(TenantContexts.system(w.id, SLA_SWEEP_JOB));
      const r = await sweepSla(db, w.id, d.now(), { executor: d.executor, tenants: d.tenants, onError: (_id, err) => d.onError?.(w.id, err) });
      total.warned += r.warned;
      total.breached += r.breached;
    } catch (err) {
      d.onError?.(w.id, err);
    }
  }
  return total;
}

/** Consumer `support` (event đã lưu → action riêng). Lỗi ném lại để consumer thử lại (biên nhận trigger chống lặp). */
export const supportConsumer = (sys: Omit<SystemRunDeps, 'onError'>): EventConsumer => ({
  name: 'support',
  topics: ['message.received', 'message.sent'],
  async handle(e, db) {
    const d: SystemRunDeps = { ...sys, onError: (_id, err) => { throw err; } };
    if (e.topic === 'message.received') await onCustomerMessage(db, e.workspaceId, messageReceivedEvent.parse(e.payload), d);
    else await onAgentReply(db, e.workspaceId, messageSentEvent.parse(e.payload), d);
  },
});

class SupportJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | undefined,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.redis || !this.platform || !this.tenants || !this.executor) return;
    const now = () => this.clock.now();
    registerEventConsumer(supportConsumer({ executor: this.executor, tenants: this.tenants }));
    // TIP-022b D: khiếu nại phát hiện ở lượt agent → ticket qua Executor (actor agent, grant hiện hành).
    registerEventConsumer(aiComplaintConsumer(this.executor, (a) => agentAuthz(a)));
    const deps: SlaSweepDeps = { platform: this.platform, tenants: this.tenants, executor: this.executor, now, onError: (ws, err) => this.log.warn({ err, ws, job: SLA_SWEEP_JOB }, 'quét SLA lỗi ở workspace') };
    this.queue = new Queue(SUPPORT_SCHEDULER_QUEUE, { connection: this.redis.duplicate() });
    await this.queue.upsertJobScheduler(SLA_SWEEP_JOB, { every: EVERY_MS }, { name: SLA_SWEEP_JOB });
    this.worker = new Worker(
      SUPPORT_SCHEDULER_QUEUE,
      async (job) => {
        if (job.name !== SLA_SWEEP_JOB) return;
        const r = await sweepSupport(deps);
        if (r.warned || r.breached) this.log.info({ job: SLA_SWEEP_JOB, ...r }, 'quét SLA');
      },
      { connection: this.redis.duplicate(), concurrency: 1 },
    );
    this.worker.on('failed', (job, err) => this.log.warn({ err, job: job?.name }, 'support scheduler lỗi'));
  }

  async onApplicationShutdown(): Promise<void> {
    unregisterEventConsumer('support');
    unregisterEventConsumer(AI_COMPLAINT_CONSUMER);
    await this.worker?.close();
    await this.queue?.close();
  }
}

@Module({ imports: [SupportModule], providers: [SupportJobsRunner] })
export class SupportJobsModule {}

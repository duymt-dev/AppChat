// Worker ROLE=jobs của domain `integrations` (TIP-012, 012b P3): queue `integrations` (gọi ra ngoài qua port, retry, call log), queue
// `integration-ops` (biên nhận bền: thăm dò / kéo — claim CAS, rào phiên bản khoá) + quét 60 giây `integration-ops-scheduler` (khôi
// phục việc mất job + kéo tự động đến hạn). Op `bank.pull` do SalesJobsModule đăng ký (ghi biên nhận là việc của sales).
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { Redis } from 'ioredis';
import { connectorRegistry } from '@appchat/integrations';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import { CLOCK, type Clock } from '../../kernel/clock';
import { ENC_KEY } from '../../kernel/crypto';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { IntegrationsModule } from '../integrations.module';
import { startIntegrationsWorker } from './integration-call.processor';
import { INTEGRATION_OPS_QUEUE, IntegrationOps, executeCall, registerCallOp, unregisterCallOp, type OpsJob } from '../operations/call-runner';
import { PROBE_OP, probeOp } from '../operations/probe';
import { providerHttp } from '../operations/provider-http';
import { mailTransports } from '../mail/module';
import { MAIL_SEND_OP, mailSendOp } from '../mail/dispatch';
import { OPS_SCHEDULER_QUEUE, OPS_SWEEP_JOB, SWEEP_EVERY_MS, sweepIntegrationOps } from './bank-sync.scheduler';

class IntegrationsJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private workers: Worker[] = [];
  private sched?: Queue;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(ENC_KEY) private readonly key: Buffer | undefined,
    @Inject(IntegrationOps) private readonly ops: IntegrationOps | null,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.redis || !this.tenants || !this.key) return;
    const now = () => this.clock.now();
    this.workers.push(startIntegrationsWorker(this.redis, { tenants: this.tenants, registry: connectorRegistry, key: this.key, kv: this.redis, now }, this.log));
    registerCallOp(PROBE_OP, probeOp);
    // TIP-012c: gửi mail của DN (bộ xử lý miền do marketing đăng ký ở cùng ROLE=jobs — thiếu thì op hoãn, không giả gửi).
    registerCallOp(MAIL_SEND_OP, mailSendOp);
    const deps = { tenants: this.tenants, registry: connectorRegistry, key: this.key, http: providerHttp(), mail: mailTransports(), kv: this.redis, now };
    this.workers.push(
      new Worker(
        INTEGRATION_OPS_QUEUE,
        async (job: Job<OpsJob>) => {
          const r = await executeCall(deps, job.data.ws, job.data.call_id);
          // Thử lại có lịch: đẩy job theo `next_attempt_at` mới (quét 60 giây cũng nhặt nếu job này mất).
          if (r === 'retry' && this.ops) {
            const db = await this.tenants!.get(TenantContexts.system(job.data.ws, 'integrations:retry'));
            const row = await db.integrationCallLog.findUnique({ where: { id: job.data.call_id }, select: { nextAttemptAt: true } });
            if (row?.nextAttemptAt) await this.ops.enqueue(job.data.ws, job.data.call_id, row.nextAttemptAt);
          }
          return r;
        },
        { connection: this.redis.duplicate(), concurrency: 4 },
      ),
    );
    if (!this.platform || !this.ops) return;
    const ops = this.ops;
    this.sched = new Queue(OPS_SCHEDULER_QUEUE, { connection: this.redis.duplicate() });
    await this.sched.upsertJobScheduler(OPS_SWEEP_JOB, { every: SWEEP_EVERY_MS }, { name: OPS_SWEEP_JOB });
    const sweep = { platform: this.platform, tenants: this.tenants, enqueue: (ws: string, id: string, at: Date | null) => ops.enqueue(ws, id, at), now, onError: (ws: string, err: unknown) => this.log.warn({ err, ws, job: OPS_SWEEP_JOB }, 'quét runtime kết nối lỗi ở workspace') };
    this.workers.push(new Worker(OPS_SCHEDULER_QUEUE, async (job) => (job.name === OPS_SWEEP_JOB ? sweepIntegrationOps(sweep) : undefined), { connection: this.redis.duplicate(), concurrency: 1 }));
  }

  async onApplicationShutdown(): Promise<void> {
    unregisterCallOp(PROBE_OP);
    unregisterCallOp(MAIL_SEND_OP);
    await Promise.all(this.workers.map((w) => w.close()));
    await this.sched?.close();
  }
}

@Module({ imports: [IntegrationsModule], providers: [IntegrationsJobsRunner] })
export class IntegrationsJobsModule {}

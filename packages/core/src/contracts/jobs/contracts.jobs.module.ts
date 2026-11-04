// Worker ROLE=jobs của domain `contracts` (TIP-030): scheduler `contracts.sweep` mỗi 15 phút trên queue riêng `contracts-scheduler`
// (như sales — DC-173): link ký quá hạn → `declined`, T-30 nhắc gia hạn (một lần), qua ngày kết thúc → `expired`. Lỗi một workspace
// (DB chưa nâng migration…) không chặn workspace khác.
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../../kernel/clock';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { ContractsModule } from '../contracts.module';
import { expireContracts, expireLinks, remindRenewal } from '../services/contract-system';
import { expireAppendixLinks } from '../appendix/expiry';

export const CONTRACTS_SCHEDULER_QUEUE = 'contracts-scheduler';
export const CONTRACT_SWEEP_JOB = 'contracts.sweep';
const EVERY_MS = 15 * 60_000;

export async function sweepContracts(d: { platform: Pick<PlatformDb, 'workspace'>; tenants: TenantDbResolver; now: () => Date; onError?: (ws: string, err: unknown) => void }) {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true, timezone: true, locale: true } });
  const r = { declined: 0, reminded: 0, expired: 0 };
  for (const w of wss) {
    try {
      const db = await d.tenants.get(TenantContexts.system(w.id, CONTRACT_SWEEP_JOB));
      const now = d.now();
      r.declined += await expireLinks(db, w.id, now, w.locale);
      r.reminded += await remindRenewal(db, w.id, now, w.timezone);
      r.expired += await expireContracts(db, w.id, now, w.timezone);
      // Phụ lục (TIP-030b F3) sau cùng: lỗi riêng phần phụ lục không chặn quét hợp đồng của workspace.
      r.declined += await expireAppendixLinks(db, now, w.locale);
    } catch (err) {
      d.onError?.(w.id, err);
    }
  }
  return r;
}

class ContractsJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.redis || !this.platform || !this.tenants) return;
    const deps = { platform: this.platform, tenants: this.tenants, now: () => this.clock.now(), onError: (ws: string, err: unknown) => this.log.warn({ err, ws, job: CONTRACT_SWEEP_JOB }, 'quét hợp đồng lỗi ở workspace') };
    this.queue = new Queue(CONTRACTS_SCHEDULER_QUEUE, { connection: this.redis.duplicate() });
    await this.queue.upsertJobScheduler(CONTRACT_SWEEP_JOB, { every: EVERY_MS }, { name: CONTRACT_SWEEP_JOB });
    this.worker = new Worker(
      CONTRACTS_SCHEDULER_QUEUE,
      async (job) => {
        if (job.name !== CONTRACT_SWEEP_JOB) return;
        const r = await sweepContracts(deps);
        if (r.declined || r.reminded || r.expired) this.log.info({ job: CONTRACT_SWEEP_JOB, ...r }, 'quét hợp đồng');
      },
      { connection: this.redis.duplicate(), concurrency: 1 },
    );
    this.worker.on('failed', (job, err) => this.log.warn({ err, job: job?.name }, 'contracts scheduler lỗi'));
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}

@Module({ imports: [ContractsModule], providers: [ContractsJobsRunner] })
export class ContractsJobsModule {}

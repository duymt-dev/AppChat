// Worker ROLE=jobs (TIP-045b annex A1): khôi phục thao tác xuyên DB + gửi hiệu ứng ngoài đến hạn. Lịch là BullMQ job scheduler
// (`consistency-scheduler`, jobId cố định → một lịch dù nhiều worker; concurrency 1), mỗi lượt có giới hạn số dòng. Lease / fence ở
// từng thao tác nên hai worker cùng quét không chạy trùng pha. Chỉ bật khi có DB nền tảng + Redis + executor.
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PlatformDb } from '@appchat/db';
import { registry } from '@appchat/actions';
import { ActionHandlerRegistry } from '../actions/handler-registry';
import { CLOCK, type Clock } from '../clock';
import { ENC_KEY } from '../crypto';
import { Queue, Worker } from '../jobs/with-job-context';
import { LOGGER } from '../kernel.module';
import type { AppLogger } from '../logger/logger';
import { REDIS } from '../redis';
import { PLATFORM_DB } from '../tenant/tenant.providers';
import { recoverOperations, recoveryAdapters } from './operation-recovery';
import { PlatformOperations } from './platform-operation';
import { sweepEffects } from './platform-effects';

export const CONSISTENCY_QUEUE = 'consistency-scheduler';
const RECOVER_JOB = 'consistency.recover';
const EFFECTS_JOB = 'consistency.effects';

class ConsistencyRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(PlatformOperations) private readonly ops: PlatformOperations | undefined,
    @Optional() @Inject(ActionHandlerRegistry) private readonly handlers: ActionHandlerRegistry | undefined,
    @Optional() @Inject(ENC_KEY) private readonly key: Buffer | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const { redis, platform, ops, handlers } = this;
    if (!redis || !platform || !ops || !handlers) return;
    const defs = new Map(registry.map((a) => [a.id, a]));
    const now = () => this.clock.now();
    this.queue = new Queue(CONSISTENCY_QUEUE, { connection: redis.duplicate() });
    await this.queue.upsertJobScheduler(RECOVER_JOB, { every: 15_000 }, { name: RECOVER_JOB });
    await this.queue.upsertJobScheduler(EFFECTS_JOB, { every: 15_000 }, { name: EFFECTS_JOB });
    this.worker = new Worker(
      CONSISTENCY_QUEUE,
      async (job) => {
        if (job.name === RECOVER_JOB) {
          const r = await recoverOperations({ ops, defs, handler: (id) => handlers.get(id), now, onError: (id, err) => this.log.warn({ err, operation: id }, 'khôi phục thao tác lỗi') });
          if (r.completed || r.dead) this.log.info({ job: RECOVER_JOB, ...r }, 'khôi phục thao tác xuyên DB');
          // Bộ khôi phục phụ của domain (TIP-019b usage AI): lỗi một bộ không chặn bộ khác.
          for (const [name, fn] of recoveryAdapters()) {
            const a = await fn(now).catch((err) => (this.log.warn({ err, adapter: name }, 'khôi phục phụ lỗi'), null));
            if (a && Object.values(a).some((v) => v > 0)) this.log.info({ job: RECOVER_JOB, adapter: name, ...a }, 'khôi phục phụ');
          }
          return r;
        }
        if (job.name === EFFECTS_JOB) return sweepEffects({ platform, key: this.key, now, onError: (kind, err) => this.log.warn({ err, kind }, 'gửi hiệu ứng lỗi') });
        return null;
      },
      { connection: redis.duplicate(), concurrency: 1 },
    );
    this.worker.on('failed', (job, err) => this.log.warn({ err, job: job?.name }, 'consistency scheduler lỗi'));
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}

@Module({ providers: [ConsistencyRunner] })
export class ConsistencyJobsModule {}

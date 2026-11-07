// Dọn cache bản dịch hết hạn (TIP-025b §H): scheduler mỗi giờ trên queue riêng, chạy ở ROLE=jobs qua InboxUiJobsModule — chỉ cần tenant
// + Clock (không nạp AiModule / AiJobsModule). Lỗi một workspace không chặn workspace khác; log chỉ có id workspace + số dòng.
import { Inject, Injectable, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import { CLOCK, type Clock } from '../../kernel/clock';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { purgeTranslations } from '../skills/translation-cache';

export const TRANSLATION_CLEANUP_QUEUE = 'inbox-ui-scheduler';
export const TRANSLATION_CLEANUP_JOB = 'inbox.translation-cache-cleanup';
const EVERY_MS = 60 * 60_000;

export async function cleanupTranslationCache(d: { platform: Pick<PlatformDb, 'workspace'>; tenants: TenantDbResolver; now: () => Date; onError?: (ws: string, err: unknown) => void }): Promise<number> {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } });
  let purged = 0;
  for (const w of wss) {
    try {
      purged += await purgeTranslations(await d.tenants.get(TenantContexts.system(w.id, TRANSLATION_CLEANUP_JOB)), d.now());
    } catch (err) {
      d.onError?.(w.id, err);
    }
  }
  return purged;
}

@Injectable()
export class TranslationCacheCleanup implements OnApplicationBootstrap, OnApplicationShutdown {
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
    const deps = { platform: this.platform, tenants: this.tenants, now: () => this.clock.now(), onError: (ws: string, err: unknown) => this.log.warn({ err, ws, job: TRANSLATION_CLEANUP_JOB }, 'dọn cache dịch lỗi ở workspace') };
    this.queue = new Queue(TRANSLATION_CLEANUP_QUEUE, { connection: this.redis.duplicate() });
    await this.queue.upsertJobScheduler(TRANSLATION_CLEANUP_JOB, { every: EVERY_MS }, { name: TRANSLATION_CLEANUP_JOB });
    this.worker = new Worker(
      TRANSLATION_CLEANUP_QUEUE,
      async (job) => {
        if (job.name !== TRANSLATION_CLEANUP_JOB) return;
        const purged = await cleanupTranslationCache(deps);
        if (purged) this.log.info({ job: TRANSLATION_CLEANUP_JOB, purged }, 'dọn cache dịch hết hạn');
      },
      { connection: this.redis.duplicate(), concurrency: 1 },
    );
    this.worker.on('failed', (job, err) => this.log.warn({ err, job: job?.name }, 'dọn cache dịch lỗi'));
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}

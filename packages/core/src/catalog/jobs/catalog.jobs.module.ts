// Worker ROLE=jobs của domain `catalog` (TIP-027): consumer `catalog-sync` của queue `events` — `product.changed` → nguồn RAG
// của sản phẩm (không giá / tồn — rag §2) → đẩy `kb-ingest` (worker ROLE=ai nạp). Chỉ bật khi có Redis + DB nền tảng.
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PlatformDb } from '@appchat/db';
import { KbIngestQueue } from '../../ai/kb/kb.queue';
import { CLOCK, type Clock } from '../../kernel/clock';
import { registerEventConsumer, unregisterEventConsumer } from '../../kernel/events/consumer';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { CatalogModule } from '../catalog.module';
import { catalogSyncConsumer } from '../events/catalog-sync';

class CatalogJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private queue?: KbIngestQueue;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  onApplicationBootstrap(): void {
    const { redis, platform } = this;
    if (!redis || !platform) return;
    const queue = (this.queue = new KbIngestQueue(redis));
    registerEventConsumer(
      catalogSyncConsumer({
        push: (ws, sources) => queue.push(ws, sources),
        localeOf: async (ws) => (await platform.workspace.findUnique({ where: { id: ws }, select: { locale: true } }))?.locale ?? 'vi',
        now: () => this.clock.now(),
      }),
    );
  }

  async onApplicationShutdown(): Promise<void> {
    unregisterEventConsumer('catalog-sync');
    await this.queue?.onApplicationShutdown();
  }
}

@Module({ imports: [CatalogModule], providers: [CatalogJobsRunner] })
export class CatalogJobsModule {}

// Worker ROLE=jobs của domain `catalog` (TIP-027): consumer `catalog-sync` của queue `events` — `product.changed` → nguồn RAG
// của sản phẩm (không giá / tồn — rag §2) → đẩy `kb-ingest` (worker ROLE=ai nạp). Chỉ bật khi có Redis + DB nền tảng.
// TIP-032b: consumer `catalog.product-import` — `product.import_requested` → chạy lần nhập (> 500 dòng / chạy lại / huỷ) qua ImportDeps.
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PlatformDb } from '@appchat/db';
import { KbIngestQueue } from '../../ai/kb/kb.queue';
import { CLOCK, type Clock } from '../../kernel/clock';
import { registerEventConsumer, unregisterEventConsumer } from '../../kernel/events/consumer';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { CatalogModule } from '../catalog.module';
import { catalogSyncConsumer, catalogSyncContract } from '../events/catalog-handoff';
import { installContract } from '../../notify/delivery/admission';
import { ImportDeps } from '../import/status';

class CatalogJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private queue?: KbIngestQueue;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ImportDeps) private readonly imports: ImportDeps,
  ) {}

  onApplicationBootstrap(): void {
    const { redis, platform } = this;
    if (!redis || !platform) return;
    const queue = (this.queue = new KbIngestQueue(redis));
    const base = { localeOf: async (ws: string) => (await platform.workspace.findUnique({ where: { id: ws }, select: { locale: true } }))?.locale ?? 'vi', now: () => this.clock.now() };
    registerEventConsumer(catalogSyncConsumer({ ...base, push: (ws, sources) => queue.push(ws, sources) }));
    // TIP-006b: v2 handoff — nguồn + ý định nạp cùng biên nhận; đẩy job do quét khôi phục ROLE=ai.
    installContract(catalogSyncContract(base));
    registerEventConsumer({
      name: 'catalog.product-import',
      topics: ['product.import_requested'],
      handle: async (e) => {
        const id = (e.payload as { import_id?: string }).import_id;
        if (id) await this.imports.run(e.workspaceId, id);
      },
    });
  }

  async onApplicationShutdown(): Promise<void> {
    unregisterEventConsumer('catalog-sync');
    unregisterEventConsumer('catalog.product-import');
    await this.queue?.onApplicationShutdown();
  }
}

@Module({ imports: [CatalogModule], providers: [CatalogJobsRunner] })
export class CatalogJobsModule {}

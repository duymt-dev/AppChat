// Worker ROLE=jobs của domain `documents`. TIP-028 render PDF xem trước mẫu ngay trong API (DocRenderer — tối đa 2 lượt LibreOffice
// cùng lúc, 60 giây — DV-007). TIP-028b: queue `doc-render` cho chứng từ phát hành (PDF đóng băng + sha256) — consumer
// `documents.render` (`document.render_requested` → job), worker 2 việc / tiến trình, vòng quét `doc-render.sweep` mỗi phút đẩy lại việc
// kẹt. Kind chứng từ do domain chủ đăng ký (sales: `quote` — SalesJobsModule nạp SalesModule ở cùng ROLE). Tin gửi khách đẩy hàng gửi
// kênh sau commit; outbox đánh dấu bẩn để relay phát `document.rendered` / `document.render_failed` ngay.
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import type { Worker } from '../../kernel/jobs/with-job-context';
import { CLOCK, type Clock } from '../../kernel/clock';
import { eventConsumers, registerEventConsumer, unregisterEventConsumer } from '../../kernel/events/consumer';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { markDirty } from '../../kernel/outbox/outbox';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { ChannelsModule } from '../../channels/channels.module';
import { ChannelSendQueue, type SendJob } from '../../channels/public';
import type { RenderJob } from '../render/runner';
import { DOC_RENDER_CONSUMER, DocRenderQueue, docRenderConsumer, startDocRenderWorker, sweepPendingRenders } from './doc-render.processor';

type Outgoing = { job: Omit<SendJob, 'ws'> };

class DocRenderRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private queue?: DocRenderQueue;
  private worker?: Worker<RenderJob>;
  private mine = false;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Optional() @Inject(ChannelSendQueue) private readonly send: ChannelSendQueue | null,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const { redis, platform, tenants } = this;
    if (!redis || !platform || !tenants) return;
    const queue = (this.queue = new DocRenderQueue(redis));
    if (!eventConsumers().some((c) => c.name === DOC_RENDER_CONSUMER)) {
      registerEventConsumer(docRenderConsumer(queue));
      this.mine = true;
    }
    await queue.scheduleSweep();
    const now = () => this.clock.now();
    this.worker = startDocRenderWorker(redis, {
      tenants,
      now,
      log: this.log,
      sweep: () => sweepPendingRenders({ platform, tenants, queue, now, onError: (ws, err) => this.log.warn({ err, ws }, 'quét doc-render lỗi ở workspace') }),
      afterCommit: async (ws, r) => {
        await markDirty(redis, ws);
        for (const o of r.out as Outgoing[]) await this.send?.enqueue({ ws, ...o.job });
      },
    });
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.mine) unregisterEventConsumer(DOC_RENDER_CONSUMER);
    await this.worker?.close();
    await this.queue?.close();
  }
}

@Module({ imports: [ChannelsModule], providers: [DocRenderRunner] })
export class DocumentsJobsModule {}

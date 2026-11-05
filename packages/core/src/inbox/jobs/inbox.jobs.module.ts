// Worker ROLE=channels của domain `inbox` (TIP-016): processor `channel-inbound` (inbound pipeline), sink kết quả gửi, quét lại
// `outbox_message` còn pending. Thiếu DB / Redis → tắt.
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../../kernel/clock';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { ChannelSendQueue, registerHistoryPipeline, registerSendBooks, registerSendReserver, registerSendResultSink, unregisterSendResultSink } from '../../channels/public';
import { inboxSendBooks } from '../services/send-book';
import { reserveDispatch } from '../../ai/reply/send-fence';
import { ChannelsModule } from '../../channels/channels.module';
import { AgentReplyQueue } from '../../ai/reply/reply.queue';
import { InboxModule } from '../inbox.module';
import { InboundPipeline } from '../services/pipeline';
import { OUTBOX_SWEEP_MS, sendResultSink, startInboundWorker, sweepOutbox, type InboxJobDeps } from './inbound.processor';

class InboxJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private worker?: Worker;
  private timer?: NodeJS.Timeout;
  private deps?: InboxJobDeps;
  private reply?: AgentReplyQueue;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Inject(ChannelSendQueue) private readonly send: ChannelSendQueue | null,
    @Inject(InboundPipeline) private readonly pipeline: InboundPipeline,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  /** Test điều khiển trực tiếp (quét outbox ngay). */
  sweep(): Promise<number> {
    return this.deps ? sweepOutbox(this.deps) : Promise.resolve(0);
  }

  onApplicationBootstrap(): void {
    const { redis, platform, tenants, send } = this;
    if (!redis || !platform || !tenants || !send) return;
    // Tin khách → job `agent-reply` (worker ROLE=ai — TIP-022); queue chỉ là tên Redis, không cần module ai ở worker kênh.
    const reply = (this.reply = new AgentReplyQueue(redis));
    const d: InboxJobDeps = { redis, platform, tenants, pipeline: this.pipeline, send, agentReply: (j) => reply.push(j), log: this.log, now: () => this.clock.now() };
    this.deps = d;
    this.worker = startInboundWorker(d);
    registerSendResultSink('inbox', sendResultSink(d));
    // Tin agent: đặt chỗ gửi dưới khoá hội thoại trước khi gọi kênh (người tiếp quản trước → không gửi — TIP-045b annex D).
    registerSendReserver(async (ws, refId) => (await reserveDispatch(await tenants.get(TenantContexts.fromRoute(ws, 'channel')), refId, this.clock.now())) !== 'rejected');
    // Sổ gửi từng phần (TIP-014b B): chạy lại job không gửi lại phần đã xác nhận; phần treo → unknown.
    registerSendBooks(inboxSendBooks(tenants, () => this.clock.now()));
    // Lịch sử kênh (TIP-014b C) lưu qua cùng pipeline, `origin = history`.
    registerHistoryPipeline(this.pipeline as never);
    this.timer = setInterval(() => void sweepOutbox(d).catch((err: unknown) => this.log.warn({ err }, 'inbox outbox sweep failed')), OUTBOX_SWEEP_MS);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    unregisterSendResultSink('inbox');
    registerSendReserver(null);
    registerSendBooks(null);
    registerHistoryPipeline(null);
    await this.worker?.close();
    await this.reply?.onApplicationShutdown();
  }
}

export const INBOX_RUNTIME = InboxJobsRunner;

@Module({ imports: [InboxModule, ChannelsModule], providers: [InboxJobsRunner] })
export class InboxJobsModule {}

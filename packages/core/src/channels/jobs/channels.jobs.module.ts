// Worker ROLE=channels của domain `channels` (TIP-014, Blueprint §6): giữ phiên theo lease (ChannelSessions), worker gửi mỗi
// tài khoản (ChannelSenders), job đăng nhập QR (`channel-login`), lệnh từ API qua Redis pub/sub; kênh không lease (webchat —
// StatelessChannels); kênh poll (email — ChannelPollers, TIP-018). Thiếu DB / Redis / khoá → tắt.
import { hostname } from 'node:os';
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Queue, type Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import type { ChannelRegistry } from '@appchat/channels';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../../kernel/clock';
import { ENC_KEY } from '../../kernel/crypto';
import { ENV_SOURCE, LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { NotifyModule } from '../../notify/notify.module';
import { REALTIME_EMITTER, type RealtimeEmitter } from '../../notify/realtime/emitter';
import { CHANNEL_REGISTRY, ChannelsModule } from '../channels.module';
import { readChannelsEnv } from '../channels.env';
import { ChannelAccounts } from '../services/accounts.service';
import { CHANNEL_CONTROL, CHANNEL_INBOUND_QUEUE, ChannelControl, type ControlOp } from '../services/control';
import { ChannelLeases, LEASE_HEARTBEAT_MS } from './lease';
import { startLoginWorker } from './login.processor';
import { ChannelSenders } from './send.processor';
import { ChannelPollers, POLL_INTERVAL_MS } from './poller';
import { ChannelSessions } from './sessions';
import { StatelessChannels } from './stateless';

class ChannelsJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private sessions?: ChannelSessions;
  private senders?: ChannelSenders;
  private stateless?: StatelessChannels;
  private pollers?: ChannelPollers;
  private timer?: NodeJS.Timeout;
  private pollTimer?: NodeJS.Timeout;
  private login?: Worker;
  private inbound?: Queue;
  private sub?: Redis;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Optional() @Inject(ENC_KEY) private readonly key: Buffer | undefined,
    @Optional() @Inject(ENV_SOURCE) private readonly src: Record<string, string | undefined> | undefined,
    @Inject(CHANNEL_REGISTRY) private readonly registry: ChannelRegistry,
    @Inject(ChannelAccounts) private readonly accounts: ChannelAccounts | null,
    @Inject(ChannelControl) private readonly control: ChannelControl | null,
    @Inject(REALTIME_EMITTER) private readonly emitter: RealtimeEmitter,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  /** Bộ phiên của worker này (test điều khiển trực tiếp). */
  get runtime() {
    return { sessions: this.sessions, senders: this.senders, stateless: this.stateless, pollers: this.pollers };
  }

  async onApplicationBootstrap(): Promise<void> {
    const { redis, platform, tenants, key, accounts, control } = this;
    if (!redis || !platform || !tenants || !key || !accounts || !control) return;
    const env = readChannelsEnv(this.src ?? {});
    const now = () => this.clock.now();
    const leases = new ChannelLeases(redis, `${hostname()}:${process.pid}:${Math.random().toString(36).slice(2, 8)}`);
    this.inbound = new Queue(CHANNEL_INBOUND_QUEUE, { connection: redis.duplicate() });
    const sessions: ChannelSessions = new ChannelSessions({
      platform, tenants, registry: this.registry, accounts, leases, inbound: this.inbound, kv: redis, key, log: this.log, now,
      onStarted: (id, ws, adapter) => senders.open(id, ws, adapter),
      onStopped: (id) => senders.close(id),
    });
    const senders: ChannelSenders = new ChannelSenders({
      redis, tenants, log: this.log, jitterScale: env.CHANNEL_SEND_JITTER,
      pause: (ws, id, detail) => sessions.markDown(ws, id, 'send_errors', detail),
      expire: (ws, id) => sessions.markDown(ws, id, 'expired'),
    });
    this.sessions = sessions;
    this.senders = senders;
    this.login = startLoginWorker(redis, { tenants, registry: this.registry, accounts, control, emitter: this.emitter, kv: redis, key, log: this.log, now, claim: (id, ws) => sessions.claim(id, ws) });
    this.sub = redis.duplicate();
    await this.sub.subscribe(CHANNEL_CONTROL);
    this.sub.on('message', (_ch, raw: string) => {
      try {
        // Lệnh chạy / dừng: kênh không lease (webchat) mở / đóng worker gửi ngay, không chờ nhịp.
        const cmd = JSON.parse(raw) as ControlOp;
        void sessions.control(cmd).finally(() => void this.stateless?.tick());
        void this.pollers?.control(cmd).catch((err: unknown) => this.log.warn({ err, account: cmd.account_id }, 'poll channel control failed'));
      } catch {
        /* lệnh hỏng — bỏ */
      }
    });
    sessions.start();
    // Kênh không lease (webchat): mở / đóng worker gửi theo route, cùng nhịp lease.
    const stateless = (this.stateless = new StatelessChannels({ platform, registry: this.registry, log: this.log, open: (id, ws, a) => senders.open(id, ws, a), close: (id) => senders.close(id) }));
    void stateless.tick();
    this.timer = setInterval(() => void stateless.tick(), LEASE_HEARTBEAT_MS);
    // Kênh poll (email): nạp credential + poll theo khoá Redis (mỗi tài khoản một worker / POLL_INTERVAL_MS).
    const pollers = (this.pollers = new ChannelPollers({
      platform, tenants, registry: this.registry, redis, inbound: this.inbound, key, log: this.log, now,
      open: (id, ws, a) => senders.open(id, ws, a),
      close: (id) => senders.close(id),
      expire: (ws, id) => sessions.markDown(ws, id, 'expired'),
    }));
    void pollers.tick();
    this.pollTimer = setInterval(() => void pollers.tick(), Math.min(POLL_INTERVAL_MS, LEASE_HEARTBEAT_MS * 3));
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    if (this.pollTimer) clearInterval(this.pollTimer);
    await this.sub?.quit().catch(() => undefined);
    await this.login?.close();
    await this.sessions?.shutdown();
    await this.pollers?.shutdown();
    await this.senders?.closeAll();
    await this.inbound?.close();
  }
}

export const CHANNELS_RUNTIME = ChannelsJobsRunner;

@Module({ imports: [ChannelsModule, NotifyModule], providers: [ChannelsJobsRunner] })
export class ChannelsJobsModule {}

// Worker ROLE=channels của domain `channels` (TIP-014, Blueprint §6): giữ phiên theo lease (ChannelSessions), worker gửi mỗi
// tài khoản (ChannelSenders), job đăng nhập QR (`channel-login`), lệnh từ API qua Redis pub/sub; kênh không lease (webchat —
// StatelessChannels); kênh poll (email — ChannelPollers, TIP-018); worker tạo nhóm theo phiên (GroupCreators — TIP-023b). Thiếu DB / Redis / khoá → tắt.
import { hostname } from 'node:os';
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { type Worker } from 'bullmq';
import { Queue } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import type { ChannelRegistry } from '@appchat/channels';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
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
import { WorkspaceAccess } from '../../platform/public';
import { reserveSend } from '../services/send-queue';
import { GroupCreators } from './create-group.processor';
import { OperationQueue, ProviderOperators } from './provider-operations.processor';
import { runAvatarSync } from './avatar-sync.processor';
import { runContactSync } from './contact-sync.processor';
import { runGroupCommand } from './group-command.processor';
import { runFriendOp, runLookup } from './friend.processor';
import { FilesService } from '../../kernel/files/files.service';
import { providerEventQueue, startProviderEventWorker } from './provider-events.processor';
import { ActionExecutor } from '../../kernel/actions/executor';
import { ChannelPollers, POLL_INTERVAL_MS } from './poller';
import { ChannelSessions } from './sessions';
import { StatelessChannels } from './stateless';
import { historyPipeline, runHistory } from './provider-history.processor';

class ChannelsJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private sessions?: ChannelSessions;
  private senders?: ChannelSenders;
  private groups?: GroupCreators;
  private operators?: ProviderOperators;
  private providerEvents?: Queue;
  private eventWorker?: Worker;
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
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | undefined,
    @Optional() @Inject(FilesService) private readonly files: FilesService | undefined,
    @Inject(OperationQueue) private readonly opQueue: OperationQueue | null,
  ) {}

  /** Bộ phiên của worker này (test điều khiển trực tiếp). */
  get runtime() {
    return { sessions: this.sessions, senders: this.senders, stateless: this.stateless, pollers: this.pollers, groups: this.groups, operators: this.operators };
  }

  async onApplicationBootstrap(): Promise<void> {
    const { redis, platform, tenants, key, accounts, control } = this;
    const executor = this.executor;
    if (!redis || !platform || !tenants || !key || !accounts || !control || !executor) return;
    const env = readChannelsEnv(this.src ?? {});
    const now = () => this.clock.now();
    const leases = new ChannelLeases(redis, `${hostname()}:${process.pid}:${Math.random().toString(36).slice(2, 8)}`);
    this.inbound = new Queue(CHANNEL_INBOUND_QUEUE, { connection: redis.duplicate() });
    // TIP-014b: sự kiện kênh (self-listen / thu hồi / cảm xúc) + worker thao tác theo phiên (thu hồi / cảm xúc gọi nhà cung cấp).
    this.providerEvents = providerEventQueue(redis);
    this.eventWorker = startProviderEventWorker({ redis, kv: redis, tenants, log: this.log, now });
    const history = { tenants, kv: redis, log: this.log, now, pipeline: historyPipeline };
    // Ảnh đại diện (TIP-014b D): cùng hàng đợi tài khoản; ghi Storage `purpose = avatar`.
    const allow = env.CHANNEL_FETCH_TEST_ALLOW?.split(',').map((x) => x.trim()).filter(Boolean);
    const avatars = { tenants, files: this.files ?? null, log: this.log, now, ...(allow?.length ? { fetchOptions: { testAllowAddresses: allow } } : {}) };
    const operators = (this.operators = new ProviderOperators(
      { redis, kv: redis, tenants, log: this.log, now, history: (id, a, j, g) => runHistory(history, id, a, j, g),
        avatars: (id, a, j, g) => runAvatarSync(avatars, id, a, j, g),
        // Danh bạ (TIP-014b D3): ảnh chụp riêng tài khoản, không tạo khách.
        contacts: (id, a, j, g) => runContactSync({ tenants, log: this.log, now }, id, a, j, g),
        // Bạn bè + tra SĐT (TIP-014b E): chỉ nhân viên bấm, trần / ngày ở action.
        friend: (id, a, j, g) => runFriendOp({ tenants, kv: redis, log: this.log, now }, id, a, j, g),
        lookup: (id, a, j) => runLookup({ tenants, kv: redis, log: this.log, now }, id, a, j),
        // Lệnh quản lý nhóm (TIP-025b): cùng hàng đợi tài khoản, kết quả theo ACK.
        group: (id, a, j, g) => runGroupCommand({ tenants, kv: redis, log: this.log, now, ...(this.key ? { key: this.key } : {}) }, id, a, j, g),
      },
      this.opQueue ?? undefined,
    ));
    const sessions: ChannelSessions = new ChannelSessions({
      platform, tenants, executor, registry: this.registry, accounts, leases, inbound: this.inbound, providerEvents: this.providerEvents, kv: redis, key, log: this.log, now,
      // Worker gửi + worker tạo nhóm (TIP-023b) cùng vòng đời phiên: chỉ nơi giữ lease mới gọi nhà cung cấp.
      onStarted: async (id, ws, adapter, generation) => {
        // Ảnh chụp danh bạ quá 24 giờ (TIP-014b D3) — dọn khi giành phiên (best-effort, không chặn phiên).
        void tenants.get(TenantContexts.fromRoute(ws, 'channel')).then((db) => db.channelContactSync.deleteMany({ where: { channelAccountId: id, expiresAt: { lte: now() } } })).catch(() => undefined);
        await senders.open(id, ws, adapter, generation);
        await groups?.open(id, adapter);
        await operators.open(id, adapter, generation);
      },
      onStopped: async (id) => {
        await senders.close(id);
        await groups?.close(id);
        await operators.close(id);
      },
    });
    const groups = this.executor ? new GroupCreators({ redis, tenants, executor: this.executor, log: this.log }) : undefined;
    this.groups = groups;
    // Tạm dừng workspace (TIP-040) chặn tin gửi ra ngay cả khi worker đã giữ client DB tenant.
    const access = new WorkspaceAccess(platform, () => now().getTime());
    const senders: ChannelSenders = new ChannelSenders({
      redis, tenants, log: this.log, jitterScale: env.CHANNEL_SEND_JITTER, now,
      pause: (ws, id, detail) => sessions.markDown(ws, id, 'send_errors', detail),
      expire: (ws, id) => sessions.markDown(ws, id, 'expired'),
      reserve: reserveSend,
      isOpen: (ws) => access.isOpen(ws),
    });
    this.sessions = sessions;
    this.senders = senders;
    this.login = startLoginWorker(redis, { tenants, registry: this.registry, accounts, control, emitter: this.emitter, kv: redis, key, log: this.log, now, executor, claim: (id, ws) => sessions.claim(id, ws) });
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
    await this.groups?.closeAll();
    await this.operators?.closeAll();
    await this.eventWorker?.close();
    await this.providerEvents?.close();
    await this.inbound?.close();
  }
}

export const CHANNELS_RUNTIME = ChannelsJobsRunner;

@Module({ imports: [ChannelsModule, NotifyModule], providers: [ChannelsJobsRunner] })
export class ChannelsJobsModule {}

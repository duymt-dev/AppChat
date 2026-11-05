// Domain `channels` (TIP-014) — tài khoản kênh (REQ-B09), action kết nối / quản lý (REQ-B10 / B11), đọc trang Kênh kết nối,
// điều khiển worker (lease / login / lệnh), hàng đợi gửi theo tài khoản; widget website (TIP-017: action, phiên khách web `/widget`).
// Registry có adapter dựng theo env (Zalo thật / giả; webchat qua redis-emitter). Thiếu DB / Redis → service null (action trả 501).
// Luật thông báo / realtime nạp khi import module này.
import { Module, type OnApplicationShutdown } from '@nestjs/common';
import { Queue } from '../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import { ImapMailboxTransport, ZcaTransport, buildChannelRegistry, fakeMailboxTransport, fakeZaloTransport, type ChannelRegistry, type FileFetcher, type WidgetPublisher } from '@appchat/channels';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../kernel/clock';
import { ENC_KEY } from '../kernel/crypto';
import { FilesService } from '../kernel/files/files.service';
import { ENV_SOURCE } from '../kernel/kernel.module';
import { RateLimiter } from '../kernel/rate-limit';
import { REDIS } from '../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import './events/channels.rules';
import { ChannelReconnectHandler, ChannelZaloStartLoginHandler } from './actions/channel-connect.handlers';
import { ChannelDisconnectHandler, ChannelPauseHandler, ChannelResumeHandler, ChannelSyncHistoryHandler, ChannelTestHandler, ChannelUpdateSettingsHandler } from './actions/channel-manage.handlers';
import { readChannelsEnv } from './channels.env';
import { CHANNEL_REGISTRY, WIDGET_URLS } from './tokens';
import { ChannelAccounts } from './services/accounts.service';
import { CHANNEL_INBOUND_QUEUE, CHANNEL_LOGIN_QUEUE, ChannelControl } from './services/control';
import { ChannelsReadService } from './services/read.service';
import { DB_AGENT_NAMES } from '../ai/agents/agent-names';
import { ChannelSendQueue } from './services/send-queue';
import { attachmentFetcher } from './services/attachment-fetcher';
import { RedisWidgetPublisher } from './webchat/publisher';
import { VisitorService } from './webchat/visitor.service';
import { VisitorTokens } from './webchat/visitor-token';
import { ChannelSearchHandler } from './actions/channel-read.handler';
import { ChannelStatusHandler } from './actions/channel-status.handler';
import { WebchatUpdateWidgetHandler } from './webchat/webchat.handlers';
import { ChannelEmailConnectHandler } from './email/email.handlers';
import type { WidgetUrls } from './webchat/widget.service';
import { ChannelGroupResultHandler } from './actions/group-result.handler';
import { GroupRequestQueue } from './jobs/create-group.processor';
import { groupRequestConsumer } from './events/group-request.consumer';
import { OperationQueue } from './jobs/provider-operations.processor';
import { operationRequestConsumer } from './jobs/provider-events.processor';
import { GroupRead } from './services/group-read';
import { ChannelOperationRead } from './operations/operation-read';
import { registerEventConsumer, unregisterEventConsumer } from '../kernel/events/consumer';

const opt = (token: symbol) => ({ token, optional: true });

export { CHANNEL_REGISTRY, WIDGET_URLS };
const LOGIN_QUEUE = Symbol('CHANNEL_LOGIN_QUEUE');
const INBOUND_QUEUE = Symbol('CHANNEL_INBOUND_QUEUE_PRODUCER');

class Closer implements OnApplicationShutdown {
  constructor(
    private readonly q: Queue | null,
    private readonly send: ChannelSendQueue | null,
    private readonly inbound: Queue | null,
    private readonly groups: GroupRequestQueue | null,
    private readonly ops: OperationQueue | null,
  ) {}
  async onApplicationShutdown(): Promise<void> {
    await this.q?.close();
    await this.inbound?.close();
    await this.send?.close();
    await this.groups?.close();
    await this.ops?.close();
  }
}

export function channelRegistryFor(src: Record<string, string | undefined>, widget?: WidgetPublisher, files?: FileFetcher): ChannelRegistry {
  const env = readChannelsEnv(src);
  if (env.ZALO_TRANSPORT === 'fake' && env.ZALO_FAKE_GREETING) fakeZaloTransport.greeting = env.ZALO_FAKE_GREETING;
  if (env.MAIL_TRANSPORT === 'fake' && env.MAIL_FAKE_GREETING) {
    fakeMailboxTransport.greeting = { from: 'khach.e2e@khach.test', name: 'Khách Email E2E', subject: 'Hỏi lịch hẹn', text: env.MAIL_FAKE_GREETING };
  }
  return buildChannelRegistry({
    zalo: env.ZALO_TRANSPORT === 'fake' ? fakeZaloTransport : new ZcaTransport(),
    mail: env.MAIL_TRANSPORT === 'fake' ? fakeMailboxTransport : new ImapMailboxTransport(files),
    ...(files ? { files } : {}),
    ...(widget ? { widget } : {}),
  });
}

export function widgetUrlsFor(src: Record<string, string | undefined>): WidgetUrls {
  const env = readChannelsEnv(src);
  const api = env.WIDGET_API_URL.replace(/\/$/, '');
  return { api, script: env.WIDGET_SCRIPT_URL ?? `${api}/widget.js` };
}

@Module({
  providers: [
    ChannelSearchHandler,
    ChannelStatusHandler,
    ChannelZaloStartLoginHandler,
    ChannelReconnectHandler,
    ChannelUpdateSettingsHandler,
    ChannelPauseHandler,
    ChannelResumeHandler,
    ChannelSyncHistoryHandler,
    ChannelTestHandler,
    ChannelDisconnectHandler,
    WebchatUpdateWidgetHandler,
    ChannelEmailConnectHandler,
    ChannelGroupResultHandler,
    {
      // Hàng đợi tạo nhóm theo tài khoản + consumer outbox `channel.group_requested` (chạy ở tiến trình có queue `events`).
      provide: GroupRequestQueue,
      inject: [opt(REDIS)],
      useFactory: (r?: Redis) => {
        if (!r) return null;
        const q = new GroupRequestQueue(r.duplicate());
        const c = groupRequestConsumer(q);
        unregisterEventConsumer(c.name);
        registerEventConsumer(c);
        return q;
      },
    },
    {
      // Hàng đợi thao tác kênh theo tài khoản + consumer outbox `channel.operation_requested` (TIP-014b).
      provide: OperationQueue,
      inject: [opt(REDIS)],
      useFactory: (r?: Redis) => {
        if (!r) return null;
        const q = new OperationQueue(r.duplicate());
        const c = operationRequestConsumer(q);
        unregisterEventConsumer(c.name);
        registerEventConsumer(c);
        return q;
      },
    },
    { provide: GroupRead, inject: [opt(TENANT_RESOLVER)], useFactory: (t?: TenantDbResolver) => (t ? new GroupRead(t) : null) },
    { provide: ChannelOperationRead, inject: [opt(TENANT_RESOLVER)], useFactory: (t?: TenantDbResolver) => (t ? new ChannelOperationRead(t) : null) },
    {
      provide: CHANNEL_REGISTRY,
      inject: [opt(ENV_SOURCE), opt(REDIS), opt(ENC_KEY), opt(TENANT_RESOLVER), { token: FilesService, optional: true }],
      // Adapter webchat phát tin qua redis-emitter (client dùng chung — Emitter chỉ PUBLISH). Tệp gửi kèm: link ký nội bộ đọc Storage,
      // URL ngoài qua safeFetch (TIP-045b).
      useFactory: (src: Record<string, string | undefined> | undefined, r?: Redis, k?: Buffer, t?: TenantDbResolver, f?: FilesService) =>
        channelRegistryFor(src ?? {}, r ? new RedisWidgetPublisher(r) : undefined, attachmentFetcher({ apiBase: widgetUrlsFor(src ?? {}).api, key: k ?? null, tenants: t ?? null, files: f ?? null })),
    },
    { provide: WIDGET_URLS, inject: [opt(ENV_SOURCE)], useFactory: (src?: Record<string, string | undefined>) => widgetUrlsFor(src ?? {}) },
    { provide: INBOUND_QUEUE, inject: [opt(REDIS)], useFactory: (r?: Redis) => (r ? new Queue(CHANNEL_INBOUND_QUEUE, { connection: r.duplicate() }) : null) },
    {
      provide: VisitorService,
      inject: [opt(PLATFORM_DB), opt(TENANT_RESOLVER), opt(ENC_KEY), opt(REDIS), INBOUND_QUEUE, CLOCK],
      useFactory: (p: PlatformDb | undefined, t: TenantDbResolver | undefined, k: Buffer | undefined, r: Redis | undefined, q: Queue | null, clock: Clock) =>
        p && t && k && q ? new VisitorService(p, t, new VisitorTokens(k), q, r ? new RateLimiter(r) : null, () => clock.now()) : null,
    },
    { provide: ChannelAccounts, inject: [opt(PLATFORM_DB)], useFactory: (p?: PlatformDb) => (p ? new ChannelAccounts(p) : null) },
    { provide: LOGIN_QUEUE, inject: [opt(REDIS)], useFactory: (r?: Redis) => (r ? new Queue(CHANNEL_LOGIN_QUEUE, { connection: r.duplicate() }) : null) },
    { provide: ChannelControl, inject: [opt(REDIS), LOGIN_QUEUE], useFactory: (r: Redis | undefined, q: Queue | null) => (r ? new ChannelControl(r, q) : null) },
    { provide: ChannelSendQueue, inject: [opt(REDIS)], useFactory: (r?: Redis) => (r ? new ChannelSendQueue(r.duplicate()) : null) },
    {
      provide: ChannelsReadService,
      inject: [CHANNEL_REGISTRY, ChannelAccounts, ChannelControl, CLOCK],
      useFactory: (reg: ChannelRegistry, a: ChannelAccounts | null, c: ChannelControl | null, clock: Clock) => (a ? new ChannelsReadService(reg, a, c, DB_AGENT_NAMES, () => clock.now()) : null),
    },
    {
      provide: 'CHANNELS_CLOSER',
      inject: [LOGIN_QUEUE, ChannelSendQueue, INBOUND_QUEUE, GroupRequestQueue, OperationQueue],
      useFactory: (q: Queue | null, s: ChannelSendQueue | null, i: Queue | null, g: GroupRequestQueue | null, o: OperationQueue | null) => new Closer(q, s, i, g, o),
    },
  ],
  exports: [CHANNEL_REGISTRY, WIDGET_URLS, ChannelAccounts, ChannelControl, ChannelsReadService, ChannelSendQueue, VisitorService, GroupRead, ChannelOperationRead],
})
export class ChannelsModule {}

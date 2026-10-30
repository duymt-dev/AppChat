// Domain `channels` (TIP-014) — tài khoản kênh (REQ-B09), action kết nối / quản lý (REQ-B10 / B11), đọc trang Kênh kết nối,
// điều khiển worker (lease / login / lệnh), hàng đợi gửi theo tài khoản; widget website (TIP-017: action, phiên khách web `/widget`).
// Registry có adapter dựng theo env (Zalo thật / giả; webchat qua redis-emitter). Thiếu DB / Redis → service null (action trả 501).
// Luật thông báo / realtime nạp khi import module này.
import { Module, type OnApplicationShutdown } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { ZcaTransport, buildChannelRegistry, fakeZaloTransport, type ChannelRegistry, type WidgetPublisher } from '@appchat/channels';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../kernel/clock';
import { ENC_KEY } from '../kernel/crypto';
import { ENV_SOURCE } from '../kernel/kernel.module';
import { RateLimiter } from '../kernel/rate-limit';
import { REDIS } from '../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import './events/channels.rules';
import { ChannelReconnectHandler, ChannelZaloStartLoginHandler } from './actions/channel-connect.handlers';
import { ChannelDisconnectHandler, ChannelPauseHandler, ChannelResumeHandler, ChannelSyncHistoryHandler, ChannelTestHandler, ChannelUpdateSettingsHandler } from './actions/channel-manage.handlers';
import { readChannelsEnv } from './channels.env';
import { ChannelAccounts } from './services/accounts.service';
import { CHANNEL_INBOUND_QUEUE, CHANNEL_LOGIN_QUEUE, ChannelControl } from './services/control';
import { ChannelsReadService, NO_AGENTS } from './services/read.service';
import { ChannelSendQueue } from './services/send-queue';
import { RedisWidgetPublisher } from './webchat/publisher';
import { VisitorService } from './webchat/visitor.service';
import { VisitorTokens } from './webchat/visitor-token';
import { WebchatUpdateWidgetHandler } from './webchat/webchat.handlers';
import type { WidgetUrls } from './webchat/widget.service';

const opt = (token: symbol) => ({ token, optional: true });

/** Registry kênh có adapter (worker giữ phiên + gửi) — transport Zalo theo `ZALO_TRANSPORT`. */
export const CHANNEL_REGISTRY = Symbol('CHANNEL_REGISTRY');
/** URL mã nhúng widget (WIDGET_API_URL / WIDGET_SCRIPT_URL). */
export const WIDGET_URLS = Symbol('WIDGET_URLS');
const LOGIN_QUEUE = Symbol('CHANNEL_LOGIN_QUEUE');
const INBOUND_QUEUE = Symbol('CHANNEL_INBOUND_QUEUE_PRODUCER');

class Closer implements OnApplicationShutdown {
  constructor(
    private readonly q: Queue | null,
    private readonly send: ChannelSendQueue | null,
    private readonly inbound: Queue | null,
  ) {}
  async onApplicationShutdown(): Promise<void> {
    await this.q?.close();
    await this.inbound?.close();
    await this.send?.close();
  }
}

export function channelRegistryFor(src: Record<string, string | undefined>, widget?: WidgetPublisher): ChannelRegistry {
  const env = readChannelsEnv(src);
  if (env.ZALO_TRANSPORT === 'fake' && env.ZALO_FAKE_GREETING) fakeZaloTransport.greeting = env.ZALO_FAKE_GREETING;
  return buildChannelRegistry({ zalo: env.ZALO_TRANSPORT === 'fake' ? fakeZaloTransport : new ZcaTransport(), ...(widget ? { widget } : {}) });
}

export function widgetUrlsFor(src: Record<string, string | undefined>): WidgetUrls {
  const env = readChannelsEnv(src);
  const api = env.WIDGET_API_URL.replace(/\/$/, '');
  return { api, script: env.WIDGET_SCRIPT_URL ?? `${api}/widget.js` };
}

@Module({
  providers: [
    ChannelZaloStartLoginHandler,
    ChannelReconnectHandler,
    ChannelUpdateSettingsHandler,
    ChannelPauseHandler,
    ChannelResumeHandler,
    ChannelSyncHistoryHandler,
    ChannelTestHandler,
    ChannelDisconnectHandler,
    WebchatUpdateWidgetHandler,
    {
      provide: CHANNEL_REGISTRY,
      inject: [opt(ENV_SOURCE), opt(REDIS)],
      // Adapter webchat phát tin qua redis-emitter (client dùng chung — Emitter chỉ PUBLISH).
      useFactory: (src: Record<string, string | undefined> | undefined, r?: Redis) => channelRegistryFor(src ?? {}, r ? new RedisWidgetPublisher(r) : undefined),
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
      useFactory: (reg: ChannelRegistry, a: ChannelAccounts | null, c: ChannelControl | null, clock: Clock) => (a ? new ChannelsReadService(reg, a, c, NO_AGENTS, () => clock.now()) : null),
    },
    {
      provide: 'CHANNELS_CLOSER',
      inject: [LOGIN_QUEUE, ChannelSendQueue, INBOUND_QUEUE],
      useFactory: (q: Queue | null, s: ChannelSendQueue | null, i: Queue | null) => new Closer(q, s, i),
    },
  ],
  exports: [CHANNEL_REGISTRY, WIDGET_URLS, ChannelAccounts, ChannelControl, ChannelsReadService, ChannelSendQueue, VisitorService],
})
export class ChannelsModule {}

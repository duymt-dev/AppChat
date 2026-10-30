// Domain `channels` (TIP-014) — tài khoản kênh (REQ-B09), action kết nối / quản lý (REQ-B10 / B11), đọc trang Kênh kết nối,
// điều khiển worker (lease / login / lệnh), hàng đợi gửi theo tài khoản. Registry có adapter dựng theo env (Zalo thật / giả).
// Thiếu DB / Redis → service null (action trả 501). Luật thông báo / realtime nạp khi import module này.
import { Module, type OnApplicationShutdown } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { ZcaTransport, buildChannelRegistry, fakeZaloTransport, type ChannelRegistry } from '@appchat/channels';
import type { PlatformDb } from '@appchat/db';
import { CLOCK, type Clock } from '../kernel/clock';
import { ENV_SOURCE } from '../kernel/kernel.module';
import { REDIS } from '../kernel/redis';
import { PLATFORM_DB } from '../kernel/tenant/tenant.providers';
import './events/channels.rules';
import { ChannelReconnectHandler, ChannelZaloStartLoginHandler } from './actions/channel-connect.handlers';
import { ChannelDisconnectHandler, ChannelPauseHandler, ChannelResumeHandler, ChannelSyncHistoryHandler, ChannelTestHandler, ChannelUpdateSettingsHandler } from './actions/channel-manage.handlers';
import { readChannelsEnv } from './channels.env';
import { ChannelAccounts } from './services/accounts.service';
import { CHANNEL_LOGIN_QUEUE, ChannelControl } from './services/control';
import { ChannelsReadService, NO_AGENTS } from './services/read.service';
import { ChannelSendQueue } from './services/send-queue';

const opt = (token: symbol) => ({ token, optional: true });

/** Registry kênh có adapter (worker giữ phiên + gửi) — transport Zalo theo `ZALO_TRANSPORT`. */
export const CHANNEL_REGISTRY = Symbol('CHANNEL_REGISTRY');
const LOGIN_QUEUE = Symbol('CHANNEL_LOGIN_QUEUE');

class Closer implements OnApplicationShutdown {
  constructor(
    private readonly q: Queue | null,
    private readonly send: ChannelSendQueue | null,
  ) {}
  async onApplicationShutdown(): Promise<void> {
    await this.q?.close();
    await this.send?.close();
  }
}

export function channelRegistryFor(src: Record<string, string | undefined>): ChannelRegistry {
  const env = readChannelsEnv(src);
  return buildChannelRegistry({ zalo: env.ZALO_TRANSPORT === 'fake' ? fakeZaloTransport : new ZcaTransport() });
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
    { provide: CHANNEL_REGISTRY, inject: [opt(ENV_SOURCE)], useFactory: (src?: Record<string, string | undefined>) => channelRegistryFor(src ?? {}) },
    { provide: ChannelAccounts, inject: [opt(PLATFORM_DB)], useFactory: (p?: PlatformDb) => (p ? new ChannelAccounts(p) : null) },
    { provide: LOGIN_QUEUE, inject: [opt(REDIS)], useFactory: (r?: Redis) => (r ? new Queue(CHANNEL_LOGIN_QUEUE, { connection: r.duplicate() }) : null) },
    { provide: ChannelControl, inject: [opt(REDIS), LOGIN_QUEUE], useFactory: (r: Redis | undefined, q: Queue | null) => (r ? new ChannelControl(r, q) : null) },
    { provide: ChannelSendQueue, inject: [opt(REDIS)], useFactory: (r?: Redis) => (r ? new ChannelSendQueue(r.duplicate()) : null) },
    {
      provide: ChannelsReadService,
      inject: [CHANNEL_REGISTRY, ChannelAccounts, ChannelControl, CLOCK],
      useFactory: (reg: ChannelRegistry, a: ChannelAccounts | null, c: ChannelControl | null, clock: Clock) => (a ? new ChannelsReadService(reg, a, c, NO_AGENTS, () => clock.now()) : null),
    },
    { provide: 'CHANNELS_CLOSER', inject: [LOGIN_QUEUE, ChannelSendQueue], useFactory: (q: Queue | null, s: ChannelSendQueue | null) => new Closer(q, s) },
  ],
  exports: [CHANNEL_REGISTRY, ChannelAccounts, ChannelControl, ChannelsReadService, ChannelSendQueue],
})
export class ChannelsModule {}

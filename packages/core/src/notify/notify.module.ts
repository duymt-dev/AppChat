// Domain `notify` — notification, tuỳ chọn, mailer, realtime fan-out (TIP-006). Luật event → thông báo / realtime của domain
// khác đăng ký qua notify/rules.ts; luật của chính notify nạp từ events/kernel.rules.ts khi import module này.
import { Module, type OnApplicationShutdown } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PlatformDb } from '@appchat/db';
import { REDIS } from '../kernel/redis';
import { LOGGER } from '../kernel/kernel.module';
import type { AppLogger } from '../kernel/logger/logger';
import { PLATFORM_DB } from '../kernel/tenant/tenant.providers';
import { NotificationMarkReadHandler } from './actions/notification-mark-read.handler';
import { NotificationUpdatePrefsHandler } from './actions/notification-update-prefs.handler';
import './events/kernel.rules';
import { MemoryRealtimeEmitter, REALTIME_EMITTER, RedisRealtimeEmitter, type RealtimeEmitter } from './realtime/emitter';
import { NotifyPrefsService } from './services/prefs.service';

const opt = (token: symbol) => ({ token, optional: true });

class EmitterCloser implements OnApplicationShutdown {
  constructor(private readonly e: RealtimeEmitter) {}
  async onApplicationShutdown(): Promise<void> {
    if (this.e instanceof RedisRealtimeEmitter) await this.e.close();
  }
}

@Module({
  providers: [
    NotificationMarkReadHandler,
    NotificationUpdatePrefsHandler,
    { provide: NotifyPrefsService, inject: [opt(PLATFORM_DB)], useFactory: (p?: PlatformDb) => (p ? new NotifyPrefsService(p) : null) },
    // Kết nối Redis riêng cho emitter (publish) — không dùng chung client có thể bị chặn bởi lệnh blocking.
    {
      provide: REALTIME_EMITTER,
      inject: [opt(REDIS), LOGGER],
      // Lỗi publish (Redis rớt / đang đóng) chỉ ghi cảnh báo — realtime là gợi ý làm mới, không làm sập worker.
      useFactory: (r: Redis | undefined, log: AppLogger) => (r ? new RedisRealtimeEmitter(r.duplicate(), (err) => log.warn({ err }, 'realtime publish lỗi')) : new MemoryRealtimeEmitter()),
    },
    { provide: 'NOTIFY_EMITTER_CLOSER', inject: [REALTIME_EMITTER], useFactory: (e: RealtimeEmitter) => new EmitterCloser(e) },
  ],
  exports: [NotifyPrefsService, REALTIME_EMITTER],
})
export class NotifyModule {}

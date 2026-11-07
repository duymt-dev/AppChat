// Worker ROLE=jobs của domain `notify` (TIP-006): đăng ký consumer `notify` + `realtime` vào queue `events` (EventsRunner của
// kernel chạy), và worker queue `notify-mail`. Chỉ bật khi có DB + Redis; mail lấy MailProvider của identity (console / brevo / smtp).
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { type Worker } from 'bullmq';
import { Queue } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import type { PlatformDb } from '@appchat/db';
import type { MailProvider } from '@appchat/integrations';
import { AuthzModule } from '../../authz/authz.module';
import { AuthzResolver } from '../../authz/services/authz-resolver';
import type { IdentityEnv } from '../../identity/identity.env';
import { IdentityModule } from '../../identity/identity.module';
import { IDENTITY_ENV, MAIL_PROVIDER } from '../../identity/services/identity.tokens';
import { CLOCK, type Clock } from '../../kernel/clock';
import { registerEventConsumer, unregisterEventConsumer } from '../../kernel/events/consumer';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import '../events/domain.rules';
import { notifyConsumer, realtimeConsumer } from '../events/notify.consumers';
import { NotifyModule } from '../notify.module';
import { REALTIME_EMITTER, type RealtimeEmitter } from '../realtime/emitter';
import { NotifyPrefsService } from '../services/prefs.service';
import { BullMailQueue, NOTIFY_MAIL_QUEUE, startMailWorker } from './notify-mail.processor';

class NotifyJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Inject(AuthzResolver) private readonly authz: AuthzResolver | null,
    @Inject(NotifyPrefsService) private readonly prefs: NotifyPrefsService | null,
    @Inject(REALTIME_EMITTER) private readonly emitter: RealtimeEmitter,
    @Inject(MAIL_PROVIDER) private readonly mail: MailProvider | null,
    @Inject(IDENTITY_ENV) private readonly env: IdentityEnv | null,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.redis || !this.platform || !this.authz || !this.prefs) return;
    const mailOn = !!(this.mail && this.env);
    if (mailOn) {
      this.queue = new Queue(NOTIFY_MAIL_QUEUE, { connection: this.redis.duplicate() });
      this.worker = startMailWorker(this.redis, { platform: this.platform, mail: this.mail!, publicUrl: this.env!.APP_PUBLIC_URL }, this.log);
    }
    const deps = {
      platform: this.platform,
      authz: this.authz,
      prefs: this.prefs,
      emitter: this.emitter,
      mail: this.queue ? new BullMailQueue(this.queue) : null,
      now: () => this.clock.now(),
    };
    registerEventConsumer(notifyConsumer(deps));
    registerEventConsumer(realtimeConsumer({ emitter: this.emitter, authz: this.authz }));
  }

  async onApplicationShutdown(): Promise<void> {
    unregisterEventConsumer('notify');
    unregisterEventConsumer('realtime');
    await this.worker?.close();
    await this.queue?.close();
  }
}

@Module({ imports: [NotifyModule, AuthzModule, IdentityModule], providers: [NotifyJobsRunner] })
export class NotifyJobsModule {}

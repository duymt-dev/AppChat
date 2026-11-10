// Worker ROLE=jobs của domain `notify` (TIP-006): đăng ký consumer `notify` + `realtime` vào queue `events` (EventsRunner của
// kernel chạy), và worker queue `notify-mail`. Chỉ bật khi có DB + Redis; mail lấy MailProvider của identity (console / brevo / smtp).
// TIP-006b: job lặp `notify.delivery-sweep` mỗi 10 phút (mọi workspace active) khôi phục ý định mail / realtime còn treo.
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { type Worker } from 'bullmq';
import { Queue, Worker as JobWorker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
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
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import '../events/domain.rules';
import { notifyConsumer, realtimeConsumer } from '../events/notify.consumers';
import { NotifyModule } from '../notify.module';
import { REALTIME_EMITTER, type RealtimeEmitter } from '../realtime/emitter';
import { NotifyPrefsService } from '../services/prefs.service';
import { BullMailQueue, NOTIFY_MAIL_QUEUE, startMailWorker } from './notify-mail.processor';
import { DELIVERY_SWEEP_MS, flushEvent, recoverAllDeliveries } from './delivery-recovery';
import { installContract, notifyContract, realtimeContract } from '../delivery/admission';

const DELIVERY_SWEEP_QUEUE = 'notify.delivery-sweep';

class NotifyJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private queue?: Queue;
  private worker?: Worker;
  private sweepQ?: Queue;
  private sweeper?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
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
    const now = () => this.clock.now();
    if (mailOn && this.tenants) {
      this.queue = new Queue(NOTIFY_MAIL_QUEUE, { connection: this.redis.duplicate() });
      this.worker = startMailWorker(this.redis, { platform: this.platform, mail: this.mail!, publicUrl: this.env!.APP_PUBLIC_URL, tenants: this.tenants, authz: this.authz, prefs: this.prefs, now }, this.log);
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
    // TIP-006b: hợp đồng v2 projection (ý định bền cùng biên nhận); v1 giữ tới cutover theo workspace (DC-426).
    const flush = this.tenants ? this.flusher(deps.mail, now) : undefined;
    installContract(notifyContract(deps, flush));
    installContract(realtimeContract(flush));
    if (this.tenants) void this.startSweep(deps.mail, now);
  }

  private flusher(mail: BullMailQueue | null, now: () => Date) {
    const tenants = this.tenants!;
    return async (ws: string, eventId: string) =>
      flushEvent(await tenants.get(TenantContexts.system(ws, 'notify-delivery')), ws, eventId, { mail, emitter: this.emitter, now, invalidate: (w) => this.authz!.invalidate(w) });
  }

  private async startSweep(mail: BullMailQueue | null, now: () => Date): Promise<void> {
    const tenants = this.tenants!;
    this.sweepQ = new Queue(DELIVERY_SWEEP_QUEUE, { connection: this.redis!.duplicate() });
    await this.sweepQ.upsertJobScheduler(DELIVERY_SWEEP_QUEUE, { every: DELIVERY_SWEEP_MS }, { name: DELIVERY_SWEEP_QUEUE });
    const tenant = (ws: string) => tenants.get(TenantContexts.system(ws, 'notify-delivery'));
    const onError = (ws: string, err: unknown) => this.log.warn({ err, ws }, 'khôi phục giao thông báo lỗi');
    this.sweeper = new JobWorker(DELIVERY_SWEEP_QUEUE, () => recoverAllDeliveries(this.platform!, tenant, { mail, emitter: this.emitter, now, invalidate: (ws) => this.authz!.invalidate(ws) }, onError), { connection: this.redis!.duplicate(), concurrency: 1 });
    this.sweeper.on('error', (err) => this.log.warn({ err }, 'notify delivery sweep error'));
  }

  async onApplicationShutdown(): Promise<void> {
    unregisterEventConsumer('notify');
    unregisterEventConsumer('realtime');
    await this.worker?.close();
    await this.queue?.close();
    await this.sweeper?.close();
    await this.sweepQ?.close();
  }
}

@Module({ imports: [NotifyModule, AuthzModule, IdentityModule], providers: [NotifyJobsRunner] })
export class NotifyJobsModule {}

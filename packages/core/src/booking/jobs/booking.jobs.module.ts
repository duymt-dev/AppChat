// Worker ROLE=jobs của domain `booking` (TIP-033): scheduler `booking.sweep` mỗi 5 phút trên queue riêng `booking-scheduler` (jobId cố
// định → một lịch dù nhiều worker) — lịch chờ hết giữ chỗ → expired, nhắc hẹn 24 giờ / 2 giờ qua kênh khách đã dùng (tin đi hàng gửi
// chung của kênh). Lỗi một workspace không chặn workspace khác.
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../../kernel/clock';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { ChannelsModule } from '../../channels/channels.module';
import { ChannelSendQueue } from '../../channels/public';
import { CrmModule } from '../../crm/crm.module';
import { CrmMembers } from '../../crm/public';
import { enqueueOutgoing, type Outgoing } from '../../inbox/public';
import { BookingModule } from '../booking.module';
import { expireHolds, remindAppointments } from '../services/booking-system';

export const BOOKING_SCHEDULER_QUEUE = 'booking-scheduler';
export const BOOKING_SWEEP_JOB = 'booking.sweep';
const EVERY_MS = 5 * 60_000;

export interface BookingSweepDeps {
  platform: PlatformDb;
  tenants: TenantDbResolver;
  members: CrmMembers;
  now: () => Date;
  enqueue: (ws: string, o: Outgoing) => Promise<void>;
  onError?: (ws: string, err: unknown) => void;
}

export async function sweepBooking(d: BookingSweepDeps) {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true, timezone: true } });
  const total = { expired: 0, reminded: 0 };
  for (const w of wss) {
    try {
      const db = await d.tenants.get(TenantContexts.system(w.id, BOOKING_SWEEP_JOB));
      const now = d.now();
      total.expired += await expireHolds(db, w.id, now, w.timezone);
      total.reminded += await remindAppointments(db, w.id, now, { platform: d.platform, members: d.members, enqueue: (o) => d.enqueue(w.id, o) });
    } catch (err) {
      d.onError?.(w.id, err);
    }
  }
  return total;
}

class BookingJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Optional() @Inject(ChannelSendQueue) private readonly send: ChannelSendQueue | null,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.redis || !this.platform || !this.tenants) return;
    const deps: BookingSweepDeps = {
      platform: this.platform,
      tenants: this.tenants,
      members: this.members,
      now: () => this.clock.now(),
      enqueue: (ws, o) => enqueueOutgoing(this.send, ws, o),
      onError: (ws, err) => this.log.warn({ err, ws, job: BOOKING_SWEEP_JOB }, 'quét lịch hẹn lỗi ở workspace'),
    };
    this.queue = new Queue(BOOKING_SCHEDULER_QUEUE, { connection: this.redis.duplicate() });
    await this.queue.upsertJobScheduler(BOOKING_SWEEP_JOB, { every: EVERY_MS }, { name: BOOKING_SWEEP_JOB });
    this.worker = new Worker(
      BOOKING_SCHEDULER_QUEUE,
      async (job) => {
        if (job.name !== BOOKING_SWEEP_JOB) return;
        const r = await sweepBooking(deps);
        if (r.expired || r.reminded) this.log.info({ job: BOOKING_SWEEP_JOB, ...r }, 'quét lịch hẹn');
      },
      { connection: this.redis.duplicate(), concurrency: 1 },
    );
    this.worker.on('failed', (job, err) => this.log.warn({ err, job: job?.name }, 'booking scheduler lỗi'));
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}

@Module({ imports: [BookingModule, ChannelsModule, CrmModule], providers: [BookingJobsRunner] })
export class BookingJobsModule {}

// Worker DUY NHẤT của queue `tenant` (TIP-041 §5): phân job theo tên — `tenant.provision` (TIP-004) / `tenant.lifecycle` (archive /
// restore). Job lạ → lỗi (không ACK như xong). Job lifecycle chỉ là tín hiệu: lệnh bền ở `workspace_lifecycle_job`; ngoài ra quét định kỳ
// (30 giây) nhặt lệnh đến hạn / lease hết hạn (Redis mất tín hiệu, worker chết giữa chừng). Dừng phiên kênh trước dump bằng pub/sub `stop`
// cho từng tài khoản route `connected` của workspace (worker ROLE=channels nhả lease Zalo / IMAP). Pha 2: job lặp `tenant.archive-scan`
// (mỗi ngày — quét gói Miễn phí không hoạt động) + consumer `lifecycle.activity` (mốc hoạt động).
import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { Redis } from 'ioredis';
import { TenantProvisioner, type DbEnv, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import { CLOCK, type Clock } from '../../kernel/clock';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { DB_ENV, PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { CHANNEL_CONTROL } from '../../channels/services/control';
import { PROVISION_JOB, TENANT_QUEUE, provisionWorkspace, tenantSeedDb, type ProvisionDeps } from '../jobs/tenant-provision.processor';
import { installActivityConsumer } from './activity';
import { scanArchiveCandidates } from './archive-scan';
import { LifecycleJobs } from './jobs';
import { TENANT_LIFECYCLE_JOB } from './lifecycle.providers';
import { processLifecycleJob, type LifecycleRunDeps } from './recovery';
import { LIFECYCLE_INFRA, LIFECYCLE_QUEUE, type LifecycleInfra, type LifecycleWake } from './types';

const SWEEP_MS = 30_000;
export const ARCHIVE_SCAN_JOB = 'tenant.archive-scan';
const SCAN_EVERY_MS = 24 * 3_600_000;

@Injectable()
export class TenantQueueDispatcher implements OnApplicationBootstrap, OnApplicationShutdown {
  private worker?: Worker;
  private queue?: Queue;
  private timer?: NodeJS.Timeout;
  private sweeping = false;
  private readonly owner = `${hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;
  private lifecycle?: LifecycleRunDeps;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly resolver: TenantDbResolver | undefined,
    @Optional() @Inject(DB_ENV) private readonly env: DbEnv | undefined,
    @Optional() @Inject(LIFECYCLE_INFRA) private readonly infra: LifecycleInfra | null,
    @Optional() @Inject(LIFECYCLE_QUEUE) private readonly wake: LifecycleWake | null,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.platform) installActivityConsumer(this.platform);
    if (!this.redis || !this.platform || !this.resolver || !this.env?.PROVISIONER_DATABASE_URL) return;
    const provisioner = new TenantProvisioner({ adminUrl: this.env.PROVISIONER_DATABASE_URL, templateDb: this.env.TENANT_TEMPLATE_DB, ownerRole: 'appchat_migrator', appRole: 'appchat_tenant_app' });
    const seedDb = tenantSeedDb(this.env.TENANT_DATABASE_URL);
    const provision: ProvisionDeps = { platform: this.platform, resolver: this.resolver, provisioner, kv: this.redis, clock: this.clock, seedDb };
    const redis = this.redis;
    const platform = this.platform;
    if (this.infra) {
      this.lifecycle = {
        platform,
        jobs: new LifecycleJobs(platform, () => this.clock.now()),
        infra: this.infra,
        resolver: this.resolver,
        kv: redis,
        now: () => this.clock.now(),
        seedDb,
        settleMs: 2_500,
        invalidate: (ws) => this.resolver!.invalidate(ws),
        stopChannels: async (ws) => {
          const routes = await platform.tenantChannelRoute.findMany({ where: { workspaceId: ws, status: 'connected' }, select: { channelAccountId: true } });
          for (const r of routes) await redis.publish(CHANNEL_CONTROL, JSON.stringify({ op: 'stop', account_id: r.channelAccountId }));
        },
        log: this.log,
      };
    }
    this.worker = new Worker(
      TENANT_QUEUE,
      async (job: Job<{ workspace_id?: string; job_id?: string }>) => {
        if (job.name === PROVISION_JOB) {
          const started = Date.now();
          const r = await provisionWorkspace(provision, job.data.workspace_id!);
          this.log.info({ job: PROVISION_JOB, ws: job.data.workspace_id, result: r, ms: Date.now() - started }, 'tenant provisioned');
          return;
        }
        if (job.name === TENANT_LIFECYCLE_JOB) {
          if (!this.lifecycle) throw new Error('lifecycle chưa cấu hình (PROVISIONER / MIGRATOR / ARCHIVE_KEYS)');
          const r = await processLifecycleJob(this.lifecycle, job.data.job_id!, this.owner);
          this.log.info({ job: TENANT_LIFECYCLE_JOB, id: job.data.job_id, result: r }, 'workspace lifecycle');
          return;
        }
        if (job.name === ARCHIVE_SCAN_JOB) {
          if (!this.lifecycle) return;
          const wake = this.wake;
          const r = await scanArchiveCandidates({ platform, resolver: this.resolver!, kv: redis, now: () => this.clock.now(), wake: async (id) => wake?.wake(id) });
          this.log.info({ job: ARCHIVE_SCAN_JOB, ...r }, 'archive scan');
          return;
        }
        throw new Error(`job lạ trên queue tenant: ${job.name}`);
      },
      { connection: this.redis.duplicate(), concurrency: 2 },
    );
    this.worker.on('failed', (job, err) => this.log.warn({ job: job?.name, ws: job?.data.workspace_id, attempt: job?.attemptsMade, err }, 'tenant job lỗi'));
    if (this.lifecycle) {
      this.queue = new Queue(TENANT_QUEUE, { connection: redis.duplicate() });
      await this.queue.upsertJobScheduler(ARCHIVE_SCAN_JOB, { every: SCAN_EVERY_MS }, { name: ARCHIVE_SCAN_JOB });
      this.timer = setInterval(() => void this.sweep(), SWEEP_MS);
      this.timer.unref();
    }
  }

  /** Nhặt lệnh đến hạn (tín hiệu lỡ / lease hết hạn) — tuần tự, mỗi lượt tối đa 10 lệnh. */
  async sweep(): Promise<void> {
    if (this.sweeping || !this.lifecycle) return;
    this.sweeping = true;
    try {
      for (const id of await this.lifecycle.jobs.due(10)) await processLifecycleJob(this.lifecycle, id, this.owner).catch((err: unknown) => this.log.error({ err, id }, 'lifecycle sweep failed'));
    } finally {
      this.sweeping = false;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.worker?.close();
    await this.queue?.close();
  }
}

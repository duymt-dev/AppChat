// Job `tenant.provision` (Blueprint §1.3 queue `tenant`, §2.0 vòng đời): CREATE DATABASE từ template → db_status active
// → outbox `workspace.ready` trong DB tenant mới. Idempotent: DB đã có → bỏ qua tạo; registry đã active → không làm lại.
// Seed mặc định: registry seed của kernel (vai trò hệ thống — TIP-005; SLA, loyalty, governance, mẫu — TIP sau), idempotent.
import { Inject, Injectable, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import type { Redis } from 'ioredis';
import { TenantContexts, TenantProvisioner, createTenantDb, withDatabase, type DbEnv, type PlatformDb, type TenantDb, type TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../../kernel/clock';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS, type KeyValueStore } from '../../kernel/redis';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import { runTenantSeeds } from '../../kernel/tenant-seeds';
import { DB_ENV, PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import type { ProvisionQueue } from '../services/workspaces.service';

export const TENANT_QUEUE = 'tenant';
export const PROVISION_JOB = 'tenant.provision';
export const PROVISION_ATTEMPTS = 3;

export interface ProvisionDeps {
  platform: PlatformDb;
  resolver: TenantDbResolver;
  provisioner: Pick<TenantProvisioner, 'provision'>;
  kv: KeyValueStore;
  clock: Clock;
  /** Mở client tạm tới DB tenant theo tên (seed trước khi `active`), đóng sau khi chạy. */
  seedDb: (dbName: string, fn: (db: TenantDb) => Promise<unknown>) => Promise<void>;
}

/** Một lần provision (gọi từ worker BullMQ hoặc test trực tiếp). */
export async function provisionWorkspace(d: ProvisionDeps, workspaceId: string): Promise<'created' | 'already_active'> {
  const ws = await d.platform.workspace.findUnique({ where: { id: workspaceId }, select: { dbStatus: true } });
  if (!ws) throw new Error(`workspace ${workspaceId} không tồn tại`);
  if (ws.dbStatus === 'active') return 'already_active';
  const { dbName } = await d.provisioner.provision(workspaceId);
  const now = d.clock.now();
  // Seed qua client trực tiếp tới DB mới (resolver chỉ mở DB `active`) — xong seed mới đặt active để không ai vào DB thiếu vai trò.
  await d.seedDb(dbName, async (db) => runTenantSeeds(db, { workspaceId, now }));
  await d.platform.workspace.update({ where: { id: workspaceId }, data: { dbName, dbStatus: 'active', provisionedAt: now } });
  d.resolver.invalidate(workspaceId);
  const tenant = await d.resolver.get(TenantContexts.system(workspaceId, 'tenant.provision'));
  await tenant.$transaction((tx) => writeOutbox(tx, workspaceId, [{ topic: 'workspace.ready', payload: { workspace_id: workspaceId } }], now));
  await markDirty(d.kv, workspaceId);
  return 'created';
}

/** Client tạm tới DB tenant mới (role appchat_tenant_app) cho bước seed — dùng chung worker + test. */
export const tenantSeedDb =
  (tenantBaseUrl: string) =>
  async (dbName: string, fn: (db: TenantDb) => Promise<unknown>): Promise<void> => {
    const db = createTenantDb(withDatabase(tenantBaseUrl, dbName), 1);
    try {
      await fn(db);
    } finally {
      await db.$disconnect();
    }
  };

/** Producer cho api: `jobId = workspaceId` (không trùng), retry back-off 3 lần (DC-021). */
export class BullProvisionQueue implements ProvisionQueue {
  constructor(private readonly queue: Queue) {}
  async enqueue(workspaceId: string): Promise<void> {
    await this.queue.add(PROVISION_JOB, { workspace_id: workspaceId }, {
      jobId: `provision-${workspaceId}`,
      attempts: PROVISION_ATTEMPTS,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  /** Job đã hết lượt thử → `failed` cho endpoint provisioning. */
  async failed(workspaceId: string): Promise<boolean> {
    return (await this.queue.getJobState(`provision-${workspaceId}`)) === 'failed';
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}

/** Worker queue `tenant` trong ROLE=jobs. */
@Injectable()
export class TenantProvisionWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private worker?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly resolver: TenantDbResolver | undefined,
    @Optional() @Inject(DB_ENV) private readonly env: DbEnv | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.redis || !this.platform || !this.resolver || !this.env?.PROVISIONER_DATABASE_URL) return;
    const provisioner = new TenantProvisioner({
      adminUrl: this.env.PROVISIONER_DATABASE_URL,
      templateDb: this.env.TENANT_TEMPLATE_DB,
      ownerRole: 'appchat_migrator',
      appRole: 'appchat_tenant_app',
    });
    const deps: ProvisionDeps = {
      platform: this.platform,
      resolver: this.resolver,
      provisioner,
      kv: this.redis,
      clock: this.clock,
      seedDb: tenantSeedDb(this.env.TENANT_DATABASE_URL),
    };
    this.worker = new Worker(
      TENANT_QUEUE,
      async (job: Job<{ workspace_id: string }>) => {
        if (job.name !== PROVISION_JOB) return;
        const started = Date.now();
        const r = await provisionWorkspace(deps, job.data.workspace_id);
        this.log.info({ job: PROVISION_JOB, ws: job.data.workspace_id, result: r, ms: Date.now() - started }, 'tenant provisioned');
      },
      { connection: this.redis.duplicate(), concurrency: 2 },
    );
    this.worker.on('failed', (job, err) => this.log.warn({ job: PROVISION_JOB, ws: job?.data.workspace_id, attempt: job?.attemptsMade, err }, 'tenant provision lỗi'));
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }
}

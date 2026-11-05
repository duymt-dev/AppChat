// Worker ROLE=jobs của domain `crm`. TIP-015b: scheduler `crm.memory-receipt-purge` mỗi giờ trên queue riêng `crm-scheduler` — xoá biên nhận
// gộp trí nhớ hết cửa sổ hoàn tác 7 ngày (lô id trước, SKIP LOCKED; replay idempotent). TIP-045b: `crm.custom-field-prune` mỗi 6 giờ —
// giá trị trường tuỳ biến đã xoá quá 30 ngày (custom-field-prune.ts). Lỗi một workspace không chặn workspace khác. TIP-045b annex D:
// việc dữ liệu nặng (DataJobsModule — consumer `data_job.requested` + quét) với kind contact.export / contact.bulk_update.
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../../kernel/clock';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { CrmModule } from '../crm.module';
import { purgeMergeReceipts } from '../memory/merge';
import { pruneDeletedFields } from './custom-field-prune';
import { STORAGE, type Storage } from '../../kernel/files/storage';
import { DataJobsModule } from '../../kernel/jobs/data-jobs/data-jobs.module';
import { CrmMembers } from '../services/members.service';
import { registerContactExportKind } from './contact-export.processor';
import './contact-bulk.processor';

export const CRM_SCHEDULER_QUEUE = 'crm-scheduler';
export const MEMORY_RECEIPT_PURGE_JOB = 'crm.memory-receipt-purge';
export const CUSTOM_FIELD_PRUNE_JOB = 'crm.custom-field-prune';
const PRUNE_EVERY_MS = 6 * 60 * 60_000;
const EVERY_MS = 60 * 60_000;

export async function purgeMemoryReceipts(d: { platform: Pick<PlatformDb, 'workspace'>; tenants: TenantDbResolver; now: () => Date; onError?: (ws: string, err: unknown) => void }) {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } });
  let purged = 0;
  for (const w of wss) {
    try {
      purged += await purgeMergeReceipts(await d.tenants.get(TenantContexts.system(w.id, MEMORY_RECEIPT_PURGE_JOB)), d.now());
    } catch (err) {
      d.onError?.(w.id, err);
    }
  }
  return purged;
}

/** TIP-045b annex C: giá trị trường tuỳ biến xoá quá 30 ngày → bỏ khỏi bản ghi, xoá hẳn định nghĩa (mỗi workspace độc lập). */
export async function pruneCustomFields(d: { platform: Pick<PlatformDb, 'workspace'>; tenants: TenantDbResolver; now: () => Date; onError?: (ws: string, err: unknown) => void }) {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } });
  const total = { values: 0, defs: 0 };
  for (const w of wss) {
    try {
      const r = await pruneDeletedFields(await d.tenants.get(TenantContexts.system(w.id, CUSTOM_FIELD_PRUNE_JOB)), d.now());
      total.values += r.values;
      total.defs += r.defs;
    } catch (err) {
      d.onError?.(w.id, err);
    }
  }
  return total;
}

class CrmJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.redis || !this.platform || !this.tenants) return;
    const deps = { platform: this.platform, tenants: this.tenants, now: () => this.clock.now(), onError: (ws: string, err: unknown) => this.log.warn({ err, ws, job: MEMORY_RECEIPT_PURGE_JOB }, 'quét biên nhận gộp lỗi ở workspace') };
    this.queue = new Queue(CRM_SCHEDULER_QUEUE, { connection: this.redis.duplicate() });
    await this.queue.upsertJobScheduler(MEMORY_RECEIPT_PURGE_JOB, { every: EVERY_MS }, { name: MEMORY_RECEIPT_PURGE_JOB });
    await this.queue.upsertJobScheduler(CUSTOM_FIELD_PRUNE_JOB, { every: PRUNE_EVERY_MS }, { name: CUSTOM_FIELD_PRUNE_JOB });
    this.worker = new Worker(
      CRM_SCHEDULER_QUEUE,
      async (job) => {
        if (job.name === CUSTOM_FIELD_PRUNE_JOB) {
          const r = await pruneCustomFields({ ...deps, onError: (ws: string, err: unknown) => this.log.warn({ err, ws, job: CUSTOM_FIELD_PRUNE_JOB }, 'dọn trường tuỳ biến lỗi ở workspace') });
          if (r.values || r.defs) this.log.info({ job: CUSTOM_FIELD_PRUNE_JOB, ...r }, 'dọn giá trị trường tuỳ biến đã xoá');
          return;
        }
        if (job.name !== MEMORY_RECEIPT_PURGE_JOB) return;
        const purged = await purgeMemoryReceipts(deps);
        if (purged) this.log.info({ job: MEMORY_RECEIPT_PURGE_JOB, purged }, 'xoá biên nhận gộp trí nhớ hết hạn');
      },
      { connection: this.redis.duplicate(), concurrency: 1 },
    );
    this.worker.on('failed', (job, err) => this.log.warn({ err, job: job?.name }, 'crm scheduler lỗi'));
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}

/** Kind việc dữ liệu của crm (TIP-045b annex D): xuất > 5.000 cần Storage + tên người phụ trách; sửa hàng loạt đăng ký khi import. */
class CrmDataJobKinds {
  constructor(@Optional() @Inject(STORAGE) storage: Storage | undefined, @Inject(CrmMembers) members: CrmMembers | null) {
    if (storage && members) registerContactExportKind(storage, members);
  }
}

@Module({ imports: [CrmModule, DataJobsModule], providers: [CrmJobsRunner, CrmDataJobKinds] })
export class CrmJobsModule {}

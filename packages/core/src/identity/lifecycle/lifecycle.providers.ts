// Provider vòng đời workspace (TIP-041): cấu hình hạ tầng từ env (kho bản lưu trữ, key ring, URL role provisioner / migrator, allowlist
// cluster) + tín hiệu đánh thức worker. Thiếu PROVISIONER / MIGRATOR / khoá → hạ tầng null: API vẫn tạo lệnh bền, chỉ worker có hạ tầng
// mới chạy dump / restore. Khoá lưu trữ: `ARCHIVE_KEYS` + `ARCHIVE_KEY_ID` (045b cấp bí mật); vắng → dẫn xuất một khoá từ APP_ENC_KEY
// (HKDF, nhãn riêng — không dùng thẳng khoá chủ) chỉ ngoài production. Không log khoá / URL.
import { hkdfSync } from 'node:crypto';
import { join } from 'node:path';
import type { FactoryProvider } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { LocalArchiveStore, parseKeyRing, singleKeyRing, type DbEnv, type KeyRing } from '@appchat/db';
import { ENV_SOURCE } from '../../kernel/env-source';
import { Queue } from '../../kernel/jobs/with-job-context';
import { REDIS } from '../../kernel/redis';
import { DB_ENV } from '../../kernel/tenant/tenant.providers';
import { LIFECYCLE_INFRA, LIFECYCLE_QUEUE, type LifecycleInfra, type LifecycleWake } from './types';

export const TENANT_LIFECYCLE_JOB = 'tenant.lifecycle';

const lifecycleEnv = z.object({
  NODE_ENV: z.string().default('development'),
  ARCHIVE_DIR: z.string().min(1).optional(),
  ARCHIVE_KEYS: z.string().min(1).optional(),
  ARCHIVE_KEY_ID: z.string().min(1).optional(),
  APP_ENC_KEY: z.string().min(32).optional(),
  /** Thư mục pg_dump / pg_restore (vắng → PATH). */
  PG_BIN_DIR: z.string().min(1).optional(),
  /** Host cluster tenant khác cluster mặc định được phép (registry db_host) — "h1,h2". */
  TENANT_DB_HOSTS: z.string().optional(),
  TENANT_MAINTENANCE_DB: z.string().regex(/^[a-z_][a-z0-9_]{0,62}$/).default('postgres'),
});

/** Key ring lưu trữ từ env; null khi không có nguồn khoá. Production bắt buộc ARCHIVE_KEYS riêng. */
export function archiveKeysFromEnv(e: z.infer<typeof lifecycleEnv>): KeyRing | null {
  if (e.ARCHIVE_KEYS) return parseKeyRing(e.ARCHIVE_KEYS, e.ARCHIVE_KEY_ID ?? '');
  if (e.NODE_ENV === 'production' || !e.APP_ENC_KEY) return null;
  const master = /^[0-9a-f]{64}$/i.test(e.APP_ENC_KEY) ? Buffer.from(e.APP_ENC_KEY, 'hex') : Buffer.from(e.APP_ENC_KEY, 'base64');
  return singleKeyRing('dev1', Buffer.from(hkdfSync('sha256', master, Buffer.alloc(0), 'appchat:archive:dev1', 32)));
}

export function lifecycleInfraFromEnv(src: Record<string, string | undefined>, db: DbEnv | null): LifecycleInfra | null {
  if (!db?.PROVISIONER_DATABASE_URL || !db.MIGRATOR_DATABASE_URL) return null;
  const e = lifecycleEnv.parse(src);
  const keys = archiveKeysFromEnv(e);
  if (!keys) return null;
  return {
    provisionerUrl: db.PROVISIONER_DATABASE_URL,
    migratorUrl: db.MIGRATOR_DATABASE_URL,
    tenantAppUrl: db.TENANT_DATABASE_URL,
    templateDb: db.TENANT_TEMPLATE_DB,
    store: new LocalArchiveStore(e.ARCHIVE_DIR ?? join(process.cwd(), '.data', 'archives')),
    keys,
    binDir: e.PG_BIN_DIR,
    allowedHosts: (e.TENANT_DB_HOSTS ?? '').split(',').map((h) => h.trim()).filter(Boolean),
    maintenanceDb: e.TENANT_MAINTENANCE_DB,
  };
}

/** Tín hiệu BullMQ (queue `tenant`, job `tenant.lifecycle`, jobId = id lệnh — không trùng). */
export class BullLifecycleWake implements LifecycleWake {
  constructor(private readonly queue: Queue) {}
  async wake(jobId: string): Promise<void> {
    await this.queue.add(TENANT_LIFECYCLE_JOB, { job_id: jobId }, { jobId: `lifecycle-${jobId}-${Date.now()}`, removeOnComplete: 1000, removeOnFail: 5000 });
  }
  async onApplicationShutdown(): Promise<void> {
    await this.queue.close();
  }
}

const opt = (token: symbol) => ({ token, optional: true });

export const LIFECYCLE_PROVIDERS: FactoryProvider[] = [
  {
    provide: LIFECYCLE_INFRA,
    inject: [opt(ENV_SOURCE), opt(DB_ENV)],
    useFactory: (src?: Record<string, string | undefined>, db?: DbEnv) => (src ? lifecycleInfraFromEnv(src, db ?? null) : null),
  },
  {
    provide: LIFECYCLE_QUEUE,
    inject: [opt(REDIS)],
    useFactory: (r?: Redis) => (r ? new BullLifecycleWake(new Queue('tenant', { connection: r.duplicate() })) : null),
  },
];

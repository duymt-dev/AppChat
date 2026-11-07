// Chạy một lệnh `restore` (TIP-041 §3): manifest mới nhất (chưa purge) của workspace → khoá cluster → DB tạm đúng thế hệ → pg_restore từ
// luồng giải mã → tenant-migrate lên version hiện tại → đổi tên sang DB tenant → seed thiếu (idempotent) → kiểm (bảng, version, role app
// đọc được) → registry `active` (CAS generation) + outbox `workspace.ready`. Không provision template rồi đè; không đụng bản lưu trữ gốc;
// không đổi ví / trial / gói (chỉ DB tenant). Lỗi: DB tạm của đúng thế hệ bị dọn, workspace giữ `restoring` để thử lại có kiểm soát.
import type { PlatformDb, TenantDb } from '@appchat/db';
import { OperationLock, TenantContexts, assertTenantDbName, pgConnFromUrl, restoreDatabase, tenantDbName, verifyRestored, type TenantDbResolver } from '@appchat/db';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';
import { runTenantSeeds } from '../../kernel/tenant-seeds';
import type { LifecycleJobs } from './jobs';
import type { LifecycleInfra, LifecycleJobRow } from './types';

export interface RestoreRunDeps {
  platform: PlatformDb;
  jobs: LifecycleJobs;
  infra: LifecycleInfra;
  resolver: TenantDbResolver;
  kv: KeyValueStore;
  now: () => Date;
  seedDb: (dbName: string, fn: (db: TenantDb) => Promise<unknown>) => Promise<void>;
}

export class NoArchiveError extends Error {
  constructor() {
    super('workspace không có bản lưu trữ khả dụng');
    this.name = 'NoArchiveError';
  }
}

export async function runRestore(d: RestoreRunDeps, job: LifecycleJobRow, owner: string): Promise<{ metrics: Record<string, number> }> {
  // Thời gian chờ hàng đợi = lúc nhận lệnh − lúc tạo (cùng đồng hồ Clock của lệnh); thời gian chạy đo bằng đồng hồ tường.
  const row = await d.platform.workspaceLifecycleJob.findUniqueOrThrow({ where: { id: job.id }, select: { createdAt: true, startedAt: true } });
  const queueMs = Math.max(0, (row.startedAt ?? d.now()).getTime() - row.createdAt.getTime());
  const ws = await d.platform.workspace.findUniqueOrThrow({ where: { id: job.workspaceId }, select: { dbName: true, dbHost: true } });
  const dbName = assertTenantDbName(ws.dbName);
  if (dbName !== tenantDbName(job.workspaceId)) throw new Error('db_name lệch tenantDbName(workspace)');
  const m = await d.platform.archiveManifest.findFirst({
    where: { workspaceId: job.workspaceId, purgedAt: null },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  if (!m) throw new NoArchiveError();
  const cluster = { adminUrl: d.infra.provisionerUrl, allowedHosts: d.infra.allowedHosts, maintenanceDb: d.infra.maintenanceDb };
  const lock = await OperationLock.acquire(cluster, job.workspaceId, ws.dbHost);
  const started = Date.now();
  try {
    await d.jobs.assertCurrent(job, owner);
    await d.jobs.step(job, owner, 'restore', { manifestId: m.id, metrics: { queue_ms: queueMs } });
    const conn = (db: string) => pgConnFromUrl(d.infra.provisionerUrl, db, ws.dbHost);
    const r = await restoreDatabase(
      { store: d.infra.store, keys: d.infra.keys, conn, binDir: d.infra.binDir, migratorUrl: d.infra.migratorUrl, adminUrl: d.infra.provisionerUrl, appRole: 'appchat_tenant_app', ownerRole: 'appchat_migrator' },
      lock,
      { storageKey: m.storageKey, checksum: m.checksum, cipherChecksum: m.cipherChecksum, tableCount: m.tableCount },
      dbName,
      { id: job.id, generation: job.generation },
    );
    await d.jobs.assertCurrent(job, owner);
    await d.jobs.step(job, owner, 'checks', { metrics: { queue_ms: queueMs, ...r.metrics } });
    // Seed mặc định còn thiếu (vai trò hệ thống / SLA …) — idempotent, không ghi đè dữ liệu đã khôi phục.
    let s = Date.now();
    await d.seedDb(dbName, (db) => runTenantSeeds(db, { workspaceId: job.workspaceId, now: d.now() }));
    await verifyRestored(d.infra.tenantAppUrl, dbName, ws.dbHost, m, r.schemaVersion);
    const metrics = { queue_ms: queueMs, ...r.metrics, checks_ms: Date.now() - s, run_ms: Date.now() - started };

    await d.jobs.step(job, owner, 'activate', { metrics });
    s = Date.now();
    await d.jobs.finish(job, owner, { status: 'succeeded', dbStatus: 'active', workspace: { schemaVersion: r.schemaVersion, archivedAt: null, archiveKey: null } });
    d.resolver.invalidate(job.workspaceId);
    // `workspace.ready` sau khi active (UI "Đang khôi phục" nghe WS; polling trạng thái là đường dự phòng).
    const tenant = await d.resolver.get(TenantContexts.system(job.workspaceId, 'tenant.restore'));
    await tenant.$transaction((tx) => writeOutbox(tx, job.workspaceId, [{ topic: 'workspace.ready', payload: { workspace_id: job.workspaceId, restored: true } }], d.now()));
    await markDirty(d.kv, job.workspaceId);
    return { metrics };
  } finally {
    await lock.release();
  }
}

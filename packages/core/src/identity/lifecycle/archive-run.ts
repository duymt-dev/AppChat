// Chạy một lệnh `archive` (TIP-041 §2, Blueprint §2.0 bước 5). Thứ tự bất biến:
//   1. khoá thao tác (advisory lock trên cluster chứa tenant) + lệnh còn hiệu lực (lease + generation)
//   2. quiesce: db_status đã `archiving` (resolver mọi tiến trình chặn ≤ 2 giây — thế hệ workspace_status) → chờ hết hạn cache + dừng
//      phiên kênh (pub/sub stop, lease Zalo / IMAP nhả) → kiểm không còn run AI / tin gửi đang chạy; còn → hoãn (không dump / drop).
//      Run AI / tin gửi đã mở client trước đó bị cổng WorkspaceAccess (TIP-040) chặn ở bước kế tiếp (workspace không còn `active`).
//   3. pg_dump mã hoá → đọc lại kiểm checksum + danh mục (archive.ts) → manifest ghi BỀN ở DB nền tảng
//   4. DROP DATABASE trên chính kết nối giữ khoá (tên = tenantDbName(workspace), không platform / template)
//   5. registry: archived + archived_at + archive_key (CAS generation)
// Lỗi TRƯỚC DROP: DB còn nguyên → kiểm DB trả lời rồi đặt lại `active` (+ cảnh báo). Lỗi SAU DROP (manifest đã có): KHÔNG đặt active giả —
// chạy lại lệnh hoàn tất bước registry; quá số lần → `recovery_needed` (DB đã mất, khôi phục từ manifest).
import type { PlatformDb } from '@appchat/db';
import { OperationLock, TABLE_COUNT_SQL, archiveKeyOf, assertTenantDbName, clusterUrl, dumpAndVerify, pgConnFromUrl, pgQuery, tenantDbName, withDatabase } from '@appchat/db';
import { uuidv7 } from '../../kernel/ids';
import type { LifecycleJobs } from './jobs';
import type { LifecycleInfra, LifecycleJobRow } from './types';

export interface ArchiveRunDeps {
  platform: PlatformDb;
  jobs: LifecycleJobs;
  infra: LifecycleInfra;
  now: () => Date;
  /** Dừng phiên kênh của workspace (pub/sub stop cho từng tài khoản route `connected`) — trước dump. */
  stopChannels: (workspaceId: string) => Promise<void>;
  /** Chờ cache resolver mọi tiến trình thấy trạng thái mới (≥ chu kỳ kiểm thế hệ 2 giây). Test truyền 0. */
  settleMs: number;
  /** Bỏ cache registry của tiến trình này. */
  invalidate: (workspaceId: string) => void;
}

export class ArchiveBusyError extends Error {
  constructor(readonly what: string) {
    super(`workspace còn việc đang chạy: ${what}`);
    this.name = 'ArchiveBusyError';
  }
}

const one = async <T extends Record<string, unknown>>(url: string, sql: string): Promise<T | undefined> => (await pgQuery<T>(url, sql))[0];

/**
 * Việc còn dở có tác dụng RA NGOÀI sau quiesce: run AI đang chạy, tin gửi đã đặt chỗ / đang gửi. Sự kiện outbox chưa phát không chặn —
 * chúng nằm trong bản dump và relay phát sau khi khôi phục (không mất, không phát đôi vì id sự kiện giữ nguyên).
 */
const BUSY_SQL = `SELECT
  (SELECT count(*)::int FROM ai_run WHERE status = 'running') AS runs,
  (SELECT count(*)::int FROM outbox_message WHERE status IN ('dispatch_reserved', 'sending')) AS sends`;

export async function runArchive(d: ArchiveRunDeps, job: LifecycleJobRow, owner: string): Promise<'archived'> {
  const ws = await d.platform.workspace.findUniqueOrThrow({ where: { id: job.workspaceId }, select: { dbName: true, dbHost: true, dbStatus: true, schemaVersion: true } });
  const dbName = assertTenantDbName(ws.dbName);
  if (dbName !== tenantDbName(job.workspaceId)) throw new Error('db_name lệch tenantDbName(workspace)');
  const cluster = { adminUrl: d.infra.provisionerUrl, allowedHosts: d.infra.allowedHosts, maintenanceDb: d.infra.maintenanceDb };
  const lock = await OperationLock.acquire(cluster, job.workspaceId, ws.dbHost);
  try {
    await d.jobs.assertCurrent(job, owner);
    // Sau crash ở bước drop / registry: manifest đã ghi → hoàn tất (DB có thể đã mất — không dump lại từ DB rỗng).
    if (job.manifestId && (job.step === 'drop' || job.step === 'registry' || job.step === 'manifest')) return await finishAfterManifest(d, job, owner, lock, dbName);

    await d.jobs.step(job, owner, 'quiesce');
    d.invalidate(job.workspaceId);
    if (d.settleMs > 0) await new Promise((r) => setTimeout(r, d.settleMs));
    await d.stopChannels(job.workspaceId);
    const adminDb = clusterUrl(cluster, ws.dbHost, dbName);
    const busy = await one<{ runs: number; sends: number }>(adminDb, BUSY_SQL);
    if (busy && (busy.runs || busy.sends)) throw new ArchiveBusyError(`runs=${busy.runs} sends=${busy.sends}`);
    const tables = (await one<{ n: number }>(adminDb, TABLE_COUNT_SQL))?.n ?? 0;

    await d.jobs.step(job, owner, 'dump');
    const manifestId = uuidv7(d.now().getTime());
    const key = archiveKeyOf(job.workspaceId, job.generation, manifestId);
    const conn = (db: string) => pgConnFromUrl(d.infra.provisionerUrl, db, ws.dbHost);
    const started = Date.now();
    const proof = await dumpAndVerify({ store: d.infra.store, keys: d.infra.keys, conn, binDir: d.infra.binDir }, lock, dbName, key, tables);

    await d.jobs.assertCurrent(job, owner);
    await d.platform.archiveManifest.create({
      data: {
        id: manifestId,
        workspaceId: job.workspaceId,
        jobId: job.id,
        generation: job.generation,
        storageKey: key,
        dbName,
        dbHost: ws.dbHost,
        schemaVersion: ws.schemaVersion,
        envelopeVersion: 1,
        encryptionKeyId: proof.encryptionKeyId,
        checksum: proof.checksum,
        sizeBytes: BigInt(proof.sizeBytes),
        cipherChecksum: proof.cipherChecksum,
        cipherBytes: BigInt(proof.cipherBytes),
        tocEntries: proof.tocEntries,
        tableCount: proof.tableCount,
        verifiedAt: d.now(),
      },
    });
    await d.jobs.step(job, owner, 'manifest', { manifestId, metrics: { dump_ms: Date.now() - started, size_bytes: proof.sizeBytes } });
    return await finishAfterManifest(d, job, owner, lock, dbName);
  } finally {
    await lock.release();
  }
}

/** Manifest đã bền: DROP (idempotent) → registry archived. Không bao giờ quay lại `active` từ đây. */
async function finishAfterManifest(d: ArchiveRunDeps, job: LifecycleJobRow, owner: string, lock: OperationLock, dbName: string): Promise<'archived'> {
  const m = await d.platform.archiveManifest.findUniqueOrThrow({ where: { id: job.manifestId! } });
  // Manifest phải thuộc đúng workspace + thế hệ lệnh và còn tệp trong kho trước khi xoá DB.
  if (m.workspaceId !== job.workspaceId || m.generation !== job.generation || (await d.infra.store.size(m.storageKey)) !== Number(m.cipherBytes)) throw new Error('manifest không khớp lệnh / kho');
  await d.jobs.assertCurrent(job, owner);
  await d.jobs.step(job, owner, 'drop');
  await lock.dropDatabase(dbName, 'tenant');
  await d.jobs.step(job, owner, 'registry');
  await d.jobs.finish(job, owner, { status: 'succeeded', dbStatus: 'archived', workspace: { archivedAt: d.now(), archiveKey: m.storageKey } });
  d.invalidate(job.workspaceId);
  return 'archived';
}

/**
 * Lỗi TRƯỚC DROP: DB còn nguyên → kiểm DB trả lời thật (role app) rồi trả `active` (lệnh failed, cảnh báo). DB không trả lời → giữ
 * `archiving` + recovery_needed (không báo active khi chưa kiểm được).
 */
export async function rollbackArchive(d: ArchiveRunDeps, job: LifecycleJobRow, owner: string, error: string): Promise<'rolled_back' | 'recovery_needed'> {
  const ws = await d.platform.workspace.findUniqueOrThrow({ where: { id: job.workspaceId }, select: { dbName: true, dbHost: true } });
  try {
    await one(withDatabase(d.infra.tenantAppUrl, assertTenantDbName(ws.dbName), ws.dbHost), 'SELECT 1');
  } catch {
    await d.jobs.finish(job, owner, { status: 'recovery_needed', error: `${error}; db_unreachable` });
    return 'recovery_needed';
  }
  await d.jobs.finish(job, owner, { status: 'failed', error, dbStatus: 'active' });
  d.invalidate(job.workspaceId);
  return 'rolled_back';
}

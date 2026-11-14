// Khôi phục DB tenant từ bản lưu trữ (TIP-041 §3): DB TẠM rỗng đúng thế hệ lệnh (`<tenant>_r<gen>`, clone từ template nền chỉ có
// extension — role provisioner không phải superuser nên không tự CREATE EXTENSION vector) → pg_restore từ luồng giải mã (bỏ mục EXTENSION
// của danh mục) trong MỘT transaction → cấp CONNECT cho role app → tenant-migrate lên version hiện tại → đánh dấu DB bằng COMMENT mã lệnh
// → đổi tên sang tên DB tenant. Không dùng provision(template) rồi đè, không restore vào DB đang có dữ liệu: tên đích đã tồn tại mà không
// mang dấu của chính lệnh này → từ chối. Lỗi giữa chừng chỉ dọn DB tạm của đúng thế hệ; bản lưu trữ gốc không bao giờ bị xoá ở đây.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { assertTenantDbName, quoteIdent } from '../db-name';
import { withDatabase } from '../env';
import { applyMigrations, latestVersion, readMigrations, TENANT_MIGRATIONS_DIR, type MigrationFile } from '../migrations';
import { readBack, type ArchiveDeps } from './archive';
import { DecryptStream, HashTap } from './archive-storage';
import { restoreTempDbName, type OperationLock } from './operation-lock';
import { runPg } from './pg-process';

/** Template nền chỉ có extension (db:setup dựng bằng quyền admin) — DB tạm khôi phục clone từ đây. */
export const TENANT_BASE_TEMPLATE = 'appchat_tenant_base';

export interface RestoreDeps extends ArchiveDeps {
  /** URL appchat_migrator (cluster mặc định) — tên DB / host thay theo DB tạm. */
  migratorUrl: string;
  appRole: string;
  ownerRole: string;
  baseTemplate?: string;
  files?: MigrationFile[];
}

export interface RestoreManifest {
  storageKey: string;
  checksum: string;
  cipherChecksum: string;
  tableCount: number;
}

export class RestoreError extends Error {
  constructor(readonly reason: 'checksum' | 'target_exists' | 'base_template_missing' | 'tables') {
    super(`khôi phục thất bại: ${reason}`);
    this.name = 'RestoreError';
  }
}

const mark = (jobId: string) => `appchat-restore:${jobId}`;

/** Một câu truy vấn trên kết nối tạm (đóng ngay) — kiểm DB tenant ngoài resolver (quiesce, kiểm sau khôi phục). */
export async function pgQuery<T extends pg.QueryResultRow>(url: string, sql: string, params: unknown[] = []): Promise<T[]> {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    return (await c.query<T>(sql, params)).rows;
  } finally {
    await c.end();
  }
}

/** DB đích đã có: chính lệnh này đổi tên xong ở lần chạy trước (dấu COMMENT khớp) → đi tiếp; khác → không đụng. */
async function targetMarked(lock: OperationLock, adminUrl: string, dbName: string, jobId: string): Promise<boolean> {
  if (!(await lock.exists(dbName))) return false;
  const rows = await pgQuery<{ c: string | null }>(withDatabase(adminUrl, 'postgres', lock.dbHost), `SELECT shobj_description(oid, 'pg_database') AS c FROM pg_database WHERE datname = $1`, [dbName]);
  if (rows[0]?.c === mark(jobId)) return true;
  throw new RestoreError('target_exists');
}

/**
 * Khôi phục `m` vào DB tenant `dbName` (đang giữ `lock` của workspace). Trả version schema sau migrate + thời gian từng pha (ms).
 * Gọi lại sau crash: DB tạm cùng thế hệ bị dọn rồi làm lại; đã đổi tên xong (dấu khớp) → bỏ qua phần đã xong.
 */
export async function restoreDatabase(
  d: RestoreDeps & { adminUrl: string },
  lock: OperationLock,
  m: RestoreManifest,
  dbName: string,
  job: { id: string; generation: number },
): Promise<{ schemaVersion: string | null; metrics: Record<string, number> }> {
  assertTenantDbName(dbName);
  const files = d.files ?? readMigrations(TENANT_MIGRATIONS_DIR);
  const metrics: Record<string, number> = {};
  const t = (k: string, from: number) => (metrics[k] = Date.now() - from);
  if (await targetMarked(lock, d.adminUrl, dbName, job.id)) return { schemaVersion: latestVersion(files), metrics };

  const temp = restoreTempDbName(dbName, job.generation);
  // Worktree (TIP-035d): template nền riêng `TENANT_BASE_DB`; checkout chính không đặt → tên cũ.
  const base = d.baseTemplate ?? (process.env.TENANT_BASE_DB || TENANT_BASE_TEMPLATE);
  if (!(await lock.exists(base))) throw new RestoreError('base_template_missing');
  await lock.dropDatabase(temp, 'temp');
  await lock.exec(`CREATE DATABASE ${quoteIdent(temp)} TEMPLATE ${quoteIdent(base)} OWNER ${quoteIdent(d.ownerRole)}`);
  const dir = await mkdtemp(join(tmpdir(), 'appchat-restore-'));
  try {
    // Lượt 1: đọc lại + kiểm checksum + danh mục (không ghi DB).
    let s = Date.now();
    const back = await readBack(d, m.storageKey, d.conn(temp), lock.signal);
    if (back.cipherChecksum !== m.cipherChecksum || back.checksum !== m.checksum) throw new RestoreError('checksum');
    if (back.toc.tables < m.tableCount) throw new RestoreError('tables');
    // Danh mục chỉ chứa tên đối tượng (không dữ liệu) — bỏ EXTENSION (đã có ở template nền, cần superuser để tạo).
    const list = join(dir, 'toc.list');
    await writeFile(list, back.toc.lines.filter((l) => !/ EXTENSION - | COMMENT - EXTENSION /.test(l)).join('\n'), { mode: 0o600 });
    t('verify_ms', s);

    // Lượt 2: khôi phục từ luồng giải mã, một transaction (lỗi → DB tạm không có nửa dữ liệu).
    s = Date.now();
    const cipher = new HashTap();
    const plain = new HashTap();
    const src = d.store.read(m.storageKey);
    const dec = new DecryptStream(d.keys);
    src.pipe(cipher).pipe(dec).pipe(plain);
    const failed = new Promise<never>((_, rej) => [src, cipher, dec, plain].forEach((x) => x.on('error', rej)));
    await Promise.race([
      runPg('pg_restore', ['--exit-on-error', '--single-transaction', '--no-owner', `--role=${d.ownerRole}`, '-L', list, '-d', temp], d.conn(temp), { binDir: d.binDir, stdin: plain, signal: lock.signal }),
      failed,
    ]);
    if (plain.digest() !== m.checksum) throw new RestoreError('checksum');
    t('restore_ms', s);

    s = Date.now();
    await lock.exec(`GRANT CONNECT, TEMPORARY ON DATABASE ${quoteIdent(temp)} TO ${quoteIdent(d.appRole)}`);
    await applyMigrations(withDatabase(d.migratorUrl, temp, lock.dbHost), files);
    t('migrate_ms', s);

    await lock.exec(`COMMENT ON DATABASE ${quoteIdent(temp)} IS '${mark(job.id)}'`);
    await lock.exec(`ALTER DATABASE ${quoteIdent(temp)} RENAME TO ${quoteIdent(dbName)}`);
    return { schemaVersion: latestVersion(files), metrics };
  } catch (e) {
    await lock.dropDatabase(temp, 'temp').catch(() => undefined);
    throw e;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Kiểm DB sau khôi phục (role app): đủ số bảng của bản lưu trữ + bảng theo dõi migration có version mới nhất. */
export async function verifyRestored(appUrl: string, dbName: string, dbHost: string | null, m: RestoreManifest, version: string | null): Promise<void> {
  const url = withDatabase(appUrl, assertTenantDbName(dbName), dbHost);
  const [n] = await pgQuery<{ n: number }>(url, `SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'`);
  if ((n?.n ?? 0) < m.tableCount) throw new RestoreError('tables');
  if (version) {
    const [v] = await pgQuery<{ ok: boolean }>(url, `SELECT EXISTS (SELECT 1 FROM "_appchat_migrations" WHERE name = $1) AS ok`, [version]);
    if (!v?.ok) throw new RestoreError('tables');
  }
}

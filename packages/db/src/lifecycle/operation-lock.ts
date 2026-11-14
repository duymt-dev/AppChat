// Khoá thao tác ngoài DB của một workspace (TIP-041 §2 "Fencing external operations"): PostgreSQL session advisory lock trên kết nối RIÊNG
// tới maintenance database cố định của CHÍNH cluster chứa tenant (registry db_host) — không pool, không transaction. Mọi provision / archive /
// restore / delete dùng cùng khoá. DROP / CREATE / ALTER DATABASE chỉ chạy trên kết nối đang giữ khoá (`exec`). Mất kết nối → `signal`
// abort (tiến trình pg_dump / pg_restore con bị kill), không tự kết nối lại để làm tiếp. Host ngoài allowlist → từ chối (fail closed).
import { createHash } from 'node:crypto';
import pg from 'pg';
import { withDatabase } from '../env';
import { assertTenantDbName, quoteIdent } from '../db-name';

export interface ClusterConfig {
  /** URL appchat_provisioner (cluster mặc định). */
  adminUrl: string;
  /** Host khác cluster mặc định được phép (registry db_host) — vắng → chỉ cluster mặc định. */
  allowedHosts?: readonly string[];
  /** Maintenance database cố định cho khoá (phạm vi advisory lock là database). */
  maintenanceDb?: string;
}

export class LockUnavailableError extends Error {
  constructor(readonly reason: 'busy' | 'host_not_allowed' | 'lost') {
    super(`khoá thao tác workspace: ${reason}`);
    this.name = 'LockUnavailableError';
  }
}

/** Khoá bigint ổn định theo workspace (62 bit của sha256 uuid — uuidv7 cùng mili-giây khác nhau ở phần cuối) → classid / objid pg_locks. */
export function lockKeyOf(workspaceId: string): bigint {
  return BigInt(`0x${createHash('sha256').update(`appchat:lifecycle:${workspaceId}`).digest('hex').slice(0, 15)}`) & 0x3fffffffffffffffn;
}

/** URL quản trị tới `database` của cluster theo registry; host lạ → LockUnavailableError. */
export function clusterUrl(c: ClusterConfig, dbHost: string | null, database: string): string {
  if (dbHost && !(c.allowedHosts ?? []).includes(dbHost)) throw new LockUnavailableError('host_not_allowed');
  return withDatabase(c.adminUrl, database, dbHost);
}

export class OperationLock {
  private lost = false;
  private readonly ac = new AbortController();

  private constructor(
    private readonly client: pg.Client,
    readonly workspaceId: string,
    readonly dbHost: string | null,
  ) {
    const onLost = () => {
      this.lost = true;
      this.ac.abort();
    };
    client.on('error', onLost);
    client.on('end', onLost);
  }

  /** Thử lấy khoá (không chờ) — đang có tiến trình khác giữ → `busy`. */
  static async acquire(c: ClusterConfig, workspaceId: string, dbHost: string | null): Promise<OperationLock> {
    const client = new pg.Client({ connectionString: clusterUrl(c, dbHost, c.maintenanceDb ?? 'postgres'), application_name: 'appchat-lifecycle-lock' });
    client.on('error', () => undefined);
    await client.connect();
    try {
      const r = await client.query<{ ok: boolean }>('SELECT pg_try_advisory_lock($1::bigint) AS ok', [lockKeyOf(workspaceId).toString()]);
      if (!r.rows[0]?.ok) throw new LockUnavailableError('busy');
      return new OperationLock(client, workspaceId, dbHost);
    } catch (e) {
      await client.end().catch(() => undefined);
      throw e;
    }
  }

  /** Huỷ khi mất khoá — truyền cho tiến trình pg_dump / pg_restore. */
  get signal(): AbortSignal {
    return this.ac.signal;
  }

  /** Kiểm khoá CÒN giữ trên chính kết nối này (pg_locks) — gọi trước mỗi bước phá huỷ. */
  async assertHeld(): Promise<void> {
    if (this.lost) throw new LockUnavailableError('lost');
    const k = lockKeyOf(this.workspaceId);
    const r = await this.client
      .query<{ n: number }>(
        `SELECT count(*)::int AS n FROM pg_locks WHERE pid = pg_backend_pid() AND locktype = 'advisory' AND granted
           AND classid = $1::bigint::oid AND objid = $2::bigint::oid AND objsubid = 1`,
        [(k >> 32n).toString(), (k & 0xffffffffn).toString()],
      )
      .catch(() => null);
    if (!r || r.rows[0]?.n !== 1) {
      this.lost = true;
      this.ac.abort();
      throw new LockUnavailableError('lost');
    }
  }

  /** Lệnh DDL cấp database (CREATE / DROP / ALTER … RENAME) — chỉ trên kết nối giữ khoá, sau khi kiểm khoá. */
  async exec(sql: string): Promise<void> {
    await this.assertHeld();
    await this.client.query(sql);
  }

  async exists(dbName: string): Promise<boolean> {
    await this.assertHeld();
    return ((await this.client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName])).rowCount ?? 0) > 0;
  }

  /** DROP DATABASE một DB tenant / DB tạm của tenant — tên đã kiểm dạng, không bao giờ platform / template / postgres. */
  async dropDatabase(dbName: string, kind: 'tenant' | 'temp'): Promise<void> {
    const name = kind === 'tenant' ? assertTenantDbName(dbName) : assertTempDbName(dbName);
    await this.exec(`DROP DATABASE IF EXISTS ${quoteIdent(name)} WITH (FORCE)`);
  }

  async release(): Promise<void> {
    if (!this.lost) await this.client.query('SELECT pg_advisory_unlock($1::bigint)', [lockKeyOf(this.workspaceId).toString()]).catch(() => undefined);
    await this.client.end().catch(() => undefined);
  }
}

const TEMP = /^ws_[a-z0-9]{12}_r[0-9]{1,9}$/;

/** DB tạm của một lần khôi phục: `<tenant>_r<generation>` — dọn đúng thế hệ của lệnh, không đụng DB khác. */
export const restoreTempDbName = (tenantDb: string, generation: number) => assertTempDbName(`${assertTenantDbName(tenantDb)}_r${generation}`);
export function assertTempDbName(name: string): string {
  if (!TEMP.test(name)) throw new Error(`Tên DB tạm không hợp lệ: ${name}`);
  return name;
}

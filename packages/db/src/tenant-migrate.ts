// tenant-migrate (Blueprint §2.0 Migration): duyệt DB `active | suspended`, song song 4, áp migration còn thiếu,
// ghi kết quả từng DB (tenant_migration); DB lỗi không chặn DB khác.
import { withDatabase } from './env';
import { applyMigrations, latestVersion, readMigrations, TENANT_MIGRATIONS_DIR, type MigrationFile } from './migrations';
import { assertTenantDbName } from './db-name';
import type { WorkspaceDbInfo, WorkspaceRegistry } from './registry';

export interface MigrationRecorder {
  start(workspaceId: string, version: string): Promise<void>;
  finish(workspaceId: string, version: string, error?: string): Promise<void>;
}

export interface TenantMigrateOptions {
  registry: WorkspaceRegistry;
  recorder: MigrationRecorder;
  /** URL appchat_migrator; tên DB thay theo registry. */
  migratorUrl: string;
  files?: MigrationFile[];
  concurrency?: number;
}

export interface TenantMigrateReport {
  version: string | null;
  done: string[];
  failed: { workspaceId: string; error: string }[];
}

export async function tenantMigrate(opts: TenantMigrateOptions): Promise<TenantMigrateReport> {
  const files = opts.files ?? readMigrations(TENANT_MIGRATIONS_DIR);
  const version = latestVersion(files);
  const report: TenantMigrateReport = { version, done: [], failed: [] };
  if (!version) return report;

  const queue = [...(await opts.registry.listMigratable())];
  const worker = async () => {
    for (let ws = queue.shift(); ws; ws = queue.shift()) await migrateOne(ws, version, files, opts, report);
  };
  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency ?? 4) }, worker));
  return report;
}

async function migrateOne(
  ws: WorkspaceDbInfo,
  version: string,
  files: MigrationFile[],
  opts: TenantMigrateOptions,
  report: TenantMigrateReport,
): Promise<void> {
  await opts.recorder.start(ws.workspaceId, version);
  try {
    const url = withDatabase(opts.migratorUrl, assertTenantDbName(ws.dbName), ws.dbHost);
    await applyMigrations(url, files);
    await opts.recorder.finish(ws.workspaceId, version);
    await opts.registry.setStatus(ws.workspaceId, ws.dbStatus, { schemaVersion: version });
    report.done.push(ws.workspaceId);
  } catch (e) {
    const error = (e as Error).message.slice(0, 2000);
    await opts.recorder.finish(ws.workspaceId, version, error);
    report.failed.push({ workspaceId: ws.workspaceId, error });
  }
}

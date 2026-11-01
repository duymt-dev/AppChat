// TIP-002 AC9: tenant-migrate áp migration mới lên mọi DB active / suspended, DB lỗi không chặn DB khác, ghi tenant_migration.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  MemoryWorkspaceRegistry,
  PlatformMigrationRecorder,
  TENANT_MIGRATIONS_DIR,
  TenantContexts,
  TenantDbResolver,
  TenantProvisioner,
  createPlatformDb,
  readMigrations,
  tenantDbName,
  tenantMigrate,
  type PlatformDb,
} from '../../src';
import { env, newWorkspaceId } from './helpers';

const provisioner = new TenantProvisioner({
  adminUrl: env.PROVISIONER_DATABASE_URL!,
  templateDb: env.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template',
  ownerRole: 'appchat_migrator',
  appRole: 'appchat_tenant_app',
});
const registry = new MemoryWorkspaceRegistry();
const OK1 = newWorkspaceId();
const OK2 = newWorkspaceId();
const BROKEN = newWorkspaceId();
const ARCHIVED = newWorkspaceId();
let platform: PlatformDb;

const NEXT = {
  name: '29991231000000_test_add_probe',
  sql: 'CREATE TABLE "probe" ("id" int PRIMARY KEY);', // quyền app đến từ ALTER DEFAULT PRIVILEGES của template
};

beforeAll(async () => {
  platform = createPlatformDb(env.PLATFORM_DATABASE_URL!);
  for (const ws of [OK1, OK2, BROKEN]) {
    const r = await provisioner.provision(ws);
    registry.upsert({ workspaceId: ws, dbName: r.dbName, dbHost: null, dbStatus: ws === OK2 ? 'suspended' : 'active', schemaVersion: null });
  }
  registry.upsert({ workspaceId: ARCHIVED, dbName: tenantDbName(ARCHIVED), dbHost: null, dbStatus: 'archived', schemaVersion: null });
  // DB hỏng: bảng probe đã có sẵn → migration mới lỗi "already exists".
  const u = new URL(env.PG_ADMIN_URL!);
  u.pathname = `/${tenantDbName(BROKEN)}`;
  const pg = (await import('pg')).default;
  const c = new pg.Client({ connectionString: u.toString() });
  await c.connect();
  await c.query('CREATE TABLE "probe" ("x" text)');
  await c.end();
});

afterAll(async () => {
  await platform?.tenantMigration.deleteMany({ where: { workspaceId: { in: [OK1, OK2, BROKEN, ARCHIVED] } } });
  await platform?.$disconnect();
  for (const ws of [OK1, OK2, BROKEN]) await provisioner.drop(tenantDbName(ws));
});

describe('tenantMigrate', () => {
  it('áp migration mới lên DB active + suspended; DB lỗi không chặn DB khác; bỏ qua archived', async () => {
    const files = [...readMigrations(TENANT_MIGRATIONS_DIR), NEXT];
    const report = await tenantMigrate({
      registry,
      recorder: new PlatformMigrationRecorder(platform),
      migratorUrl: env.MIGRATOR_DATABASE_URL!,
      files,
      concurrency: 4,
    });
    expect(report.version).toBe(NEXT.name);
    expect(report.done.sort()).toEqual([OK1, OK2].sort());
    expect(report.failed.map((f) => f.workspaceId)).toEqual([BROKEN]);
    expect(report.failed[0]!.error).toMatch(/already exists/);

    const rows = await platform.tenantMigration.findMany({ where: { version: NEXT.name, workspaceId: { in: [OK1, OK2, BROKEN, ARCHIVED] } } });
    const st = Object.fromEntries(rows.map((r) => [r.workspaceId, r.status]));
    expect(st).toEqual({ [OK1]: 'done', [OK2]: 'done', [BROKEN]: 'failed' });
    expect((await registry.find(OK1))!.schemaVersion).toBe(NEXT.name);

    // DB đã migrate: bảng mới đọc được bằng role app.
    registry.upsert({ ...(await registry.find(OK1))!, dbStatus: 'active' });
    const resolver = new TenantDbResolver({ registry, baseUrl: env.TENANT_DATABASE_URL! });
    const db = await resolver.get(TenantContexts.system(OK1, 'test'));
    await expect(db.$queryRawUnsafe('SELECT count(*) FROM probe')).resolves.toBeDefined();
    await resolver.close();

    // Chạy lại → idempotent, DB đã xong không áp lại.
    const again = await tenantMigrate({ registry, recorder: new PlatformMigrationRecorder(platform), migratorUrl: env.MIGRATOR_DATABASE_URL!, files });
    expect(again.done.sort()).toEqual([OK1, OK2].sort());
  });
});

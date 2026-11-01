// TIP-002 AC2, AC3, AC6, AC7 + tenant-db "test bắt buộc" trên Postgres 16 thật:
// template đủ extension, provision từ template (idempotent, < 10 s), route registry → đúng DB, 2 workspace song song cô lập.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  MemoryWorkspaceRegistry,
  TenantContexts,
  TenantDbResolver,
  TenantProvisioner,
  createPlatformDb,
  tenantDbName,
  type PlatformDb,
} from '../../src';
import { adminQuery, dbExists, env, newWorkspaceId } from './helpers';

const TEMPLATE = env.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template';
const provisioner = new TenantProvisioner({
  adminUrl: env.PROVISIONER_DATABASE_URL!,
  templateDb: TEMPLATE,
  ownerRole: 'appchat_migrator',
  appRole: 'appchat_tenant_app',
});
const registry = new MemoryWorkspaceRegistry();
const resolver = new TenantDbResolver({ registry, baseUrl: env.TENANT_DATABASE_URL! });
const A = newWorkspaceId();
const B = newWorkspaceId();
let platform: PlatformDb;

beforeAll(async () => {
  platform = createPlatformDb(env.PLATFORM_DATABASE_URL!);
  for (const ws of [A, B]) {
    const r = await provisioner.provision(ws);
    registry.upsert({ workspaceId: ws, dbName: r.dbName, dbHost: null, dbStatus: 'active', schemaVersion: null });
  }
});

afterAll(async () => {
  await resolver.close();
  await platform?.tenantChannelRoute.deleteMany({ where: { workspaceId: { in: [A, B] } } });
  await platform?.$disconnect();
  for (const ws of [A, B]) await provisioner.drop(tenantDbName(ws));
});

describe('template', () => {
  it('đủ 6 extension + f_unaccent bỏ dấu tiếng Việt', async () => {
    const db = await resolver.get(TenantContexts.system(A, 'test'));
    const ext = await db.$queryRaw<{ extname: string }[]>`SELECT extname FROM pg_extension ORDER BY 1`;
    expect(ext.map((e) => e.extname)).toEqual(expect.arrayContaining(['pgcrypto', 'vector', 'pg_trgm', 'unaccent', 'btree_gist', 'citext']));
    const [r] = await db.$queryRaw<{ v: string }[]>`SELECT f_unaccent(${'Đặng Thị Hà · Nguyễn Văn Ước'}) AS v`;
    expect(r!.v).toBe('Dang Thi Ha · Nguyen Van Uoc');
  });

  it('không app nào kết nối template (tenant_app bị từ chối)', async () => {
    const u = new URL(env.TENANT_DATABASE_URL!);
    u.pathname = `/${TEMPLATE}`;
    const pg = await import('pg');
    const c = new pg.default.Client({ connectionString: u.toString() });
    await expect(c.connect()).rejects.toThrow(/permission denied|not currently accepting|is not allowed/i);
  });
});

describe('provisioner', () => {
  it('tạo DB ws_* từ template < 10 s, có bảng kernel; gọi lại không tạo mới', async () => {
    const ws = newWorkspaceId();
    const r = await provisioner.provision(ws);
    try {
      expect(r.created).toBe(true);
      expect(r.ms).toBeLessThan(10_000);
      expect(r.dbName).toBe(tenantDbName(ws));
      expect(await dbExists(r.dbName)).toBe(true);
      const again = await provisioner.provision(ws);
      expect(again).toMatchObject({ dbName: r.dbName, created: false });
      const t = await adminQuery<{ c: string }>(
        `SELECT count(*)::text AS c FROM pg_database WHERE datname = $1`,
        [r.dbName],
      );
      expect(t.rows[0]!.c).toBe('1');
    } finally {
      await provisioner.drop(r.dbName);
    }
    expect(await dbExists(r.dbName)).toBe(false);
  });
});

describe('cô lập tenant (DB thật)', () => {
  it('(c) route registry → TenantContext.fromRoute → đúng DB', async () => {
    const accountA = newWorkspaceId();
    await platform.tenantChannelRoute.create({ data: { channelAccountId: accountA, workspaceId: A, type: 'zalo_personal', status: 'connected' } });
    const route = await platform.tenantChannelRoute.findUniqueOrThrow({ where: { channelAccountId: accountA } });
    const db = await resolver.get(TenantContexts.fromRoute(route.workspaceId, 'channel'));
    const [r] = await db.$queryRaw<{ d: string }[]>`SELECT current_database() AS d`;
    expect(r!.d).toBe(tenantDbName(A));
  });

  it('(d) 2 workspace ghi song song → mỗi DB chỉ thấy dữ liệu của mình', async () => {
    const [dbA, dbB] = await Promise.all([
      resolver.get(TenantContexts.fromMembership(A, 'user-a')),
      resolver.get(TenantContexts.fromMembership(B, 'user-b')),
    ]);
    const userA = newWorkspaceId();
    const userB = newWorkspaceId();
    const bump = (db: typeof dbA) =>
      db.$queryRaw<{ value: bigint }[]>`INSERT INTO sequence_counter(kind, value) VALUES ('contact', 1)
        ON CONFLICT (kind) DO UPDATE SET value = sequence_counter.value + 1 RETURNING value`;
    await Promise.all([
      ...Array.from({ length: 20 }, () => bump(dbA)),
      ...Array.from({ length: 7 }, () => bump(dbB)),
      dbA.notification.create({ data: { id: newWorkspaceId(), userId: userA, type: 'test', title: 'A' } }),
      dbB.notification.create({ data: { id: newWorkspaceId(), userId: userB, type: 'test', title: 'B' } }),
    ]);
    expect((await dbA.sequenceCounter.findUniqueOrThrow({ where: { kind: 'contact' } })).value).toBe(20n);
    expect((await dbB.sequenceCounter.findUniqueOrThrow({ where: { kind: 'contact' } })).value).toBe(7n);
    expect((await dbA.notification.findMany()).map((n) => n.title)).toEqual(['A']);
    expect((await dbB.notification.findMany()).map((n) => n.title)).toEqual(['B']);
    expect(await dbA.notification.count({ where: { userId: userB } })).toBe(0);
  });

  it('app role không tạo / xoá được DB (không CREATEDB)', async () => {
    const db = await resolver.get(TenantContexts.system(A, 'test'));
    await expect(db.$executeRawUnsafe('CREATE DATABASE ws_000000000bad')).rejects.toThrow(/permission denied/i);
  });
});

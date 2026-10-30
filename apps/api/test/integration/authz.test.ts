// TIP-005 AC1–AC9 trên Postgres 16 + Memurai: migration 005, seed vai trò, ma trận §3.5 qua /v1/me/authz, uỷ quyền,
// vai trò tuỳ biến, cache + invalidate, executor dùng AuthzContext thật, platform_admin, role-isolation, endpoint đọc.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthzResolver, provisionWorkspace, runTenantSeeds, scopeFilter, tenantSeedDb, uuidv7, ContextAuthorizer } from '@appchat/core';
import {
  MemoryWorkspaceRegistry,
  PrismaWorkspaceRegistry,
  TENANT_MIGRATIONS_DIR,
  TenantContexts,
  TenantDbResolver,
  readMigrations,
  tenantDbName,
  tenantMigrate,
} from '@appchat/db';
import { PERMISSIONS, ROLE_DEFS, SYSTEM_ROLES } from '@appchat/shared';
import { call, env, provisioner, startApi, type Harness } from './setup';
import { actorFor, newActor, visible } from './role-isolation.harness';

let h: Harness;
beforeAll(async () => {
  h = await startApi();
});
afterAll(async () => {
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (token: string) => ({ authorization: `Bearer ${token}` });
const tenant = () => new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });

describe('schema + seed', () => {
  it('AC1 template có migration 005 + index team_member_user_idx; tenant-migrate áp 005 cho DB tenant cũ', async () => {
    const r = tenant();
    const db = await r.get(TenantContexts.system(h.ws, 't'));
    const idx = await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename = 'team_member'`;
    expect(idx.map((i) => i.indexname)).toContain('team_member_user_idx');
    await r.close();
    expect(readMigrations(TENANT_MIGRATIONS_DIR).map((m) => m.name)).toContain('20261030110000_005_authz');
    // DB tenant "cũ" (chỉ có migration 002): tạo từ template rồi gỡ bảng 005 + dòng theo dõi → tenant-migrate áp lại.
    const ws = uuidv7();
    const prov = provisioner();
    const { dbName } = await prov.provision(ws);
    try {
      const reg = new MemoryWorkspaceRegistry();
      reg.upsert({ workspaceId: ws, dbName, dbHost: null, dbStatus: 'active', schemaVersion: null });
      const pg = await import('pg');
      const { withDatabase } = await import('@appchat/db');
      const c = new pg.default.Client({ connectionString: withDatabase(env.MIGRATOR_DATABASE_URL!, dbName) });
      await c.connect();
      await c.query(`DROP TABLE team_member, team, role; DELETE FROM "_appchat_migrations" WHERE name = '20261030110000_005_authz'`);
      await c.end();
      const recorder = { start: async () => undefined, finish: async () => undefined };
      const out = await tenantMigrate({ registry: reg, recorder, migratorUrl: env.MIGRATOR_DATABASE_URL!, concurrency: 1 });
      // version = migration mới nhất của template (TIP sau thêm migration → không phải sửa test này).
      expect(out).toMatchObject({ version: readMigrations(TENANT_MIGRATIONS_DIR).at(-1)!.name, done: [ws], failed: [] });
      const c2 = new pg.default.Client({ connectionString: withDatabase(env.MIGRATOR_DATABASE_URL!, dbName) });
      await c2.connect();
      expect((await c2.query(`SELECT to_regclass('team_member') AS t`)).rows[0].t).toBe('team_member');
      await c2.end();
    } finally {
      await prov.drop(dbName);
    }
  });

  it('AC2 tenant.provision seed đúng 5 vai trò hệ thống; chạy lại không nhân đôi', async () => {
    const ws = uuidv7();
    await h.platform.workspace.create({ data: { id: ws, name: 'Seed', slug: `seed-${ws.slice(-12)}`, ownerUserId: h.user, dbName: tenantDbName(ws), dbStatus: 'provisioning' } });
    const resolver = tenant();
    const deps = { platform: h.platform, resolver, provisioner: provisioner(), kv: { sadd: async () => 1, set: async () => 'OK', getdel: async () => null, spop: async () => [] }, clock: h.clock, seedDb: tenantSeedDb(env.TENANT_DATABASE_URL!) };
    try {
      expect(await provisionWorkspace(deps, ws)).toBe('created');
      const db = await resolver.get(TenantContexts.system(ws, 't'));
      const roles = await db.role.findMany({ orderBy: { key: 'asc' } });
      expect(roles.map((r) => r.key)).toEqual([...SYSTEM_ROLES].sort());
      for (const r of roles) {
        expect(r.isSystem).toBe(true);
        expect([...r.permissions].sort()).toEqual([...ROLE_DEFS[r.key as 'owner'].permissions].sort());
        expect(r.dataScope).toEqual(ROLE_DEFS[r.key as 'owner'].scope);
      }
      await tenantSeedDb(env.TENANT_DATABASE_URL!)(tenantDbName(ws), (d) => runTenantSeeds(d, { workspaceId: ws, now: h.clock.now() }));
      expect(await db.role.count()).toBe(5);
    } finally {
      await resolver.close();
      await provisioner().drop(tenantDbName(ws));
      await h.platform.workspace.delete({ where: { id: ws } });
    }
  });
});

describe('AuthzContext', () => {
  it('AC3 ma trận §3.5 qua GET /v1/me/authz cho 5 vai trò; Owner theo workspace.owner_user_id', async () => {
    const owner = await json(await call(h, '/me/authz'));
    expect(owner.body.data).toMatchObject({ role: 'owner', is_owner: true, team_ids: [] });
    expect(owner.body.data.permissions).toEqual([...PERMISSIONS].sort());
    for (const role of ['manager', 'sales', 'cs', 'accountant'] as const) {
      const m = await h.member(role);
      const r = await json(await call(h, '/me/authz', undefined, as(m.token)));
      expect(r.status).toBe(200);
      expect(r.body.data).toMatchObject({ role, is_owner: false, scope: ROLE_DEFS[role].scope });
      expect(r.body.data.permissions).toEqual([...ROLE_DEFS[role].permissions].sort());
    }
    // role_key 'manager' nhưng là owner_user_id của workspace → vẫn là Owner (không theo tên vai trò).
    await h.platform.membership.update({ where: { workspaceId_userId: { workspaceId: h.ws, userId: h.user } }, data: { roleKey: 'manager' } });
    await h.app.get(AuthzResolver).invalidate(h.ws);
    try {
      expect((await json(await call(h, '/me/authz'))).body.data).toMatchObject({ role: 'manager', is_owner: true });
    } finally {
      await h.platform.membership.update({ where: { workspaceId_userId: { workspaceId: h.ws, userId: h.user } }, data: { roleKey: 'owner' } });
      await h.app.get(AuthzResolver).invalidate(h.ws);
    }
  });

  it('AC4 uỷ quyền: Quản lý + contract.sign → có; billing.manage (không uỷ quyền được) → bỏ qua', async () => {
    const m = await h.member('manager');
    await h.platform.membership.update({ where: { workspaceId_userId: { workspaceId: h.ws, userId: m.id } }, data: { delegations: ['contract.sign', 'billing.manage'] } });
    const r = await json(await call(h, '/me/authz', undefined, as(m.token)));
    expect(r.body.data.permissions).toContain('contract.sign');
    expect(r.body.data.permissions).not.toContain('billing.manage');
    expect(r.body.data.permissions).not.toContain('payment.refund_approve');
  });

  it('AC5 vai trò tuỳ biến từ bảng role (lọc permission lạ); custom:* không có dòng → không quyền', async () => {
    const r = tenant();
    const db = await r.get(TenantContexts.system(h.ws, 't'));
    await db.role.create({ data: { id: uuidv7(), key: 'custom:viewer', name: 'Viewer', permissions: ['crm.view', 'quote.view', 'hack.all'], dataScope: { crm: 'all', sales: 'team' } } });
    await r.close();
    const v = await h.member('custom:viewer');
    const got = (await json(await call(h, '/me/authz', undefined, as(v.token)))).body.data;
    expect(got.permissions).toEqual(['crm.view', 'quote.view']);
    expect(got.scope).toMatchObject({ crm: 'all', sales: 'team', inbox: 'none' });
    const ghost = await h.member('custom:ghost');
    const g = (await json(await call(h, '/me/authz', undefined, as(ghost.token)))).body.data;
    expect(g.permissions).toEqual([]);
    expect(Object.values(g.scope).every((s) => s === 'none')).toBe(true);
  });

  it('AC6 cache Redis: lần 2 không đọc DB; invalidate(ws) → đọc lại', async () => {
    const a = h.app.get(AuthzResolver);
    const m = await h.member('sales');
    const ms = { roleKey: 'sales', delegations: [] as string[] };
    await a.resolve(h.ws, m.id, ms);
    const n = a.loads;
    await a.resolve(h.ws, m.id, ms);
    expect(a.loads).toBe(n);
    await a.invalidate(h.ws);
    await a.resolve(h.ws, m.id, ms);
    expect(a.loads).toBe(n + 1);
  });

  it('AC7 executor dùng AuthzContext thật: accountant → action cần inbox.manage 403; platform_admin chỉ admin nền tảng', async () => {
    const acct = await h.member('accountant');
    expect((await json(await call(h, '/actions/tag.create', { input: { name: 'X' } }, { ...as(acct.token), 'idempotency-key': 'k-acct' }))).status).toBe(403);
    const auth = new ContextAuthorizer(h.platform);
    const owner = await actorFor(h, h.user, h.token);
    const base = { workspaceId: h.ws, source: 'ui' as const, actor: { type: 'user' as const, id: h.user }, authz: owner.authz };
    expect(await auth.can(base, 'platform_admin')).toBe(false);
    await h.platform.user.update({ where: { id: h.user }, data: { isPlatformAdmin: true } });
    try {
      expect(await auth.can(base, 'platform_admin')).toBe(true);
    } finally {
      await h.platform.user.update({ where: { id: h.user }, data: { isPlatformAdmin: false } });
    }
    expect(await auth.can(base, 'self')).toBe(true);
  });
});

describe('role-isolation (DB thật)', () => {
  it('AC8 own / team / all / none trên bảng notification (owner = user_id)', async () => {
    const salesA = await newActor(h, 'sales');
    const salesB = await newActor(h, 'sales');
    const manager = await newActor(h, 'manager');
    const acct = await newActor(h, 'accountant');
    const r = tenant();
    const db = await r.get(TenantContexts.system(h.ws, 't'));
    const ids = { a: uuidv7(), b: uuidv7() };
    await db.notification.createMany({ data: [{ id: ids.a, userId: salesA.id, type: 'iso', title: 'A' }, { id: ids.b, userId: salesB.id, type: 'iso', title: 'B' }] });
    // Nhóm chung A + B → scope team thấy nhau.
    const team = uuidv7();
    await db.team.create({ data: { id: team, name: 'Nhóm 1' } });
    await db.teamMember.createMany({ data: [{ teamId: team, userId: salesA.id }, { teamId: team, userId: salesB.id }] });
    await h.app.get(AuthzResolver).invalidate(h.ws);
    const salesTeam = await actorFor(h, salesA.id, salesA.token);
    const q = (module: 'inbox' | 'crm') => (authz: Parameters<typeof scopeFilter>[0]) =>
      db.notification.findMany({ where: { type: 'iso', ...scopeFilter(authz, module, { owner: 'userId' }) }, select: { id: true } });
    try {
      expect(await visible(salesA, q('crm'))).toEqual([ids.a]);
      expect(await visible(salesB, q('crm'))).toEqual([ids.b]);
      expect(await visible({ ...salesTeam, authz: { ...salesTeam.authz, scope: { ...salesTeam.authz.scope, crm: 'team' } } }, q('crm'))).toEqual([ids.a, ids.b].sort());
      expect(salesTeam.authz.teamIds).toEqual([team]);
      expect(await visible(manager, q('crm'))).toEqual([ids.a, ids.b].sort());
      expect(await visible(acct, q('inbox'))).toEqual([]);
    } finally {
      await r.close();
    }
  });
});

describe('endpoint đọc', () => {
  it('AC9 GET /v1/roles (5 vai trò + số thành viên), /v1/permissions (nhóm theo module), /v1/teams', async () => {
    const roles = await json(await call(h, '/roles'));
    expect(roles.status).toBe(200);
    const sys = roles.body.data.filter((r: { is_system: boolean }) => r.is_system);
    expect(sys.map((r: { key: string }) => r.key).sort()).toEqual([...SYSTEM_ROLES].sort());
    expect(sys.find((r: { key: string }) => r.key === 'owner').member_count).toBe(1);
    expect(sys.find((r: { key: string }) => r.key === 'sales').member_count).toBeGreaterThanOrEqual(2);
    const perms = await json(await call(h, '/permissions'));
    expect(perms.body.data.flatMap((g: { permissions: string[] }) => g.permissions).sort()).toEqual([...PERMISSIONS].sort());
    const teams = await json(await call(h, '/teams'));
    expect(teams.body.data[0]).toMatchObject({ name: 'Nhóm 1' });
    expect(teams.body.data[0].user_ids).toHaveLength(2);
    expect((await fetch(`${h.base}/v1/roles`)).status).toBe(401);
  });
});

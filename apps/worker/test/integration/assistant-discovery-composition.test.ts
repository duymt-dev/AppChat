// TIP-023e §4.3: worker ROLE=ai thật (WorkerModule.forRole — module production) ghép discovery cho run Trợ lý chạy tiếp: spec `assistant`
// đã đăng ký có tool `find_actions` trả envelope `{actions, discovery}` từ discovery service (không phải findActions đồng bộ cũ). AI_ENGINE
// =mock → nguồn embed giả có cấu hình; DB tenant chưa có generation → keyword trung thực `corpus_not_ready` (không phải `no_model_route`
// — chứng minh runtime discovery thực sự được tiêm vào đường chạy tiếp).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { RunStore, resumeSpecOf, runTenantSeeds, tenantSeedDb, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, TenantProvisioner, createPlatformDb, tenantDbName, type PlatformDb } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { WorkerModule } from '../../src/worker.module';
import { testEnv } from './fixtures/ai-process';

let app: INestApplicationContext;
let platform: PlatformDb;
let resolver: TenantDbResolver;
const ws = uuidv7();
const owner = uuidv7();
const prov = new TenantProvisioner({ adminUrl: testEnv.PROVISIONER_DATABASE_URL!, templateDb: testEnv.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template', ownerRole: 'appchat_migrator', appRole: 'appchat_tenant_app' });

beforeAll(async () => {
  platform = createPlatformDb(testEnv.PLATFORM_DATABASE_URL!);
  const now = new Date();
  await platform.user.create({ data: { id: owner, email: `t-ai-disc-${owner.slice(-12)}@test.appchat.vn`, name: 'Owner', emailVerifiedAt: now } });
  const { dbName } = await prov.provision(ws);
  await tenantSeedDb(testEnv.TENANT_DATABASE_URL!)(dbName, (d) => runTenantSeeds(d, { workspaceId: ws, now }));
  await platform.workspace.create({ data: { id: ws, name: 'WS discovery', slug: `ws-dc-${ws.slice(-12)}`, ownerUserId: owner, dbName, dbStatus: 'active' } });
  await platform.membership.create({ data: { workspaceId: ws, userId: owner, roleKey: 'owner', joinedAt: now } });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(platform), baseUrl: testEnv.TENANT_DATABASE_URL! });
  Object.assign(process.env, testEnv, { ROLE: 'ai' });
  app = await NestFactory.createApplicationContext(WorkerModule.forRole('ai'), { logger: false });
  await app.init();
}, 180_000);

afterAll(async () => {
  await app?.close();
  await resolver?.close();
  await prov.drop(tenantDbName(ws)).catch(() => undefined);
  await platform.membership.deleteMany({ where: { workspaceId: ws } });
  await platform.workspace.deleteMany({ where: { id: ws } });
  await platform.user.deleteMany({ where: { id: owner } });
  await platform.$disconnect();
});

describe('worker ROLE=ai — discovery ghép vào run Trợ lý chạy tiếp', () => {
  it('spec assistant đã đăng ký; find_actions trả discovery từ service (corpus_not_ready, không no_model_route)', async () => {
    const spec = resumeSpecOf('assistant');
    expect(spec).toBeDefined();
    const db = await resolver.get(TenantContexts.system(ws, 'discovery-composition'));
    const run = await new RunStore(db, () => new Date()).create({ kind: 'assistant', tier: 'standard', input: { mode: 'cowork', locale: 'vi', role: 'owner' }, initiatedByUserId: owner });
    const deps = { tenants: resolver, executor: { isImplemented: () => true, execute: async () => ({ status: 200, data: {} }) }, runner: null, kv: null, log: null, now: () => new Date(), commander: async () => authzForRole('owner', owner) } as never;
    const built = await spec!(db, run, deps, ws);
    const find = built.tools.find((t) => t.name === 'find_actions');
    expect(find).toBeDefined();
    const out = (await find!.execute({ query: 'tạo khách hàng' }, { stepIdx: 0, toolCallId: 'c1' })) as { kind: string; output: { actions: unknown[]; discovery: { strategy: string; reason?: string } } };
    expect(out.kind).toBe('ok');
    expect(Array.isArray(out.output.actions)).toBe(true);
    expect(out.output.discovery).toMatchObject({ strategy: 'keyword', reason: 'corpus_not_ready' });
  });
});

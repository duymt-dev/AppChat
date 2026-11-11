// TIP-023g §3.6, §4.1: worker ROLE=ai thật (WorkerModule.forRole — module production) ghép AssistantService.propose cùng engine mock và
// executor như API: đề xuất combo theo sản phẩm sinh qua run schema không tool → binding `record_proposal` validated; gửi lại cùng
// request_id không run mới. ROLE=jobs (nơi điều phối khôi phục 045b chạy) đăng ký adapter `ai.record_proposal` lúc boot; binding sinh dở
// quá lease → failed USAGE_UNKNOWN (không gọi lại provider).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { AI_RECORD_PROPOSAL_RECOVERY, ActionExecutor, AssistantService, WalletService, recoveryAdapters, runTenantSeeds, tenantSeedDb, uuidv7 } from '@appchat/core';
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
  await platform.user.create({ data: { id: owner, email: `t-ai-rec-${owner.slice(-12)}@test.appchat.vn`, name: 'Owner', emailVerifiedAt: now } });
  const { dbName } = await prov.provision(ws);
  await tenantSeedDb(testEnv.TENANT_DATABASE_URL!)(dbName, (d) => runTenantSeeds(d, { workspaceId: ws, now }));
  await platform.workspace.create({ data: { id: ws, name: 'WS record', slug: `ws-rec-${ws.slice(-12)}`, ownerUserId: owner, dbName, dbStatus: 'active' } });
  await platform.membership.create({ data: { workspaceId: ws, userId: owner, roleKey: 'owner', joinedAt: now } });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(platform), baseUrl: testEnv.TENANT_DATABASE_URL! });
  Object.assign(process.env, testEnv, { ROLE: 'ai' });
  app = await NestFactory.createApplicationContext(WorkerModule.forRole('ai'), { logger: false });
  await app.init();
  await app.get(WalletService, { strict: false }).topup(ws, 1000, { refType: 'test', refId: uuidv7() });
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

describe('worker ROLE=ai — đề xuất theo bản ghi ghép thật', () => {
  it('propose combo → validated, món ⊆ danh mục, 0 ghi; gửi lại không run mới; adapter khôi phục đăng ký và chạy', async () => {
    const executor = app.get(ActionExecutor, { strict: false });
    const authz = authzForRole('owner', owner);
    const ctx = { workspaceId: ws, source: 'ui' as const, actor: { type: 'user' as const, id: owner }, authz: authz as never };
    const mk = async (name: string, price: string) => {
      const r = await executor.execute({ ...ctx, idempotencyKey: uuidv7() }, 'product.create', { name, type: 'service', price, status: 'active' });
      return (r.data as { result: { product_id: string } }).result.product_id;
    };
    const p1 = await mk('Gội đầu dưỡng sinh', '200000');
    const p2 = await mk('Massage cổ vai gáy', '300000');
    const svc = app.get(AssistantService, { strict: false });
    const caller = { workspaceId: ws, userId: owner, authz };
    const body = { entity: 'product', entity_id: p1, intent: 'product_combo', request_id: uuidv7() };
    const out = await svc.propose(caller, body);
    expect(out.state).toBe('validated');
    for (const it of out.combo!.items) expect([p1, p2]).toContain(it.product_id);
    const db = await resolver.get(TenantContexts.system(ws, 'record-composition'));
    const runs = await db.aiRun.count();
    const products = await db.product.count();
    expect(await svc.propose(caller, body)).toEqual(out);
    expect(await db.aiRun.count()).toBe(runs);
    expect(await db.product.count()).toBe(products);
  });
});

describe('worker ROLE=jobs — khôi phục đề xuất theo bản ghi', () => {
  it('adapter ai.record_proposal đăng ký lúc boot; sinh dở quá lease → failed USAGE_UNKNOWN', async () => {
    await app.close();
    Object.assign(process.env, { ROLE: 'jobs' });
    app = await NestFactory.createApplicationContext(WorkerModule.forRole('jobs'), { logger: false });
    await app.init();
    const db = await resolver.get(TenantContexts.system(ws, 'record-recovery'));
    const p1 = (await db.product.findFirstOrThrow({ select: { id: true } })).id;
    const recover = recoveryAdapters().get(AI_RECORD_PROPOSAL_RECOVERY);
    expect(recover).toBeTypeOf('function');
    const stuck = await db.recordProposal.create({ data: { id: uuidv7(), userId: owner, requestId: uuidv7(), runId: uuidv7(), entity: 'product', entityId: p1, intent: 'product_combo', schemaVersion: 1, inputDigest: 'stuck', leaseUntil: new Date(Date.now() - 1000) } });
    const r = await recover!(() => new Date());
    expect(r.unknown).toBeGreaterThanOrEqual(1);
    expect(await db.recordProposal.findUniqueOrThrow({ where: { id: stuck.id } })).toMatchObject({ phase: 'failed', safeReason: 'USAGE_UNKNOWN' });
  }, 180_000);
});

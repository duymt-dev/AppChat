// TIP-019b §4.6 (AC7): tiến trình worker ROLE=ai thật (`node dist/main.js`, module production) chạy tiếp action domain đã duyệt của nhiều
// module — catalog (`product.archive`, delete), sales (`order.cancel`, money) — đúng một lần, không 501; khởi động lại tiến trình + job
// lặp không chạy lần hai. Chỉ ROLE=ai: không hàng đợi kênh / jobs nào được worker này nhận (job `channels` / `jobs` không bị tiêu thụ).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import IORedis from 'ioredis';
import { ActionExecutor, AiModule, BillingModule, CatalogModule, CrmModule, KernelModule, LOGGER, ResumeQueue, SalesModule, createLogger, runTenantSeeds, tenantSeedDb, uuidv7, type ActionContext } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, TenantProvisioner, createPlatformDb, tenantDbName, type PlatformDb, type TenantDb } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { startAiProcess, testEnv, until, type AiProcess } from './fixtures/ai-process';

let api: TestingModule;
let platform: PlatformDb;
let resolver: TenantDbResolver;
let redis: IORedis;
let worker: AiProcess;
const ws = uuidv7();
const owner = uuidv7();
const prov = new TenantProvisioner({ adminUrl: testEnv.PROVISIONER_DATABASE_URL!, templateDb: testEnv.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template', ownerRole: 'appchat_migrator', appRole: 'appchat_tenant_app' });

const db = (): Promise<TenantDb> => resolver.get(TenantContexts.system(ws, 'test'));
const exec = () => api.get(ActionExecutor, { strict: false });
const ui = (): ActionContext => ({ workspaceId: ws, source: 'ui', actor: { type: 'user', id: owner }, idempotencyKey: uuidv7(), authz: authzForRole('owner', owner) as never });
/** Tác vụ Cowork thay Owner — delete / money luôn qua duyệt (Blueprint §3.3). */
const task = (): ActionContext => ({ workspaceId: ws, source: 'task', actor: { type: 'system', id: 'cowork' }, onBehalfOfUserId: owner, authz: authzForRole('owner', owner) as never });

beforeAll(async () => {
  platform = createPlatformDb(testEnv.PLATFORM_DATABASE_URL!);
  const now = new Date();
  await platform.user.create({ data: { id: owner, email: `t-ai-dom-${owner.slice(-12)}@test.appchat.vn`, name: 'Owner', emailVerifiedAt: now } });
  const { dbName } = await prov.provision(ws);
  await tenantSeedDb(testEnv.TENANT_DATABASE_URL!)(dbName, (d) => runTenantSeeds(d, { workspaceId: ws, now }));
  await platform.workspace.create({ data: { id: ws, name: 'WS ai-domain', slug: `ws-aid-${ws.slice(-12)}`, ownerUserId: owner, dbName, dbStatus: 'active' } });
  await platform.membership.create({ data: { workspaceId: ws, userId: owner, roleKey: 'owner', joinedAt: now } });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(platform), baseUrl: testEnv.TENANT_DATABASE_URL! });
  redis = new IORedis(testEnv.REDIS_URL!);
  api = await Test.createTestingModule({ imports: [KernelModule.forRoot({ ...testEnv, LOG_LEVEL: 'silent' }), AiModule, BillingModule, CrmModule, CatalogModule, SalesModule] })
    .overrideProvider(LOGGER)
    .useValue(createLogger({ level: 'silent' }))
    .compile();
  await api.init();
  worker = await startAiProcess();
}, 180_000);

afterAll(async () => {
  await worker?.stop();
  await api?.close();
  await redis?.quit();
  await resolver?.close();
  await prov.drop(tenantDbName(ws)).catch(() => undefined);
  await platform.membership.deleteMany({ where: { workspaceId: ws } });
  await platform.workspace.deleteMany({ where: { id: ws } });
  await platform.user.deleteMany({ where: { id: owner } });
  await platform.$disconnect();
});

async function approved(actionId: string, input: Record<string, unknown>): Promise<string> {
  const out = await exec().execute(task(), actionId, input);
  expect(out, actionId).toMatchObject({ status: 202, data: { status: 'approval_required' } });
  const apId = (out.data as { approval_id: string }).approval_id;
  expect((await exec().execute(ui(), 'approval.approve', { approval_id: apId })).status).toBe(200);
  return apId;
}

const approval = async (id: string) => (await db()).approvalRequest.findUniqueOrThrow({ where: { id } });
const logCount = async (actionId: string, key: string, value: string) => (await db()).actionLog.count({ where: { actionId, input: { path: [key], equals: value } } });

describe('worker ROLE=ai — handler domain thật sau duyệt', () => {
  it('catalog + sales chạy đúng một lần, không 501; khởi động lại + job lặp không chạy lần hai', async () => {
    const p = await exec().execute(ui(), 'product.create', { name: `Gói ${uuidv7().slice(-5)}`, type: 'service', price: '900000' });
    const productId = (p.data as { result: { product_id: string } }).result.product_id;
    const c = await exec().execute(ui(), 'contact.create', { full_name: `Khách ${uuidv7().slice(-5)}`, phone: `0908${Math.floor(100000 + Math.random() * 899999)}` });
    const contactId = (c.data as { result: { contact_id: string } }).result.contact_id;
    const o = await exec().execute(ui(), 'order.create', { contact_id: contactId, items: [{ name: 'HIFU', qty: 1, unit_price: '1500000', tax_rate: 8 }] });
    const orderId = (o.data as { result: { order_id: string } }).result.order_id;

    const cases = [
      { action: 'product.archive', key: 'product_id', id: productId, ap: await approved('product.archive', { product_id: productId }) },
      { action: 'order.cancel', key: 'order_id', id: orderId, ap: await approved('order.cancel', { order_id: orderId, reason: 'Khách đổi ý' }) },
    ];
    for (const k of cases) {
      expect(await until(async () => !!(await approval(k.ap)).executedAt), k.action).toBe(true);
      const r = (await approval(k.ap)).result as { kind: string; code?: string };
      expect(r.kind, `${k.action}: ${JSON.stringify(r)}`).toBe('ok');
      expect(await logCount(k.action, k.key, k.id)).toBe(1);
    }
    expect((await (await db()).product.findUniqueOrThrow({ where: { id: productId } })).status).toBe('archived');
    expect((await (await db()).order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe('cancelled');

    await worker.stop();
    worker = await startAiProcess();
    for (const k of cases) await new ResumeQueue(redis).push(ws, k.ap).catch(() => undefined);
    await new Promise((r) => setTimeout(r, 3000));
    for (const k of cases) expect(await logCount(k.action, k.key, k.id)).toBe(1);
    expect(worker.logs.some((l) => /NOT_IMPLEMENTED|501/.test(l))).toBe(false);
  });

  it('chỉ vai trò ai: job hàng đợi kênh không bị worker này nhận', async () => {
    const { Queue } = await import('bullmq');
    const q = new Queue('channel-inbound', { connection: redis.duplicate() });
    const job = await q.add('probe', { ws, probe: true }, { jobId: `probe-${uuidv7()}` });
    await new Promise((r) => setTimeout(r, 2000));
    expect(await job.getState()).toBe('waiting');
    await job.remove();
    await q.close();
  });
});

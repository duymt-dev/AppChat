// TIP-023b AC điểm nối: approval commerce hợp lệ tạo ở phía "API" (ActionExecutor + module domain thật, Postgres + Redis DB test) → worker
// ROLE=ai chạy bằng tiến trình `node dist/main.js` (module production) nhận job `ai-resume`, có handler thật (không 501) và chạy đúng một
// lần; dừng + chạy lại tiến trình rồi đẩy lại job → không tạo chứng từ thứ hai; đọc lại qua `order.get` cùng id / trạng thái. Người ra lệnh
// bị thu hồi trước khi chạy tiếp → chặn (FORBIDDEN), chứng từ không đổi.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import IORedis from 'ioredis';
import {
  ActionExecutor,
  AiModule,
  BillingModule,
  CrmModule,
  KernelModule,
  LOGGER,
  ResumeQueue,
  SalesModule,
  createLogger,
  runTenantSeeds,
  tenantSeedDb,
  uuidv7,
  type ActionContext,
} from '@appchat/core';
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
/** Mỗi lời gọi một Idempotency-Key mới (như một lần bấm trên UI). */
const ui = (): ActionContext => ({ workspaceId: ws, source: 'ui', actor: { type: 'user', id: owner }, idempotencyKey: uuidv7(), authz: authzForRole('owner', owner) as never });
/** Tác vụ Cowork thay Owner: `order.cancel` (risk money) → luôn qua duyệt (Blueprint §3.3). */
const task = (): ActionContext => ({ workspaceId: ws, source: 'task', actor: { type: 'system', id: 'cowork' }, onBehalfOfUserId: owner, authz: authzForRole('owner', owner) as never });

beforeAll(async () => {
  platform = createPlatformDb(testEnv.PLATFORM_DATABASE_URL!);
  const now = new Date();
  await platform.user.create({ data: { id: owner, email: `t-ai-resume-${owner.slice(-12)}@test.appchat.vn`, name: 'Owner', emailVerifiedAt: now } });
  const { dbName } = await prov.provision(ws);
  await tenantSeedDb(testEnv.TENANT_DATABASE_URL!)(dbName, (d) => runTenantSeeds(d, { workspaceId: ws, now }));
  await platform.workspace.create({ data: { id: ws, name: 'WS ai-resume', slug: `ws-ai-${ws.slice(-12)}`, ownerUserId: owner, dbName, dbStatus: 'active' } });
  await platform.membership.create({ data: { workspaceId: ws, userId: owner, roleKey: 'owner', joinedAt: now } });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(platform), baseUrl: testEnv.TENANT_DATABASE_URL! });
  redis = new IORedis(testEnv.REDIS_URL!);
  // Phía "API": cùng ActionExecutor + module domain như HTTP (không worker AI trong tiến trình này).
  api = await Test.createTestingModule({ imports: [KernelModule.forRoot({ ...testEnv, LOG_LEVEL: 'silent' }), AiModule, BillingModule, CrmModule, SalesModule] })
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

async function newOrder(): Promise<string> {
  const c = await exec().execute(ui(), 'contact.create', { full_name: `Khách ${uuidv7().slice(-5)}`, phone: `0909${Math.floor(100000 + Math.random() * 899999)}` });
  const contactId = (c.data as { result: { contact_id: string } }).result.contact_id;
  const o = await exec().execute(ui(), 'order.create', { contact_id: contactId, items: [{ name: 'HIFU', qty: 1, unit_price: '1500000', tax_rate: 8 }] });
  return (o.data as { result: { order_id: string } }).result.order_id;
}

async function approvedCancel(orderId: string): Promise<string> {
  const out = await exec().execute(task(), 'order.cancel', { order_id: orderId, reason: 'Khách đổi ý' });
  expect(out).toMatchObject({ status: 202, data: { status: 'approval_required' } });
  const apId = (out.data as { approval_id: string }).approval_id;
  const r = await exec().execute(ui(), 'approval.approve', { approval_id: apId });
  expect(r.status).toBe(200);
  return apId;
}

const approval = async (id: string) => (await db()).approvalRequest.findUniqueOrThrow({ where: { id } });

describe('worker ROLE=ai — chạy tiếp commerce sau duyệt', () => {
  it('handler thật (không 501), chạy đúng một lần; khởi động lại + job lặp không tạo / đổi lần hai; đọc lại qua order.get', async () => {
    const orderId = await newOrder();
    const apId = await approvedCancel(orderId);
    expect(await until(async () => !!(await approval(apId)).executedAt)).toBe(true);
    const ap = await approval(apId);
    expect(ap.result).toMatchObject({ kind: 'ok', output: { order_id: orderId, status: 'cancelled' } });
    const logs = async () => (await db()).actionLog.count({ where: { actionId: 'order.cancel', input: { path: ['order_id'], equals: orderId } } });
    expect(await logs()).toBe(1);

    // Tiến trình chạy lại + job đẩy lại (retry / job trùng) → không chạy action lần hai.
    await worker.stop();
    worker = await startAiProcess();
    await new ResumeQueue(redis).push(ws, apId).catch(() => undefined);
    const { Queue } = await import('bullmq');
    const q = new Queue('ai-resume', { connection: redis.duplicate() });
    await q.add('decided', { ws, approval_id: apId }, { jobId: `ap-${apId}-retry` });
    await q.close();
    await new Promise((r) => setTimeout(r, 3000));
    expect(await logs()).toBe(1);
    expect((await approval(apId)).executedAt?.getTime()).toBe(ap.executedAt!.getTime());

    const read = await exec().execute(ui(), 'order.get', { order_id: orderId });
    expect(read.data).toMatchObject({ result: { id: orderId, status: 'cancelled' } });
  });

  it('người ra lệnh bị thu hồi trước khi chạy tiếp → FORBIDDEN, đơn không đổi', async () => {
    const orderId = await newOrder();
    await platform.membership.update({ where: { workspaceId_userId: { workspaceId: ws, userId: owner } }, data: { status: 'removed' } });
    try {
      const out = await exec().execute(task(), 'order.cancel', { order_id: orderId, reason: 'Khách đổi ý' });
      const apId = (out.data as { approval_id: string }).approval_id;
      // Duyệt bởi Owner workspace (vẫn là chủ sở hữu) — người ra lệnh của tác vụ đã mất membership active.
      await (await db()).approvalRequest.update({ where: { id: apId }, data: { status: 'approved', decidedAt: new Date() } });
      await new ResumeQueue(redis).push(ws, apId);
      expect(await until(async () => !!(await approval(apId)).result)).toBe(true);
      expect((await approval(apId)).result).toMatchObject({ kind: 'error', code: 'FORBIDDEN' });
      expect((await (await db()).order.findUniqueOrThrow({ where: { id: orderId } })).status).not.toBe('cancelled');
    } finally {
      await platform.membership.update({ where: { workspaceId_userId: { workspaceId: ws, userId: owner } }, data: { status: 'active' } });
    }
  });
});

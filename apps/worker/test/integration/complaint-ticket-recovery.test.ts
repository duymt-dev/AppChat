// TIP-022b AC5 / AC9 trên Postgres 16 + Memurai: event `ai.complaint_detected` trong outbox → worker ROLE=jobs THẬT (outbox relay + consumer
// `support.ai-complaint`) tạo ĐÚNG MỘT ticket qua Executor với actor agent; tiến trình dừng / chạy lại + event phát lại cùng tin nguồn → vẫn
// một ticket; thu hồi grant ticket.create trước khi consumer chạy → không ticket, receipt `denied`.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import IORedis from 'ioredis';
import { ActionExecutor, AiModule, BillingModule, KernelModule, LOGGER, createLogger, markDirty, runTenantSeeds, tenantSeedDb, uuidv7, writeOutbox, type ActionContext } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, TenantProvisioner, createPlatformDb, tenantDbName, type PlatformDb, type TenantDb } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { startAiProcess, testEnv, until, type AiProcess } from './fixtures/ai-process';

let api: TestingModule;
let platform: PlatformDb;
let resolver: TenantDbResolver;
let redis: IORedis;
let jobs: AiProcess;
let acc: string;
const ws = uuidv7();
const owner = uuidv7();
const prov = new TenantProvisioner({ adminUrl: testEnv.PROVISIONER_DATABASE_URL!, templateDb: testEnv.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template', ownerRole: 'appchat_migrator', appRole: 'appchat_tenant_app' });
const db = (): Promise<TenantDb> => resolver.get(TenantContexts.system(ws, 'test'));
const ui = (): ActionContext => ({ workspaceId: ws, source: 'ui', actor: { type: 'user', id: owner }, idempotencyKey: uuidv7(), authz: authzForRole('owner', owner) as never });
const exec = (id: string, input: unknown) => api.get(ActionExecutor, { strict: false }).execute(ui(), id, input);

beforeAll(async () => {
  platform = createPlatformDb(testEnv.PLATFORM_DATABASE_URL!);
  const now = new Date();
  await platform.user.create({ data: { id: owner, email: `t-complaint-${owner.slice(-12)}@test.appchat.vn`, name: 'Owner', emailVerifiedAt: now } });
  const { dbName } = await prov.provision(ws);
  await tenantSeedDb(testEnv.TENANT_DATABASE_URL!)(dbName, (d) => runTenantSeeds(d, { workspaceId: ws, now }));
  await platform.workspace.create({ data: { id: ws, name: 'WS complaint', slug: `ws-cp-${ws.slice(-12)}`, ownerUserId: owner, dbName, dbStatus: 'active' } });
  await platform.membership.create({ data: { workspaceId: ws, userId: owner, roleKey: 'owner', joinedAt: now } });
  const plan = await platform.plan.create({ data: { id: uuidv7(), key: `t-unl-${uuidv7().slice(-8)}`, segment: 'business', name: 'Test', maxAgents: null, maxChannels: null, active: false } });
  await platform.subscription.create({ data: { id: uuidv7(), workspaceId: ws, planId: plan.id, status: 'active', currentPeriodStart: now } });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(platform), baseUrl: testEnv.TENANT_DATABASE_URL! });
  redis = new IORedis(testEnv.REDIS_URL!);
  api = await Test.createTestingModule({ imports: [KernelModule.forRoot({ ...testEnv, LOG_LEVEL: 'silent' }), AiModule, BillingModule] })
    .overrideProvider(LOGGER)
    .useValue(createLogger({ level: 'silent' }))
    .compile();
  await api.init();
  acc = uuidv7();
  await (await db()).channelAccount.create({ data: { id: acc, type: 'webchat', name: 'Web', externalId: `w-${acc}`, status: 'connected', settings: {} } });
  jobs = await startAiProcess('jobs');
}, 240_000);

afterAll(async () => {
  await jobs?.stop();
  await api?.close();
  await redis?.quit();
  await resolver?.close();
  await prov.drop(tenantDbName(ws)).catch(() => undefined);
  await platform.subscription.deleteMany({ where: { workspaceId: ws } });
  await platform.membership.deleteMany({ where: { workspaceId: ws } });
  await platform.workspace.deleteMany({ where: { id: ws } });
  await platform.user.deleteMany({ where: { id: owner } });
  await platform.$disconnect();
});

/** Lượt khiếu nại đã bàn giao: hội thoại + tin khách + run agent_reply (nguồn lưu ở input) + tóm tắt. */
async function complaintTurn(agentId: string) {
  const d = await db();
  const conv = uuidv7();
  const msg = uuidv7();
  const run = uuidv7();
  await d.conversation.create({ data: { id: conv, channelAccountId: acc, channelType: 'webchat', externalThreadId: `t-${conv}`, aiMode: 'auto', aiState: 'handoff', assigneeAgentId: agentId, lastMessageAt: new Date(), handoffSummary: { request: 'Hàng giao bị vỡ, tôi khiếu nại' } } });
  await d.message.create({ data: { id: msg, conversationId: conv, channelAccountId: acc, direction: 'in', senderType: 'contact', senderId: 'v', kind: 'text', body: 'Hàng giao bị vỡ, tôi khiếu nại', externalMsgId: uuidv7(), status: 'delivered' } });
  await d.aiRun.create({ data: { id: run, kind: 'agent_reply', rootRunId: run, status: 'handoff', agentId, agentVersion: 1, conversationId: conv, input: { conversation_id: conv, source_message_id: msg } } });
  return { conv, msg, run };
}
async function emit(t: { conv: string; msg: string; run: string }, agentId: string) {
  const d = await db();
  await d.$transaction((tx) => writeOutbox(tx, ws, [{ topic: 'ai.complaint_detected', payload: { conversation_id: t.conv, source_message_id: t.msg, run_id: t.run, agent_id: agentId, fence: 1 } }], new Date()));
  await markDirty(redis, ws);
}

describe('worker ROLE=jobs — ticket khiếu nại từ lượt agent', () => {
  it('đúng một ticket (actor agent); khởi động lại + phát lại event cùng tin nguồn → vẫn một', async () => {
    const r = await exec('agent.create_and_publish', { name: 'CSKH', role: 'cs', tools: ['ticket.create', 'conversation.tag'], threshold: 70 });
    const agentId = (r.data as { result: { agent_id: string } }).result.agent_id;
    const t = await complaintTurn(agentId);
    await emit(t, agentId);
    const d = await db();
    const ok = await until(async () => (await d.ticket.count({ where: { sourceMessageId: t.msg } })) === 1, 90_000);
    expect(ok, jobs.logs.slice(-20).join('\n')).toBe(true);
    expect(await d.ticket.findFirstOrThrow({ where: { sourceMessageId: t.msg } })).toMatchObject({ conversationId: t.conv, createdByType: 'agent', createdById: agentId, priority: 'high' });
    await jobs.stop();
    jobs = await startAiProcess('jobs');
    await emit(t, agentId);
    await emit(t, agentId);
    await until(async () => (await d.outboxEvent.count({ where: { topic: 'ai.complaint_detected', status: { not: 'published' } } })) === 0, 30_000);
    await new Promise((r2) => setTimeout(r2, 3000));
    expect(await d.ticket.count({ where: { sourceMessageId: t.msg } })).toBe(1);
  });

  it('grant bị thu hồi trước khi consumer chạy → 0 ticket, receipt denied', async () => {
    const r = await exec('agent.create_and_publish', { name: 'CSKH 2', role: 'cs', tools: ['ticket.create'], threshold: 70 });
    const agentId = (r.data as { result: { agent_id: string } }).result.agent_id;
    expect((await exec('agent.update', { agent_id: agentId, patch: { tools: ['conversation.tag'] } })).status).toBe(200);
    expect((await exec('agent.publish', { agent_id: agentId })).status).toBe(200);
    const t = await complaintTurn(agentId);
    await emit(t, agentId);
    const d = await db();
    expect(await until(async () => (await d.aiComplaintReceipt.findFirst({ where: { sourceMessageId: t.msg } }))?.status === 'denied', 90_000)).toBe(true);
    expect(await d.ticket.count({ where: { sourceMessageId: t.msg } })).toBe(0);
  });
});

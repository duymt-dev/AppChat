// TIP-022b AC9 trên Postgres 16 + Memurai (DB Redis riêng của test): tiến trình worker ROLE=ai THẬT (`node dist/main.js`, model giả) chạy
// lượt agent trực kênh từ queue `agent-reply`: phân luồng từ khoá chọn đúng agent + receipt lượt; lời chào một lần trước câu trả lời; dừng /
// chạy lại tiến trình rồi đẩy lại job cùng hội thoại → không chào lại, không trả lời lần hai (receipt lượt `finalized`); tin khách mới → lượt
// mới, không chào lại. Ngoài giờ tài khoản → không run / không tin ra.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import IORedis from 'ioredis';
import { ActionExecutor, AgentReplyQueue, AiModule, BillingModule, ChannelsModule, KernelModule, LOGGER, WalletService, createLogger, runTenantSeeds, tenantSeedDb, uuidv7, type ActionContext } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, TenantProvisioner, createPlatformDb, tenantDbName, type PlatformDb, type TenantDb } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { startAiProcess, testEnv, until, type AiProcess } from './fixtures/ai-process';

let api: TestingModule;
let platform: PlatformDb;
let resolver: TenantDbResolver;
let redis: IORedis;
let worker: AiProcess;
let queue: AgentReplyQueue;
let acc: string;
const ws = uuidv7();
const owner = uuidv7();
const prov = new TenantProvisioner({ adminUrl: testEnv.PROVISIONER_DATABASE_URL!, templateDb: testEnv.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template', ownerRole: 'appchat_migrator', appRole: 'appchat_tenant_app' });
const db = (): Promise<TenantDb> => resolver.get(TenantContexts.system(ws, 'test'));
const ui = (): ActionContext => ({ workspaceId: ws, source: 'ui', actor: { type: 'user', id: owner }, idempotencyKey: uuidv7(), authz: authzForRole('owner', owner) as never });
const exec = (id: string, input: unknown) => api.get(ActionExecutor, { strict: false }).execute(ui(), id, input);
const always = () => Array.from({ length: 7 }, () => [{ from: '00:00', to: '24:00' }]);

beforeAll(async () => {
  platform = createPlatformDb(testEnv.PLATFORM_DATABASE_URL!);
  const now = new Date();
  await platform.user.create({ data: { id: owner, email: `t-agent-ch-${owner.slice(-12)}@test.appchat.vn`, name: 'Owner', emailVerifiedAt: now } });
  const { dbName } = await prov.provision(ws);
  await tenantSeedDb(testEnv.TENANT_DATABASE_URL!)(dbName, (d) => runTenantSeeds(d, { workspaceId: ws, now }));
  await platform.workspace.create({ data: { id: ws, name: 'WS agent-channel', slug: `ws-ac-${ws.slice(-12)}`, ownerUserId: owner, dbName, dbStatus: 'active' } });
  await platform.membership.create({ data: { workspaceId: ws, userId: owner, roleKey: 'owner', joinedAt: now } });
  const plan = await platform.plan.create({ data: { id: uuidv7(), key: `t-unl-${uuidv7().slice(-8)}`, segment: 'business', name: 'Test', maxAgents: null, maxChannels: null, active: false } });
  await platform.subscription.create({ data: { id: uuidv7(), workspaceId: ws, planId: plan.id, status: 'active', currentPeriodStart: now } });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(platform), baseUrl: testEnv.TENANT_DATABASE_URL! });
  redis = new IORedis(testEnv.REDIS_URL!);
  queue = new AgentReplyQueue(redis, 0);
  api = await Test.createTestingModule({ imports: [KernelModule.forRoot({ ...testEnv, LOG_LEVEL: 'silent' }), AiModule, BillingModule, ChannelsModule] })
    .overrideProvider(LOGGER)
    .useValue(createLogger({ level: 'silent' }))
    .compile();
  await api.init();
  await api.get(WalletService, { strict: false }).topup(ws, 1000, { refType: 'test', refId: uuidv7() });
  const d = await db();
  acc = uuidv7();
  await d.channelAccount.create({ data: { id: acc, type: 'webchat', name: 'Web Spa', externalId: `w-${acc}`, status: 'connected', settings: {} } });
  worker = await startAiProcess('ai');
}, 240_000);

afterAll(async () => {
  await worker?.stop();
  await queue?.onApplicationShutdown();
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

async function agent(name: string): Promise<string> {
  const r = await exec('agent.create_and_publish', { name, role: 'cs', tools: ['conversation.tag'], threshold: 70 });
  expect(r.status, JSON.stringify(r.data)).toBe(200);
  return (r.data as { result: { agent_id: string } }).result.agent_id;
}
async function conversation(text: string): Promise<{ id: string; msg: string }> {
  const d = await db();
  const id = uuidv7();
  await d.conversation.create({ data: { id, channelAccountId: acc, channelType: 'webchat', externalThreadId: `t-${id}`, aiMode: 'auto', lastMessageAt: new Date() } });
  return { id, msg: await customer(id, text) };
}
async function customer(conversationId: string, text: string): Promise<string> {
  const msg = uuidv7();
  await (await db()).message.create({ data: { id: msg, conversationId, channelAccountId: acc, direction: 'in', senderType: 'contact', senderId: 'v', kind: 'text', body: text, externalMsgId: uuidv7(), status: 'delivered', createdAt: new Date() } });
  return msg;
}
const outs = async (id: string) => (await db()).message.findMany({ where: { conversationId: id, direction: 'out' }, orderBy: { createdAt: 'asc' } });

describe('worker ROLE=ai — lượt agent trực kênh (phân luồng + lời chào + khởi động lại)', () => {
  it('phân luồng từ khoá + lời chào một lần + câu trả lời; khởi động lại + job lặp không chào / trả lời lần hai', async () => {
    const [def, booking] = [await agent('Mặc định'), await agent('Đặt lịch')];
    const s = await exec('channel.update_settings', {
      channel_account_id: acc,
      patch: { agent_id: def, greeting: 'Chào anh chị!', greeting_enabled: true, schedule: { timezone: 'Asia/Ho_Chi_Minh', days: always() }, routing: { enabled: true, candidates: [{ agent_id: booking, priority: 5, keywords: ['đặt lịch'] }] } },
    });
    expect(s.status, JSON.stringify(s.data)).toBe(200);
    const c = await conversation('Cho em đặt lịch chiều nay');
    await queue.push({ ws, conversation_id: c.id, message_id: c.msg });
    const ok = await until(async () => (await outs(c.id)).length === 2, 90_000);
    expect(ok, worker.logs.slice(-20).join('\n')).toBe(true);
    const o = await outs(c.id);
    expect(o.map((m) => m.purpose)).toEqual(['greeting', null]);
    expect(o[0]!.body).toBe('Chào anh chị!');
    const d = await db();
    expect((await d.conversation.findUniqueOrThrow({ where: { id: c.id } })).assigneeAgentId).toBe(booking);
    expect(await d.aiTurnReceipt.findUniqueOrThrow({ where: { conversationId_sourceMessageId: { conversationId: c.id, sourceMessageId: c.msg } } })).toMatchObject({ agentId: booking, greetingPhase: 'acknowledged', answerPhase: 'finalized', bindingSource: 'auto' });

    // Khởi động lại tiến trình + đẩy lại job cùng tin → không thêm tin ra.
    await worker.stop();
    worker = await startAiProcess('ai');
    await queue.push({ ws, conversation_id: c.id, message_id: c.msg });
    await new Promise((r) => setTimeout(r, 5000));
    expect(await outs(c.id)).toHaveLength(2);

    // Tin khách mới → lượt mới trả lời, không chào lại.
    const m2 = await customer(c.id, 'Còn chỗ lúc 3 giờ không?');
    await queue.push({ ws, conversation_id: c.id, message_id: m2 });
    expect(await until(async () => (await outs(c.id)).length === 3, 90_000)).toBe(true);
    expect((await outs(c.id)).filter((m) => m.purpose === 'greeting')).toHaveLength(1);
  });

  it('ngoài giờ tài khoản → không run, không tin ra', async () => {
    const ag = await agent('Ngoài giờ');
    // Lịch rỗng mọi ngày = luôn đóng.
    const s = await exec('channel.update_settings', { channel_account_id: acc, patch: { agent_id: ag, greeting_enabled: false, routing: { enabled: false, candidates: [] }, schedule: { timezone: 'Asia/Ho_Chi_Minh', days: Array.from({ length: 7 }, () => []) } } });
    expect(s.status).toBe(200);
    const c = await conversation('Shop ơi');
    await queue.push({ ws, conversation_id: c.id, message_id: c.msg });
    await new Promise((r) => setTimeout(r, 6000));
    const d = await db();
    expect(await outs(c.id)).toHaveLength(0);
    expect(await d.aiRun.count({ where: { conversationId: c.id } })).toBe(0);
  });
});

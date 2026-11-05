// TIP-023b SPEC D trên Postgres 16 + Memurai: API thật + worker ROLE=channels thật (ZALO_TRANSPORT=fake, giữ lease) + worker ROLE=jobs
// (relay outbox → consumer `channel.group_requested`). Kiểm: tạo nhóm → queued → worker giữ phiên gọi Zalo → `channel.group_result` qua executor
// (system) → hội thoại nhóm + thành viên; tin nhóm về trước kết quả không sinh hai hội thoại; request đã attempt rồi sập → unknown, không gọi lại;
// treo → unknown; offline (không phiên) → vẫn queued; đọc trạng thái theo scope; HTTP không gọi được `channel.group_result`.
// Chưa nghiệm thu với Zalo thật (fake transport).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { fakeZaloTransport, type ChannelRegistry } from '@appchat/channels';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry } from '@appchat/db';
import { CHANNELS_RUNTIME, CHANNEL_REGISTRY, CLOCK, ChannelsJobsModule, KernelModule, LOGGER, createLogger, uuidv7, type GroupCreators } from '@appchat/core';
import { groupRequestSchema } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';
import { startWorker, until, type WorkerHarness } from './worker.harness';

const chEnv = { ...env, LOG_LEVEL: 'silent', ZALO_TRANSPORT: 'fake', CHANNEL_SEND_JITTER: '0' };

let h: Harness;
let jobs: WorkerHarness;
let ch: TestingModule;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
let acc: string;
const convs: string[] = [];

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...headers }).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? { authorization: `Bearer ${who.token}` } : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const runtime = () => ch.get(CHANNELS_RUNTIME).runtime;
const req = async (id: string) => (await tenant()).conversationGroupRequest.findUniqueOrThrow({ where: { id } });
const session = () => fakeZaloTransport.session(acc)!;

/** Hội thoại 1-1 của khách trên tài khoản Zalo (như pipeline tạo khi khách nhắn). */
async function direct(uid: string, title: string) {
  const id = uuidv7();
  await (await tenant()).conversation.create({ data: { id, channelAccountId: acc, channelType: 'zalo_personal', externalThreadId: uid, title, lastMessageAt: h.clock.now() } });
  return id;
}

async function create(name: string, ids = convs) {
  const r = await act('conversation.create_group', { channel_account_id: acc, name, conversation_ids: ids });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data.result.request_id as string;
}

beforeAll(async () => {
  h = await startApi();
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  fakeZaloTransport.reset();
  fakeZaloTransport.scanAfterMs = 200;
  ch = await Test.createTestingModule({ imports: [KernelModule.forRoot(chEnv), ChannelsJobsModule] })
    .overrideProvider(LOGGER)
    .useValue(createLogger({ level: 'silent' }))
    .overrideProvider(CLOCK)
    .useValue(h.clock)
    .compile();
  await ch.init();
  jobs = await startWorker(h.platform, { clock: h.clock });
  const r = await act('channel.zalo.start_login', { label: 'Zalo nhóm' });
  acc = r.body.data.result.channel_account_id;
  expect(await until(async () => (await (await tenant()).channelAccount.findUniqueOrThrow({ where: { id: acc } })).status === 'connected')).toBe(true);
  expect(await until(() => runtime().sessions!.isHeld(acc))).toBe(true);
  convs.push(await direct('zl_lan', 'Chị Lan'), await direct('zl_hung', 'Anh Hùng'));
}, 120_000);
afterAll(async () => {
  await ch?.close();
  await jobs?.close();
  await resolver?.close();
  await h?.close();
});

describe('tạo nhóm Zalo — luồng bền', () => {
  it('queued → worker giữ phiên tạo nhóm → succeeded + hội thoại nhóm + thành viên (đọc lại qua HTTP)', async () => {
    const id = await create('Khách VIP');
    expect(await until(async () => (await req(id)).status === 'succeeded')).toBe(true);
    const r = await req(id);
    expect(r.attemptedAt).not.toBeNull();
    expect(session().groups).toEqual([{ groupId: r.providerGroupId, name: 'Khách VIP', members: ['zl_lan', 'zl_hung'] }]);
    const t = await tenant();
    const conv = await t.conversation.findUniqueOrThrow({ where: { id: r.conversationId! } });
    expect(conv).toMatchObject({ kind: 'group', externalThreadId: r.providerGroupId, title: 'Khách VIP' });
    expect((await t.conversationParticipant.findMany({ where: { conversationId: conv.id } })).map((p) => p.externalId).sort()).toEqual(['zl_hung', 'zl_lan']);
    const dto = groupRequestSchema.parse((await get(`/conversation-groups/${id}`)).body.data);
    expect(dto).toMatchObject({ status: 'succeeded', conversation_id: conv.id, members: [{ name: 'Chị Lan', result: 'added' }, { name: 'Anh Hùng', result: 'added' }] });
    expect(await t.actionLog.count({ where: { actionId: 'channel.group_result', source: 'system' } })).toBeGreaterThan(0);
  });

  it('tin nhóm về trước kết quả → vẫn một hội thoại (unique tài khoản + id nhóm)', async () => {
    const t = await tenant();
    const gid = `${session().ownId}-g${session().groups.length + 1}`;
    await t.conversation.create({ data: { id: uuidv7(), channelAccountId: acc, channelType: 'zalo_personal', kind: 'group', externalThreadId: gid, title: 'Nhóm từ tin vào', lastMessageAt: h.clock.now() } });
    const id = await create('Nhóm đua');
    expect(await until(async () => (await req(id)).status === 'succeeded')).toBe(true);
    expect(await t.conversation.count({ where: { channelAccountId: acc, externalThreadId: gid } })).toBe(1);
    expect((await req(id)).conversationId).toBe((await t.conversation.findFirstOrThrow({ where: { externalThreadId: gid } })).id);
  });

  it('đã attempt rồi sập (running) → unknown, KHÔNG gọi Zalo lần hai', async () => {
    const t = await tenant();
    const id = uuidv7();
    const before = session().groups.length;
    await t.conversationGroupRequest.create({ data: { id, channelAccountId: acc, name: 'Sập giữa chừng', participants: [], payloadDigest: 'x', status: 'running', attemptedAt: h.clock.now() } });
    const groups = runtime().groups as GroupCreators;
    const adapter = ch.get<ChannelRegistry>(CHANNEL_REGISTRY, { strict: false }).get('zalo_personal')!.adapter!;
    expect(await groups.run(acc, adapter, { ws: h.ws, request_id: id })).toBe('unknown');
    expect((await req(id)).status).toBe('unknown');
    expect(session().groups.length).toBe(before);
  });

  it('Zalo treo quá hạn → unknown (không đoán id nhóm); preview lần sau cảnh báo previous_unknown', async () => {
    session().groupMode = 'hang';
    const groups = runtime().groups as GroupCreators;
    (groups as unknown as { d: { timeoutMs: number } }).d.timeoutMs = 300;
    const id = await create('Nhóm treo', [convs[0]!]);
    expect(await until(async () => (await req(id)).status === 'unknown')).toBe(true);
    expect((await req(id)).providerGroupId).toBeNull();
    (groups as unknown as { d: { timeoutMs?: number } }).d.timeoutMs = undefined;
    const pv = await act('conversation.create_group', { channel_account_id: acc, name: 'Nhóm treo', conversation_ids: [convs[0]] }, { 'x-action-source': 'assistant' });
    expect(pv.body.data.preview.warnings).toEqual(['invites_customers', 'previous_unknown']);
  });

  it('offline (mất phiên) → request vẫn queued, không gọi Zalo', async () => {
    await runtime().sessions!.drop(acc);
    const before = fakeZaloTransport.session(acc)?.groups.length ?? 0;
    await (await tenant()).channelAccount.update({ where: { id: acc }, data: { status: 'connected' } });
    const id = await create('Nhóm offline', [convs[1]!]);
    await new Promise((r) => setTimeout(r, 1500));
    expect((await req(id)).status).toBe('queued');
    expect(fakeZaloTransport.session(acc)?.groups.length ?? 0).toBe(before);
  });

  it('scope: sales không phải người yêu cầu, không thấy hội thoại nguồn → 404; HTTP không gọi được channel.group_result', async () => {
    const id = (await (await tenant()).conversationGroupRequest.findFirstOrThrow({ where: { name: 'Khách VIP' } })).id;
    expect((await get(`/conversation-groups/${id}`, sales)).status).toBe(404);
    const r = await act('channel.group_result', { request_id: id, outcome: 'failed' });
    expect([r.status, r.body.error.code]).toEqual([403, 'FORBIDDEN']);
    const sys = await act('channel.group_result', { request_id: id, outcome: 'failed' }, { 'x-action-source': 'system' });
    expect(sys.status).toBe(422);
    expect((await req(id)).status).toBe('succeeded');
  });
});

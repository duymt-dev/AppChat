// TIP-014 AC3–AC10 trên Postgres 16 + Memurai: API thật + worker ROLE=channels thật (cùng process, ZALO_TRANSPORT=fake — Q-003)
// + worker ROLE=jobs (relay outbox → thông báo `channel_down`). QR → quét → connected + lease, hạn mức gói, trang Kênh, quản lý,
// tin vào, gửi (limiter / cap / tự tạm dừng), hết phiên → expired + thông báo → kết nối lại, ngắt.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry } from '@appchat/db';
import { fakeZaloTransport } from '@appchat/channels';
import {
  CHANNEL_INBOUND_QUEUE,
  CLOCK,
  CHANNELS_RUNTIME,
  ChannelSendQueue,
  ChannelsJobsModule,
  KernelModule,
  LOGGER,
  MemoryRealtimeEmitter,
  REALTIME_EMITTER,
  createLogger,
  decryptSecret,
  leaseKey,
  parseEncKey,
  registerSendResultSink,
  unregisterSendResultSink,
  uuidv7,
  type SendResult,
} from '@appchat/core';
import { channelAccountStatsSchema, channelLoginStateSchema, settingsChannelListSchema } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';
import { startWorker, until, type WorkerHarness } from './worker.harness';

const chEnv = { ...env, LOG_LEVEL: 'silent', ZALO_TRANSPORT: 'fake', CHANNEL_SEND_JITTER: '0' };

let h: Harness;
let jobs: WorkerHarness;
let ch: TestingModule;
let resolver: TenantDbResolver;
let redis: IORedis;
let inbound: Queue;
let sendQ: ChannelSendQueue;
let sales: { id: string; token: string };
const emitter = new MemoryRealtimeEmitter();
const results: SendResult[] = [];

beforeAll(async () => {
  h = await startApi();
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  redis = new IORedis(env.REDIS_URL!);
  fakeZaloTransport.reset();
  fakeZaloTransport.scanAfterMs = 300;
  ch = await Test.createTestingModule({ imports: [KernelModule.forRoot(chEnv), ChannelsJobsModule] })
    .overrideProvider(LOGGER)
    .useValue(createLogger({ level: 'silent' }))
    .overrideProvider(REALTIME_EMITTER)
    .useValue(emitter)
    // Cùng đồng hồ cố định với API + relay (relay chỉ lấy event available_at ≤ now).
    .overrideProvider(CLOCK)
    .useValue(h.clock)
    .compile();
  await ch.init();
  jobs = await startWorker(h.platform, { clock: h.clock });
  inbound = new Queue(CHANNEL_INBOUND_QUEUE, { connection: redis.duplicate() });
  sendQ = new ChannelSendQueue(redis.duplicate());
  registerSendResultSink('test', async (r) => void results.push(r));
});
afterAll(async () => {
  unregisterSendResultSink('test');
  await sendQ?.close();
  await inbound?.obliterate({ force: true }).catch(() => undefined);
  await inbound?.close();
  await ch?.close();
  await jobs?.close();
  await redis?.quit();
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, headers).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const account = async (id: string) => (await tenant()).channelAccount.findUniqueOrThrow({ where: { id } });
const route = (id: string) => h.platform.tenantChannelRoute.findUnique({ where: { channelAccountId: id } });
const sessions = () => ch.get(CHANNELS_RUNTIME).runtime.sessions!;
const zalo = async () => (await get('/settings/channels')).body.data.find((c: { type: string }) => c.type === 'zalo_personal');

/** Kết nối một tài khoản Zalo giả tới `connected` (QR tự quét sau 300 ms). */
async function connect(label?: string): Promise<string> {
  const r = await act('channel.zalo.start_login', label ? { label } : {});
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  const id = r.body.data.result.channel_account_id as string;
  expect(await until(async () => (await account(id)).status === 'connected')).toBe(true);
  expect(await until(() => sessions().isHeld(id))).toBe(true);
  return id;
}

let A: string;

describe('kết nối Zalo cá nhân', () => {
  it('AC3 start_login → connecting + route; QR (Redis + WS) → quét → connected, credential mã hoá, lease, outbox channel.connected', async () => {
    fakeZaloTransport.autoScan = false;
    const r = await act('channel.zalo.start_login', { label: 'Zalo bán hàng' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    A = r.body.data.result.channel_account_id;
    expect(r.body.data.result.qr).toBe(`/settings/channels/${A}/login`);
    expect(await account(A)).toMatchObject({ type: 'zalo_personal', name: 'Zalo bán hàng', status: 'connecting' });
    expect(await route(A)).toMatchObject({ workspaceId: h.ws, type: 'zalo_personal', status: 'connecting' });

    expect(await until(async () => (await get(`/settings/channels/${A}/login`)).body.data?.status === 'waiting')).toBe(true);
    const st = channelLoginStateSchema.parse((await get(`/settings/channels/${A}/login`)).body.data);
    expect(st.qr?.length).toBeGreaterThan(20);
    expect(emitter.sent.find((e) => e.event === 'channel.zalo.qr')).toMatchObject({ ws: h.ws, rooms: [`user:${h.user}`], data: { account_id: A, qr_png_base64: st.qr } });

    expect(fakeZaloTransport.scan(A)).toBe(true);
    expect(await until(async () => (await account(A)).status === 'connected')).toBe(true);
    const row = await account(A);
    expect(row.name).toBe('Zalo bán hàng');
    expect(row.externalId).toMatch(/^zl_/);
    const creds = JSON.parse(decryptSecret(row.credentialsEnc!, parseEncKey(env.APP_ENC_KEY!))) as { imei: string };
    expect(creds.imei).toBe(row.externalId);
    expect(JSON.stringify((await get('/settings/channels')).body)).not.toMatch(/secret-zl_|zpw_sek/);
    const logs = await (await tenant()).actionLog.findMany({ where: { actionId: 'channel.zalo.start_login' } });
    expect(JSON.stringify(logs)).not.toMatch(/secret-zl_|zpw_sek/);
    expect(await route(A)).toMatchObject({ status: 'connected', externalId: row.externalId });
    expect((await (await tenant()).outboxEvent.findMany({ where: { topic: 'channel.connected' } })).map((e) => (e.payload as { channel_account_id: string }).channel_account_id)).toContain(A);
    expect(await until(() => sessions().isHeld(A))).toBe(true);
    expect(await redis.exists(leaseKey(A))).toBe(1);
    expect((await get(`/settings/channels/${A}/login`)).body.data.status).toBe('connected');
    fakeZaloTransport.autoScan = true;
  });

  it('AC4 hạn mức gói: Miễn phí 1 kênh, đã có 1 → 402 PLAN_LIMIT_REACHED; sales → 403', async () => {
    const free = await h.platform.plan.findUniqueOrThrow({ where: { key: 'free' } });
    const sub = await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: free.id, status: 'active', currentPeriodStart: h.clock.now() } });
    const r = await act('channel.zalo.start_login', {});
    expect(r).toMatchObject({ status: 402, body: { error: { code: 'PLAN_LIMIT_REACHED', fields: { resource: 'channels', limit: '1' } } } });
    expect((await act('channel.zalo.start_login', {}, as(sales))).status).toBe(403);
    expect((await get('/settings/channels', sales)).status).toBe(403);
    // Gói Team (5 kênh) cho phần còn lại.
    const team = await h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
    await h.platform.subscription.update({ where: { id: sub.id }, data: { planId: team.id } });
  });

  it('AC5 /settings/channels khớp schema FE: 16 loại theo thứ tự, Zalo có tài khoản, lọc on / off; stats 7 ngày; id lạ 404', async () => {
    const list = settingsChannelListSchema.parse((await get('/settings/channels')).body.data);
    expect(list).toHaveLength(16);
    expect(list.map((c) => c.type).slice(0, 3)).toEqual(['zalo_oa', 'zalo_personal', 'facebook']);
    const z = list.find((c) => c.type === 'zalo_personal')!;
    expect(z).toMatchObject({ available: true, connected: true, health: 'good', account: 'Zalo bán hàng', convs: 0, frt: '—' });
    expect(z.accounts[0]).toMatchObject({ id: A, connected: true, health: 'good', ai_mode: 'auto', assign_mode: 'round_robin', history_days: 30, paused: false, sync_messages: true });
    expect(list.find((c) => c.type === 'facebook')).toMatchObject({ available: false, accounts: [], connected: false, health: 'off' });
    expect(list.find((c) => c.type === 'email')).toMatchObject({ available: true, connected: false });
    expect((await get('/settings/channels?filter=on')).body.data.map((c: { type: string }) => c.type)).toEqual(['zalo_personal']);
    expect((await get('/settings/channels?filter=off')).body.data).toHaveLength(15);

    const db = await tenant();
    const today = new Date(Date.UTC(2026, 9, 30));
    await db.channelAccountStatDaily.create({ data: { channelAccountId: A, day: today, convs: 12, frtSum: 720n, frtCount: 10 } });
    const s = channelAccountStatsSchema.parse((await get(`/settings/channels/${A}/stats?days=7`)).body.data);
    expect(s.days).toHaveLength(7);
    expect(s.days[6]).toEqual({ day: 6, convs: 12, frt_sec: 72 });
    expect(s.total_convs).toBe(12);
    expect((await zalo()).accounts[0]).toMatchObject({ convs: 12, frt: "1'12" });
    expect((await get(`/settings/channels/${uuidv7()}/stats`)).status).toBe(404);
    expect((await get('/settings/channels/abc/stats')).status).toBe(404);
  });

  it('AC6 update_settings / pause / resume / sync_history / test', async () => {
    const u = await act('channel.update_settings', { channel_account_id: A, patch: { name: 'Zalo CSKH', agent_id: 'ag_1', ai_mode: 'suggest', hours: '08:00–21:00', greeting: 'Xin chào', assign_mode: 'least_busy', sla_policy: 'VIP', sync_auto_create_contact: false } });
    expect(u.status, JSON.stringify(u.body)).toBe(200);
    expect((await zalo()).accounts[0]).toMatchObject({ name: 'Zalo CSKH', agent_id: 'ag_1', ai_mode: 'suggest', hours: '08:00–21:00', greeting: 'Xin chào', assign_mode: 'least_busy', sla_policy: 'VIP', sync_auto_create_contact: false });
    expect((await act('channel.update_settings', { channel_account_id: A, patch: { agent_id: '' } })).status).toBe(200);
    expect((await zalo()).accounts[0].agent_id).toBeUndefined();

    expect((await act('channel.test', { channel_account_id: A })).body.data.result).toEqual({ ok: true, message: 'Kết nối hoạt động bình thường' });

    expect((await act('channel.pause', { channel_account_id: A })).status).toBe(200);
    expect((await zalo()).accounts[0]).toMatchObject({ paused: true, health: 'off' });
    expect((await zalo()).connected).toBe(true);
    expect(await route(A)).toMatchObject({ status: 'paused' });
    expect(await until(() => !sessions().isHeld(A))).toBe(true);
    expect(await redis.exists(leaseKey(A))).toBe(0);
    expect((await act('channel.test', { channel_account_id: A })).body.data.result.ok).toBe(false);

    expect((await act('channel.resume', { channel_account_id: A })).status).toBe(200);
    expect(await route(A)).toMatchObject({ status: 'connected' });
    expect(await until(() => sessions().isHeld(A))).toBe(true);
    expect((await zalo()).accounts[0]).toMatchObject({ paused: false, health: 'good' });

    const s = fakeZaloTransport.session(A)!;
    s.history = [{ isGroup: false, isSelf: false, threadId: 'u_old', msgId: 'h1', uidFrom: 'u_old', ts: String(Date.now() - 86_400_000), msgType: 'webchat', content: 'tin cũ' }];
    expect((await act('channel.sync_history', { channel_account_id: A, history_days: 7 })).status).toBe(200);
    expect((await zalo()).accounts[0].history_days).toBe(7);
    expect(await until(async () => !!(await inbound.getJob(`in-${A}-h1`)))).toBe(true);
  });

  it('AC7 tin vào → job channel-inbound (NormalizedInbound); trùng msgId không thêm job; last_event_at cập nhật', async () => {
    const s = fakeZaloTransport.session(A)!;
    s.inject({ msgId: 'm100', uidFrom: 'u_lan', threadId: 'u_lan', dName: 'Lan', text: 'Shop còn size M không?' });
    s.inject({ msgId: 'm100', uidFrom: 'u_lan', threadId: 'u_lan', dName: 'Lan', text: 'Shop còn size M không?' });
    s.inject({ msgId: 'g1', isGroup: true, threadId: 'grp', uidFrom: 'u_b', text: '@shop báo giá', mentions: [{ uid: s.ownId }] });
    expect(await until(async () => !!(await inbound.getJob(`in-${A}-g1`)))).toBe(true);
    const j = await inbound.getJob(`in-${A}-m100`);
    expect(j?.data).toMatchObject({ ws: h.ws, message: { channelAccountId: A, externalThreadId: 'u_lan', externalMsgId: 'm100', kind: 'text', text: 'Shop còn size M không?', sender: { externalId: 'u_lan', name: 'Lan' } } });
    expect((await inbound.getJob(`in-${A}-g1`))?.data.message).toMatchObject({ isGroup: true, mentionsMe: true });
    expect((await inbound.getJobs(['waiting', 'delayed', 'active', 'completed', 'failed'])).filter((x) => x.id === `in-${A}-m100`)).toHaveLength(1);
    expect((await account(A)).lastEventAt).not.toBeNull();
  });

  it('AC8 gửi qua hàng đợi tài khoản: chữ (rich text) → sink ok; ref trùng gửi 1 lần; 3 lỗi bất thường → tự tạm dừng + channel_down', async () => {
    const s = fakeZaloTransport.session(A)!;
    await sendQ.enqueue({ ws: h.ws, account_id: A, ref_id: 'r1', message: { externalThreadId: 'u_lan', kind: 'text', text: 'Dạ còn **size M** ạ' } });
    await sendQ.enqueue({ ws: h.ws, account_id: A, ref_id: 'r1', message: { externalThreadId: 'u_lan', kind: 'text', text: 'Dạ còn **size M** ạ' } });
    expect(await until(() => results.some((r) => r.ref_id === 'r1'))).toBe(true);
    await new Promise((r) => setTimeout(r, 300));
    expect(results.filter((r) => r.ref_id === 'r1')).toEqual([{ ok: true, ws: h.ws, account_id: A, ref_id: 'r1', external_msg_id: s.sent.at(-1)!.id }]);
    expect(s.sent.filter((x) => x.msg === 'Dạ còn size M ạ')).toHaveLength(1);
    expect(s.sent.at(-1)!.styles).toEqual([{ start: 7, len: 6, st: 'b' }]);

    s.failNext = 3;
    for (const ref of ['f1', 'f2', 'f3']) await sendQ.enqueue({ ws: h.ws, account_id: A, ref_id: ref, message: { externalThreadId: 'u_lan', kind: 'text', text: 'x' } });
    expect(await until(async () => !!(await account(A)).pausedAt, 30_000)).toBe(true);
    expect(results.filter((r) => !r.ok).length).toBeGreaterThanOrEqual(3);
    expect(await route(A)).toMatchObject({ status: 'paused' });
    const ev = (await (await tenant()).outboxEvent.findMany({ where: { topic: 'channel.status_changed' } })).map((e) => e.payload as { reason?: string });
    expect(ev.some((p) => p.reason === 'send_errors')).toBe(true);
    expect(await until(async () => (await (await tenant()).notification.count({ where: { userId: h.user, type: 'channel_down' } })) >= 1)).toBe(true);
    expect((await act('channel.resume', { channel_account_id: A })).status).toBe(200);
    expect(await until(() => sessions().isHeld(A))).toBe(true);
  }, 60_000);

  it('AC9 bị đá phiên → expired + route + channel_down; reconnect → QR mới → connected', async () => {
    const before = await (await tenant()).notification.count({ where: { userId: h.user, type: 'channel_down' } });
    fakeZaloTransport.session(A)!.kick();
    expect(await until(async () => (await account(A)).status === 'expired')).toBe(true);
    expect(await route(A)).toMatchObject({ status: 'expired' });
    expect((await zalo()).accounts[0]).toMatchObject({ connected: false, health: 'down' });
    expect((await act('channel.test', { channel_account_id: A })).body.data.result).toMatchObject({ ok: false });
    expect(await until(async () => (await (await tenant()).notification.count({ where: { userId: h.user, type: 'channel_down' } })) > before)).toBe(true);
    const n = await (await tenant()).notification.findFirst({ where: { userId: h.user, type: 'channel_down' }, orderBy: { createdAt: 'desc' } });
    expect(n).toMatchObject({ title: 'Kênh Zalo CSKH bị ngắt kết nối', link: '/settings/channels' });

    const r = await act('channel.reconnect', { channel_account_id: A });
    expect(r.body.data?.result, JSON.stringify(r.body)).toEqual({ channel_account_id: A, status: 'connecting' });
    expect(await until(async () => (await account(A)).status === 'connected')).toBe(true);
    expect(await until(() => sessions().isHeld(A))).toBe(true);
    expect((await zalo()).accounts).toHaveLength(1);
  }, 60_000);

  it('AC10 disconnect → disconnected, credential xoá, phiên dừng, biến khỏi list; tài khoản cuối → kênh Chưa kết nối; ngắt lần 2 404', async () => {
    const B = await connect();
    expect((await account(B)).name).toBe('Zalo thử nghiệm · 0909 000 111');
    expect((await zalo()).accounts.map((a: { id: string }) => a.id)).toEqual([A, B]);
    expect((await act('channel.disconnect', { channel_account_id: B })).status).toBe(200);
    expect(await account(B)).toMatchObject({ status: 'disconnected', credentialsEnc: null });
    expect(await until(() => !sessions().isHeld(B))).toBe(true);
    expect(await route(B)).toMatchObject({ status: 'disconnected' });
    expect((await zalo()).accounts.map((a: { id: string }) => a.id)).toEqual([A]);
    expect((await act('channel.disconnect', { channel_account_id: A })).status).toBe(200);
    expect(await zalo()).toMatchObject({ connected: false, accounts: [], health: 'off' });
    expect((await act('channel.disconnect', { channel_account_id: A })).status).toBe(404);
    expect((await get(`/settings/channels/${A}/login`)).status).toBe(404);
    expect((await act('channel.test', { type: 'email', fields: { imap_host: 'imap.gmail.com' } })).body.error).toMatchObject({ code: 'NOT_IMPLEMENTED', fields: { tip: '018' } });
  }, 60_000);
});


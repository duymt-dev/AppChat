// TIP-017 AC1–AC6 trên Postgres 16 + Memurai: API thật (Socket.IO `/widget` thật qua socket.io-client) + worker ROLE=channels
// (inbound pipeline, worker gửi cho tài khoản không lease, adapter webchat qua redis-emitter) + ROLE=jobs. Bật widget → khách web
// nối từ trang nhúng → pre-chat → nhắn → hội thoại webchat ở Hộp thư → trả lời → khách nhận realtime; tạm dừng / ngắt / hạn mức.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry } from '@appchat/db';
import { CHANNELS_RUNTIME, CLOCK, ChannelsJobsModule, InboxJobsModule, KernelModule, LOGGER, MemoryRealtimeEmitter, REALTIME_EMITTER, createLogger, uuidv7 } from '@appchat/core';
import { visitorHelloResult, widgetSettingsSchema } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';
import { startWorker, until, type WorkerHarness } from './worker.harness';

const chEnv = { ...env, LOG_LEVEL: 'silent', CHANNEL_SEND_JITTER: '0', ZALO_TRANSPORT: 'fake' };

let h: Harness;
let jobs: WorkerHarness;
let ch: TestingModule;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
const emitter = new MemoryRealtimeEmitter();
const open: Socket[] = [];

beforeAll(async () => {
  h = await startApi();
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  ch = await Test.createTestingModule({ imports: [KernelModule.forRoot(chEnv), ChannelsJobsModule, InboxJobsModule] })
    .overrideProvider(LOGGER)
    .useValue(createLogger({ level: 'silent' }))
    .overrideProvider(REALTIME_EMITTER)
    .useValue(emitter)
    .overrideProvider(CLOCK)
    .useValue(h.clock)
    .compile();
  await ch.init();
  jobs = await startWorker(h.platform, { clock: h.clock, emitter });
});
afterAll(async () => {
  open.forEach((s) => s.disconnect());
  await ch?.close();
  await jobs?.close();
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const idem = () => ({ 'idempotency-key': uuidv7() });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, headers).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const stateless = () => ch.get(CHANNELS_RUNTIME).runtime.stateless!;

type Got = { event: string; data: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
type Ack = { data?: any; error?: { code: string; fields?: Record<string, string> } }; // eslint-disable-line @typescript-eslint/no-explicit-any

async function visitor(opts: { key?: string; token?: string; origin?: string } = {}): Promise<{ s: Socket; got: Got[] }> {
  const s = io(`${h.base}/widget`, {
    auth: { public_key: opts.key ?? key, ...(opts.token ? { visitor_token: opts.token } : {}) },
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
    extraHeaders: { origin: opts.origin ?? 'https://spa.vn' },
  });
  open.push(s);
  const got: Got[] = [];
  s.onAny((event, data) => got.push({ event, data }));
  await new Promise<void>((resolve, reject) => {
    s.once('connect', () => resolve());
    s.once('connect_error', (e) => reject(e));
  });
  return { s, got };
}
const refused = (opts: Parameters<typeof visitor>[0]) =>
  visitor(opts).then(
    () => 'connected',
    (e: Error & { data?: { code: string } }) => e.data?.code ?? e.message,
  );
const ack = (s: Socket, ev: string, p: unknown) => s.timeout(8000).emitWithAck(ev, p) as Promise<Ack>;

let key: string;
let acc: string;
let token: string;
let visitorId: string;

describe('cài đặt widget', () => {
  it('AC1 migration 017: bảng + unique + FK', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename IN ('webchat_widget','webchat_visitor')`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['webchat_widget_public_key_key', 'webchat_widget_channel_account_id_key', 'webchat_visitor_channel_account_id_created_at_idx']));
    const fk = await db.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM pg_constraint WHERE contype = 'f' AND conrelid::regclass::text IN ('webchat_widget','webchat_visitor')`;
    expect(Number(fk[0]!.n)).toBe(2);
  });

  it('AC2 chưa bật → mặc định; sales 403; bật → tài khoản webchat + route + mã nhúng; cấu hình phản ánh ở GET', async () => {
    const before = await get('/settings/widget');
    expect(before.status).toBe(200);
    expect(widgetSettingsSchema.parse(before.body.data)).toMatchObject({ enabled: false, public_key: null, embed: '', channel_account_id: null });
    expect((await get('/settings/widget', sales)).status).toBe(403);
    expect((await act('webchat.update_widget', { name: 'X' }, as(sales))).status).toBe(403);

    const r = await act('webchat.update_widget', { name: 'Trợ lý Hương Sen', allowed_domains: ['spa.vn', '*.spa.vn'] });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    ({ channel_account_id: acc, public_key: key } = r.body.data.result);
    expect(key).toMatch(/^wk_/);
    const w = widgetSettingsSchema.parse((await get('/settings/widget')).body.data);
    expect(w).toMatchObject({ enabled: true, name: 'Trợ lý Hương Sen', public_key: key, channel_account_id: acc, allowed_domains: ['spa.vn', '*.spa.vn'], kpis: { running: 1, total: 1 } });
    expect(w.embed).toContain(`data-key="${key}"`);
    expect(await h.platform.tenantWidgetRoute.findUnique({ where: { publicKey: key } })).toMatchObject({ workspaceId: h.ws, allowedDomains: ['spa.vn', '*.spa.vn'] });
    expect(await h.platform.tenantChannelRoute.findUnique({ where: { channelAccountId: acc } })).toMatchObject({ type: 'webchat', status: 'connected' });
    const ch1 = (await get('/settings/channels')).body.data.find((c: { type: string }) => c.type === 'webchat');
    expect(ch1).toMatchObject({ connected: true, accounts: [{ id: acc, name: 'Trợ lý Hương Sen', health: 'good' }] });

    const u = await act('webchat.update_widget', { greeting: 'Chào bạn 👋', prechat: true, color: '#2563eb', actions: [{ key: 'order', on: true }, { key: 'faq', on: false }], handoff: 80, tone: 'professional' });
    expect(u.status).toBe(200);
    expect(u.body.data.result.public_key).toBe(key);
    expect(widgetSettingsSchema.parse((await get('/settings/widget')).body.data)).toMatchObject({
      greeting: 'Chào bạn 👋',
      color: '#2563EB',
      prechat: true,
      handoff: 80,
      tone: 'professional',
      actions: [{ key: 'order', on: true }, { key: 'faq', on: false }],
    });
    const t = await act('channel.test', { channel_account_id: acc });
    expect(t.body.data.result.ok).toBe(true);
    // Worker channels mở worker gửi cho tài khoản không lease.
    expect(await until(() => stateless().isOpen(acc))).toBe(true);
  });

  it('AC2 hạn mức gói: gói Miễn phí 1 kênh — widget đã chiếm, thêm Zalo → 402', async () => {
    const r = await act('channel.zalo.start_login', { label: 'Zalo 2' });
    expect(r.status).toBe(402);
    expect(r.body.error).toMatchObject({ code: 'PLAN_LIMIT_REACHED', fields: { resource: 'channels' } });
  });
});

describe('socket /widget', () => {
  it('AC3 key sai / Origin ngoài allowed_domains → từ chối; tên miền con được', async () => {
    expect(await refused({ key: 'wk_khongtontai12345' })).toBe('NOT_FOUND');
    expect(await refused({ key: 'abc' })).toBe('NOT_FOUND');
    expect(await refused({ origin: 'https://evil.vn' })).toBe('FORBIDDEN');
    expect(await refused({ origin: 'https://www.spa.vn' })).toBe('connected');
  });

  it('AC3 + AC4 hello → token; pre-chat chưa khai → chặn gửi; khai → gửi → khách + hội thoại webchat ở Hộp thư; trùng client_id một tin', async () => {
    const { s } = await visitor();
    const r1 = await ack(s, 'visitor.hello', { page_url: 'https://spa.vn/gia' });
    const h1 = visitorHelloResult.parse(r1.data);
    expect(h1).toMatchObject({ ready: false, config: { name: 'Trợ lý Hương Sen', greeting: 'Chào bạn 👋', color: '#2563EB', prechat: { enabled: true, fields: ['name', 'phone'] } }, messages: [] });
    const blocked = await ack(s, 'message.send', { client_id: 'cid-aaaaaaaa', text: 'Hi' });
    expect(blocked.error).toMatchObject({ code: 'VALIDATION_FAILED', fields: { prechat: 'required' } });
    expect((await ack(s, 'message.send', { client_id: 'x', text: 'Hi' })).error?.code).toBe('VALIDATION_FAILED');

    const r2 = visitorHelloResult.parse((await ack(s, 'visitor.hello', { name: 'Chị Mai', phone: '0901 234 567', email: 'Mai@Spa.vn' })).data);
    expect(r2.ready).toBe(true);
    expect(r2.visitor_id).toBe(h1.visitor_id);
    ({ visitor_token: token, visitor_id: visitorId } = r2);
    const sent = await ack(s, 'message.send', { client_id: 'cid-00000001', text: 'Cho em hỏi giá gội đầu dưỡng sinh' });
    expect(sent.data).toMatchObject({ id: 'cid-00000001' });
    await ack(s, 'message.send', { client_id: 'cid-00000001', text: 'Cho em hỏi giá gội đầu dưỡng sinh' });

    const db = await tenant();
    expect(await until(async () => !!(await db.conversation.findFirst({ where: { channelAccountId: acc, externalThreadId: visitorId } })))).toBe(true);
    const conv = (await db.conversation.findFirst({ where: { channelAccountId: acc, externalThreadId: visitorId } }))!;
    expect(conv).toMatchObject({ channelType: 'webchat', kind: 'direct', lastMessagePreview: 'Cho em hỏi giá gội đầu dưỡng sinh' });
    expect(await db.contact.findUniqueOrThrow({ where: { id: conv.contactId! } })).toMatchObject({ name: 'Chị Mai', phoneNorm: '0901234567', email: 'mai@spa.vn', source: 'website' });
    await new Promise((r) => setTimeout(r, 500));
    expect(await db.message.count({ where: { conversationId: conv.id } })).toBe(1);
    const list = await get('/conversations?channel=webchat');
    expect(list.body.data).toEqual([expect.objectContaining({ id: conv.id, channel: 'webchat', title: 'Chị Mai' })]);
    expect(widgetSettingsSchema.parse((await get('/settings/widget')).body.data).kpis).toMatchObject({ clicks: 1, chats: 1 });
  });

  it('AC5 trả lời ở Hộp thư → khách nhận message.new, tin sent; kết nối lại bằng token → cùng khách + lịch sử hai chiều', async () => {
    const { s, got } = await visitor({ token });
    const h2 = visitorHelloResult.parse((await ack(s, 'visitor.hello', {})).data);
    expect(h2).toMatchObject({ visitor_id: visitorId, ready: true });
    expect(h2.messages.map((m) => [m.direction, m.id, m.text])).toEqual([['in', 'cid-00000001', 'Cho em hỏi giá gội đầu dưỡng sinh']]);

    const db = await tenant();
    const conv = (await db.conversation.findFirst({ where: { channelAccountId: acc, externalThreadId: visitorId } }))!;
    const r = await act('message.send', { conversation_id: conv.id, text: 'Dạ gói gội đầu dưỡng sinh **300k** ạ' }, idem());
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(await until(() => got.some((g) => g.event === 'message.new'))).toBe(true);
    const m = got.find((g) => g.event === 'message.new')!.data;
    expect(m).toMatchObject({ direction: 'out', text: 'Dạ gói gội đầu dưỡng sinh **300k** ạ' });
    expect(await until(async () => (await db.message.findUniqueOrThrow({ where: { id: r.body.data.result.message_id } })).status === 'sent')).toBe(true);
    expect((await db.message.findUniqueOrThrow({ where: { id: r.body.data.result.message_id } })).externalMsgId).toBe(m.id);

    const { s: s3 } = await visitor({ token });
    const h3 = visitorHelloResult.parse((await ack(s3, 'visitor.hello', {})).data);
    expect(h3.messages.map((x) => [x.direction, x.id])).toEqual([['in', 'cid-00000001'], ['out', m.id]]);
  });

  it('AC4 vượt rate-limit gửi → RATE_LIMITED', async () => {
    const { s } = await visitor({ token });
    await ack(s, 'visitor.hello', {});
    let last: Ack = {};
    for (let i = 0; i < 21; i++) last = await ack(s, 'message.send', { client_id: `cid-rate-${String(i).padStart(4, '0')}`, text: `tin ${i}` });
    expect(last.error?.code).toBe('RATE_LIMITED');
  });

  it('AC6 tắt widget → khách mới bị từ chối, gửi ra 409; bật lại chạy; ngắt → ngoại tuyến; bật lại dùng lại tài khoản + key', async () => {
    expect((await act('webchat.update_widget', { enabled: false })).status).toBe(200);
    expect(widgetSettingsSchema.parse((await get('/settings/widget')).body.data).enabled).toBe(false);
    expect(await refused({ token })).toBe('INVALID_STATE');
    const db = await tenant();
    const conv = (await db.conversation.findFirst({ where: { channelAccountId: acc, externalThreadId: visitorId } }))!;
    const r = await act('message.send', { conversation_id: conv.id, text: 'Alo' }, idem());
    expect(r.status).toBe(409);
    expect((await act('channel.test', { channel_account_id: acc })).body.data.result.ok).toBe(false);

    expect((await act('webchat.update_widget', { enabled: true })).status).toBe(200);
    expect(await refused({ token })).toBe('connected');

    expect((await act('channel.disconnect', { channel_account_id: acc })).status).toBe(200);
    expect(await refused({ token })).toBe('INVALID_STATE');
    expect(widgetSettingsSchema.parse((await get('/settings/widget')).body.data)).toMatchObject({ enabled: false, channel_account_id: null, public_key: key });
    expect(await until(() => !stateless().isOpen(acc))).toBe(true);

    const again = await act('webchat.update_widget', { enabled: true });
    expect(again.status).toBe(200);
    expect(again.body.data.result).toMatchObject({ channel_account_id: acc, public_key: key });
    const { s } = await visitor({ token });
    expect(visitorHelloResult.parse((await ack(s, 'visitor.hello', {})).data)).toMatchObject({ visitor_id: visitorId, ready: true });
  });

  it('GET /widget.js ngoài /v1: 200 JS hoặc 404 khi chưa build', async () => {
    const r = await fetch(`${h.base}/widget.js`);
    expect([200, 404]).toContain(r.status);
    if (r.status === 200) expect(r.headers.get('content-type')).toContain('javascript');
  });
});

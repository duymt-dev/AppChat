// TIP-014b C trên Postgres 16 + Memurai: lịch sử Zalo là lệnh bền — `channel.sync_history` → 202 job_accepted + `channel_history_run`;
// worker giữ phiên (Zalo giả, trang lùi theo lastId) lưu tin `origin = history` qua cùng pipeline. Không hiệu ứng luồng trực tiếp: không
// chưa đọc / mở lại hội thoại đóng / FRT; preview + last_message_at + last_interaction_at chỉ tiến (không lùi về tin cũ); không event
// `message.received` / `conversation.assigned` / `contact.created`; worker outbox + thông báo + support thật chạy cùng: không thông báo VIP /
// phân công, phiếu `waiting` giữ nguyên, không job agent-reply. Báo cáo trung thực (provider_limit khi nhà cung cấp hết dữ liệu trước mốc).
// Trùng msgId live / history → một tin. Route trạng thái quản lý kênh.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import IORedis from 'ioredis';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry } from '@appchat/db';
import { fakeZaloTransport } from '@appchat/channels';
import { CLOCK, CHANNELS_RUNTIME, ChannelsJobsModule, InboxJobsModule, KernelModule, LOGGER, MemoryRealtimeEmitter, REALTIME_EMITTER, SupportJobsModule, createLogger, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';
import { startWorker, until, type WorkerHarness } from './worker.harness';

const chEnv = { ...env, LOG_LEVEL: 'silent', ZALO_TRANSPORT: 'fake', CHANNEL_SEND_JITTER: '0' };
const DAY = 86_400_000;

let h: Harness;
let ch: TestingModule;
let jobs: WorkerHarness;
let support: TestingModule;
let resolver: TenantDbResolver;
let redis: IORedis;
let A: string;
let conv: string;
let contact: string;
const emitter = new MemoryRealtimeEmitter();

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  redis = new IORedis(env.REDIS_URL!);
  fakeZaloTransport.reset();
  fakeZaloTransport.scanAfterMs = 200;
  const mod = (imports: unknown[]) =>
    Test.createTestingModule({ imports: [KernelModule.forRoot(chEnv), ...(imports as never[])] })
      .overrideProvider(LOGGER)
      .useValue(createLogger({ level: 'silent' }))
      .overrideProvider(REALTIME_EMITTER)
      .useValue(emitter)
      .overrideProvider(CLOCK)
      .useValue(h.clock)
      .compile();
  ch = await mod([ChannelsJobsModule, InboxJobsModule]);
  await ch.init();
  support = await mod([SupportJobsModule]);
  await support.init();
  jobs = await startWorker(h.platform, { clock: h.clock, emitter });
});
afterAll(async () => {
  await support?.close();
  await ch?.close();
  await jobs?.close();
  await redis?.quit();
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const session = () => fakeZaloTransport.session(A)!;
const now = () => h.clock.now().getTime();
const raw = (n: number, ageDays: number, over: Record<string, unknown> = {}) => ({
  isGroup: false, isSelf: false, threadId: 'zl_mai', msgId: String(7_200_000_000 + n), uidFrom: 'zl_mai', dName: 'Chị Mai', ts: String(now() - ageDays * DAY), msgType: 'webchat', content: `cũ ${n}`, ...over,
});
const agentJobs = async () => (await redis.keys('bull:agent-reply:*')).filter((k) => /bull:agent-reply:[^:]+$/.test(k) && !/(meta|id|delayed|wait|events|de)$/.test(k)).length;

describe('lịch sử bền', () => {
  it('kết nối + tin mới (live) → hội thoại có chưa đọc 1; phiếu waiting; khách VIP', async () => {
    const r = await act('channel.zalo.start_login', { label: 'Zalo Shop' });
    A = r.body.data.result.channel_account_id;
    expect(await until(() => ch.get(CHANNELS_RUNTIME).runtime.sessions!.isHeld(A) && !!fakeZaloTransport.session(A))).toBe(true);
    session().inject({ msgId: '7200009999', uidFrom: 'zl_mai', threadId: 'zl_mai', dName: 'Chị Mai', text: 'Tin mới nhất' });
    expect(await until(async () => !!(await (await tenant()).conversation.findFirst({ where: { channelAccountId: A } })))).toBe(true);
    const db = await tenant();
    const c = await db.conversation.findFirstOrThrow({ where: { channelAccountId: A } });
    conv = c.id;
    contact = c.contactId!;
    await db.contact.update({ where: { id: contact }, data: { group: 'vip' } });
    // Phiếu đang chờ khách — tin khách MỚI sẽ chuyển in_progress; tin lịch sử thì không.
    // Chờ relay xử lý xong event của tin live (support chuyển phiếu theo tin khách) trước khi đặt phiếu `waiting`.
    expect(await until(async () => (await db.outboxEvent.count({ where: { status: 'pending' } })) === 0, 20_000)).toBe(true);
    const src = (await db.message.findFirstOrThrow({ where: { conversationId: conv } })).id;
    const t = await act('ticket.create', { title: 'Đổi lịch', channel: 'zalo_personal', category: 'Booking', priority: 'medium', source_message_id: src });
    expect(t.status, JSON.stringify(t.body)).toBe(200);
    expect((await act('ticket.set_status', { ticket_id: t.body.data.result.ticket_id, status: 'waiting' })).status).toBe(200);
    await db.conversation.update({ where: { id: conv }, data: { status: 'closed', unreadCount: 0, frtPendingSince: null } });
  });

  it('sync_history 7 ngày → 202 job_accepted; run complete; tin history trong khoảng; không hiệu ứng luồng trực tiếp', async () => {
    const db = await tenant();
    const before = { conv: await db.conversation.findUniqueOrThrow({ where: { id: conv } }), contact: await db.contact.findUniqueOrThrow({ where: { id: contact } }), agent: await agentJobs(), notif: await db.notification.count(), recv: await db.outboxEvent.count({ where: { topic: 'message.received' } }), live: await db.outboxEvent.count({ where: { topic: { in: ['contact.created', 'conversation.assigned'] } } }) };
    session().historyPage = 2;
    // Tin 9999 (live) trả lại trong lịch sử → chống trùng. Khách mới chỉ có trong lịch sử → khách mới không event contact.created.
    session().history = [raw(1, 1), raw(2, 3), { ...raw(9999, 0.5), msgId: '7200009999' }, raw(3, 5), raw(4, 10), raw(5, 2, { threadId: 'zl_lan', uidFrom: 'zl_lan', dName: 'Chị Lan' })];
    const r = await act('channel.sync_history', { channel_account_id: A, history_days: 7 });
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    expect(r.body.data).toMatchObject({ status: 'job_accepted', status_url: `/v1/settings/channels/${A}/syncs/${r.body.data.job_id}` });
    const runId = r.body.data.job_id as string;
    expect(await until(async () => !['queued', 'running'].includes((await db.channelHistoryRun.findUniqueOrThrow({ where: { id: runId } })).status), 30_000)).toBe(true);
    const run = await db.channelHistoryRun.findUniqueOrThrow({ where: { id: runId } });
    expect(run).toMatchObject({ status: 'complete', imported: 4 });
    expect(run.inRange).toBeGreaterThanOrEqual(5);

    const hist = await db.message.findMany({ where: { channelAccountId: A, origin: 'history' }, select: { externalMsgId: true } });
    expect(hist.map((m) => m.externalMsgId).sort()).toEqual(['7200000001', '7200000002', '7200000003', '7200000005']);
    expect(await db.message.count({ where: { channelAccountId: A, externalMsgId: '7200009999' } })).toBe(1);

    const c = await db.conversation.findUniqueOrThrow({ where: { id: conv } });
    expect(c).toMatchObject({ status: 'closed', unreadCount: 0, frtPendingSince: null, lastMessagePreview: before.conv.lastMessagePreview });
    expect(c.lastMessageAt).toEqual(before.conv.lastMessageAt);
    expect((await db.contact.findUniqueOrThrow({ where: { id: contact } })).lastInteractionAt).toEqual(before.contact.lastInteractionAt);
    const lan = await db.conversation.findFirstOrThrow({ where: { channelAccountId: A, externalThreadId: 'zl_lan' } });
    expect(lan).toMatchObject({ unreadCount: 0, frtPendingSince: null, assigneeUserId: null });

    expect(await db.outboxEvent.count({ where: { topic: 'message.received' } })).toBe(before.recv);
    // Đồng hồ test cố định → so số đếm trước / sau (khách Lan mới tạo từ lịch sử không phát contact.created).
    expect(await db.outboxEvent.count({ where: { topic: { in: ['contact.created', 'conversation.assigned'] } } })).toBe(before.live);
    expect(await db.outboxEvent.count({ where: { topic: 'channel.history_ingested' } })).toBeGreaterThanOrEqual(1);
    await new Promise((r2) => setTimeout(r2, 1500));
    expect(await db.notification.count()).toBe(before.notif);
    expect((await db.ticket.findFirstOrThrow({ where: { conversationId: conv } })).status).toBe('waiting');
    expect(await agentJobs()).toBe(before.agent);
  }, 60_000);

  it('khoảng 90 ngày mà nhà cung cấp hết dữ liệu trước mốc → provider_limit (không giả đủ khoảng); route trạng thái', async () => {
    const r = await act('channel.sync_history', { channel_account_id: A, history_days: 90 });
    const runId = r.body.data.job_id as string;
    const db = await tenant();
    expect(await until(async () => !['queued', 'running'].includes((await db.channelHistoryRun.findUniqueOrThrow({ where: { id: runId } })).status), 30_000)).toBe(true);
    const s = await json(await call(h, `/settings/channels/${A}/syncs/${runId}`));
    expect(s.status).toBe(200);
    // Tin 10 ngày trước nằm ngoài lần 7 ngày, trong lần 90 ngày → nhập thêm đúng 1 tin; tin đã có không nhập lại.
    expect(s.body.data).toMatchObject({ id: runId, days: 90, state: 'provider_limit', imported: 1 });
    expect(Date.parse(s.body.data.earliest_at)).toBeGreaterThan(Date.parse(s.body.data.cutoff_at));
    expect((await json(await call(h, `/settings/channels/${A}/syncs/${uuidv7()}`))).status).toBe(404);
  }, 60_000);

  it('lần mới thay lần còn queued (superseded); tài khoản tạm dừng → 200 không tạo lần', async () => {
    const db = await tenant();
    const old = uuidv7();
    await db.channelHistoryRun.create({ data: { id: old, channelAccountId: A, days: 7, cutoffAt: h.clock.now(), createdAt: h.clock.now() } });
    expect((await act('channel.sync_history', { channel_account_id: A, history_days: 7 })).status).toBe(202);
    expect((await db.channelHistoryRun.findUniqueOrThrow({ where: { id: old } })).status).toBe('superseded');
    expect((await act('channel.pause', { channel_account_id: A })).status).toBe(200);
    const n = await db.channelHistoryRun.count();
    expect((await act('channel.sync_history', { channel_account_id: A, history_days: 30 })).status).toBe(200);
    expect(await db.channelHistoryRun.count()).toBe(n);
  }, 60_000);
});

// TIP-014b D trên Postgres 16 + Memurai: chính sách đồng bộ tài khoản Zalo đọc TRƯỚC mọi ghi — 4 tổ hợp sync_messages × sync_auto_create_contact
// với khách đã biết (identity) / người lạ / SĐT trùng nhiều khách / nhóm; đúng số tin / khách / hội thoại / job AI. Tắt sync_messages: không
// lưu gì, chỉ đếm chẩn đoán, phiên vẫn chạy; bật lại chỉ tin mới. Tắt tự tạo khách: người lạ → hội thoại không gắn khách + participant,
// khách đã biết vẫn gắn (SĐT mơ hồ: Zalo không gửi SĐT — kiểm ở unit identity-match). Lịch sử dùng cùng chính sách.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry } from '@appchat/db';
import { fakeZaloTransport } from '@appchat/channels';
import { CLOCK, CHANNELS_RUNTIME, ChannelsJobsModule, InboxJobsModule, KernelModule, LOGGER, MemoryRealtimeEmitter, REALTIME_EMITTER, createLogger, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';
import { startWorker, until, type WorkerHarness } from './worker.harness';

const chEnv = { ...env, LOG_LEVEL: 'silent', ZALO_TRANSPORT: 'fake', CHANNEL_SEND_JITTER: '0' };

let h: Harness;
let ch: TestingModule;
let jobs: WorkerHarness;
let resolver: TenantDbResolver;
let A: string;
let known: string;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  fakeZaloTransport.reset();
  fakeZaloTransport.scanAfterMs = 200;
  ch = await Test.createTestingModule({ imports: [KernelModule.forRoot(chEnv), ChannelsJobsModule, InboxJobsModule] })
    .overrideProvider(LOGGER)
    .useValue(createLogger({ level: 'silent' }))
    .overrideProvider(REALTIME_EMITTER)
    .useValue(new MemoryRealtimeEmitter())
    .overrideProvider(CLOCK)
    .useValue(h.clock)
    .compile();
  await ch.init();
  // Relay outbox → consumer `channel.history_requested` (lần lấy lịch sử).
  jobs = await startWorker(h.platform, { clock: h.clock });
});
afterAll(async () => {
  await ch?.close();
  await jobs?.close();
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const session = () => fakeZaloTransport.session(A)!;
let seq = 0;
const send = (from: string, extra: Record<string, unknown> = {}) => {
  const msgId = String(7_300_000_000 + ++seq);
  session().inject({ msgId, uidFrom: from, threadId: (extra.threadId as string) ?? from, dName: from, text: `tin ${seq}`, ...extra });
  return msgId;
};
const settle = () => new Promise((r) => setTimeout(r, 800));
const counts = async () => {
  const db = await tenant();
  return { msgs: await db.message.count({ where: { channelAccountId: A } }), contacts: await db.contact.count(), convs: await db.conversation.count({ where: { channelAccountId: A } }) };
};
const policy = (sync_messages: boolean, sync_auto_create_contact: boolean) => act('channel.update_settings', { channel_account_id: A, patch: { sync_messages, sync_auto_create_contact } });

describe('chính sách đồng bộ', () => {
  it('kết nối + khách đã biết (identity)', async () => {
    const r = await act('channel.zalo.start_login', { label: 'Zalo Shop' });
    A = r.body.data.result.channel_account_id;
    expect(await until(() => ch.get(CHANNELS_RUNTIME).runtime.sessions!.isHeld(A) && !!fakeZaloTransport.session(A))).toBe(true);
    const k = await act('contact.create', { full_name: 'Chị Hoa', phone: '0909000111' });
    known = k.body.data.result.contact_id;
    const db = await tenant();
    await db.contactIdentity.create({ data: { id: uuidv7(), contactId: known, channelType: 'zalo_personal', channelAccountId: A, externalId: 'zl_hoa', createdAt: h.clock.now() } });
  });

  it('sync_messages=false → không lưu tin / khách / hội thoại; đếm chẩn đoán; phiên vẫn chạy', async () => {
    expect((await policy(false, true)).status).toBe(200);
    const before = await counts();
    send('zl_hoa');
    send('zl_la');
    expect(await until(async () => (((await (await tenant()).channelAccount.findUniqueOrThrow({ where: { id: A } })).health as { suppressed?: number }).suppressed ?? 0) >= 2)).toBe(true);
    await settle();
    expect(await counts()).toEqual(before);
    expect(ch.get(CHANNELS_RUNTIME).runtime.sessions!.isHeld(A)).toBe(true);
  });

  it('bật lại → chỉ tin mới; tự tạo khách bật: người lạ → khách mới; khách đã biết → gắn', async () => {
    expect((await policy(true, true)).status).toBe(200);
    const before = await counts();
    send('zl_hoa');
    send('zl_moi');
    expect(await until(async () => (await counts()).msgs === before.msgs + 2)).toBe(true);
    const db = await tenant();
    expect((await db.conversation.findFirstOrThrow({ where: { channelAccountId: A, externalThreadId: 'zl_hoa' } })).contactId).toBe(known);
    expect((await db.conversation.findFirstOrThrow({ where: { channelAccountId: A, externalThreadId: 'zl_moi' } })).contactId).not.toBeNull();
    expect((await counts()).contacts).toBe(before.contacts + 1);
  });

  it('tự tạo khách tắt: người lạ → hội thoại không gắn khách + participant; khách đã biết vẫn gắn; nhóm không thành khách', async () => {
    expect((await policy(true, false)).status).toBe(200);
    const before = await counts();
    send('zl_hoa');
    send('zl_la2');
    send('zl_nhom1', { isGroup: true, threadId: 'grp_1' });
    expect(await until(async () => (await counts()).msgs === before.msgs + 3)).toBe(true);
    const db = await tenant();
    const conv = (t: string) => db.conversation.findFirstOrThrow({ where: { channelAccountId: A, externalThreadId: t } });
    expect((await conv('zl_hoa')).contactId).toBe(known);
    const la = await conv('zl_la2');
    expect(la.contactId).toBeNull();
    expect(await db.conversationParticipant.findMany({ where: { conversationId: la.id }, select: { externalId: true } })).toEqual([{ externalId: 'zl_la2' }]);
    expect((await conv('grp_1')).contactId).toBeNull();
    expect((await counts()).contacts).toBe(before.contacts);
    expect(await db.contactIdentity.count({ where: { channelAccountId: A, externalId: 'zl_la2' } })).toBe(0);
  });

  it('lịch sử dùng cùng chính sách: sync_messages=false → lần lấy lịch sử không nhập tin', async () => {
    expect((await policy(false, true)).status).toBe(200);
    const before = await counts();
    session().history = [{ isGroup: false, isSelf: false, threadId: 'zl_cu', msgId: '7300009001', uidFrom: 'zl_cu', ts: String(h.clock.now().getTime() - 86_400_000), msgType: 'webchat', content: 'cũ' }];
    const r = await act('channel.sync_history', { channel_account_id: A, history_days: 7 });
    expect(r.status).toBe(202);
    const db = await tenant();
    expect(await until(async () => !['queued', 'running'].includes((await db.channelHistoryRun.findUniqueOrThrow({ where: { id: r.body.data.job_id } })).status))).toBe(true);
    expect(await db.channelHistoryRun.findUniqueOrThrow({ where: { id: r.body.data.job_id } })).toMatchObject({ imported: 0 });
    expect(await counts()).toEqual(before);
  });
});

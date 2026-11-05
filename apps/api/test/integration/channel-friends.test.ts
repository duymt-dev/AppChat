// TIP-014b E trên Postgres 16 + Memurai (DC nới DC-247): bạn bè Zalo — chỉ nhân viên bấm (UI); Trợ lý / nguồn khác → 403. Lời mời tới từ
// kênh → incoming → nhận / từ chối (inbox.reply) qua lệnh bền + ACK. Gửi lời mời (inbox.manage, risk send — xác nhận): chỉ định danh đã biết
// (người lạ → 422), trần / ngày (429), lời mời đã gửi → 409, thu hồi. Lỗi nhà cung cấp → failed. Tra SĐT: một số, trần / ngày, kết
// quả tạm 24 giờ chỉ người tra thấy; không tạo khách; kết quả tra làm định danh đã biết để gửi lời mời.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry } from '@appchat/db';
import { fakeZaloTransport } from '@appchat/channels';
import { CLOCK, CHANNELS_RUNTIME, ChannelsJobsModule, InboxJobsModule, KernelModule, LOGGER, MemoryRealtimeEmitter, REALTIME_EMITTER, createLogger, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';
import { startWorker, until, type WorkerHarness } from './worker.harness';

let h: Harness;
let ch: TestingModule;
let jobs: WorkerHarness;
let resolver: TenantDbResolver;
let A: string;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  fakeZaloTransport.reset();
  fakeZaloTransport.scanAfterMs = 200;
  ch = await Test.createTestingModule({ imports: [KernelModule.forRoot({ ...env, LOG_LEVEL: 'silent', ZALO_TRANSPORT: 'fake', CHANNEL_SEND_JITTER: '0' }), ChannelsJobsModule, InboxJobsModule] })
    .overrideProvider(LOGGER)
    .useValue(createLogger({ level: 'silent' }))
    .overrideProvider(REALTIME_EMITTER)
    .useValue(new MemoryRealtimeEmitter())
    .overrideProvider(CLOCK)
    .useValue(h.clock)
    .compile();
  await ch.init();
  jobs = await startWorker(h.platform, { clock: h.clock });
});
afterAll(async () => {
  await ch?.close();
  await jobs?.close();
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...headers }).then(json);
/** Action risk send: preview → xác nhận (người bấm trên UI). */
const confirmed = async (id: string, input: unknown) => {
  const pv = await act(id, input);
  if (pv.body.data?.status !== 'preview_required') return pv;
  return call(h, `/actions/${id}`, { input, confirm_token: pv.body.data.confirm_token }, { 'idempotency-key': uuidv7() }).then(json);
};
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const session = () => fakeZaloTransport.session(A)!;
const friend = (ext: string) => call(h, `/settings/channels/${A}/friends/${ext}`).then(json);
const settled = (ext: string) => until(async () => ['confirmed', 'failed', 'unknown'].includes((await friend(ext)).body.data.op_status), 10_000);

describe('bạn bè Zalo', () => {
  it('kết nối + một khách đã nhắn (định danh đã biết)', async () => {
    const r = await act('channel.zalo.start_login', { label: 'Zalo Bạn bè' });
    A = r.body.data.result.channel_account_id;
    expect(await until(() => ch.get(CHANNELS_RUNTIME).runtime.sessions!.isHeld(A) && !!fakeZaloTransport.session(A))).toBe(true);
    session().inject({ msgId: '7500000001', uidFrom: '9001', threadId: '9001', dName: 'Khách Quen', text: 'chào shop' });
    expect(await until(async () => !!(await (await tenant()).conversation.findFirst({ where: { channelAccountId: A, externalThreadId: '9001' } })))).toBe(true);
  });

  it('lời mời tới → incoming → nhận (ACK) → friend; Trợ lý gọi → 403', async () => {
    session().emitFriend({ type: 'request', userId: '9101', message: 'Kết bạn với shop nhé' });
    expect(await until(async () => (await friend('9101')).body.data.state === 'incoming')).toBe(true);
    const list = await call(h, `/settings/channels/${A}/friends?state=incoming`).then(json);
    expect(list.body.data).toEqual([expect.objectContaining({ external_id: '9101', incoming_message: 'Kết bạn với shop nhé' })]);
    expect((await act('channel.friend.accept', { channel_account_id: A, external_id: '9101' }, { 'x-action-source': 'assistant' })).status).toBe(403);
    const r = await act('channel.friend.accept', { channel_account_id: A, external_id: '9101' });
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    expect(await settled('9101')).toBe(true);
    expect((await friend('9101')).body.data).toMatchObject({ state: 'friend', op: 'accept', op_status: 'confirmed' });
    expect(session().ops.filter((o) => o.op === 'friend_accept').map((o) => o.userId)).toEqual(['9101']);
  });

  it('từ chối khi không có lời mời → 409; từ chối lời mời → none', async () => {
    expect((await act('channel.friend.reject', { channel_account_id: A, external_id: '9102' })).status).toBe(409);
    session().emitFriend({ type: 'request', userId: '9102' });
    expect(await until(async () => (await friend('9102')).body.data.state === 'incoming')).toBe(true);
    expect((await act('channel.friend.reject', { channel_account_id: A, external_id: '9102' })).status).toBe(202);
    expect(await settled('9102')).toBe(true);
    expect((await friend('9102')).body.data.state).toBe('none');
  });

  it('gửi: người lạ → 422; khách đã nhắn → xác nhận → outgoing; lệnh mở → 409; thu hồi → none', async () => {
    expect((await confirmed('channel.friend.send', { channel_account_id: A, external_id: '9999', message: 'hi' })).body.error.fields).toEqual({ external_id: 'unknown_identity' });
    // Người bấm trên UI chạy thẳng (hộp xác nhận + cảnh báo rủi ro ở web); Trợ lý không gọi được kể cả xem trước.
    expect((await act('channel.friend.send', { channel_account_id: A, external_id: '9001', message: 'Chào anh' }, { 'x-action-source': 'assistant' })).status).toBe(403);
    const r = await confirmed('channel.friend.send', { channel_account_id: A, external_id: '9001', message: 'Chào anh' });
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    expect(await settled('9001')).toBe(true);
    expect((await friend('9001')).body.data).toMatchObject({ state: 'outgoing', op_status: 'confirmed' });
    expect(session().ops.find((o) => o.op === 'friend_send')).toMatchObject({ userId: '9001', text: 'Chào anh' });
    expect((await confirmed('channel.friend.send', { channel_account_id: A, external_id: '9001', message: '' })).body.error.fields).toEqual({ external_id: 'already_requested' });
    expect((await act('channel.friend.undo', { channel_account_id: A, external_id: '9001' })).status).toBe(202);
    expect(await settled('9001')).toBe(true);
    expect((await friend('9001')).body.data.state).toBe('none');
  });

  it('nhà cung cấp từ chối → failed, trạng thái không đổi', async () => {
    session().emitFriend({ type: 'request', userId: '9103' });
    expect(await until(async () => (await friend('9103')).body.data.state === 'incoming')).toBe(true);
    session().friendMode = 'reject';
    expect((await act('channel.friend.accept', { channel_account_id: A, external_id: '9103' })).status).toBe(202);
    expect(await settled('9103')).toBe(true);
    expect((await friend('9103')).body.data).toMatchObject({ state: 'incoming', op_status: 'failed' });
  });

  it('tra SĐT: kết quả tạm chỉ người tra thấy, không tạo khách; dùng được để gửi lời mời; trần / ngày → 429', async () => {
    const db = await tenant();
    const before = await db.contact.count();
    session().phoneBook.set('0912345678', { id: '9201', displayName: 'Người lạ A' });
    const r = await act('channel.lookup_user', { channel_account_id: A, phone: '0912 345 678' });
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    const id = r.body.data.job_id;
    expect(await until(async () => (await call(h, `/settings/channels/${A}/lookups/${id}`).then(json)).body.data.state === 'found', 10_000)).toBe(true);
    expect((await call(h, `/settings/channels/${A}/lookups/${id}`).then(json)).body.data).toMatchObject({ phone: '0912345678', external_id: '9201', name: 'Người lạ A' });
    const sales = await h.member('sales');
    expect((await call(h, `/settings/channels/${A}/lookups/${id}`, undefined, { authorization: `Bearer ${sales.token}` })).status).toBe(403);
    expect(await db.contact.count()).toBe(before);
    expect((await confirmed('channel.friend.send', { channel_account_id: A, external_id: '9201', message: '' })).status).toBe(202);
    expect(await settled('9201')).toBe(true);
    // Số không có trên Zalo → not_found; số hỏng → 422.
    expect((await act('channel.lookup_user', { channel_account_id: A, phone: '12345' })).status).toBe(422);
    // Trần 30 / ngày: đã dùng 1 lượt — dựng thêm 29 dòng tra trong ngày.
    for (let i = 0; i < 29; i++) await db.channelUserLookup.create({ data: { id: uuidv7(), channelAccountId: A, actorId: h.user, phone: '0900000000', status: 'not_found', expiresAt: h.clock.now(), createdAt: h.clock.now() } });
    const capped = await act('channel.lookup_user', { channel_account_id: A, phone: '0912345679' });
    expect(capped.status).toBe(429);
    expect(capped.body.error.fields).toEqual({ channel_account_id: 'lookup_daily_cap' });
  });

  it('trần gửi / ngày (friend_daily_cap) → 429', async () => {
    expect((await act('channel.update_settings', { channel_account_id: A, patch: {} })).status).toBe(200);
    const db = await tenant();
    const acc = await db.channelAccount.findUniqueOrThrow({ where: { id: A } });
    await db.channelAccount.update({ where: { id: A }, data: { settings: { ...(acc.settings as object), friend_daily_cap: 2 } } });
    // Đã gửi 9001 + 9201 hôm nay → 2 lượt.
    session().inject({ msgId: '7500000002', uidFrom: '9002', threadId: '9002', dName: 'Khách 2', text: 'hi' });
    expect(await until(async () => !!(await db.conversation.findFirst({ where: { channelAccountId: A, externalThreadId: '9002' } })))).toBe(true);
    const r = await confirmed('channel.friend.send', { channel_account_id: A, external_id: '9002', message: '' });
    expect(r.status).toBe(429);
    expect(r.body.error.fields).toEqual({ channel_account_id: 'friend_daily_cap' });
  });
});

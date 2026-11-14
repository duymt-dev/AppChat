// TIP-014b B trên Postgres 16 + Memurai: API thật + worker ROLE=channels thật (Zalo giả, id dạng thật). Gửi bền theo sổ `outbox_send_part`:
//  - tin chia đoạn → mỗi phần đặt chỗ + xác nhận, tin `sent`, tham chiếu từng phần;
//  - lỗi giữa chừng → `partial` (final), không gửi lại phần đã tới; lỗi mạng sau khi gọi → `unknown` (final), outbox không quét lại;
//  - kênh từ chối rõ → thử lại an toàn, gửi đúng một lần;
//  - phần treo `dispatch_reserved` từ lần chạy trước (sập giữa chừng) → job chạy lại không gọi kênh, tin `unknown`;
//  - biên nhận đã nhận / đã xem → `message_receipt` + trạng thái tin chỉ tăng; nhóm theo từng người.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry } from '@appchat/db';
import { ChannelOperationError, fakeZaloTransport } from '@appchat/channels';
import { CLOCK, CHANNELS_RUNTIME, ChannelSendQueue, ChannelsJobsModule, InboxJobsModule, KernelModule, LOGGER, MemoryRealtimeEmitter, REALTIME_EMITTER, createLogger, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';
import { until } from './worker.harness';

const chEnv = { ...env, LOG_LEVEL: 'silent', ZALO_TRANSPORT: 'fake', CHANNEL_SEND_JITTER: '0' };

let h: Harness;
let ch: TestingModule;
let resolver: TenantDbResolver;
let A: string;
let conv: string;

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
});
afterAll(async () => {
  await ch?.close();
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const sessions = () => ch.get(CHANNELS_RUNTIME).runtime.sessions!;
const session = () => fakeZaloTransport.session(A)!;
const long = `${'a'.repeat(1990)} ${'b'.repeat(1990)}`;
const settle = () => new Promise((r) => setTimeout(r, 400));

async function send(text: string) {
  const r = await act('message.send', { conversation_id: conv, text });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data.result.message_id as string;
}
const msg = async (id: string) => (await tenant()).message.findUniqueOrThrow({ where: { id } });
const outbox = async (id: string) => (await tenant()).outboxMessage.findFirstOrThrow({ where: { messageId: id } });
const parts = async (id: string) => (await tenant()).outboxSendPart.findMany({ where: { outboxMessageId: (await outbox(id)).id }, orderBy: { partNo: 'asc' } });

describe('gửi bền theo phần', () => {
  it('kết nối + hội thoại', async () => {
    const r = await act('channel.zalo.start_login', { label: 'Zalo Shop' });
    A = r.body.data.result.channel_account_id;
    expect(await until(() => sessions().isHeld(A) && !!fakeZaloTransport.session(A))).toBe(true);
    session().inject({ msgId: '7000009001', uidFrom: 'zl_khach', threadId: 'zl_khach', dName: 'Chị Mai', text: 'Shop ơi' });
    expect(await until(async () => !!(await (await tenant()).conversation.findFirst({ where: { channelAccountId: A } })))).toBe(true);
    conv = (await (await tenant()).conversation.findFirstOrThrow({ where: { channelAccountId: A } })).id;
  });

  it('tin chia 2 đoạn → 2 phần confirmed_sent, tin sent, tham chiếu từng phần', async () => {
    const before = session().sent.length;
    const id = await send(long);
    expect(await until(async () => (await msg(id)).status === 'sent')).toBe(true);
    const ps = await parts(id);
    expect(ps.map((p) => p.status)).toEqual(['confirmed_sent', 'confirmed_sent']);
    expect(ps.map((p) => p.msgId)).toEqual(session().sent.slice(before).map((s) => s.id));
    expect(await (await tenant()).messageProviderRef.count({ where: { messageId: id } })).toBe(2);
  });

  it('lỗi mạng ở phần 2 → partial (final), phần 1 không gửi lại', async () => {
    const s = session();
    const before = s.sent.length;
    const orig = s.sendText.bind(s);
    let n = 0;
    s.sendText = async (...a: Parameters<typeof orig>) => (++n === 2 ? Promise.reject(new Error('zalo_network')) : orig(...a));
    const id = await send(long);
    expect(await until(async () => (await msg(id)).status === 'partial')).toBe(true);
    s.sendText = orig;
    await settle();
    expect(s.sent.length - before).toBe(1);
    expect((await parts(id)).map((p) => p.status)).toEqual(['confirmed_sent', 'unknown']);
    expect((await outbox(id)).status).toBe('dead');
  });

  it('lỗi mạng ở phần đầu (đã gọi kênh) → unknown, outbox unknown, không gửi lại', async () => {
    const s = session();
    const orig = s.sendText.bind(s);
    let calls = 0;
    s.sendText = async () => {
      calls++;
      throw new Error('zalo_timeout');
    };
    const id = await send('Dạ chị chờ em chút ạ');
    expect(await until(async () => (await msg(id)).status === 'unknown')).toBe(true);
    await settle();
    s.sendText = orig;
    expect(calls).toBe(1);
    expect((await outbox(id)).status).toBe('unknown');
    expect((await parts(id))[0]).toMatchObject({ status: 'unknown', error: 'zalo_timeout' });
  });

  it('kênh từ chối rõ → lỗi chắc chắn, thử lại gửi đúng một lần', async () => {
    const s = session();
    const orig = s.sendText.bind(s);
    let n = 0;
    s.sendText = async (...a: Parameters<typeof orig>) => (++n === 1 ? Promise.reject(new ChannelOperationError('rejected', '-1')) : orig(...a));
    const before = s.sent.length;
    const id = await send('Dạ em gửi lại ạ');
    expect(await until(async () => (await msg(id)).status === 'sent', 30_000)).toBe(true);
    s.sendText = orig;
    expect(s.sent.length - before).toBe(1);
    expect((await parts(id))[0]).toMatchObject({ status: 'confirmed_sent', error: null });
  }, 40_000);

  it('phần treo từ lần chạy trước (sập sau khi đặt chỗ) → job chạy lại không gọi kênh, tin unknown', async () => {
    const db = await tenant();
    const s = session();
    const before = s.sent.length;
    const id = uuidv7();
    const ob = uuidv7();
    const now = h.clock.now();
    await db.message.create({ data: { id, conversationId: conv, channelAccountId: A, direction: 'out', senderType: 'user', kind: 'text', body: 'treo', status: 'queued', createdAt: now } });
    const payload = { externalThreadId: 'zl_khach', kind: 'text', text: 'treo' };
    await db.outboxMessage.create({ data: { id: ob, messageId: id, channelAccountId: A, payload, status: 'sending', nextAttemptAt: now, createdAt: now } });
    await db.outboxSendPart.create({ data: { outboxMessageId: ob, partNo: 0, channelAccountId: A, contentHash: 'x', status: 'dispatch_reserved', attemptedAt: now } });
    await ch.get(ChannelSendQueue).enqueue({ ws: h.ws, account_id: A, ref_id: ob, message: payload as never });
    expect(await until(async () => (await msg(id)).status === 'unknown')).toBe(true);
    expect(s.sent.length).toBe(before);
    expect((await db.outboxSendPart.findFirstOrThrow({ where: { outboxMessageId: ob } })).status).toBe('unknown');
  });
});

describe('biên nhận', () => {
  it('đã nhận → đã xem: message_receipt + trạng thái tin chỉ tăng; lặp idempotent', async () => {
    const id = await send('Lịch hẹn 14:00 thứ Bảy ạ');
    expect(await until(async () => (await msg(id)).status === 'sent')).toBe(true);
    const msgId = (await parts(id))[0]!.msgId!;
    session().emitReceipt({ kind: 'delivered', msgIds: [msgId], uids: ['zl_khach'] });
    expect(await until(async () => (await msg(id)).status === 'delivered')).toBe(true);
    session().emitReceipt({ kind: 'seen', msgIds: [msgId], uids: ['zl_khach'] });
    expect(await until(async () => (await msg(id)).status === 'read')).toBe(true);
    session().emitReceipt({ kind: 'delivered', msgIds: [msgId], uids: ['zl_khach'] });
    await settle();
    expect((await msg(id)).status).toBe('read');
    const r = await (await tenant()).messageReceipt.findMany({ where: { messageId: id } });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ recipientId: 'zl_khach' });
    expect(r[0]!.readAt).not.toBeNull();
    const t = (await json(await call(h, `/conversations/${conv}/messages`))).body.data as { id: string; status?: string }[];
    expect(t.find((m) => m.id === id)?.status).toBe('read');
  });

  it('biên nhận cho msgId lạ / thread khác → bỏ', async () => {
    const before = await (await tenant()).messageReceipt.count();
    session().emitReceipt({ kind: 'seen', msgIds: ['7999999999'], uids: ['zl_khach'] });
    await settle();
    expect(await (await tenant()).messageReceipt.count()).toBe(before);
  });
});

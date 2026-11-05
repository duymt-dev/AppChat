// TIP-014b C trên Postgres 16 + Memurai: HAI worker ROLE=channels thật (Zalo giả) cùng tranh một tài khoản — đúng một chủ phiên; mỗi lần
// giành phiên = thế hệ mới; chủ cũ (mất lease / bị tạm dừng) không đặt chỗ gửi được nữa (StaleGenerationError trước khi gọi kênh); tạm
// dừng tăng thế hệ và phiên dừng kể cả khi lệnh pub/sub bị lỡ (nhịp lease so thế hệ DB); tắt worker: fence thế hệ rồi nhả lease → worker kia
// nhận ngay, tin gửi tiếp chỉ một lần. Quét route theo trang (EXPLAIN dùng tenant_channel_route_scan_idx).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import pg from 'pg';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry } from '@appchat/db';
import { fakeZaloTransport } from '@appchat/channels';
import { CLOCK, CHANNELS_RUNTIME, ChannelsJobsModule, InboxJobsModule, KernelModule, LOGGER, MemoryRealtimeEmitter, REALTIME_EMITTER, createLogger, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';
import { until } from './worker.harness';

const chEnv = { ...env, LOG_LEVEL: 'silent', ZALO_TRANSPORT: 'fake', CHANNEL_SEND_JITTER: '0' };

let h: Harness;
let w1: TestingModule;
let w2: TestingModule | undefined;
let resolver: TenantDbResolver;
let A: string;
let conv: string;

const worker = async () => {
  const m = await Test.createTestingModule({ imports: [KernelModule.forRoot(chEnv), ChannelsJobsModule, InboxJobsModule] })
    .overrideProvider(LOGGER)
    .useValue(createLogger({ level: 'silent' }))
    .overrideProvider(REALTIME_EMITTER)
    .useValue(new MemoryRealtimeEmitter())
    .overrideProvider(CLOCK)
    .useValue(h.clock)
    .compile();
  await m.init();
  return m;
};

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  fakeZaloTransport.reset();
  fakeZaloTransport.scanAfterMs = 200;
  w1 = await worker();
});
afterAll(async () => {
  await w2?.close();
  await w1?.close();
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const sessionsOf = (m: TestingModule) => m.get(CHANNELS_RUNTIME).runtime.sessions!;
const gen = async () => (await (await tenant()).channelAccount.findUniqueOrThrow({ where: { id: A } })).sessionGeneration;

describe('thế hệ phiên', () => {
  it('kết nối → worker 1 giữ phiên, thế hệ ≥ 1; worker 2 không giành được (một chủ)', async () => {
    const r = await act('channel.zalo.start_login', { label: 'Zalo Shop' });
    A = r.body.data.result.channel_account_id;
    expect(await until(() => sessionsOf(w1).isHeld(A))).toBe(true);
    const g = await gen();
    expect(g).toBeGreaterThanOrEqual(1);
    expect(sessionsOf(w1).generation(A)).toBe(g);
    w2 = await worker();
    await sessionsOf(w2).tick();
    expect(sessionsOf(w2).isHeld(A)).toBe(false);
    fakeZaloTransport.session(A)!.inject({ msgId: '7000008001', uidFrom: 'zl_khach', threadId: 'zl_khach', dName: 'Chị Mai', text: 'Shop ơi' });
    expect(await until(async () => !!(await (await tenant()).conversation.findFirst({ where: { channelAccountId: A } })))).toBe(true);
    conv = (await (await tenant()).conversation.findFirstOrThrow({ where: { channelAccountId: A } })).id;
  });

  it('tạm dừng → thế hệ tăng; phiên dừng kể cả khi lệnh pub/sub bị lỡ (nhịp so thế hệ DB)', async () => {
    const g0 = await gen();
    // Mô phỏng lỡ lệnh: ghi tạm dừng thẳng vào DB như action làm, không publish.
    const db = await tenant();
    await db.channelAccount.update({ where: { id: A }, data: { pausedAt: h.clock.now(), sessionGeneration: { increment: 1 } } });
    expect(await gen()).toBe(g0 + 1);
    await sessionsOf(w1).tick();
    expect(sessionsOf(w1).isHeld(A)).toBe(false);
    // Tài khoản đang tạm dừng (theo DB) → resume thật: thế hệ mới + lệnh start.
    expect((await act('channel.resume', { channel_account_id: A })).status).toBe(200);
    expect(await until(() => sessionsOf(w1).isHeld(A) || sessionsOf(w2!).isHeld(A))).toBe(true);
  });

  it('action tạm dừng (setStatus) cũng tăng thế hệ', async () => {
    const g0 = await gen();
    expect((await act('channel.pause', { channel_account_id: A })).status).toBe(200);
    expect(await gen()).toBeGreaterThan(g0);
    expect(await until(() => !sessionsOf(w1).isHeld(A) && !sessionsOf(w2!).isHeld(A))).toBe(true);
    expect((await act('channel.resume', { channel_account_id: A })).status).toBe(200);
    expect(await until(() => sessionsOf(w1).isHeld(A) || sessionsOf(w2!).isHeld(A))).toBe(true);
  });

  it('tắt worker đang giữ → fence thế hệ + nhả lease; worker kia nhận ngay; tin gửi sau đó đúng một lần', async () => {
    const [owner, other] = sessionsOf(w1).isHeld(A) ? [w1, w2!] : [w2!, w1];
    const g0 = await gen();
    await sessionsOf(owner).shutdown();
    expect(await gen()).toBe(g0 + 1);
    await sessionsOf(other).tick();
    expect(await until(() => sessionsOf(other).isHeld(A))).toBe(true);
    expect(sessionsOf(other).generation(A)).toBe(await gen());
    const before = fakeZaloTransport.session(A)!.sent.length;
    const r = await act('message.send', { conversation_id: conv, text: 'Dạ shop còn hàng ạ' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const id = r.body.data.result.message_id as string;
    expect(await until(async () => (await (await tenant()).message.findUniqueOrThrow({ where: { id } })).status === 'sent')).toBe(true);
    expect(fakeZaloTransport.session(A)!.sent.length - before).toBe(1);
    const ob = await (await tenant()).outboxMessage.findFirstOrThrow({ where: { messageId: id } });
    const part = await (await tenant()).outboxSendPart.findFirstOrThrow({ where: { outboxMessageId: ob.id } });
    expect(part.generation).toBe(await gen());
  });

  it('EXPLAIN quét route theo trang dùng tenant_channel_route_scan_idx', async () => {
    const c = new pg.Client({ connectionString: env.PLATFORM_DATABASE_URL! });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const plan = (await c.query(`EXPLAIN SELECT channel_account_id, workspace_id, type FROM tenant_channel_route WHERE status = 'connected' AND type IN ('zalo_personal') AND channel_account_id > '00000000-0000-0000-0000-000000000000'::uuid ORDER BY channel_account_id LIMIT 200`)).rows.map((x) => x['QUERY PLAN']).join('\n');
      expect(plan).toMatch(/tenant_channel_route_scan_idx/);
    } finally {
      await c.end();
    }
  });
});

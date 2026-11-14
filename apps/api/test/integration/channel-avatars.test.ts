// TIP-014b D trên Postgres 16 + Memurai: ảnh đại diện Zalo. Tin live đầu tiên của khách 1-1 / thành viên nhóm → xếp `channel_avatar`; worker
// giữ phiên lấy hồ sơ theo lô (≤ 20 id / lần gọi), tải ảnh qua safeFetch về Storage (`file.purpose = avatar`) — API chỉ trả link ký của
// AppChat (không URL CDN). Thành viên nhóm có ảnh nhưng không thành khách. Ảnh nhân viên đặt (`contact.avatar_url`) thắng. Nhắn lại trong
// 7 ngày → không gọi lại; sau 7 ngày → kiểm lại (URL không đổi → không tải lại). Lỗi nhà cung cấp → lùi; ảnh không phải ảnh → không ghi
// tệp. Trần lượt kiểm / ngày. Lịch sử không xếp ảnh.
import 'reflect-metadata';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry } from '@appchat/db';
import { fakeZaloTransport } from '@appchat/channels';
import { CLOCK, CHANNELS_RUNTIME, ChannelsJobsModule, InboxJobsModule, KernelModule, LOGGER, MemoryRealtimeEmitter, REALTIME_EMITTER, createLogger, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';
import { startWorker, until, type WorkerHarness } from './worker.harness';

// PNG 1×1 hợp lệ (qua cổng guardUpload — loại theo nội dung).
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
let cdn: Server;
let cdnBase = '';
const hits: string[] = [];

let h: Harness;
let ch: TestingModule;
let resolver: TenantDbResolver;
let A: string;
let jobs: WorkerHarness;

beforeAll(async () => {
  cdn = createServer((req, res) => {
    hits.push(req.url ?? '');
    if (req.url?.startsWith('/html')) return void res.writeHead(200, { 'content-type': 'image/png' }).end('<html>not an image</html>');
    res.writeHead(200, { 'content-type': 'image/png' }).end(PNG);
  });
  await new Promise<void>((r) => cdn.listen(0, '127.0.0.1', r));
  cdnBase = `http://127.0.0.1:${(cdn.address() as AddressInfo).port}`;
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  fakeZaloTransport.reset();
  fakeZaloTransport.scanAfterMs = 200;
  const chEnv = { ...env, LOG_LEVEL: 'silent', ZALO_TRANSPORT: 'fake', CHANNEL_SEND_JITTER: '0', CHANNEL_FETCH_TEST_ALLOW: '127.0.0.1' };
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
  await new Promise((r) => cdn?.close(r));
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const session = () => fakeZaloTransport.session(A)!;
let seq = 0;
const send = (from: string, extra: Record<string, unknown> = {}) => {
  const msgId = String(7_400_000_000 + ++seq);
  session().inject({ msgId, uidFrom: from, threadId: (extra.threadId as string) ?? from, dName: `Tên ${from}`, text: `tin ${seq}`, ts: String(h.clock.now().getTime()), ...extra });
  return msgId;
};
const avatar = async (ext: string) => (await tenant()).channelAvatar.findUnique({ where: { channelAccountId_externalId: { channelAccountId: A, externalId: ext } } });
const settled = (ext: string) => until(async () => !!(await avatar(ext)) && (await avatar(ext))!.status !== 'queued', 10_000);
const conv = async (thread: string) => (await tenant()).conversation.findFirstOrThrow({ where: { channelAccountId: A, externalThreadId: thread } });

describe('ảnh đại diện Zalo', () => {
  it('kết nối', async () => {
    const r = await act('channel.zalo.start_login', { label: 'Zalo Ảnh' });
    A = r.body.data.result.channel_account_id;
    expect(await until(() => ch.get(CHANNELS_RUNTIME).runtime.sessions!.isHeld(A) && !!fakeZaloTransport.session(A))).toBe(true);
  });

  it('khách 1-1 lần đầu → tải về Storage (purpose avatar), API trả link ký — không URL CDN', async () => {
    session().profiles.set('5101', { displayName: 'Chị Lan', avatar: `${cdnBase}/a/lan.png` });
    send('5101');
    expect(await settled('5101')).toBe(true);
    const row = (await avatar('5101'))!;
    expect(row).toMatchObject({ status: 'ok', attempts: 0 });
    const db = await tenant();
    expect(await db.file.findUniqueOrThrow({ where: { id: row.fileId! } })).toMatchObject({ purpose: 'avatar', mime: 'image/png', confirmed: true });
    const c = await conv('5101');
    const list = await json(await call(h, '/conversations?folder=all'));
    const dto = list.body.data.find((x: { id: string }) => x.id === c.id);
    expect(dto.avatar_url).toContain(`/v1/files/${row.fileId}/raw?ws=${h.ws}&sig=`);
    expect(JSON.stringify(list.body)).not.toContain(cdnBase);
    // Ảnh mở được bằng link ký (không cần token).
    const img = await fetch(dto.avatar_url.replace(/^https?:\/\/[^/]+/, h.base));
    expect(img.status).toBe(200);
    expect(Buffer.from(await img.arrayBuffer()).equals(PNG)).toBe(true);
    const p360 = await json(await call(h, `/contacts/${c.contactId}`));
    expect(p360.body.data.avatar_url).toBe(dto.avatar_url);
  });

  it('thành viên nhóm: có ảnh ở tin, không thành khách; gom một lần gọi', async () => {
    const db = await tenant();
    const before = await db.contact.count();
    const calls = session().profileCalls.length;
    session().profiles.set('5201', { displayName: 'TV 1', avatar: `${cdnBase}/a/tv1.png` });
    session().profiles.set('5202', { displayName: 'TV 2' });
    send('5201', { isGroup: true, threadId: 'grp_av' });
    send('5202', { isGroup: true, threadId: 'grp_av' });
    expect(await settled('5201')).toBe(true);
    expect(await settled('5202')).toBe(true);
    expect((await avatar('5202'))!.status).toBe('none');
    expect(await db.contact.count()).toBe(before);
    expect(session().profileCalls.length - calls).toBeLessThanOrEqual(2);
    const g = await conv('grp_av');
    const msgs = await json(await call(h, `/conversations/${g.id}/messages`));
    const byName = (n: string) => msgs.body.data.find((m: { sender?: string }) => m.sender === n);
    expect(byName('Tên 5201').sender_avatar).toContain('/v1/files/');
    expect(byName('Tên 5202').sender_avatar).toBeUndefined();
  });

  it('nhắn lại trong 7 ngày → không gọi lại; sau 7 ngày → kiểm lại, URL không đổi → không tải lại', async () => {
    const calls = session().profileCalls.length;
    const fetched = hits.length;
    send('5101');
    await new Promise((r) => setTimeout(r, 800));
    expect(session().profileCalls.length).toBe(calls);
    const fileId = (await avatar('5101'))!.fileId;
    h.clock.advance(8 * 86_400_000);
    send('5101');
    expect(await until(async () => session().profileCalls.length > calls && (await avatar('5101'))!.status === 'ok', 10_000)).toBe(true);
    expect((await avatar('5101'))!.fileId).toBe(fileId);
    expect(hits.length).toBe(fetched);
  });

  it('ảnh nhân viên đặt thắng ảnh đồng bộ', async () => {
    const c = await conv('5101');
    const db = await tenant();
    await db.contact.update({ where: { id: c.contactId! }, data: { avatarUrl: 'https://anh.shop.test/lan.jpg' } });
    const one = await json(await call(h, `/conversations/${c.id}`));
    expect(one.body.data.avatar_url).toBe('https://anh.shop.test/lan.jpg');
    expect((await json(await call(h, `/contacts/${c.contactId}`))).body.data.avatar_url).toBe('https://anh.shop.test/lan.jpg');
    expect((await avatar('5101'))!.fileId).not.toBeNull();
  });

  it('nhà cung cấp lỗi → lùi (queued + attempts); nội dung không phải ảnh → không ghi tệp', async () => {
    const db = await tenant();
    session().opMode = 'fail';
    send('5301');
    expect(await until(async () => ((await avatar('5301'))?.attempts ?? 0) >= 1, 10_000)).toBe(true);
    const r = (await avatar('5301'))!;
    expect(r.status).toBe('queued');
    expect(r.nextAt.getTime()).toBeGreaterThan(h.clock.now().getTime());
    const files = await db.file.count({ where: { purpose: 'avatar' } });
    session().profiles.set('5302', { displayName: 'Giả ảnh', avatar: `${cdnBase}/html` });
    send('5302');
    expect(await until(async () => ((await avatar('5302'))?.attempts ?? 0) >= 1, 10_000)).toBe(true);
    expect((await avatar('5302'))!.fileId).toBeNull();
    expect(await db.file.count({ where: { purpose: 'avatar' } })).toBe(files);
  });

  it('lịch sử không xếp ảnh', async () => {
    session().history = [{ isGroup: false, isSelf: false, threadId: '5401', msgId: '7400009001', uidFrom: '5401', ts: String(h.clock.now().getTime() - 86_400_000), msgType: 'webchat', content: 'cũ' }];
    const r = await act('channel.sync_history', { channel_account_id: A, history_days: 7 });
    expect(r.status).toBe(202);
    const db = await tenant();
    expect(await until(async () => !['queued', 'running'].includes((await db.channelHistoryRun.findUniqueOrThrow({ where: { id: r.body.data.job_id } })).status), 10_000)).toBe(true);
    expect(await avatar('5401')).toBeNull();
  });
});

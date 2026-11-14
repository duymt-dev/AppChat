// TIP-014b D3 trên Postgres 16 + Memurai: đồng bộ danh bạ Zalo. `channel.sync_contacts` (202) → outbox → worker giữ phiên lấy danh bạ theo
// trang (≤ 200) vào ảnh chụp riêng tài khoản → GET /settings/channels/:id/contact-syncs/:syncId (channels.manage) với trạng thái khớp:
// identity đã gắn → known; có SĐT chưa có khách → importable; thiếu SĐT → no_phone (không bịa); SĐT thuộc khách người khác (ngoài scope) →
// conflict, không lộ id (unit). Không tạo khách, không gửi gì. Nhập tay qua contact.import. Trần trang → partial (unit). Hết 24 giờ → 404.
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
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const session = () => fakeZaloTransport.session(A)!;
const read = (id: string, headers: Record<string, string> = {}) => call(h, `/settings/channels/${A}/contact-syncs/${id}`, undefined, headers).then(json);
const finished = async (id: string) => until(async () => !['queued', 'running'].includes((await (await tenant()).channelContactSync.findUniqueOrThrow({ where: { id } })).status), 10_000);

describe('danh bạ Zalo', () => {
  let syncId = '';

  it('kết nối + dữ liệu: khách đã gắn identity, khách cùng SĐT', async () => {
    const r = await act('channel.zalo.start_login', { label: 'Zalo Danh bạ' });
    A = r.body.data.result.channel_account_id;
    expect(await until(() => ch.get(CHANNELS_RUNTIME).runtime.sessions!.isHeld(A) && !!fakeZaloTransport.session(A))).toBe(true);
    const k = await act('contact.create', { full_name: 'Chị Hoa', phone: '0909000222' });
    const db = await tenant();
    await db.contactIdentity.create({ data: { id: uuidv7(), contactId: k.body.data.result.contact_id, channelType: 'zalo_personal', channelAccountId: A, externalId: '6001', createdAt: h.clock.now() } });
    // Khách đã có cùng SĐT với một người trong danh bạ (Owner thấy → known; người ngoài scope → conflict — unit channel-contacts-sync).
    expect((await act('contact.create', { full_name: 'Khách cùng số', phone: '0909000333' })).status).toBe(200);
  });

  it('lấy danh bạ → ảnh chụp + trạng thái khớp; không tạo khách', async () => {
    session().friendList = [
      { id: '6001', displayName: 'Hoa Zalo' },
      { id: '6002', displayName: 'Nam', phone: '0909000444' },
      { id: '6003', displayName: 'Không số' },
      { id: '6004', displayName: 'Trùng số', phone: '0909 000 333' },
    ];
    const db = await tenant();
    const before = await db.contact.count();
    const r = await act('channel.sync_contacts', { channel_account_id: A });
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    syncId = r.body.data.job_id;
    expect(await finished(syncId)).toBe(true);
    const s = await read(syncId);
    expect(s.status).toBe(200);
    expect(s.body.data).toMatchObject({ state: 'complete', pages: 1, received: 4, next_cursor: null });
    const by = (id: string) => s.body.data.rows.find((x: { external_id: string }) => x.external_id === id);
    expect(by('6001')).toMatchObject({ state: 'known', contact_id: expect.any(String) });
    expect(by('6002')).toMatchObject({ state: 'importable', phone: '0909000444' });
    expect(by('6003')).toMatchObject({ state: 'no_phone', phone: null });
    // Owner thấy mọi khách → khách cùng SĐT là `known` với Owner.
    expect(by('6004')).toMatchObject({ state: 'known' });
    expect(await db.contact.count()).toBe(before);
    expect(session().sent).toEqual([]);
  });

  it('không có channels.manage → 403', async () => {
    const sales = await h.member('sales');
    const r403 = await read(syncId, { authorization: `Bearer ${sales.token}` });
    expect(r403.status).toBe(403);
  });

  it('nhập tay qua contact.import — chỉ dòng chọn', async () => {
    const db = await tenant();
    const before = await db.contact.count();
    // contact.import luôn xem trước → xác nhận (như nhập file), cùng Executor.
    const input = { rows: [{ full_name: 'Nam', phone: '0909000444', source: 'zalo_personal' }] };
    const pv = await act('contact.import', input);
    expect(pv.body.data.status).toBe('preview_required');
    const r = await call(h, '/actions/contact.import', { input, confirm_token: pv.body.data.confirm_token }, { 'idempotency-key': uuidv7() }).then(json);
    expect(r.body.data.result).toMatchObject({ created: 1 });
    expect(await db.contact.count()).toBe(before + 1);
    const s = await read(syncId);
    expect(s.body.data.rows.find((x: { external_id: string }) => x.external_id === '6002')).toMatchObject({ state: 'known' });
  });

  it('đọc theo trang 100 dòng (cursor); 450 người = 3 trang nhà cung cấp', async () => {
    session().friendList = Array.from({ length: 450 }, (_, i) => ({ id: String(8000 + i), displayName: `Bạn ${i}` }));
    const pages = session().friendPages.length;
    const r = await act('channel.sync_contacts', { channel_account_id: A });
    expect(await finished(r.body.data.job_id)).toBe(true);
    expect(session().friendPages.length - pages).toBe(3);
    const p1 = await read(r.body.data.job_id);
    expect(p1.body.data).toMatchObject({ state: 'complete', received: 450 });
    expect(p1.body.data.rows).toHaveLength(100);
    const p2 = await call(h, `/settings/channels/${A}/contact-syncs/${r.body.data.job_id}?cursor=${p1.body.data.next_cursor}`).then(json);
    expect(p2.body.data.rows[0].external_id).toBe('8100');
  });

  it('hết 24 giờ → 404; lần mới dọn ảnh chụp hết hạn', async () => {
    h.clock.advance(25 * 3_600_000);
    expect((await read(syncId)).status).toBe(404);
    session().friendList = [];
    const r = await act('channel.sync_contacts', { channel_account_id: A });
    expect(r.status).toBe(202);
    const db = await tenant();
    expect(await db.channelContactSync.findUnique({ where: { id: syncId } })).toBeNull();
    expect(await db.channelContactSnapshot.count({ where: { syncId } })).toBe(0);
  });
});

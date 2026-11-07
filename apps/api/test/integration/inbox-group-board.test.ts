// TIP-025b P7 — §A.6 sao chép link tham gia (lệnh đọc bền qua worker giữ phiên: link tắt → không URL, không bao giờ bật; URL mã hoá trong
// kết quả, chỉ người yêu cầu đọc trong 10 phút; Trợ lý / thiếu inbox.manage bị từ chối) + §A.7 bảng tin có trang (tin ghim, ảnh / tệp /
// link / ghi chú; xoá / thu hồi / trước mốc xoá lịch sử không hiện; link chỉ http(s); ngoài scope 404; EXPLAIN index theo loại).
// Chưa nghiệm thu với Zalo thật (fake transport).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { fakeZaloTransport } from '@appchat/channels';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry } from '@appchat/db';
import { CHANNELS_RUNTIME, CLOCK, ChannelsJobsModule, KernelModule, LOGGER, createLogger, uuidv7 } from '@appchat/core';
import { groupBoardSchema, groupCommandSchema } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';
import { startWorker, until, type WorkerHarness } from './worker.harness';

const chEnv = { ...env, LOG_LEVEL: 'silent', ZALO_TRANSPORT: 'fake', CHANNEL_SEND_JITTER: '0' };

let h: Harness;
let jobs: WorkerHarness;
let ch: TestingModule;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
let acc = '';
let group = '';
let gid = '';

type Body = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as Body });
const hdr = (who?: { token: string }): Record<string, string> => (who ? { authorization: `Bearer ${who.token}` } : {});
const act = (id: string, input: unknown, who?: { token: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...hdr(who) }).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, hdr(who)).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const runtime = () => ch.get(CHANNELS_RUNTIME).runtime;
const session = () => fakeZaloTransport.session(acc)!;
const cmd = async (id: string) => groupCommandSchema.parse((await get(`/inbox/group-commands/${id}`)).body.data);
const done = (id: string) => until(async () => (await cmd(id)).state !== 'pending', 15_000);

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
  const r = await act('channel.zalo.start_login', { label: 'Zalo nhóm 025b' });
  acc = r.body.data.result.channel_account_id;
  expect(await until(async () => (await (await tenant()).channelAccount.findUniqueOrThrow({ where: { id: acc } })).status === 'connected')).toBe(true);
  expect(await until(() => runtime().sessions!.isHeld(acc))).toBe(true);
  gid = `${session().ownId}-gx`;
  session().remoteGroups.set(gid, { groupId: gid, name: 'Khách VIP', totalMember: 3, memberIds: ['zl_a', 'zl_b', session().ownId], creatorId: 'zl_a', adminIds: [session().ownId], version: '7', link: null });
  group = uuidv7();
  const t = await tenant();
  await t.conversation.create({ data: { id: group, channelAccountId: acc, channelType: 'zalo_personal', kind: 'group', externalThreadId: gid, title: 'Khách VIP', groupAiPolicy: 'mention', lastMessageAt: h.clock.now() } });
  await t.conversationParticipant.createMany({ data: [{ conversationId: group, externalId: 'zl_a', displayName: 'A' }, { conversationId: group, externalId: 'zl_b', displayName: 'B' }] });
}, 120_000);
afterAll(async () => {
  await ch?.close();
  await jobs?.close();
  await resolver?.close();
  await h?.close();
});

describe('sao chép link tham gia (§A.6)', () => {
  it('link tắt → enabled false, không URL; không bao giờ bật link', async () => {
    const r = await act('group.copy_link', { conversation_id: group });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const id = r.body.data.result.command_id;
    expect(await done(id)).toBe(true);
    expect((await cmd(id)).link).toEqual({ enabled: false, url: null });
    expect(session().remoteGroups.get(gid)!.link).toBeNull();
  });

  it('link bật → chỉ người yêu cầu thấy URL, trong 10 phút; DB chỉ giữ bản mã hoá', async () => {
    session().remoteGroups.get(gid)!.link = 'https://zalo.me/g/secret025b';
    const id = (await act('group.copy_link', { conversation_id: group })).body.data.result.command_id;
    expect(await done(id)).toBe(true);
    expect((await cmd(id)).link).toEqual({ enabled: true, url: 'https://zalo.me/g/secret025b' });
    const row = await (await tenant()).groupCommand.findUniqueOrThrow({ where: { id } });
    expect(JSON.stringify(row.result)).not.toContain('secret025b');
    const mgr = await h.member('manager');
    expect((await get(`/inbox/group-commands/${id}`, mgr)).status).toBe(404);
    h.clock.advance(11 * 60_000);
    expect((await cmd(id)).link).toEqual({ enabled: true, url: null });
  });

  it('nguồn Trợ lý / sales không inbox.manage → từ chối', async () => {
    expect((await call(h, '/actions/group.copy_link', { input: { conversation_id: group } }, { 'idempotency-key': uuidv7(), 'x-action-source': 'assistant' }).then(json)).status).not.toBe(200);
    expect((await act('group.copy_link', { conversation_id: group }, sales)).status).toBe(403);
  });
});

describe('bảng tin nhóm (§A.7)', () => {
  it('tin ghim + ảnh / tệp / link / ghi chú theo trang; tin xoá / thu hồi / trước mốc xoá lịch sử không hiện', async () => {
    const t = await tenant();
    const at = (s: number) => new Date(h.clock.now().getTime() - s * 1000);
    const mk = (kind: 'text' | 'image' | 'file' | 'note', body: string, s: number, extra: Record<string, unknown> = {}) =>
      t.message.create({ data: { id: uuidv7(), conversationId: group, channelAccountId: acc, kind, body, direction: kind === 'note' ? null : 'in', senderType: kind === 'note' ? 'user' : 'contact', senderName: 'A', createdAt: at(s), ...extra } });
    const old = await mk('image', 'cũ.png', 900);
    await t.conversation.update({ where: { id: group }, data: { clearedAt: at(800) } });
    const pin = await mk('text', 'Lịch họp nhóm thứ 2', 500);
    await t.conversation.update({ where: { id: group }, data: { pinnedMessageId: pin.id } });
    for (let i = 0; i < 30; i++) await mk('image', `anh-${i}.png`, 400 - i, { attachments: [{ name: `anh-${i}.png`, mime: 'image/png', size: 100, url: 'https://files.local/x' }] });
    await mk('image', 'xoa.png', 100, { deletedAt: h.clock.now() });
    await mk('file', 'bao-gia.pdf', 90, { attachments: [{ name: 'bao-gia.pdf', mime: 'application/pdf', size: 2048 }] });
    await mk('text', 'Xem https://example.com/menu, và javascript:alert(1)', 80);
    await mk('note', 'Ghi chú nội bộ: khách VIP', 70);
    const p1 = groupBoardSchema.parse((await get(`/conversations/${group}/group/board?kind=media`)).body.data);
    expect(p1.pinned?.text).toBe('Lịch họp nhóm thứ 2');
    expect(p1.items).toHaveLength(24);
    expect(p1.items.map((x) => x.name)).not.toContain('xoa.png');
    const p2 = groupBoardSchema.parse((await get(`/conversations/${group}/group/board?kind=media&cursor=${p1.next_cursor}`)).body.data);
    expect(p2.items).toHaveLength(6);
    expect(p2.next_cursor).toBeNull();
    expect([...p1.items, ...p2.items].map((x) => x.message_id)).not.toContain(old.id);
    const files = groupBoardSchema.parse((await get(`/conversations/${group}/group/board?kind=files`)).body.data);
    expect(files.items[0]).toMatchObject({ name: 'bao-gia.pdf', mime: 'application/pdf', size: 2048 });
    const links = groupBoardSchema.parse((await get(`/conversations/${group}/group/board?kind=links`)).body.data);
    expect(links.items.map((x) => x.url)).toEqual(['https://example.com/menu']);
    const notes = groupBoardSchema.parse((await get(`/conversations/${group}/group/board?kind=notes`)).body.data);
    expect(notes.items.map((x) => x.text)).toEqual(['Ghi chú nội bộ: khách VIP']);
    expect((await get(`/conversations/${group}/group/board?kind=bad`)).status).toBe(400);
  });

  it('ngoài scope → 404; EXPLAIN dùng index theo loại', async () => {
    expect((await get(`/conversations/${group}/group/board`, sales)).status).toBe(404);
    const t = await tenant();
    await t.$executeRawUnsafe('SET enable_seqscan = off');
    const plan = (await t.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN SELECT id FROM message WHERE conversation_id = '${group}' AND kind = 'image' AND deleted_at IS NULL AND recalled_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 25`)).map((r) => r['QUERY PLAN']).join(' | ');
    await t.$executeRawUnsafe('RESET enable_seqscan');
    expect(plan).toMatch(/message_conversation_kind_idx/);
  });
});

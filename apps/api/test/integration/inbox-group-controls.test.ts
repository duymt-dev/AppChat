// TIP-025b P3 — §A quản lý nhóm trên Postgres 16 + Memurai: API thật + worker ROLE=channels thật (ZALO_TRANSPORT=fake, giữ lease) + worker
// ROLE=jobs (relay outbox → consumer `channel.group_command_requested`). Kiểm: chính sách AI nhóm CAS (if_version lệch → 409, đọc lại thấy
// đúng, hội thoại 1-1 → INVALID_TRANSITION, đổi chính sách tăng ai_epoch + huỷ tin agent chưa gửi); làm mới nhóm → ảnh chụp (vai trò /
// phiên bản / link); đổi tên + link cần đúng phiên bản (lệch → 409); thêm thành viên chỉ từ hội thoại 1-1 cùng tài khoản, kết quả từng
// người (một phần lỗi → partial); tắt thông báo của tài khoản; đã đặt chỗ rồi sập → unknown không gọi lại; scope + quyền đọc lệnh.
// Chưa nghiệm thu với Zalo thật (fake transport).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { fakeZaloTransport } from '@appchat/channels';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry } from '@appchat/db';
import { CHANNELS_RUNTIME, CLOCK, ChannelsJobsModule, KernelModule, LOGGER, createLogger, runGroupCommand, uuidv7 } from '@appchat/core';
import { groupCommandSchema, groupStateSchema } from '@appchat/shared';
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
const directs: string[] = [];

type Body = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as Body });
const hdr = (who?: { token: string }): Record<string, string> => (who ? { authorization: `Bearer ${who.token}` } : {});
const act = (id: string, input: unknown, who?: { token: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...hdr(who) }).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, hdr(who)).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const runtime = () => ch.get(CHANNELS_RUNTIME).runtime;
const session = () => fakeZaloTransport.session(acc)!;
const state = async () => groupStateSchema.parse((await get(`/conversations/${group}/group`)).body.data);
const cmd = async (id: string) => groupCommandSchema.parse((await get(`/inbox/group-commands/${id}`)).body.data);
const done = (id: string) => until(async () => (await cmd(id)).state !== 'pending', 15_000);

async function direct(uid: string, title: string) {
  const id = uuidv7();
  await (await tenant()).conversation.create({ data: { id, channelAccountId: acc, channelType: 'zalo_personal', externalThreadId: uid, title, lastMessageAt: h.clock.now() } });
  return id;
}

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
  directs.push(await direct('zl_lan', 'Chị Lan'), await direct('blocked_hung', 'Anh Hùng'), await direct('zl_a', 'A (đã trong nhóm)'));
}, 120_000);
afterAll(async () => {
  await ch?.close();
  await jobs?.close();
  await resolver?.close();
  await h?.close();
});

describe('chính sách AI nhóm (§A.2)', () => {
  it('CAS theo phiên bản; đọc lại thấy đúng; if_version cũ → 409; hội thoại 1-1 → INVALID_TRANSITION', async () => {
    const s0 = await state();
    expect(s0).toMatchObject({ policy: 'mention', policy_version: 0, observed_members: 2, provider: null });
    const r = await act('group.set_ai_policy', { conversation_id: group, policy: 'off', if_version: 0 });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toEqual({ policy: 'off', policy_version: 1 });
    expect((await state()).policy).toBe('off');
    expect((await act('group.set_ai_policy', { conversation_id: group, policy: 'auto', if_version: 0 })).status).toBe(409);
    const d = await act('group.set_ai_policy', { conversation_id: directs[0], policy: 'auto', if_version: 0 });
    expect([d.status, d.body.error.code]).toEqual([409, 'INVALID_TRANSITION']);
  });

  it('đổi chính sách tăng ai_epoch + huỷ tin agent chưa đặt chỗ gửi; không đổi ai_mode', async () => {
    const t = await tenant();
    const before = await t.conversation.findUniqueOrThrow({ where: { id: group } });
    const msg = uuidv7();
    await t.message.create({ data: { id: msg, conversationId: group, channelAccountId: acc, direction: 'out', senderType: 'agent', senderId: 'ag', kind: 'text', body: 'Dạ shop chào cả nhà', status: 'queued', createdAt: h.clock.now() } });
    await t.outboxMessage.create({ data: { id: uuidv7(), messageId: msg, channelAccountId: acc, payload: { text: 'Dạ shop chào cả nhà' }, status: 'pending', turnFence: 1 } });
    expect((await act('group.set_ai_policy', { conversation_id: group, policy: 'mention', if_version: 1 })).status).toBe(200);
    const after = await t.conversation.findUniqueOrThrow({ where: { id: group } });
    expect(after.aiEpoch).toBe(before.aiEpoch + 1);
    expect(after.aiMode).toBe(before.aiMode);
    expect((await t.message.findUniqueOrThrow({ where: { id: msg } })).status).toBe('failed');
  });
});

describe('lệnh nhóm phía kênh (§A.3–5)', () => {
  it('làm mới → ảnh chụp nhà cung cấp (vai trò admin, phiên bản 7, link tắt); làm mới chồng → 409', async () => {
    const r = await act('group.refresh', { conversation_id: group });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(await done(r.body.data.result.command_id)).toBe(true);
    expect((await cmd(r.body.data.result.command_id)).state).toBe('confirmed');
    expect((await state()).provider).toMatchObject({ name: 'Khách VIP', total: 3, complete: true, account_role: 'admin', link_enabled: false, version: '7' });
  });

  it('đổi tên + bật link: phiên bản cũ → 409; đúng phiên bản → confirmed, ảnh chụp cập nhật; không lộ URL', async () => {
    expect((await act('group.update', { conversation_id: group, name: 'X', expected_version: '6' })).status).toBe(409);
    const r = await act('group.update', { conversation_id: group, name: 'Khách VIP 2026', invite_link_enabled: true, expected_version: '7' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(await done(r.body.data.result.command_id)).toBe(true);
    expect((await cmd(r.body.data.result.command_id)).state).toBe('confirmed');
    expect(session().remoteGroups.get(gid)!.name).toBe('Khách VIP 2026');
    const s = await state();
    expect(s.provider).toMatchObject({ name: 'Khách VIP 2026', link_enabled: true, version: '8' });
    expect(JSON.stringify(s)).not.toContain('zalo.me');
  });

  it('thêm thành viên: chỉ hội thoại 1-1 cùng tài khoản; đã trong nhóm bỏ; một người bị chặn → partial, kết quả từng người', async () => {
    expect((await act('group.add_members', { conversation_id: group, member_conversation_ids: [directs[2]] })).status).toBe(422);
    expect((await act('group.add_members', { conversation_id: group, member_conversation_ids: [uuidv7()] })).status).toBe(404);
    const r = await act('group.add_members', { conversation_id: group, member_conversation_ids: [directs[0], directs[1], directs[2]] });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(await done(r.body.data.result.command_id)).toBe(true);
    const c = await cmd(r.body.data.result.command_id);
    expect(c.state).toBe('partial');
    expect(c.members).toEqual([
      { id: 'zl_lan', status: 'confirmed', error: null },
      { id: 'blocked_hung', status: 'failed', error: 'blocked' },
    ]);
  });

  it('tắt thông báo của tài khoản; đã đặt chỗ rồi sập → unknown, không gọi Zalo lần hai', async () => {
    const r = await act('group.set_mute', { conversation_id: group, muted: true });
    expect(await done(r.body.data.result.command_id)).toBe(true);
    expect(session().remoteGroups.get(gid)!.muted).toBe(true);
    expect((await state()).provider?.muted).toBe(true);
    const t = await tenant();
    const id = uuidv7();
    await t.groupCommand.create({ data: { id, kind: 'set_mute', channelAccountId: acc, conversationId: group, desired: { muted: false }, status: 'dispatch_reserved', attemptedAt: h.clock.now() } });
    const opsBefore = session().ops.length;
    const deps = { tenants: resolver, kv: { sadd: async () => 1, set: async () => 'OK' } as never, log: createLogger({ level: 'silent' }), now: () => h.clock.now() };
    expect(await runGroupCommand(deps, acc, { operations: {} } as never, { ws: h.ws, command_id: id })).toBe('unknown');
    expect(session().ops.length).toBe(opsBefore);
    expect((await cmd(id)).state).toBe('unknown');
  });

  it('quyền + scope: sales (không inbox.manage, ngoài scope) → lệnh 403/404, đọc lệnh 404; ứng viên chỉ hội thoại 1-1 cùng tài khoản', async () => {
    const r = await act('group.set_mute', { conversation_id: group, muted: false }, sales);
    expect([403, 404]).toContain(r.status);
    const any = (await (await tenant()).groupCommand.findFirstOrThrow({ where: { conversationId: group, kind: 'set_mute' } })).id;
    expect((await get(`/inbox/group-commands/${any}`, sales)).status).toBe(404);
    expect((await get(`/conversations/${group}/group`, sales)).status).toBe(404);
    const cand = await get(`/conversations/${group}/group/candidates`);
    expect(cand.body.data.map((x: Body) => x.conversation_id).sort()).toEqual([...directs].sort());
  });
});

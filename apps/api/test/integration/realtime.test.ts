// TIP-006 AC7–AC10 trên Memurai thật: Socket.IO `/ws` (socket.io-client), handshake JWT + membership, phòng ws / user / conv,
// presence, typing, lọc quyền khi phát, member.role_changed / member.removed, fan-out từ worker (redis-emitter) sang API.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import IORedis from 'ioredis';
import { RedisRealtimeEmitter, registerConversationGuard, uuidv7, type RealtimeEnvelope } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';
import { startWorker, until, type WorkerHarness } from './worker.harness';

let h: Harness;
let w: WorkerHarness;
let emitter: RedisRealtimeEmitter;
const open: Socket[] = [];

beforeAll(async () => {
  h = await startApi();
  w = await startWorker(h.platform, { clock: h.clock });
  emitter = new RedisRealtimeEmitter(new IORedis(env.REDIS_URL!));
});
afterAll(async () => {
  open.forEach((s) => s.disconnect());
  registerConversationGuard(null);
  await emitter?.close();
  await w?.close();
  await h?.close();
});

type Got = { event: string; data: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Kết nối `/ws`; trả socket + hộp thư mọi sự kiện server → client. */
async function connect(token: string | undefined, ws = h.ws): Promise<{ s: Socket; got: Got[] }> {
  const s = io(`${h.base}/ws`, { auth: { token, workspace_id: ws }, transports: ['websocket'], reconnection: false, forceNew: true });
  open.push(s);
  const got: Got[] = [];
  s.onAny((event, data) => got.push({ event, data }));
  await new Promise<void>((resolve, reject) => {
    s.once('connect', () => resolve());
    s.once('connect_error', (e) => reject(e));
  });
  return { s, got };
}

const connectError = async (token: string | undefined, ws = h.ws) =>
  connect(token, ws).then(
    () => 'connected',
    (e: Error & { data?: { code: string } }) => e.data?.code ?? e.message,
  );

const ack = (s: Socket, ev: string, p: unknown) => s.timeout(5000).emitWithAck(ev, p) as Promise<{ data?: any; error?: { code: string } }>; // eslint-disable-line @typescript-eslint/no-explicit-any
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('handshake', () => {
  it('AC7 không token / token sai / hết hạn / không phải thành viên → từ chối', async () => {
    expect(await connectError(undefined)).toBe('UNAUTHENTICATED');
    expect(await connectError('abc.def.ghi')).toBe('UNAUTHENTICATED');
    const stale = h.tokenFor(h.user);
    h.clock.advance(16 * 60_000);
    expect(await connectError(stale)).toBe('UNAUTHENTICATED');
    h.clock.advance(-16 * 60_000);
    expect(await connectError(h.tokenFor(h.user), uuidv7())).toBe('FORBIDDEN');
    expect(await connectError(h.tokenFor(h.user), 'not-a-uuid')).toBe('FORBIDDEN');
  });
});

describe('phòng + client → server', () => {
  it('AC7 notification.new chỉ tới đúng user; presence; conv.join cần inbox.view + guard; typing tới người khác', async () => {
    const sales = await h.member('sales');
    const acct = await h.member('accountant');
    const owner = await connect(h.tokenFor(h.user));
    const a = await connect(sales.token);
    expect(await until(() => owner.got.some((g) => g.event === 'presence' && g.data.user_id === sales.id && g.data.online))).toBe(true);
    const list = await ack(owner.s, 'presence.list', {});
    expect(list.data.user_ids).toEqual([h.user, sales.id].sort());

    // Worker xin gửi thông báo cho sales → chỉ socket của sales nhận notification.new.
    await w.emit(h.ws, 'notify.requested', { kind: 'msg_assigned', to: { user_ids: [sales.id] }, params: { contact: 'Lan' } });
    expect(await until(() => a.got.some((g) => g.event === 'notification.new'))).toBe(true);
    expect(a.got.find((g) => g.event === 'notification.new')!.data).toMatchObject({ kind: 'msg_assigned', title: 'Hội thoại mới được gán cho bạn: Lan', toast: true });
    await sleep(300);
    expect(owner.got.some((g) => g.event === 'notification.new')).toBe(false);

    const conv = uuidv7();
    // Guard thật của Inbox (TIP-016): hội thoại không tồn tại / ngoài scope → SCOPE_FORBIDDEN; kế toán không có inbox.view → FORBIDDEN.
    expect((await ack(a.s, 'conv.join', { conversation_id: conv })).error?.code).toBe('SCOPE_FORBIDDEN');
    const k = await connect(acct.token);
    expect((await ack(k.s, 'conv.join', { conversation_id: conv })).error?.code).toBe('FORBIDDEN');
    registerConversationGuard(async ({ userId, conversationId }) => conversationId === conv && userId !== 'nobody');
    expect((await ack(a.s, 'conv.join', { conversation_id: conv })).data).toEqual({ ok: true });
    expect((await ack(owner.s, 'conv.join', { conversation_id: conv })).data).toEqual({ ok: true });
    expect((await ack(owner.s, 'conv.join', { conversation_id: uuidv7() })).error?.code).toBe('SCOPE_FORBIDDEN');
    expect((await ack(owner.s, 'conv.join', { conversation_id: 'x' })).error?.code).toBe('VALIDATION_FAILED');

    expect((await ack(a.s, 'typing', { conversation_id: conv })).data).toEqual({ ok: true });
    expect(await until(() => owner.got.some((g) => g.event === 'typing' && g.data.user_id === sales.id))).toBe(true);
    expect(a.got.some((g) => g.event === 'typing')).toBe(false);
    // Không ở trong phòng → không được phát typing.
    expect((await ack(k.s, 'typing', { conversation_id: conv })).error?.code).toBe('FORBIDDEN');
    expect((await ack(a.s, 'conv.leave', { conversation_id: conv })).data).toEqual({ ok: true });

    k.s.disconnect();
    expect(await until(() => owner.got.some((g) => g.event === 'presence' && g.data.user_id === acct.id && g.data.online === false))).toBe(true);
    a.s.disconnect();
    owner.s.disconnect();
  });
});

describe('phát có lọc quyền (fan-out worker → API)', () => {
  it('AC8 + AC10 require.permission / require.scope; emitter trong process riêng tới socket của API', async () => {
    const salesA = await h.member('sales');
    const salesB = await h.member('sales');
    const acct = await h.member('accountant');
    const [a, b, k, o] = [await connect(salesA.token), await connect(salesB.token), await connect(acct.token), await connect(h.tokenFor(h.user))];
    const env = (over: Partial<RealtimeEnvelope>): RealtimeEnvelope => ({ ws: h.ws, rooms: [`ws:${h.ws}`], event: 'conversation.updated', data: { n: Math.random() }, ...over });

    emitter.publish(env({ require: { permission: 'inbox.view' } }));
    expect(await until(() => a.got.some((g) => g.event === 'conversation.updated') && o.got.some((g) => g.event === 'conversation.updated'))).toBe(true);
    await sleep(300);
    expect(k.got.some((g) => g.event === 'conversation.updated')).toBe(false);

    // Bản ghi của sales A — crm: sales `own`, kế toán `all` (Blueprint §3.5) → A + Owner + Kế toán nhận, B không.
    emitter.publish(env({ event: 'contact.updated', require: { scope: { module: 'crm', row: { ownerUserId: salesA.id }, fields: { owner: 'ownerUserId' } } } }));
    expect(await until(() => [a, o, k].every((x) => x.got.some((g) => g.event === 'contact.updated')))).toBe(true);
    await sleep(300);
    expect(b.got.some((g) => g.event === 'contact.updated')).toBe(false);
    // booking: kế toán `none` → không nhận dù bản ghi là của chính mình.
    emitter.publish(env({ event: 'appointment.updated', require: { scope: { module: 'booking', row: { ownerUserId: acct.id }, fields: { owner: 'ownerUserId' } } } }));
    expect(await until(() => o.got.some((g) => g.event === 'appointment.updated'))).toBe(true);
    await sleep(300);
    expect(k.got.some((g) => g.event === 'appointment.updated')).toBe(false);

    // Workspace khác trong envelope → không ai nhận (phòng ws: trùng tên vẫn bị lọc theo workspace của socket).
    emitter.publish(env({ ws: uuidv7(), event: 'leak.check' }));
    await sleep(500);
    expect([a, b, k, o].some((x) => x.got.some((g) => g.event === 'leak.check'))).toBe(false);
    [a, b, k, o].forEach((x) => x.s.disconnect());
  });
});

describe('đổi / gỡ thành viên', () => {
  it('AC9 member.role_changed → authz.changed + lọc theo vai trò mới; member.removed → ngắt', async () => {
    const m = await h.member('accountant');
    const c = await connect(m.token);
    const inboxEnv = (tag: string): RealtimeEnvelope => ({ ws: h.ws, rooms: [`ws:${h.ws}`], event: 'inbox.ping', data: { tag }, require: { permission: 'inbox.view' } });
    emitter.publish(inboxEnv('before'));
    await sleep(500);
    expect(c.got.some((g) => g.event === 'inbox.ping')).toBe(false);

    await h.platform.membership.update({ where: { workspaceId_userId: { workspaceId: h.ws, userId: m.id } }, data: { roleKey: 'sales' } });
    await w.emit(h.ws, 'member.role_changed', { user_id: m.id, role_key: 'sales' });
    expect(await until(() => c.got.some((g) => g.event === 'authz.changed'))).toBe(true);
    emitter.publish(inboxEnv('after'));
    expect(await until(() => c.got.some((g) => g.event === 'inbox.ping' && g.data.tag === 'after'))).toBe(true);

    const gone = new Promise<string>((r) => c.s.once('disconnect', (reason) => r(reason)));
    await h.platform.membership.update({ where: { workspaceId_userId: { workspaceId: h.ws, userId: m.id } }, data: { status: 'removed' } });
    await w.emit(h.ws, 'member.removed', { user_id: m.id });
    expect(await gone).toBe('io server disconnect');
    expect(await connectError(m.token)).toBe('FORBIDDEN');
  });

  it('HTTP + WS dùng chung một người gọi: /me/authz vẫn chạy khi socket mở', async () => {
    const o = await connect(h.tokenFor(h.user));
    expect((await call(h, '/me/authz')).status).toBe(200);
    o.s.disconnect();
  });
});

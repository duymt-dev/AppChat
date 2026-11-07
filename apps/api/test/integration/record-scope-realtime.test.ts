// TIP-042c AC7 — realtime theo policy ĐỌC chung (DC-299, D32): event hội thoại tới người được gán / phụ trách khách / nhóm hội thoại /
// collaborator + watcher của khách (tra quan hệ lúc phát); người ngoài (cùng workspace) không nhận, không vào phòng `conv:{id}`; gỡ watcher →
// event kế tiếp không nhận (không theo payload / cache cũ); scope none không nhận dù là người được gán. Ticket: nhóm ticket, không mở theo
// quan hệ khách CRM.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import IORedis from 'ioredis';
import { AuthzResolver, POLICIES, RedisRealtimeEmitter, uuidv7, type RealtimeEnvelope } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { env, startApi, type Harness } from './setup';
import { until } from './worker.harness';
import { seedBase, seedRecords, type RecordSet } from './helpers/record-scope-fixtures';

let h: Harness;
let resolver: TenantDbResolver;
let emitter: RedisRealtimeEmitter;
const open: Socket[] = [];
let owner: { id: string; token: string };
let W: { id: string; token: string };
let X: { id: string; token: string };
let T: { id: string; token: string };
let team: string;
let rec: RecordSet;

type Got = { event: string; data: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));

async function connect(token: string): Promise<{ s: Socket; got: Got[] }> {
  const s = io(`${h.base}/ws`, { auth: { token, workspace_id: h.ws }, transports: ['websocket'], reconnection: false, forceNew: true });
  open.push(s);
  const got: Got[] = [];
  s.onAny((event, data) => got.push({ event, data }));
  await new Promise<void>((resolve, reject) => {
    s.once('connect', () => resolve());
    s.once('connect_error', (e) => reject(e));
  });
  return { s, got };
}
const ack = (s: Socket, ev: string, p: unknown) => s.timeout(5000).emitWithAck(ev, p) as Promise<{ data?: unknown; error?: { code: string } }>;

/** Envelope hội thoại như luật inbox (convRecord) — nonce để phân biệt từng lần phát. */
const convEnv = (n: number, assignee: string | null = owner.id): RealtimeEnvelope => ({
  ws: h.ws,
  rooms: [`ws:${h.ws}`],
  event: 'conversation.updated',
  data: { conversation_id: rec.conversation, n },
  require: { permission: 'inbox.view', record: { policy: POLICIES.inbox, ref: { assignee, team: null, contact: rec.contact }, mineUserId: owner.id } },
});
const has = (x: { got: Got[] }, n: number) => x.got.some((g) => g.event === 'conversation.updated' && g.data?.n === n);

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  emitter = new RedisRealtimeEmitter(new IORedis(env.REDIS_URL!));
  [owner, W, X, T] = [await h.member('sales'), await h.member('sales'), await h.member('sales'), await h.member('sales')];
  const db = await tenant();
  team = uuidv7();
  await db.team.create({ data: { id: team, name: 'Nhóm realtime' } });
  await db.teamMember.create({ data: { teamId: team, userId: T.id } });
  rec = await seedRecords(db, { ...(await seedBase(db, h.clock.now())), owner: owner.id, team: null, at: h.clock.now() });
  await db.contactCollaborator.create({ data: { contactId: rec.contact, userId: W.id, role: 'watcher' } });
  await h.app.get(AuthzResolver).invalidate(h.ws);
}, 240_000);
afterAll(async () => {
  open.forEach((s) => s.disconnect());
  await emitter?.close();
  await resolver?.close();
  await h?.close();
});

describe('AC7 realtime theo policy đọc', () => {
  it('phụ trách + watcher nhận, người ngoài không; watcher vào phòng hội thoại, người ngoài SCOPE_FORBIDDEN', async () => {
    const [o, w, x] = [await connect(owner.token), await connect(W.token), await connect(X.token)];
    emitter.publish(convEnv(1));
    expect(await until(() => has(o, 1) && has(w, 1))).toBe(true);
    await sleep(300);
    expect(has(x, 1)).toBe(false);
    expect((await ack(w.s, 'conv.join', { conversation_id: rec.conversation })).data).toEqual({ ok: true });
    expect((await ack(x.s, 'conv.join', { conversation_id: rec.conversation })).error?.code).toBe('SCOPE_FORBIDDEN');
  });

  it('gỡ watcher → event kế tiếp không nhận, vào phòng bị chặn (tra quan hệ lúc phát, không theo payload)', async () => {
    const w = await connect(W.token);
    const db = await tenant();
    await db.contactCollaborator.delete({ where: { contactId_userId: { contactId: rec.contact, userId: W.id } } });
    emitter.publish(convEnv(2));
    const o = await connect(owner.token);
    emitter.publish(convEnv(3));
    expect(await until(() => has(o, 3))).toBe(true);
    await sleep(300);
    expect(has(w, 2) || has(w, 3)).toBe(false);
    expect((await ack(w.s, 'conv.join', { conversation_id: rec.conversation })).error?.code).toBe('SCOPE_FORBIDDEN');
    await db.contactCollaborator.create({ data: { contactId: rec.contact, userId: W.id, role: 'watcher' } });
  });

  it('nhóm: team_id hội thoại ∈ nhóm người xem (scope team) mới nhận — không suy từ đồng đội', async () => {
    const db = await tenant();
    const key = `custom:rt_team_${uuidv7().slice(-6)}`;
    await db.role.create({ data: { id: uuidv7(), key, name: key, permissions: ['inbox.view'], dataScope: { inbox: 'team' } } });
    await h.platform.membership.update({ where: { workspaceId_userId: { workspaceId: h.ws, userId: T.id } }, data: { roleKey: key } });
    await h.app.get(AuthzResolver).invalidate(h.ws);
    const t = await connect(T.token);
    emitter.publish(convEnv(4));
    const withTeam: RealtimeEnvelope = { ...convEnv(5), require: { permission: 'inbox.view', record: { policy: POLICIES.inbox, ref: { assignee: owner.id, team, contact: rec.contact }, mineUserId: owner.id } } };
    emitter.publish(withTeam);
    expect(await until(() => has(t, 5))).toBe(true);
    expect(has(t, 4)).toBe(false);
  });

  it('scope none: không nhận dù là người được gán', async () => {
    const db = await tenant();
    const key = `custom:rt_none_${uuidv7().slice(-6)}`;
    await db.role.create({ data: { id: uuidv7(), key, name: key, permissions: ['inbox.view'], dataScope: { inbox: 'none' } } });
    await h.platform.membership.update({ where: { workspaceId_userId: { workspaceId: h.ws, userId: X.id } }, data: { roleKey: key } });
    await h.app.get(AuthzResolver).invalidate(h.ws);
    const [x, o] = [await connect(X.token), await connect(owner.token)];
    emitter.publish({ ...convEnv(6, X.id) });
    expect(await until(() => has(o, 6))).toBe(true);
    await sleep(300);
    expect(has(x, 6)).toBe(false);
  });

  it('ticket: không mở theo quan hệ khách CRM (watcher không nhận ticket của khách)', async () => {
    const [w, o] = [await connect(W.token), await connect(owner.token)];
    const tEnv: RealtimeEnvelope = { ws: h.ws, rooms: [`ws:${h.ws}`], event: 'ticket.updated', data: { n: 7 }, require: { permission: 'ticket.view', record: { policy: POLICIES.support, ref: { assignee: owner.id, team: null }, mineUserId: null } } };
    emitter.publish(tEnv);
    expect(await until(() => o.got.some((g) => g.event === 'ticket.updated' && g.data?.n === 7))).toBe(true);
    await sleep(300);
    expect(w.got.some((g) => g.event === 'ticket.updated')).toBe(false);
  });
});

// TIP-023c SPEC vận hành trên Postgres 16 + Memurai: dọn sổ sự kiện stream Trợ lý quá 24h theo lô (Clock), giữ sự kiện chưa hạn, KHÔNG
// xoá tin của phiên (`assistant_message`); workspace sạch thì rời tập `assistant:events:armed`; replay sau khi dọn → reset_required.
// EXPLAIN lô xoá dùng `assistant_event_expires_at_idx`.
import 'reflect-metadata';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EventStore, EVENTS_ARMED_KEY, pruneArmedEvents, PRUNE_BATCH, REDIS, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const T0 = new Date('2026-10-05T08:00:00.000Z');

describe('dọn sự kiện stream', () => {
  it('xoá quá hạn theo lô, giữ chưa hạn + tin phiên; workspace sạch rời tập armed; replay → reset_required', async () => {
    const db = await tenant();
    const oldRun = uuidv7();
    const newRun = uuidv7();
    // Ghi theo Clock: run cũ lúc T0 (hết hạn T0 + 24h), run mới lúc T0 + 30h.
    const oldStore = new EventStore(db, () => T0);
    const n = PRUNE_BATCH + 7;
    for (let i = 0; i < n; i++) await oldStore.append(oldRun, { type: 'delta', text: `x${i}` });
    await new EventStore(db, () => new Date(T0.getTime() + 30 * 3600_000)).append(newRun, { type: 'delta', text: 'mới' });
    const sid = uuidv7();
    await db.assistantSession.create({ data: { id: sid, userId: h.user, title: 'Giữ lịch sử', mode: 'chat', lastMessageAt: T0, createdAt: T0 } });
    await db.assistantMessage.create({ data: { id: uuidv7(), sessionId: sid, role: 'user', content: { parts: [{ type: 'text', text: 'giữ' }] }, runId: oldRun, createdAt: T0 } });

    const redis = h.app.get(REDIS, { strict: false });
    await redis.sadd(EVENTS_ARMED_KEY, h.ws);
    const armed = { list: async () => [h.ws], remove: async (ws: string) => void (await redis.srem(EVENTS_ARMED_KEY, ws)) };
    const errors: unknown[] = [];
    const at = new Date(T0.getTime() + 25 * 3600_000);
    const deleted = await pruneArmedEvents(armed, async () => db, () => at, (_ws, e) => errors.push(e));
    expect(errors).toEqual([]);
    expect(deleted).toBe(n);
    expect(await db.assistantEvent.count({ where: { runId: oldRun } })).toBe(0);
    expect(await db.assistantEvent.count({ where: { runId: newRun } })).toBe(1);
    expect(await db.assistantMessage.count({ where: { sessionId: sid } })).toBe(1);
    // Còn sự kiện chưa hạn → vẫn trong tập.
    expect(await redis.sismember(EVENTS_ARMED_KEY, h.ws)).toBe(1);
    expect(await new EventStore(db, () => at).after(oldRun, 3)).toBe('reset_required');

    // Lượt sau khi run mới cũng hết hạn → sạch → rời tập.
    await pruneArmedEvents(armed, async () => db, () => new Date(T0.getTime() + 60 * 3600_000), (_ws, e) => errors.push(e));
    expect(await db.assistantEvent.count({ where: { runId: { in: [oldRun, newRun] } } })).toBe(0);
    expect(await redis.sismember(EVENTS_ARMED_KEY, h.ws)).toBe(0);
  });

  it('EXPLAIN lô xoá dùng index expires_at', async () => {
    const ws = await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } });
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${ws.dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const plan = (await c.query(`EXPLAIN SELECT id FROM assistant_event WHERE expires_at < now() ORDER BY expires_at, id LIMIT ${PRUNE_BATCH}`)).rows.map((x) => x['QUERY PLAN']).join('\n');
      expect(plan).toMatch(/assistant_event_expires_at_idx/);
    } finally {
      await c.end();
    }
  });
});

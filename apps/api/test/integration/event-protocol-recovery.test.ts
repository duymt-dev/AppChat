// TIP-003b AC3 / AC4 / AC5 trên Postgres thật: relay claim có fence (lỗi cũ tới sau thành công mới không ghi đè, attempts không phồng),
// claim hết lease nhận lại; dispatch head — event mới hơn cùng aggregate chờ event cũ đang lỗi, aggregate khác chạy, biên nhận trùng hội
// tụ; projection crash trước commit → không hiệu ứng / không biên nhận, chạy lại đúng một lần; thiếu adapter → chặn, không ACK.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { MemoryWorkspaceRegistry, TenantContexts, TenantDbResolver, TenantProvisioner, tenantDbName } from '@appchat/db';
import { claimDue, dispatchV2, markFailed, markPublished, withEventTransaction, writeOutbox, type EventContract, type RegistryTable } from '@appchat/core';
import { env } from './setup';

const ws = randomUUID();
const registry = new MemoryWorkspaceRegistry();
const provisioner = new TenantProvisioner({ adminUrl: env.PROVISIONER_DATABASE_URL!, templateDb: env.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template', ownerRole: 'appchat_migrator', appRole: 'appchat_tenant_app' });
const resolver = new TenantDbResolver({ registry, baseUrl: env.TENANT_DATABASE_URL! });
const db = () => resolver.get(TenantContexts.system(ws, 'test'));
const now = () => new Date();
const table: RegistryTable = { 'tag.created': [{ consumer: 'fx.counter', mode: 'projection', contract_version: 1 }] };

let fail = new Set<string>();
let crashOnce = new Set<string>();
const counter: EventContract = {
  name: 'fx.counter',
  mode: 'projection',
  contractVersion: 1,
  topics: ['tag.created'],
  async apply(e, tx) {
    if (fail.has(e.id)) throw Object.assign(new Error('boom'), { code: 'FX_FAIL' });
    await tx.$executeRaw`INSERT INTO event_aggregate_counter (kind, id, next_seq) VALUES ('fx.effect', ${e.id}::uuid, 1)`;
    if (crashOnce.delete(e.id)) throw Object.assign(new Error('crash'), { code: 'FX_CRASH' });
    return { kind: 'applied', effectRef: e.id };
  },
};
const contracts = new Map([[counter.name, counter]]);

beforeAll(async () => {
  const { dbName } = await provisioner.provision(ws);
  registry.upsert({ workspaceId: ws, dbName, dbHost: null, dbStatus: 'active', schemaVersion: null });
  const t = await db();
  await t.eventRegistryVersion.create({ data: { version: 1, digest: 'fx-1', contracts: table as object } });
  await t.eventProtocolState.update({ where: { id: 1 }, data: { phase: 'v2', registryVersion: 1 } });
}, 120_000);

afterAll(async () => {
  await resolver.close();
  await provisioner.drop(tenantDbName(ws));
});

beforeEach(() => {
  fail = new Set();
  crashOnce = new Set();
});

const emit = async (tagId: string, n = 1) => {
  const t = await db();
  await withEventTransaction(t, ws, (tx) => writeOutbox(tx, ws, Array.from({ length: n }, () => ({ topic: 'tag.created', payload: { id: tagId } })), new Date()));
  return (await t.outboxEvent.findMany({ where: { aggregateId: tagId }, orderBy: { aggregateSeq: 'asc' }, select: { id: true } })).map((r) => r.id);
};
const effects = async (id: string) => (await db()).eventAggregateCounter.count({ where: { kind: 'fx.effect', id } });
const run = async (id: string) => dispatchV2({ db: await db(), workspaceId: ws, contracts, epoch: 1, now }, id);

describe('relay claim có fence', () => {
  it('lỗi cũ tới sau khi tiến trình khác đã nhận lại + thành công → stale, không ghi đè published, attempts không phồng', async () => {
    const t = await db();
    const [id] = await emit(randomUUID());
    const [old] = (await claimDue(t, new Date())).filter((c) => c.id === id);
    expect(old).toMatchObject({ attempts: 1, generation: 1, protocolVersion: 2 });
    // claim cũ "chết": hết lease → tiến trình mới nhận lại
    await t.$executeRaw`UPDATE outbox_event SET relay_lease_until = now() - interval '1 second' WHERE id = ${id!}::uuid`;
    const [fresh] = (await claimDue(t, new Date())).filter((c) => c.id === id);
    expect(fresh).toMatchObject({ attempts: 2, generation: 2 });
    expect(await markPublished(t, fresh!)).toBe(true);
    expect(await markFailed(t, old!, 'late', new Date())).toBe('stale');
    expect(await markPublished(t, old!)).toBe(false);
    expect(await t.outboxEvent.findUniqueOrThrow({ where: { id: id! } })).toMatchObject({ status: 'published', relayPhase: 'published', attempts: 2 });
  });

  it('8 lần lỗi thật → failed bền, không tự đặt lại', async () => {
    const t = await db();
    const [id] = await emit(randomUUID());
    let last: string = '';
    let at = new Date();
    for (let i = 1; i <= 8; i++) {
      const [c] = (await claimDue(t, at)).filter((x) => x.id === id);
      expect(c!.attempts).toBe(i);
      last = await markFailed(t, c!, 'queue_down', at);
      at = new Date(at.getTime() + 2 ** i * 1000 + 1);
    }
    expect(last).toBe('failed');
    expect((await claimDue(t, new Date(Date.now() + 10 ** 9))).some((c) => c.id === id)).toBe(false);
  });
});

describe('dispatch head theo aggregate', () => {
  it('event cũ lỗi → event mới cùng aggregate CHỜ; aggregate khác chạy; sửa xong chạy đúng thứ tự, mỗi hiệu ứng một lần', async () => {
    const A = randomUUID();
    const [a1, a2] = await emit(A, 2);
    const [b1] = await emit(randomUUID());
    fail.add(a1!);
    expect(await run(a2!)).toEqual({ kind: 'deferred' });
    expect(await run(a1!)).toMatchObject({ kind: 'retry', code: 'FX_FAIL' });
    expect(await run(a2!)).toEqual({ kind: 'deferred' });
    expect(await run(b1!)).toMatchObject({ kind: 'completed' });
    fail.clear();
    await (await db()).$executeRaw`UPDATE event_aggregate_head SET head_lease_until = now() - interval '1 second' WHERE id = ${A}::uuid`;
    expect(await run(a1!)).toMatchObject({ kind: 'completed' });
    expect(await run(a1!)).toEqual({ kind: 'done' });
    expect(await run(a2!)).toMatchObject({ kind: 'completed' });
    expect([await effects(a1!), await effects(a2!), await effects(b1!)]).toEqual([1, 1, 1]);
  });

  it('crash trong transaction hiệu ứng → không hiệu ứng / không biên nhận; chạy lại đúng một lần; dispatch trùng hội tụ', async () => {
    const [id] = await emit(randomUUID());
    crashOnce.add(id!);
    expect(await run(id!)).toMatchObject({ kind: 'retry', code: 'FX_CRASH' });
    expect(await effects(id!)).toBe(0);
    const t = await db();
    expect(await t.eventConsumerReceipt.findUniqueOrThrow({ where: { eventId_consumer: { eventId: id!, consumer: 'fx.counter' } } })).toMatchObject({ phase: 'pending' });
    await t.$executeRaw`UPDATE event_aggregate_head SET head_lease_until = now() - interval '1 second' WHERE active_event_id = ${id!}::uuid`;
    const rs = await Promise.all([run(id!), run(id!), run(id!)]);
    expect(rs.filter((r) => r.kind === 'completed')).toHaveLength(1);
    expect(await effects(id!)).toBe(1);
    expect(await t.eventDispatch.findUniqueOrThrow({ where: { eventId: id! } })).toMatchObject({ phase: 'completed' });
  });

  it('thiếu adapter của hợp đồng đã lưu → chặn stream có lý do, không ACK; event sau cùng aggregate chờ', async () => {
    const A = randomUUID();
    const [x1, x2] = await emit(A, 2);
    const r = await dispatchV2({ db: await db(), workspaceId: ws, contracts: new Map(), epoch: 1, now }, x1!);
    expect(r).toEqual({ kind: 'blocked', reason: 'missing_capability' });
    expect(await run(x1!)).toEqual({ kind: 'blocked', reason: 'missing_capability' });
    expect(await run(x2!)).toEqual({ kind: 'deferred' });
    expect(await (await db()).eventDispatch.findUniqueOrThrow({ where: { eventId: x1! } })).toMatchObject({ phase: 'blocked_unknown', lastErrorCode: 'missing_capability' });
  });

  it('kết cục void không phải bằng chứng → không completed', async () => {
    const [id] = await emit(randomUUID());
    const bad: EventContract = { ...counter, apply: async () => undefined as never };
    const r = await dispatchV2({ db: await db(), workspaceId: ws, contracts: new Map([[bad.name, bad]]), epoch: 1, now }, id!);
    expect(r).toMatchObject({ kind: 'retry', code: 'invalid_outcome' });
  });
});

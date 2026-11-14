// TIP-003b AC2 trên Postgres thật: hai transaction đồng thời ghi aggregate A / B theo thứ tự NGƯỢC nhau → không deadlock (flush cuối
// khoá theo (kind, id) đã sắp), seq liên tục không lỗ; transaction rollback (CAS thua sau khi đã gom) → không event mồ côi, bộ đếm lùi
// cùng; v2 ngoài transaction đã đăng ký → từ chối; dispatch head KHÔNG do producer tạo.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { MemoryWorkspaceRegistry, TenantContexts, TenantDbResolver, TenantProvisioner, tenantDbName } from '@appchat/db';
import { withEventTransaction, writeOutbox } from '@appchat/core';
import { env } from './setup';

const ws = randomUUID();
const registry = new MemoryWorkspaceRegistry();
const provisioner = new TenantProvisioner({ adminUrl: env.PROVISIONER_DATABASE_URL!, templateDb: env.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template', ownerRole: 'appchat_migrator', appRole: 'appchat_tenant_app' });
const resolver = new TenantDbResolver({ registry, baseUrl: env.TENANT_DATABASE_URL! });
const A = randomUUID();
const B = randomUUID();
const now = new Date('2026-11-11T01:00:00Z');
const db = () => resolver.get(TenantContexts.system(ws, 'test'));
const tag = (id: string) => ({ topic: 'tag.created', payload: { id } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  const { dbName } = await provisioner.provision(ws);
  registry.upsert({ workspaceId: ws, dbName, dbHost: null, dbStatus: 'active', schemaVersion: null });
  const t = await db();
  await t.eventRegistryVersion.create({ data: { version: 1, digest: 'test-v1', contracts: {} } });
  await t.eventProtocolState.update({ where: { id: 1 }, data: { phase: 'v2', registryVersion: 1 } });
}, 120_000);

afterAll(async () => {
  await resolver.close();
  await provisioner.drop(tenantDbName(ws));
});

const seqs = async (id: string) =>
  (await (await db()).outboxEvent.findMany({ where: { aggregateKind: 'tag', aggregateId: id }, orderBy: { aggregateSeq: 'asc' }, select: { aggregateSeq: true } })).map((r) => Number(r.aggregateSeq));

describe('giao thức sự kiện — sequence trên DB thật', () => {
  it('hai transaction ghi A→B và B→A đồng thời (domain giữ lâu) → không deadlock, seq liên tục; mỗi event có dispatch, không head', async () => {
    const t = await db();
    const run = (first: string, second: string) =>
      withEventTransaction(t, ws, async (tx) => {
        await writeOutbox(tx, ws, [tag(first)], now);
        await sleep(150); // công việc domain giữa hai lần ghi — chưa khoá seq nào
        await writeOutbox(tx, ws, [tag(second)], now);
      });
    const rs = await Promise.all([run(A, B), run(B, A), run(A, B)]);
    expect(rs.map((r) => r.events)).toEqual([2, 2, 2]);
    expect(await seqs(A)).toEqual([1, 2, 3]);
    expect(await seqs(B)).toEqual([1, 2, 3]);
    expect(await t.eventDispatch.count()).toBe(6);
    expect(await t.eventAggregateHead.count()).toBe(0);
  });

  it('rollback sau khi đã gom (CAS thua) → không event mồ côi; bộ đếm lùi cùng → seq kế tiếp không lỗ', async () => {
    const t = await db();
    await expect(
      withEventTransaction(t, ws, async (tx) => {
        await writeOutbox(tx, ws, [tag(A)], now);
        throw new Error('CAS thua');
      }),
    ).rejects.toThrow('CAS thua');
    // lỗi schema ở flush cuối cũng rollback cả domain
    const marker = randomUUID();
    await expect(
      withEventTransaction(t, ws, async (tx) => {
        await tx.$executeRaw`INSERT INTO event_aggregate_counter (kind, id, next_seq) VALUES ('probe', ${marker}::uuid, 9)`;
        await writeOutbox(tx, ws, [{ topic: 'tag.created', payload: { id: 'x' } }], now);
      }),
    ).rejects.toMatchObject({ code: 'EVENT_PAYLOAD_INVALID' });
    expect(await t.eventAggregateCounter.count({ where: { kind: 'probe' } })).toBe(0);
    await withEventTransaction(t, ws, (tx) => writeOutbox(tx, ws, [tag(A)], now));
    expect(await seqs(A)).toEqual([1, 2, 3, 4]);
  });

  it('pha v2: writeOutbox ngoài transaction đã đăng ký → EVENT_TRANSACTION_REQUIRED, không ghi', async () => {
    const t = await db();
    const before = await t.outboxEvent.count();
    await expect(t.$transaction((tx) => writeOutbox(tx, ws, [tag(B)], now))).rejects.toMatchObject({ code: 'EVENT_TRANSACTION_REQUIRED' });
    expect(await t.outboxEvent.count()).toBe(before);
  });

  it('EXPLAIN: hàng relay chờ dùng index partial, seq duy nhất theo aggregate', async () => {
    const t = await db();
    // SET LOCAL trong một transaction — cùng kết nối với EXPLAIN (không rò cấu hình sang kết nối khác của pool).
    const plan = (sql: string) =>
      t.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL enable_seqscan = off');
        return (await tx.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN ${sql}`)).map((r) => r['QUERY PLAN']).join('\n');
      });
    expect(await plan(`SELECT id FROM outbox_event WHERE status = 'pending' AND available_at <= now() ORDER BY available_at, id LIMIT 200`)).toContain('outbox_event_relay_due_idx');
    expect(await plan(`SELECT id FROM outbox_event WHERE aggregate_kind = 'tag' AND aggregate_id = '${A}' AND aggregate_seq = 1`)).toContain('outbox_event_aggregate_seq_key');
  });

  it('EXPLAIN trên 100k event / 1000 aggregate lệch: relay, dispatch đến hạn, claim hết hạn, head khôi phục đều dùng index (không Seq Scan)', async () => {
    const t = await db();
    await t.$executeRawUnsafe(`
      INSERT INTO outbox_event (id, topic, payload, status, available_at, protocol_version, aggregate_kind, aggregate_id, aggregate_seq, registry_version, relay_phase)
      SELECT gen_random_uuid(), 'tag.created', '{}'::jsonb, CASE WHEN g % 50 = 0 THEN 'pending' ELSE 'published' END::outbox_status, now() - (g || ' seconds')::interval,
             2, 'bulk', ('00000000-0000-7000-8000-' || lpad(((g % 1000) * (g % 7 + 1) % 1000)::text, 12, '0'))::uuid, g, 1,
             CASE WHEN g % 50 = 0 THEN 'pending' ELSE 'published' END::event_relay_phase
        FROM generate_series(1, 100000) g`);
    await t.$executeRawUnsafe(`INSERT INTO event_dispatch (event_id, protocol_version, registry_version, phase, available_at)
      SELECT id, 2, 1, CASE WHEN aggregate_seq % 40 = 0 THEN 'pending' ELSE 'completed' END::event_dispatch_phase, available_at FROM outbox_event WHERE aggregate_kind = 'bulk'`);
    await t.$executeRawUnsafe('ANALYZE outbox_event');
    await t.$executeRawUnsafe('ANALYZE event_dispatch');
    const plan = async (sql: string) => (await t.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN ${sql}`)).map((r) => r['QUERY PLAN']).join('\n');
    const relay = await plan(`SELECT id FROM outbox_event WHERE status = 'pending' AND relay_phase = 'pending' AND available_at <= now() ORDER BY available_at, id LIMIT 200`);
    expect(relay).toContain('outbox_event_relay_due_idx');
    expect(relay).not.toContain('Seq Scan');
    const claim = await plan(`SELECT id FROM outbox_event WHERE relay_phase = 'claimed' AND relay_lease_until < now() ORDER BY relay_lease_until, id LIMIT 200`);
    expect(claim).toContain('outbox_event_relay_claim_idx');
    const due = await plan(`SELECT event_id FROM event_dispatch WHERE phase = 'pending' AND available_at <= now() ORDER BY available_at, event_id LIMIT 200`);
    expect(due).toContain('event_dispatch_due_idx');
    expect(due).not.toContain('Seq Scan');
    const running = await plan(`SELECT event_id FROM event_dispatch WHERE phase = 'running' AND dispatch_lease_until < now() LIMIT 200`);
    expect(running).toContain('event_dispatch_claim_idx');
    const head = await plan(`SELECT kind, id FROM event_aggregate_head WHERE active_event_id IS NOT NULL AND head_lease_until < now() ORDER BY head_lease_until LIMIT 200`);
    expect(head).not.toContain('Seq Scan on outbox_event');
  }, 120_000);
});

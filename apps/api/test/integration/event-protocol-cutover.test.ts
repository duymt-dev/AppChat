// TIP-003b AC9 / AC10 trên Postgres thật: cutover — rào chặn producer mới (không mất event: transaction lỗi rõ, không ghi nửa vời);
// legacy pending / failed chặn bật v2 (không bịa thứ tự, không tự đánh dấu xong); chưa sẵn sàng → không bật; bật xong epoch + registry
// bất biến theo digest; gỡ rào sau khi đã v2 bị từ chối. Privacy: event v2 của stream khách vào kiểm kê kernel; erase giữ seq / id,
// xoá thân, dispatch chưa xong → privacy_suppressed, dispatcher không chạy consumer trên thân đã xoá.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { MemoryWorkspaceRegistry, TenantContexts, TenantDbResolver, TenantProvisioner, tenantDbName } from '@appchat/db';
import { activateV2, dispatchV2, eraseOutboxEvent, evaluateLegacy, fenceWorkspace, kernelInventory, unfenceWorkspace, withEventTransaction, writeOutbox, type Readiness, type RegistryTable } from '@appchat/core';
import { env } from './setup';

const ws = randomUUID();
const registry = new MemoryWorkspaceRegistry();
const provisioner = new TenantProvisioner({ adminUrl: env.PROVISIONER_DATABASE_URL!, templateDb: env.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template', ownerRole: 'appchat_migrator', appRole: 'appchat_tenant_app' });
const resolver = new TenantDbResolver({ registry, baseUrl: env.TENANT_DATABASE_URL! });
const db = () => resolver.get(TenantContexts.system(ws, 'test'));
const table: RegistryTable = { 'contact.memory_changed': [{ consumer: 'fx.memory', mode: 'projection', contract_version: 1 }], 'tag.created': [] };
const ready: Readiness = { ready: true, role: 'jobs', digest: 'd', missing: [], unexpected: [], mismatched: [], blockers: [] };
const tag = () => ({ topic: 'tag.created', payload: { id: randomUUID() } });

beforeAll(async () => {
  const { dbName } = await provisioner.provision(ws);
  registry.upsert({ workspaceId: ws, dbName, dbHost: null, dbStatus: 'active', schemaVersion: null });
}, 120_000);

afterAll(async () => {
  await resolver.close();
  await provisioner.drop(tenantDbName(ws));
});

describe('cutover v1 → v2', () => {
  it('rào: producer mới lỗi EVENT_PROTOCOL_FENCED (không ghi); legacy pending chặn bật; chưa sẵn sàng / chưa rào → không bật', async () => {
    const t = await db();
    await withEventTransaction(t, ws, (tx) => writeOutbox(tx, ws, [tag()], new Date()));
    expect(await activateV2(t, table, ready)).toEqual({ ok: false, reason: 'not_fenced' });
    expect(await fenceWorkspace(t)).toBe('fenced');
    const before = await t.outboxEvent.count();
    await expect(withEventTransaction(t, ws, (tx) => writeOutbox(tx, ws, [tag()], new Date()))).rejects.toMatchObject({ code: 'EVENT_PROTOCOL_FENCED' });
    expect(await t.outboxEvent.count()).toBe(before);
    expect(await activateV2(t, table, null)).toEqual({ ok: false, reason: 'not_ready' });
    const blocked = await activateV2(t, table, ready);
    expect(blocked).toMatchObject({ ok: false, reason: 'legacy_unresolved', ledger: { pending: 1, failed: 0 } });
    expect((blocked as { ledger: { sampleIds: string[] } }).ledger.sampleIds).toHaveLength(1);
  });

  it('legacy đã giải quyết → bật v2: epoch 1, registry bất biến theo digest; gỡ rào sau v2 bị từ chối; event mới có seq', async () => {
    const t = await db();
    await t.$executeRaw`UPDATE outbox_event SET status = 'published' WHERE protocol_version IS NULL`;
    expect((await evaluateLegacy(t)).publishedUnverified).toBe(1);
    const r = await activateV2(t, table, ready);
    expect(r).toEqual({ ok: true, epoch: 1, registryVersion: 1 });
    expect(await activateV2(t, table, ready)).toEqual({ ok: true, epoch: 1, registryVersion: 1 });
    expect(await unfenceWorkspace(t)).toBe(false);
    const st = await t.eventProtocolState.findUniqueOrThrow({ where: { id: 1 } });
    expect(st).toMatchObject({ phase: 'v2', epoch: 1, registryVersion: 1 });
    expect(JSON.stringify(st.legacyCheckpoint)).not.toMatch(/payload|tag\.created/);
    await withEventTransaction(t, ws, (tx) => writeOutbox(tx, ws, [tag()], new Date()));
    expect(await t.outboxEvent.count({ where: { protocolVersion: 2, aggregateSeq: 1n } })).toBe(1);
  });
});

describe('privacy event v2', () => {
  it('kiểm kê theo stream khách; erase giữ id / seq, xoá thân; dispatch → privacy_suppressed, consumer không chạy', async () => {
    const t = await db();
    const contact = randomUUID();
    await withEventTransaction(t, ws, (tx) => writeOutbox(tx, ws, [{ topic: 'contact.memory_changed', payload: { contact_id: contact, memory_rev: 7 } }], new Date()));
    const inv = await t.$transaction((tx) => kernelInventory(tx, [contact]));
    expect(inv).toHaveLength(1);
    expect(inv[0]).toMatchObject({ kind: 'outbox_event', ownership: 'exclusive' });
    await t.$transaction((tx) => eraseOutboxEvent(tx, inv[0]!.recordId));
    const row = await t.outboxEvent.findUniqueOrThrow({ where: { id: inv[0]!.recordId } });
    expect(row.aggregateSeq).toBe(1n);
    expect(row.payload).not.toHaveProperty('memory_rev');
    expect(row.payload).toMatchObject({ privacy_erased: true, aggregate_id: contact });
    expect(await t.eventDispatch.findUniqueOrThrow({ where: { eventId: row.id } })).toMatchObject({ phase: 'blocked_unknown', lastErrorCode: 'privacy_suppressed' });
    let ran = false;
    const fx = { name: 'fx.memory', mode: 'projection' as const, contractVersion: 1, topics: ['contact.memory_changed'], apply: async () => ((ran = true), { kind: 'applied' as const }) };
    expect(await dispatchV2({ db: t, workspaceId: ws, contracts: new Map([[fx.name, fx]]), epoch: 1, now: () => new Date() }, row.id)).toEqual({ kind: 'blocked', reason: 'privacy_suppressed' });
    expect(ran).toBe(false);
  });
});

// TIP-003 AC9 (outbox relay: published / back-off 2^n / failed sau 8 lần, outbox:dirty trên Memurai thật)
// + AC10 (nextCode 20 lần song song → không trùng, đúng định dạng) trên Postgres thật.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { MemoryWorkspaceRegistry, TenantContexts, TenantDbResolver, TenantProvisioner, tenantDbName } from '@appchat/db';
import { FixedClock, MAX_ATTEMPTS, OUTBOX_DIRTY, drainDirty, markDirty, nextCode, sweepAll, uuidv7, type EventPublisher } from '@appchat/core';
import { env } from './setup';

const ws = randomUUID();
const registry = new MemoryWorkspaceRegistry();
const provisioner = new TenantProvisioner({
  adminUrl: env.PROVISIONER_DATABASE_URL!,
  templateDb: env.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template',
  ownerRole: 'appchat_migrator',
  appRole: 'appchat_tenant_app',
});
const resolver = new TenantDbResolver({ registry, baseUrl: env.TENANT_DATABASE_URL! });
const redis = new Redis(env.REDIS_URL!, { maxRetriesPerRequest: null });
const clock = new FixedClock('2026-10-30T09:00:00.000Z');

beforeAll(async () => {
  const { dbName } = await provisioner.provision(ws);
  registry.upsert({ workspaceId: ws, dbName, dbHost: null, dbStatus: 'active', schemaVersion: null });
});

afterAll(async () => {
  await resolver.close();
  await redis.srem(OUTBOX_DIRTY, ws);
  redis.disconnect();
  await provisioner.drop(tenantDbName(ws));
});

const db = () => resolver.get(TenantContexts.system(ws, 'test'));

describe('outbox relay', () => {
  it('drain workspace bẩn → published; publisher lỗi → back-off 2^n giây; 8 lần → failed', async () => {
    const t = await db();
    const ok = uuidv7();
    const bad = uuidv7();
    await t.outboxEvent.createMany({
      data: [
        { id: ok, topic: 'tag.created', payload: { id: 'a', ws }, availableAt: clock.now() },
        { id: bad, topic: 'poison', payload: { id: 'b', ws }, availableAt: clock.now() },
      ],
    });
    const seen: string[] = [];
    const publisher: EventPublisher = {
      publish: async (e) => {
        if (e.topic === 'poison') throw new Error('queue down');
        seen.push(e.id);
      },
    };
    const deps = { resolver, registry, kv: redis, publisher, clock };
    await markDirty(redis, ws);
    const r1 = await drainDirty(deps);
    expect(r1[ws]).toEqual({ published: 1, retried: 1, failed: 0 });
    expect(seen).toEqual([ok]);
    expect(await redis.sismember(OUTBOX_DIRTY, ws)).toBe(0);
    let row = await t.outboxEvent.findUniqueOrThrow({ where: { id: bad } });
    expect(row).toMatchObject({ status: 'pending', attempts: 1, lastError: 'queue down' });
    expect(row.availableAt.toISOString()).toBe('2026-10-30T09:00:02.000Z');

    // Chưa tới available_at → không thử lại.
    expect((await sweepAll(deps))).toBe(0);
    expect((await t.outboxEvent.findUniqueOrThrow({ where: { id: bad } })).attempts).toBe(1);

    for (let i = 2; i <= MAX_ATTEMPTS; i++) {
      clock.set(row.availableAt);
      await sweepAll(deps);
      row = await t.outboxEvent.findUniqueOrThrow({ where: { id: bad } });
      expect(row.attempts).toBe(i);
    }
    expect(row.status).toBe('failed');
    expect((await t.outboxEvent.findUniqueOrThrow({ where: { id: ok } })).status).toBe('published');
  });
});

describe('nextCode', () => {
  it('20 lần song song (mỗi lần một transaction) → 1001..1020 không trùng, định dạng KH-xxxx', async () => {
    const t = await db();
    const codes = await Promise.all(Array.from({ length: 20 }, () => t.$transaction((tx) => nextCode(tx, 'contact'))));
    expect(new Set(codes).size).toBe(20);
    expect([...codes].sort()).toEqual(Array.from({ length: 20 }, (_, i) => `KH-${1001 + i}`));
  });

  it('transaction rollback → số được trả lại (không nhảy số)', async () => {
    const t = await db();
    await t.$transaction(async (tx) => {
      await nextCode(tx, 'order');
      throw new Error('rollback');
    }).catch(() => undefined);
    expect(await t.$transaction((tx) => nextCode(tx, 'order'))).toBe('DH-001001');
  });
});

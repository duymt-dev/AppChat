// TIP-006b §1.1, §2 trên Postgres thật: fanout niêm phong — 257 mục tiêu chọn bằng một INSERT…SELECT (một snapshot), xử lý theo trang
// ≤ 100 tới hết (không cắt 100); mục tạo sau khi chọn không vào; người chọn cũ mất thuê không niêm phong được; bỏ thế hệ → thế hệ mới.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { MemoryWorkspaceRegistry, TenantContexts, TenantDbResolver, TenantProvisioner, TenantSql, tenantDbName } from '@appchat/db';
import { abandonSelection, insertSelected, leaseSelection, openFanout, pendingCount, pendingPage, sealSelection, settleItem, stageTargets } from '@appchat/core';
import { env } from './setup';

const ws = randomUUID();
const registry = new MemoryWorkspaceRegistry();
const provisioner = new TenantProvisioner({ adminUrl: env.PROVISIONER_DATABASE_URL!, templateDb: env.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template', ownerRole: 'appchat_migrator', appRole: 'appchat_tenant_app' });
const resolver = new TenantDbResolver({ registry, baseUrl: env.TENANT_DATABASE_URL! });
const db = () => resolver.get(TenantContexts.system(ws, 'test'));
const ids = Array.from({ length: 257 }, () => randomUUID());

beforeAll(async () => {
  const { dbName } = await provisioner.provision(ws);
  registry.upsert({ workspaceId: ws, dbName, dbHost: null, dbStatus: 'active', schemaVersion: null });
}, 120_000);

afterAll(async () => {
  await resolver.close();
  await provisioner.drop(tenantDbName(ws));
});

// Nguồn thử: bảng tạm ngoài schema domain (một câu SELECT trả 3 cột).
const source = (from: string[]) => TenantSql.sql`SELECT 'fx'::text, x::uuid, '1'::text FROM unnest(${from}::text[]) AS x`;

describe('fanout niêm phong', () => {
  it('257 mục tiêu → niêm phong một lần, xử lý trang ≤ 100 tới hết; event trùng dùng lại cùng fanout', async () => {
    const t = await db();
    const key = { eventId: randomUUID(), consumer: 'fx.fanout', contractVersion: 1 };
    const f = await t.$transaction(async (tx) => {
      const f = await openFanout(tx, key);
      const l = (await leaseSelection(tx, f.id))!;
      expect(await insertSelected(tx, f.id, l, source(ids))).toBe(257);
      expect(await sealSelection(tx, f.id, l)).toBe(true);
      return f;
    });
    // Phát lại: cùng dòng, đã niêm phong → không thuê chọn lại.
    await t.$transaction(async (tx) => {
      const again = await openFanout(tx, key);
      expect([again.id, again.phase, again.selected]).toEqual([f.id, 'sealed', 257]);
      expect(await leaseSelection(tx, f.id)).toBeNull();
    });
    let after: string | null = null;
    let pages = 0;
    const seen = new Set<string>();
    for (;;) {
      const page = await pendingPage(t, f.id, after);
      if (!page.length) break;
      expect(page.length).toBeLessThanOrEqual(100);
      pages++;
      for (const it of page) {
        await t.$transaction(async (tx) => expect(await settleItem(tx, f.id, it.kind, it.id, { phase: 'applied', operationRef: `op:${it.id}` })).toBe(true));
        seen.add(it.id);
      }
      after = page.at(-1)!.id;
    }
    expect([pages, seen.size, await pendingCount(t, f.id)]).toEqual([3, 257, 0]);
    // Ghi lại kết cục lần hai (worker trùng) → không ghi đè.
    await t.$transaction(async (tx) => expect(await settleItem(tx, f.id, 'fx', ids[0]!, { phase: 'no_effect', reason: 'dup' })).toBe(false));
    const [row] = await t.$queryRaw<{ processed: number }[]>`SELECT processed_count AS processed FROM event_fanout WHERE id = ${f.id}::uuid`;
    expect(row!.processed).toBe(257);
  });

  it('người chọn mất thuê không niêm phong; bỏ thế hệ → thế hệ mới, mục thế hệ cũ không lên trang', async () => {
    const t = await db();
    const key = { eventId: randomUUID(), consumer: 'fx.fanout', contractVersion: 1 };
    const { f, old } = await t.$transaction(async (tx) => {
      const f = await openFanout(tx, key);
      const old = (await leaseSelection(tx, f.id))!;
      expect(await stageTargets(tx, f.id, old, [{ kind: 'fx', id: ids[0]! }], 0, ids[0]!)).toBe(true);
      // Hết hạn thuê giả lập → người khác tiếp quản.
      await tx.$executeRaw`UPDATE event_fanout SET lease_until = now() - interval '1 second' WHERE id = ${f.id}::uuid`;
      return { f, old };
    });
    const next = await t.$transaction(async (tx) => (await leaseSelection(tx, f.id))!);
    await t.$transaction(async (tx) => {
      expect(await sealSelection(tx, f.id, old)).toBe(false);
      expect(await stageTargets(tx, f.id, old, [{ kind: 'fx', id: ids[1]! }], 1, ids[1]!)).toBe(false);
      // Người mới bỏ thế hệ (vd. cấu hình quyền đổi) → thế hệ 2 chọn lại cohort mới.
      expect(await abandonSelection(tx, f.id, next)).toBe(true);
    });
    const g2 = await t.$transaction(async (tx) => {
      const l = (await leaseSelection(tx, f.id))!;
      expect(l.generation).toBe(2);
      await stageTargets(tx, f.id, l, [{ kind: 'fx', id: ids[2]! }], 0, null);
      expect(await sealSelection(tx, f.id, l)).toBe(true);
      return l;
    });
    const page = await pendingPage(t, f.id, null);
    expect(page.map((p) => p.id)).toEqual([ids[2]]);
    expect(g2.generation).toBe(2);
  });

  it('chưa niêm phong → không có trang để xử lý', async () => {
    const t = await db();
    const f = await t.$transaction(async (tx) => {
      const f = await openFanout(tx, { eventId: randomUUID(), consumer: 'fx.fanout', contractVersion: 1 });
      const l = (await leaseSelection(tx, f.id))!;
      await insertSelected(tx, f.id, l, source(ids.slice(0, 3)));
      return f;
    });
    expect(await pendingPage(t, f.id, null)).toEqual([]);
  });
});

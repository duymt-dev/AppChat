// TIP-023d §5.2 trên Postgres 16: GET /v1/assistant/agent-choices — trang AI Agent đang hoạt động / đã xuất bản (chủ phiên đọc, chỉ
// cần assistant.use — không cần agents.manage), chỉ metadata an toàn (tên/vai trò/mức AI, không prompt/persona/tier nháp), keyset
// (updated_at DESC, id DESC); cursor hỏng → 422; EXPLAIN dùng index covering, không seq scan.
import 'reflect-metadata';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, tenantDbName, withDatabase } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';

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
type Page = { data: { id: string; name: string; role: string; role_label: string; model_tier: string }[]; next_cursor: string | null };
const list = async (qs: string) => {
  const r = await call(h, `/assistant/agent-choices${qs}`);
  return { status: r.status, body: (await r.json()) as Page };
};
const BASE = new Date('2026-10-01T08:00:00.000Z');

describe('assistant.agent_choices (keyset)', () => {
  let active: string[];
  let draft: string;
  let paused: string;
  let unpublished: string;

  beforeAll(async () => {
    const db = await tenant();
    active = [];
    for (let i = 0; i < 4; i++) {
      const id = uuidv7();
      active.push(id);
      await db.aiAgent.create({
        data: { id, name: `Agent ${i}`, role: 'sales', roleLabel: 'Bán hàng', modelTier: 'standard', status: 'active', publishedVersion: 1, updatedAt: new Date(BASE.getTime() + i * 60_000) },
      });
    }
    draft = uuidv7();
    await db.aiAgent.create({ data: { id: draft, name: 'Nháp', status: 'draft', publishedVersion: 0, updatedAt: BASE } });
    paused = uuidv7();
    await db.aiAgent.create({ data: { id: paused, name: 'Tạm dừng', status: 'paused', publishedVersion: 1, updatedAt: BASE } });
    unpublished = uuidv7();
    await db.aiAgent.create({ data: { id: unpublished, name: 'Chưa xuất bản', status: 'active', publishedVersion: 0, updatedAt: BASE } });
  });

  it('chỉ active + published_version > 0, mới nhất trước; không prompt/persona', async () => {
    const r = await list('?limit=50');
    expect(r.status).toBe(200);
    const ids = r.body.data.map((a) => a.id);
    expect(ids).toEqual([...active].reverse());
    expect(ids).not.toContain(draft);
    expect(ids).not.toContain(paused);
    expect(ids).not.toContain(unpublished);
    expect(Object.keys(r.body.data[0]!).sort()).toEqual(['id', 'model_tier', 'name', 'role', 'role_label'].sort());
  });

  it('phân trang keyset 2/trang: không trùng / sót', async () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const r: { body: Page } = await list(`?limit=2${cursor ? `&cursor=${cursor}` : ''}`);
      seen.push(...r.body.data.map((a) => a.id));
      cursor = r.body.next_cursor;
      pages++;
    } while (cursor && pages < 10);
    const ours = seen.filter((id) => active.includes(id));
    expect(ours).toHaveLength(4);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('cursor hỏng → 422', async () => {
    expect((await list('?cursor=not-a-cursor')).status).toBe(422);
  });

  it('EXPLAIN: trang keyset dùng index agent_choices (không seq scan)', async () => {
    // Thống kê thật (vai trò app không ANALYZE được) — chạy bằng migrator trên đúng DB tenant.
    const mig = new pg.Client({ connectionString: withDatabase(env.MIGRATOR_DATABASE_URL!, tenantDbName(h.ws)) });
    await mig.connect();
    await mig.query('ANALYZE ai_agent');
    await mig.end();
    const ws = await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } });
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${ws.dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const plan = (
        await c.query(
          `EXPLAIN SELECT id, name, role, role_label, model_tier, updated_at FROM ai_agent
           WHERE deleted_at IS NULL AND status = 'active' AND published_version > 0
           AND (updated_at, id) < ('2026-10-01T09:00:00Z'::timestamptz, '${uuidv7()}'::uuid) ORDER BY updated_at DESC, id DESC LIMIT 31`,
        )
      ).rows
        .map((x) => x['QUERY PLAN'])
        .join('\n');
      expect(plan).toMatch(/ai_agent_choices_idx/);
      expect(plan).not.toMatch(/Seq Scan/);
    } finally {
      await c.end();
    }
  });
});

// TIP-026b P3 trên Postgres 16 + Memurai (AC5, AC6): Kanban phân trang theo cột — 160 khách cùng cột, thời điểm trùng (tie) → đi hết các
// trang không trùng / không sót, đếm theo bộ lọc; cursor của bộ lọc / cột khác → 400; cột lạ → 400. contact.set_stage if_version: hai lần
// kéo đồng thời cùng version → một thắng, một 409, cột thật trên server giữ nguyên. profile_layout CAS: hai người sửa cùng version → một 409;
// gán vai trò không đổi version nội dung; xoá theo version cũ → 409; xoá đúng → vai trò về mặc định. EXPLAIN 10k: trang một cột dùng
// index `contact_stage_*` + LIMIT, không window / Sort toàn bảng.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, tenantDbName, withDatabase } from '@appchat/db';
import { contactsBoardSchema, profileLayoutsSchema } from '@appchat/shared';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 60_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const get = (path: string) => call(h, path).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));

describe('kanban phân trang theo cột (§4.1)', () => {
  it('160 khách cột "potential", 40 cùng thời điểm → trang 50 + cursor đi hết 160, không trùng; cursor sai cột / bộ lọc → 400', async () => {
    const db = await tenant();
    await db.$executeRawUnsafe(`INSERT INTO contact (id, code, name, stage, source, last_interaction_at, phone_norm)
      SELECT gen_random_uuid(), 'KB' || lpad(g::text, 4, '0'), 'Khách bảng ' || g, 'potential', 'manual',
        CASE WHEN g <= 40 THEN timestamptz '2026-10-01 10:00:00+07' ELSE timestamptz '2026-10-01 10:00:00+07' - (g || ' minutes')::interval END,
        '0977' || lpad(g::text, 6, '0') FROM generate_series(1, 160) g`);
    const b = contactsBoardSchema.parse((await get('/contacts/board?q=Khách bảng')).body.data);
    const col = b.columns.find((c) => c.key === 'potential')!;
    expect([col.total, col.rows.length]).toEqual([160, 50]);
    expect(col.next_cursor).toBeTruthy();
    const seen = new Set(col.rows.map((r) => r.id));
    let cursor = col.next_cursor!;
    let pages = 1;
    while (cursor) {
      const r = await get(`/contacts/board/potential?q=Khách bảng&cursor=${cursor}&limit=50`);
      expect(r.status, JSON.stringify(r.body)).toBe(200);
      for (const x of r.body.data) {
        expect(seen.has(x.id)).toBe(false);
        seen.add(x.id);
      }
      cursor = r.body.next_cursor;
      pages++;
    }
    expect([seen.size, pages]).toEqual([160, 4]);
    expect((await get(`/contacts/board/lead?q=Khách bảng&cursor=${col.next_cursor}`)).status).toBe(400);
    expect((await get(`/contacts/board/potential?q=khác&cursor=${col.next_cursor}`)).status).toBe(400);
    expect((await get('/contacts/board/xyz')).status).toBe(400);
    expect((await get('/contacts/board/potential?limit=500')).body.data.length).toBeLessThanOrEqual(100);
  });

  it('EXPLAIN 10k: trang một cột dùng index giai đoạn + LIMIT, không window / Sort', async () => {
    const db = await tenant();
    await db.$executeRawUnsafe(`INSERT INTO contact (id, code, name, stage, source, last_interaction_at)
      SELECT gen_random_uuid(), 'KX' || lpad(g::text, 5, '0'), 'X ' || g, (ARRAY['lead','potential','consulting','quote','contract'])[1 + g % 5]::contact_stage, 'manual', now() - (g || ' seconds')::interval FROM generate_series(1, 10000) g`);
    const mig = new pg.Client({ connectionString: withDatabase(env.MIGRATOR_DATABASE_URL!, tenantDbName(h.ws)) });
    await mig.connect();
    await mig.query('ANALYZE contact');
    await mig.end();
    const plan = (await db.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(
      `EXPLAIN (ANALYZE, BUFFERS) SELECT c.id FROM contact c WHERE c.deleted_at IS NULL AND c.stage = 'consulting' ORDER BY c.last_interaction_at DESC, c.id DESC LIMIT 51`,
    )).map((r) => r['QUERY PLAN']).join(String.fromCharCode(10));
    if (process.env.EXPLAIN_OUT) (await import('node:fs')).writeFileSync(process.env.EXPLAIN_OUT, plan);
    expect(plan).toContain('contact_stage_recent_idx');
    expect(plan).not.toMatch(/WindowAgg|Sort Method|Seq Scan/);
  });
});

describe('contact.set_stage if_version (§4.3)', () => {
  it('hai lần kéo cùng version → một thắng, một 409; cột server giữ bản thắng; trả version mới', async () => {
    const c = (await act('contact.create', { full_name: 'Khách kéo thả', phone: '0909500001' })).body.data.result.contact_id;
    const db = await tenant();
    const v = (await db.contact.findUniqueOrThrow({ where: { id: c } })).version;
    const [a, b] = await Promise.all([act('contact.set_stage', { contact_id: c, stage: 'quote', if_version: v }), act('contact.set_stage', { contact_id: c, stage: 'contract', if_version: v })]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const win = a.status === 200 ? a : b;
    const after = await db.contact.findUniqueOrThrow({ where: { id: c } });
    expect(after.stage).toBe(a.status === 200 ? 'quote' : 'contract');
    expect(win.body.data.result.version).toBe(after.version);
    // Hoàn tác khi khách đã đổi tiếp → 409, không đè.
    await act('contact.update', { contact_id: c, patch: { city: 'Huế' } });
    expect((await call(h, `/action-logs/${win.body.data.action_log_id}/undo`, {}).then(json)).status).toBe(409);
  });
});

describe('profile_layout CAS (§4.5)', () => {
  it('hai lần sửa cùng version → 409; gán vai trò không đổi version; xoá version cũ 409; xoá đúng → vai trò về mặc định', async () => {
    const tabs = [{ key: 'overview', label: 'Tổng quan', enabled: true, sort: 0, builtin: true, blocks: [] }];
    const id = (await act('profile_layout.create', { name: 'CAS', tabs })).body.data.result.layout_id;
    const list = async () => profileLayoutsSchema.parse((await get('/settings/profile-layouts')).body.data).layouts.find((l) => l.id === id)!;
    expect((await list()).version).toBe(1);
    const u1 = await act('profile_layout.update', { layout_id: id, if_version: 1, patch: { name: 'CAS A' } });
    expect(u1.body.data.result.version).toBe(2);
    expect((await act('profile_layout.update', { layout_id: id, if_version: 1, patch: { name: 'CAS B' } })).status).toBe(409);
    expect((await list()).name).toBe('CAS A');
    expect((await act('profile_layout.assign_role', { role: 'manager', layout_id: id })).status).toBe(200);
    expect((await list()).version).toBe(2);
    expect((await act('profile_layout.delete', { layout_id: id, if_version: 1 })).status).toBe(409);
    expect((await act('profile_layout.delete', { layout_id: id, if_version: 2 })).status).toBe(200);
    expect(profileLayoutsSchema.parse((await get('/settings/profile-layouts')).body.data).role_assignments.manager).toBe('pl_default');
  });
});

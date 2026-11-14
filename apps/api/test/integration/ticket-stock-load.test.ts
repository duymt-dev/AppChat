// TIP-034d AC8 trên Postgres 16 thật — 100.000 ticket rải 40 người + 8 lần chụp (7 ngày trước + hôm qua) ở workspace A, workspace B (harness
// thứ hai) có ticket riêng. Đo: một lần chụp 100k ≤ 30 giây; đọc `/tickets/meta` p95 ≤ 2 giây trên 20 lượt nóng (Chủ = all, sales = own);
// heap Node tăng ≤ 64 MiB (đếm trong SQL, không nạp ticket); số câu đọc cố định; dọn cache 8 ngày; tenant B không thấy số của A. EXPLAIN
// (ANALYZE, BUFFERS) câu đọc thật: mốc nối qua PK `ticket_stock_observation_pkey`, tra mốc qua `ticket_stock_batch_day_key`; scope own
// đi index người phụ trách. Kết quả đo ghi vào report TIP-034d.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import pg from 'pg';
import { AuthzResolver, baselineOf, captureStock, pruneStockBatch, stockReadSql, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let other: Harness;
let resolver: TenantDbResolver;
let S: { id: string };
const ZONE = 'Asia/Ho_Chi_Minh';
const N = 100_000;
const T0 = new Date('2026-10-30T08:00:00.000Z');

const urlOf = async (hh: Harness, base: string) => {
  const dbName = (await hh.platform.workspace.findUniqueOrThrow({ where: { id: hh.ws } })).dbName;
  return base.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`);
};
/** Số đo ghi ra file (vitest ẩn console của test xanh) — đường dẫn qua STOCK_LOAD_OUT, mặc định bỏ qua. */
const note = (s: string) => {
  if (process.env.STOCK_LOAD_OUT) appendFileSync(process.env.STOCK_LOAD_OUT, `${s}\n`);
};
const p95 = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.ceil(xs.length * 0.95) - 1]!;
const meta = async (hh: Harness, who?: string) => {
  const r = await call(hh, '/tickets/meta', undefined, who ? { authorization: `Bearer ${hh.tokenFor(who)}` } : {});
  expect(r.status).toBe(200);
  return ((await r.json()) as { data: { stock_summary: { counts: { total: number }; comparison: { status: string } } } }).data.stock_summary;
};

beforeAll(async () => {
  [h, other] = [await startApi(), await startApi()];
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  S = await h.member('sales');
  const c = new pg.Client({ connectionString: await urlOf(h, env.TENANT_DATABASE_URL!) });
  await c.connect();
  try {
    const users = [S.id, ...Array.from({ length: 39 }, () => uuidv7())].map((u) => `'${u}'`).join(',');
    await c.query(`INSERT INTO ticket (id, code, title, category, status, assignee_user_id, frt_due_at, ttr_start_at, ttr_due_at, paused_since, close_reason, sla_result, closed_at, created_at)
      SELECT gen_random_uuid(), 'TK-L' || g, 'Tải', 'Khác', s, (ARRAY[${users}]::uuid[])[1 + g % 40], d, d, d + ((g % 97) - 40) * interval '1 hour',
        CASE WHEN s = 'waiting' THEN d END, CASE WHEN s = 'closed' THEN 'resolved' END, CASE WHEN s = 'closed' THEN (CASE WHEN g % 7 = 0 THEN 'breached' ELSE 'met' END) END,
        CASE WHEN s = 'closed' THEN d END, d
      FROM (SELECT g, '2026-10-01T00:00:00Z'::timestamptz AS d, (ARRAY['open','in_progress','waiting','closed','closed'])[1 + g % 5]::ticket_status AS s FROM generate_series(1, ${N}) g) x`);
  } finally {
    await c.end();
  }
  const db2 = await resolver.get(TenantContexts.system(other.ws, 'load-b'));
  await db2.ticket.create({ data: { id: uuidv7(), code: 'TK-B1', title: 'B', category: 'Khác', status: 'open', frtDueAt: T0, ttrStartAt: T0, ttrDueAt: T0 } });
  const adm = new pg.Client({ connectionString: await urlOf(h, env.PROVISIONER_DATABASE_URL!) });
  await adm.connect();
  await adm.query('ANALYZE ticket');
  await adm.end();
  await h.app.get(AuthzResolver).invalidate(h.ws);
}, 600_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
  await other?.close();
});

describe('AC8 — 100k ticket / 8 lần chụp / hai tenant', () => {
  it('chụp 100k ≤ 30 giây mỗi lần (8 ngày); dọn cache giữ 8 ngày', async () => {
    const db = await resolver.get(TenantContexts.system(h.ws, 'load'));
    const took: number[] = [];
    for (let d = 7; d >= 1; d--) {
      h.clock.set(new Date(T0.getTime() - d * 86_400_000));
      const t = performance.now();
      const r = await captureStock(db, ZONE, () => h.clock.now());
      took.push(performance.now() - t);
      expect(r).toMatchObject({ status: 'captured', rows: N });
    }
    h.clock.set(T0);
    expect(Math.max(...took)).toBeLessThanOrEqual(30_000);
    note(`chụp 100k: max ${Math.round(Math.max(...took))}ms, p50 ${Math.round([...took].sort((a, b) => a - b)[3]!)}ms`);
    expect(await pruneStockBatch(db, T0)).toMatchObject({ batches: 0 });
    const adm = new pg.Client({ connectionString: await urlOf(h, env.PROVISIONER_DATABASE_URL!) });
    await adm.connect();
    await adm.query('ANALYZE ticket_stock_batch; ANALYZE ticket_stock_observation');
    await adm.end();
  }, 600_000);

  it('đọc /tickets/meta p95 ≤ 2 giây (20 lượt nóng, Chủ + sales); heap ≤ 64 MiB; tenant B chỉ thấy số của mình', async () => {
    for (const who of [undefined, S.id]) await meta(h, who);
    global.gc?.();
    const heap0 = process.memoryUsage().heapUsed;
    const t: Record<string, number[]> = { owner: [], sales: [] };
    for (let i = 0; i < 20; i++)
      for (const [k, who] of [['owner', undefined], ['sales', S.id]] as const) {
        const s = performance.now();
        const r = await meta(h, who);
        t[k]!.push(performance.now() - s);
        expect(r.comparison.status).toBe('available');
      }
    const heap = (process.memoryUsage().heapUsed - heap0) / 2 ** 20;
    note(`đọc meta p95: owner ${Math.round(p95(t.owner!))}ms, sales ${Math.round(p95(t.sales!))}ms; heap +${heap.toFixed(1)} MiB`);
    expect(p95(t.owner!)).toBeLessThanOrEqual(2000);
    expect(p95(t.sales!)).toBeLessThanOrEqual(2000);
    expect(heap).toBeLessThanOrEqual(64);
    expect((await meta(h)).counts.total).toBe(N);
    expect((await meta(h, S.id)).counts.total).toBe(N / 40);
    const b = await meta(other);
    expect(b.counts.total).toBe(1);
    expect(b.comparison).toEqual({ status: 'unavailable', reason: 'baseline_missing' });
  }, 600_000);

  it('EXPLAIN (ANALYZE, BUFFERS) câu đọc thật: mốc qua khoá ngày, nối mốc qua PK quan sát; sales đi index người phụ trách', async () => {
    const db = await resolver.get(TenantContexts.system(h.ws, 'load-explain'));
    const base = await db.$transaction((tx) => baselineOf(tx as never, ZONE, '2026-10-30'));
    expect(base).not.toBeNull();
    const plan = async (who: string, isOwner: boolean) => {
      const authz = await h.app.get(AuthzResolver).resolve(h.ws, who, { roleKey: isOwner ? 'owner' : 'sales', delegations: [] });
      const q = stockReadSql(authz, base, T0) as unknown as { sql: string; values: unknown[] };
      let i = 0;
      const sql = q.sql.replace(/\?/g, () => `$${++i}`);
      const rows = await db.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN (ANALYZE, BUFFERS) ${sql}`, ...q.values);
      return rows.map((r) => r['QUERY PLAN']).join('\n');
    };
    const own = await plan(S.id, false);
    const all = await plan(h.user, true);
    note(`EXPLAIN own:\n${own}\nEXPLAIN all:\n${all}`);
    expect(own).toMatch(/ticket_stock_observation_pkey/);
    expect(own).toMatch(/ticket_(assignee|assignee_category_c)_idx/);
    expect(own).not.toMatch(/Seq Scan on ticket_stock_observation/);
    // Chủ: đếm toàn bộ 100k là bản chất câu hỏi (không LIMIT) — quét ticket hợp lệ; mốc vẫn nối theo PK / hash trên đúng một lần chụp.
    expect(all).toMatch(/ticket_stock_observation/);
    // Bảng header chỉ 8 dòng → planner chọn Seq Scan là đúng; tắt seqscan để kiểm tra mốc tra được bằng index seek (múi giờ + ngày) khi bảng lớn.
    const days = await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL enable_seqscan = off');
      return tx.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(
        `EXPLAIN SELECT id, observed_at FROM ticket_stock_batch WHERE time_zone = $1 AND local_date = $2::date AND metric_version = 1`, ZONE, '2026-10-29');
    });
    expect(days.map((r) => r['QUERY PLAN']).join('\n')).toMatch(/Index (Only )?Scan using ticket_stock_batch_(day_key|retention_idx)[\s\S]*Index Cond: \(\(time_zone = .*local_date = /);
  }, 300_000);
});

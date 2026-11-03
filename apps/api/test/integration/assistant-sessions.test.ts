// TIP-023c G2.8a (REQ-E10a) trên Postgres 16: trình duyệt phiên — keyset (last_message_at, id) của CHÍNH người gọi, trang ổn định khi có
// phiên mới chen vào đầu, nhiều phiên cùng thời điểm vẫn không trùng / sót; tìm không dấu theo tiêu đề; cursor hỏng → 422; người khác
// không thấy phiên; phiên đã lưu trữ ẩn. EXPLAIN dùng `assistant_session_user_recent_idx` (không seq scan).
import 'reflect-metadata';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { assistantSessionSchema } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };

beforeAll(async () => {
  h = await startApi();
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
type Page = { data: { id: string; title: string }[]; next_cursor: string | null };
const list = async (qs: string, token?: string) => {
  const r = await call(h, `/assistant/sessions${qs}`, undefined, token ? { authorization: `Bearer ${token}` } : {});
  return { status: r.status, body: (await r.json()) as Page };
};
const BASE = new Date('2026-10-01T08:00:00.000Z');
const seed = async (userId: string, n: number, title: (i: number) => string, at: (i: number) => Date) => {
  const db = await tenant();
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const id = uuidv7();
    ids.push(id);
    await db.assistantSession.create({ data: { id, userId, title: title(i), mode: 'chat', lastMessageAt: at(i), createdAt: at(i) } });
  }
  return ids;
};

describe('trình duyệt phiên (keyset)', () => {
  let mine: string[];

  beforeAll(async () => {
    // 7 phiên: 4 phiên trùng đúng một thời điểm (tie-break theo id), 3 phiên cách nhau 1 phút.
    mine = [
      ...(await seed(h.user, 4, (i) => `Phiên trùng giờ ${i}`, () => BASE)),
      ...(await seed(h.user, 3, (i) => `Báo giá chị Lan ${i}`, (i) => new Date(BASE.getTime() + (i + 1) * 60_000))),
    ];
    await seed(sales.id, 2, (i) => `Phiên của sales ${i}`, () => BASE);
    const db = await tenant();
    await db.assistantSession.create({ data: { id: uuidv7(), userId: h.user, title: 'Đã lưu trữ', mode: 'chat', lastMessageAt: BASE, createdAt: BASE, archivedAt: BASE } });
  });

  it('phân trang 3/trang: đủ 7 phiên, không trùng, mới nhất trước; schema DTO đúng', async () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const r = await list(`?limit=3${cursor ? `&cursor=${cursor}` : ''}`);
      expect(r.status).toBe(200);
      r.body.data.forEach((s) => assistantSessionSchema.parse(s));
      seen.push(...r.body.data.map((s) => s.id));
      cursor = r.body.next_cursor;
      pages++;
    } while (cursor && pages < 10);
    const ours = seen.filter((id) => mine.includes(id));
    expect(ours).toHaveLength(7);
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen.slice(0, 3)).toEqual([mine[6], mine[5], mine[4]]);
  });

  it('phiên mới chen vào đầu giữa hai trang → trang sau không trùng / sót', async () => {
    const p1 = await list('?limit=3');
    await seed(h.user, 1, () => 'Phiên mới chen vào', () => new Date(BASE.getTime() + 3_600_000));
    const p2 = await list(`?limit=3&cursor=${p1.body.next_cursor}`);
    const ids1 = p1.body.data.map((s) => s.id);
    const ids2 = p2.body.data.map((s) => s.id);
    expect(ids2.some((id) => ids1.includes(id))).toBe(false);
    expect(ids2).toHaveLength(3);
  });

  it('tìm không dấu theo tiêu đề; người khác / đã lưu trữ không hiện; cursor hỏng → 422', async () => {
    const q = await list(`?q=${encodeURIComponent('bao gia chi lan')}`);
    expect(q.body.data.map((s) => s.title).sort()).toEqual(['Báo giá chị Lan 0', 'Báo giá chị Lan 1', 'Báo giá chị Lan 2']);
    const all = await list('?limit=50');
    expect(all.body.data.map((s) => s.title)).not.toContain('Phiên của sales 0');
    expect(all.body.data.map((s) => s.title)).not.toContain('Đã lưu trữ');
    const theirs = await list('?limit=50', sales.token);
    expect(theirs.body.data.map((s) => s.title).sort()).toEqual(['Phiên của sales 0', 'Phiên của sales 1']);
    expect((await list('?cursor=not-a-cursor')).status).toBe(422);
  });

  it('EXPLAIN: trang keyset dùng index phiên theo người (không seq scan)', async () => {
    const ws = await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } });
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${ws.dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const plan = (
        await c.query(
          `EXPLAIN SELECT id, title, mode, last_message_at FROM assistant_session WHERE user_id = '${h.user}'::uuid AND archived_at IS NULL
           AND (last_message_at, id) < ('2026-10-01T09:00:00Z'::timestamptz, '${uuidv7()}'::uuid) ORDER BY last_message_at DESC, id DESC LIMIT 31`,
        )
      ).rows
        .map((x) => x['QUERY PLAN'])
        .join('\n');
      expect(plan).toMatch(/assistant_session_user_recent_idx/);
      expect(plan).not.toMatch(/Seq Scan/);
    } finally {
      await c.end();
    }
  });
});

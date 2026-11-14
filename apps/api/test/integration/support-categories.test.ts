// TIP-034b (Postgres 16 + Memurai thật): từ điển gợi ý danh mục ticket.
// AC1 chưa cấu hình → đọc 8 nhãn ảo version 0 không ghi; lần sửa đầu CAS (hai yêu cầu version 0 cùng lúc chỉ một thắng).
// AC2 đổi tên / bớt / đổi thứ tự / hoàn tác: gợi ý đổi, `ticket.category` cũ giữ nguyên; hoàn tác cũ sau lần sửa mới → 409.
// AC3 nhãn đã dùng chỉ trong ticket người xem thấy (own / team / none / thu hồi) — meta + GET + action, cursor chéo người / workspace bị chặn.
// AC4 settings.manage và sla.manage độc lập. AC8 EXPLAIN 100k ticket: index `(…, category COLLATE "C")`, không quét bảng.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, tenantDbName, withDatabase } from '@appchat/db';
import { categorySuggestionsSchema, DEFAULT_CATEGORY_LABELS, ticketCategoryConfigSchema, ticketsMetaSchema } from '@appchat/shared';
import { AuthzResolver, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
type Who = { id: string; token: string };
let A: Who;
let B: Who;
let N: Who;
let teamA: string;

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u?: Who): Record<string, string> => (u ? { authorization: `Bearer ${u.token}` } : {});
const act = (id: string, input: unknown, who?: Who, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...as(who), ...headers }).then(json);
const get = (path: string, who?: Who) => call(h, path, undefined, as(who)).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const ok = (r: { status: number; body: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data;
};
const cfg = async () => ticketCategoryConfigSchema.parse(ok(await get('/settings/ticket-categories')));
const replace = (labels: string[], if_version: number, who?: Who) => act('ticket_categories.replace', { labels, if_version }, who);
const undo = (logId: string, who?: Who) => call(h, `/action-logs/${logId}/undo`, {}, as(who)).then(json);
const suggest = async (who: Who, cursor?: string) => categorySuggestionsSchema.parse(ok(await get(`/support/category-suggestions${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, who)));

/** Vai trò tuỳ biến (quyền + scope support) gán cho user, làm mới quyền. */
async function role(user: string, perms: string[], support: string) {
  const db = await tenant();
  const key = `custom:cat_${uuidv7().slice(-8)}`;
  await db.role.create({ data: { id: uuidv7(), key, name: key, permissions: perms, dataScope: { inbox: 'own', crm: 'own', sales: 'own', booking: 'own', support } } });
  await h.platform.membership.update({ where: { workspaceId_userId: { workspaceId: h.ws, userId: user } }, data: { roleKey: key } });
  await h.app.get(AuthzResolver).invalidate(h.ws);
}

async function ticket(category: string, o: { assignee?: string; team?: string | null; by?: string } = {}) {
  const db = await tenant();
  const now = h.clock.now();
  const id = uuidv7();
  await db.ticket.create({
    data: { id, code: `TK-${id.slice(-8)}`, title: category, category, assigneeUserId: o.assignee ?? null, teamId: o.team ?? null, createdByType: 'user', createdById: o.by ?? h.user, frtDueAt: now, ttrStartAt: now, ttrDueAt: now },
  });
  return id;
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  [A, B, N] = [await h.member('cs'), await h.member('cs'), await h.member('cs')];
  teamA = uuidv7();
  const db = await tenant();
  await db.team.create({ data: { id: teamA, name: 'Nhóm A' } });
  await db.teamMember.createMany({ data: [{ teamId: teamA, userId: A.id }] });
  await ticket('Nhãn của A', { assignee: A.id });
  await ticket('Nhãn A tạo', { by: A.id });
  await ticket('Nhãn nhóm A', { team: teamA });
  await ticket('Nhãn của B', { assignee: B.id });
  await ticket('Nhãn ẩn', {});
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('AC1 — chưa cấu hình / lần sửa đầu', () => {
  it('đọc bản ảo version 0 (8 nhãn prototype) không ghi dòng nào', async () => {
    const c = await cfg();
    expect(c).toMatchObject({ version: 0, labels: [...DEFAULT_CATEGORY_LABELS], default: DEFAULT_CATEGORY_LABELS[0], updated_at: null });
    expect(ok(await act('ticket_categories.get', {})).result).toMatchObject({ version: 0, labels: [...DEFAULT_CATEGORY_LABELS] });
    expect(await (await tenant()).ticketCategoryConfig.count()).toBe(0);
  });

  it('hai yêu cầu version 0 cùng lúc → đúng một thắng, bên kia 409 STALE_VERSION', async () => {
    const [x, y] = await Promise.all([replace(['Hoàn tiền', 'Giao hàng'], 0), replace(['Khiếu nại'], 0)]);
    const codes = [x, y].map((r) => (r.status === 200 ? 'ok' : r.body.error.code)).sort();
    expect(codes).toEqual(['STALE_VERSION', 'ok']);
    const c = await cfg();
    expect(c.version).toBe(1);
    expect(await (await tenant()).ticketCategoryConfig.count()).toBe(1);
    const loser = [x, y].find((r) => r.status !== 200)!;
    expect(loser.body.error.fields).toEqual({ version: '1' });
  });
});

describe('AC2 — thay / hoàn tác không đổi ticket cũ', () => {
  it('xem trước: trước / sau, thêm / bớt (đổi tên = bớt + thêm), đổi mặc định, cảnh báo; chuẩn hoá NFC + trim', async () => {
    const cur = await cfg();
    const pv = await act('ticket_categories.replace', { labels: ['  Giao hàng ', 'Hoàn tiền nhanh'], if_version: cur.version }, undefined, { 'x-action-preview': '1' });
    expect(pv.status, JSON.stringify(pv.body)).toBe(202);
    const p = pv.body.data.preview;
    expect(p).toMatchObject({ risk: 'config', warnings: ['existing_tickets_unchanged'] });
    expect(p.changes[0].before.labels).toEqual(cur.labels);
    expect(p.changes[0].after).toMatchObject({ labels: ['Giao hàng', 'Hoàn tiền nhanh'], default: 'Giao hàng', default_changed: true });
    expect(p.changes[0].after.added).toEqual(['Hoàn tiền nhanh']);
    expect(p.changes[0].after.removed).toEqual(cur.labels.filter((l) => l !== 'Giao hàng'));
    expect((await cfg()).version).toBe(cur.version);
  });

  it('thay cả bộ → version +1, ticket cũ giữ nhãn; hoàn tác khôi phục bộ trước ở version mới; hoàn tác cũ sau lần sửa mới → 409', async () => {
    const db = await tenant();
    const tid = await ticket('Hoàn tiền');
    const v0 = await cfg();
    const r = ok(await replace(['Giao hàng', 'Hoàn tiền nhanh'], v0.version));
    expect(r.result).toEqual({ version: v0.version + 1, labels: ['Giao hàng', 'Hoàn tiền nhanh'], default: 'Giao hàng' });
    expect((await db.ticket.findUniqueOrThrow({ where: { id: tid } })).category).toBe('Hoàn tiền');
    const outbox = await db.outboxEvent.findMany({ where: { topic: 'ticket_categories.changed' }, orderBy: { id: 'desc' }, take: 1 });
    expect(outbox[0]!.payload).toMatchObject({ key: 'ticket_categories', version: v0.version + 1 });
    expect(JSON.stringify(outbox[0]!.payload)).not.toContain('Giao hàng');

    expect(ok(await undo(r.action_log_id))).toEqual({ undone: true });
    const back = await cfg();
    expect(back).toMatchObject({ version: v0.version + 2, labels: v0.labels });
    expect((await db.ticket.findUniqueOrThrow({ where: { id: tid } })).category).toBe('Hoàn tiền');

    const r2 = ok(await replace(['A', 'B'], back.version));
    ok(await replace(['B', 'A'], back.version + 1));
    expect((await undo(r2.action_log_id)).body.error.code).toBe('STALE_VERSION');
    expect((await cfg()).labels).toEqual(['B', 'A']);
  });

  it('hoàn tác lần sửa đầu → 8 nhãn prototype ở version mới (không xoá dòng)', async () => {
    // Workspace riêng: chưa có cấu hình.
    const h2 = await startApi();
    try {
      const r = await call(h2, '/actions/ticket_categories.replace', { input: { labels: ['Một'], if_version: 0 } }, { 'idempotency-key': uuidv7() }).then(json);
      expect(r.status, JSON.stringify(r.body)).toBe(200);
      expect((await call(h2, `/action-logs/${r.body.data.action_log_id}/undo`, {}).then(json)).status).toBe(200);
      const c = ticketCategoryConfigSchema.parse((await call(h2, '/settings/ticket-categories').then(json)).body.data);
      expect(c).toMatchObject({ version: 2, labels: [...DEFAULT_CATEGORY_LABELS] });
    } finally {
      await h2.close();
    }
  });

  it('422 theo field: rỗng / trùng không phân biệt hoa thường / quá 60 / xuống dòng / > 100; 409 version lệch; gọi lặp cùng khoá không thay hai lần', async () => {
    const c = await cfg();
    expect((await replace([], c.version)).body.error).toMatchObject({ code: 'VALIDATION_FAILED', fields: { labels: 'empty' } });
    expect((await replace(['Hoàn tiền', 'HOÀN TIỀN'], c.version)).body.error.fields).toEqual({ 'labels.1': 'duplicate' });
    expect((await replace(['Hoàn tiền', 'Hoan tien'], c.version)).status).toBe(200);
    const c2 = await cfg();
    expect((await replace(['x'.repeat(61)], c2.version)).body.error.fields).toEqual({ 'labels.0': 'too_long' });
    expect((await replace(['a\nb'], c2.version)).body.error.fields).toEqual({ 'labels.0': 'control' });
    expect((await replace(Array.from({ length: 101 }, (_, i) => `n${i}`), c2.version)).body.error.fields).toEqual({ labels: 'too_many' });
    expect((await replace(['Z'], c2.version - 1)).body.error).toMatchObject({ code: 'STALE_VERSION', fields: { version: String(c2.version) } });
    const key = uuidv7();
    const once = () => call(h, '/actions/ticket_categories.replace', { input: { labels: ['Lặp'], if_version: c2.version } }, { 'idempotency-key': key }).then(json);
    const [a, b] = [await once(), await once()];
    expect(b.body.data.result).toEqual(a.body.data.result);
    expect((await cfg()).version).toBe(c2.version + 1);
  });
});

describe('AC4 — quyền', () => {
  it('settings.manage không kèm sla.manage dùng được cấu hình, không vào SLA; ngược lại thì không', async () => {
    const X = await h.member('cs');
    await role(X.id, ['settings.manage', 'ticket.view'], 'own');
    expect((await get('/settings/ticket-categories', X)).status).toBe(200);
    expect((await get('/settings/sla', X)).status).toBe(403);
    const c = await cfg();
    expect((await replace(['Từ X'], c.version, X)).status).toBe(200);
    const Y = await h.member('cs');
    await role(Y.id, ['sla.manage', 'ticket.view'], 'own');
    expect((await get('/settings/sla', Y)).status).toBe(200);
    expect((await get('/settings/ticket-categories', Y)).status).toBe(403);
    expect((await replace(['Từ Y'], c.version + 1, Y)).status).toBe(403);
    expect((await act('ticket_categories.get', {}, Y)).status).toBe(403);
    // Gợi ý cho người đọc ticket — không cần settings.manage.
    expect((await get('/support/category-suggestions', Y)).status).toBe(200);
  });

  it('hoàn tác khi người làm đã mất settings.manage → 403, cấu hình giữ nguyên', async () => {
    const X = await h.member('cs');
    await role(X.id, ['settings.manage', 'ticket.view'], 'own');
    const r = ok(await replace(['Trước thu hồi'], (await cfg()).version, X));
    await role(X.id, ['ticket.view'], 'own');
    expect((await undo(r.action_log_id, X)).status).toBe(403);
    expect((await cfg()).labels).toEqual(['Trước thu hồi']);
  });
});

describe('AC3 — nhãn đã dùng theo scope hiện tại', () => {
  it('own: chỉ nhãn ticket mình phụ trách / tạo; team: thêm nhãn nhóm; none: không; Owner: tất cả', async () => {
    await role(A.id, ['ticket.view'], 'own');
    const own = await suggest(A);
    expect(own.used).toEqual(expect.arrayContaining(['Nhãn của A', 'Nhãn A tạo']));
    for (const hidden of ['Nhãn nhóm A', 'Nhãn của B', 'Nhãn ẩn']) expect(own.used).not.toContain(hidden);
    await role(A.id, ['ticket.view'], 'team');
    expect((await suggest(A)).used).toEqual(expect.arrayContaining(['Nhãn của A', 'Nhãn nhóm A']));
    expect((await suggest(A)).used).not.toContain('Nhãn của B');
    await role(A.id, ['ticket.view'], 'none');
    expect((await suggest(A)).used).toEqual([]);
    const all = ok(await get('/support/category-suggestions')).used as string[];
    expect(all).toEqual(expect.arrayContaining(['Nhãn của A', 'Nhãn của B', 'Nhãn ẩn']));
    // Thứ tự byte ổn định.
    expect([...all].sort((x, y) => (Buffer.from(x) < Buffer.from(y) ? -1 : 1))).toEqual(all);
  });

  it('meta danh sách ticket: cấu hình trước rồi nhãn trong scope (không lộ nhãn ẩn); action cùng kết quả', async () => {
    await role(B.id, ['ticket.view'], 'own');
    const m = ticketsMetaSchema.parse(ok(await get('/tickets/meta', B)));
    const c = await cfg();
    expect(m.category_config).toEqual({ version: c.version, labels: c.labels, default: c.labels[0] });
    expect(m.categories.slice(0, c.labels.length)).toEqual(c.labels);
    expect(m.categories).toContain('Nhãn của B');
    for (const hidden of ['Nhãn của A', 'Nhãn ẩn', 'Nhãn nhóm A']) expect(m.categories).not.toContain(hidden);
    expect(m.used_has_more).toBe(false);
    const viaAction = ok(await act('ticket.category_suggestions', {}, B)).result;
    expect(viaAction.used).toEqual((await suggest(B)).used);
  });

  it('phân trang 50 + cursor mờ: đọc tiếp đủ, không trùng; cursor người khác / sửa → 403; scope đổi → 409', async () => {
    await role(N.id, ['ticket.view'], 'own');
    for (let i = 0; i < 55; i++) await ticket(`Trang ${String(i).padStart(2, '0')}`, { assignee: N.id });
    const p1 = await suggest(N);
    expect(p1.used).toHaveLength(50);
    expect(p1.next_cursor).toBeTruthy();
    const p2 = await suggest(N, p1.next_cursor!);
    expect(p2.used).toHaveLength(5);
    expect(p2.next_cursor).toBeNull();
    expect(new Set([...p1.used, ...p2.used]).size).toBe(55);
    expect(ticketsMetaSchema.parse(ok(await get('/tickets/meta', N))).used_has_more).toBe(true);
    expect((await get(`/support/category-suggestions?cursor=${encodeURIComponent(p1.next_cursor!)}`, B)).status).toBe(403);
    expect((await get('/support/category-suggestions?cursor=abc', N)).status).toBe(403);
    await role(N.id, ['ticket.view'], 'team');
    expect((await get(`/support/category-suggestions?cursor=${encodeURIComponent(p1.next_cursor!)}`, N)).body.error.code).toBe('CONFLICT');
  });

  it('cấu hình không cho xem nhãn đã dùng: GET settings chỉ trả bộ cấu hình', async () => {
    const body = ok(await get('/settings/ticket-categories'));
    expect(Object.keys(body).sort()).toEqual(['default', 'labels', 'updated_at', 'version']);
    expect(body.labels).not.toContain('Nhãn ẩn');
  });
});

describe('AC8 — 100k ticket: index theo scope, không quét bảng', () => {
  it('all = quét nhảy trên ticket_category_c_idx; own / team = index (người phụ trách | người tạo | nhóm, category)', async () => {
    const dbName = tenantDbName(h.ws);
    const mig = new pg.Client({ connectionString: withDatabase(env.MIGRATOR_DATABASE_URL!, dbName) });
    await mig.connect();
    try {
      const now = h.clock.now();
      await mig.query(
        `INSERT INTO ticket (id, code, title, category, assignee_user_id, team_id, created_by_type, created_by_id, frt_due_at, ttr_start_at, ttr_due_at)
         SELECT gen_random_uuid(), 'TKX-'||g, 'x', 'Nhóm '||(g % 40), CASE WHEN g % 3 = 0 THEN $1::uuid END, CASE WHEN g % 5 = 0 THEN $2 END, 'user', $3, $4, $4, $4
         FROM generate_series(1, 100000) g`,
        [B.id, teamA, h.user, now],
      );
      // Bảng sau autovacuum (visibility map đủ) — như vận hành thật; không VACUUM thì planner không chọn Index Only Scan.
      await mig.query('VACUUM ANALYZE ticket');
      const plan = async (q: string, p: unknown[]) => (await mig.query(`EXPLAIN ${q}`, p)).rows.map((x) => x['QUERY PLAN']).join('\n');
      const all = await plan(
        `WITH RECURSIVE c AS ((SELECT t.category COLLATE "C" AS v FROM ticket t WHERE t.category COLLATE "C" > $1 ORDER BY 1 LIMIT 1)
          UNION ALL SELECT (SELECT t.category COLLATE "C" FROM ticket t WHERE t.category COLLATE "C" > c.v ORDER BY 1 LIMIT 1) FROM c WHERE c.v IS NOT NULL)
         SELECT v FROM c WHERE v IS NOT NULL LIMIT 51`,
        [''],
      );
      expect(all).toMatch(/ticket_category_c_idx/);
      expect(all).not.toMatch(/Seq Scan on ticket/);
      const own = await plan(
        `SELECT DISTINCT t.category COLLATE "C" FROM ticket t WHERE (t.assignee_user_id = $1::uuid OR (t.created_by_type = 'user' AND t.created_by_id = $2)) AND t.category COLLATE "C" > '' ORDER BY 1 LIMIT 51`,
        [A.id, A.id],
      );
      // Ít ticket: planner được chọn index người phụ trách có sẵn — miễn là index, không quét bảng.
      expect(own).toMatch(/ticket_assignee(_category_c)?_idx/);
      expect(own).toMatch(/ticket_creator_category_c_idx/);
      expect(own).not.toMatch(/Seq Scan on ticket/);
      // Nhiều ticket (B phụ trách ~33k): đọc nhãn thẳng từ index (người phụ trách, category) — không đọc heap từng ticket.
      const heavy = await plan(`SELECT DISTINCT t.category COLLATE "C" FROM ticket t WHERE t.assignee_user_id = $1::uuid AND t.category COLLATE "C" > '' ORDER BY 1 LIMIT 51`, [B.id]);
      expect(heavy).toMatch(/ticket_assignee_category_c_idx/);
      expect(heavy).not.toMatch(/Seq Scan on ticket/);
      const team = await plan(
        `SELECT DISTINCT t.category COLLATE "C" FROM ticket t WHERE (t.assignee_user_id = $1::uuid OR (t.created_by_type = 'user' AND t.created_by_id = $2) OR t.team_id = ANY($3::text[])) AND t.category COLLATE "C" > '' ORDER BY 1 LIMIT 51`,
        [A.id, A.id, [teamA]],
      );
      expect(team).toMatch(/ticket_team_category_c_idx/);
      expect(team).not.toMatch(/Seq Scan on ticket/);
      // Đọc thật trên 100k: Owner thấy đủ 40 nhãn mới + trang ≤ 50.
      const r = await suggest({ id: h.user, token: h.tokenFor(h.user) });
      expect(r.used.length).toBeLessThanOrEqual(50);
    } finally {
      await mig.query(`DELETE FROM ticket WHERE code LIKE 'TKX-%'`);
      await mig.end();
    }
  }, 180_000);
});

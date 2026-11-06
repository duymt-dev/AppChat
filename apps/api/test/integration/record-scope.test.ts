// TIP-042c — scope bản ghi thống nhất trên Postgres 16 thật (DC-299, D32): list (HTTP) / detail (HTTP) / action đọc (Trợ lý) cùng tập id
// cho own / team / none; team theo `team_id` bản ghi (owner ở nhiều nhóm, team_id null mơ hồ); watcher đọc chứng từ + lịch hẹn + khách +
// hội thoại của đúng khách; gỡ watcher → request kế tiếp không thấy (cô lập tenant: workspaces / hardening-cross-db); EXPLAIN list team dùng index team equality-first.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { AuthzResolver, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';
import { seedBase, seedRecords, type RecordSet } from './helpers/record-scope-fixtures';

let h: Harness;
let resolver: TenantDbResolver;
let A: { id: string; token: string };
let B: { id: string; token: string };
let W: { id: string; token: string };
let N: { id: string; token: string };
let teamA: string;
let teamB: string;
let recA: RecordSet;
let recB: RecordSet;
let recNull: RecordSet;

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const get = (path: string, who: { token: string }) => call(h, path, undefined, { authorization: `Bearer ${who.token}` }).then(json);
const act = (id: string, input: unknown, who: { token: string }, source?: string) =>
  call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), authorization: `Bearer ${who.token}`, ...(source ? { 'x-action-source': source } : {}) }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const ids = (r: { body: { data: { id: string }[] } }) => r.body.data.map((x) => x.id).sort();

/** Đặt data scope cho vai trò tuỳ biến (một module hoặc tất cả) + gán cho user, làm mới quyền. */
async function roleWith(user: string, scope: string) {
  const db = await tenant();
  const key = `custom:rs_${scope}_${uuidv7().slice(-6)}`;
  const perms = ['crm.view', 'inbox.view', 'quote.view', 'contract.view', 'order.view', 'invoice.manage', 'booking.view', 'assistant.use'];
  await db.role.create({ data: { id: uuidv7(), key, name: key, permissions: perms, dataScope: { inbox: scope, crm: scope, sales: scope, booking: scope, support: scope } } });
  await h.platform.membership.update({ where: { workspaceId_userId: { workspaceId: h.ws, userId: user } }, data: { roleKey: key } });
  await h.app.get(AuthzResolver).invalidate(h.ws);
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  [A, B, W, N] = [await h.member('sales'), await h.member('sales'), await h.member('sales'), await h.member('sales')];
  const db = await tenant();
  [teamA, teamB] = [uuidv7(), uuidv7()];
  await db.team.createMany({ data: [{ id: teamA, name: 'Nhóm A' }, { id: teamB, name: 'Nhóm B' }] });
  // B ở CẢ hai nhóm (owner nhiều nhóm); N chỉ ở nhóm A.
  await db.teamMember.createMany({ data: [{ teamId: teamA, userId: A.id }, { teamId: teamA, userId: B.id }, { teamId: teamB, userId: B.id }, { teamId: teamA, userId: N.id }] });
  const base = await seedBase(db, h.clock.now());
  recA = await seedRecords(db, { ...base, owner: A.id, team: teamA, at: h.clock.now() });
  recB = await seedRecords(db, { ...base, owner: B.id, team: teamB, at: h.clock.now() });
  recNull = await seedRecords(db, { ...base, owner: B.id, team: null, at: h.clock.now() });
  await h.app.get(AuthzResolver).invalidate(h.ws);
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const LISTS: [string, keyof RecordSet][] = [
  ['/quotes?limit=100', 'quote'],
  ['/contracts?limit=100', 'contract'],
  ['/orders?limit=100', 'order'],
  ['/invoices?limit=100', 'invoice'],
  ['/contacts?limit=100', 'contact'],
  ['/conversations?limit=100', 'conversation'],
];
const DETAIL: [string, keyof RecordSet][] = [
  ['/quotes/', 'quote'],
  ['/contracts/', 'contract'],
  ['/orders/', 'order'],
  ['/invoices/', 'invoice'],
  ['/contacts/', 'contact'],
  ['/conversations/', 'conversation'],
  ['/calendar/', 'appointment'],
];
const READ_ACTIONS: [string, string, keyof RecordSet][] = [
  ['quote.get', 'quote_id', 'quote'],
  ['contract.get', 'contract_id', 'contract'],
  ['order.get', 'order_id', 'order'],
  ['invoice.get', 'invoice_id', 'invoice'],
  ['appointment.get', 'appointment_id', 'appointment'],
];

/** Tập bản ghi người xem thấy ở mọi bề mặt — list HTTP, detail HTTP, action đọc (nguồn Trợ lý) phải cùng kết quả. */
async function seen(who: { token: string }, sets: RecordSet[]) {
  const out: Record<string, string[]> = {};
  for (const [path, k] of LISTS) {
    const r = await get(path, who);
    const all = r.status === 200 ? ids(r) : [];
    out[`list:${k}`] = sets.map((s) => s[k]).filter((x) => all.includes(x)).sort();
  }
  for (const [path, k] of DETAIL) out[`get:${k}`] = (await Promise.all(sets.map(async (s) => ((await get(path + s[k], who)).status === 200 ? s[k] : null)))).filter((x): x is string => !!x).sort();
  for (const [id, field, k] of READ_ACTIONS) out[`act:${k}`] = (await Promise.all(sets.map(async (s) => ((await act(id, { [field]: s[k] }, who, 'assistant')).status === 200 ? s[k] : null)))).filter((x): x is string => !!x).sort();
  return out;
}

const expectSame = (got: Record<string, string[]>, want: (k: keyof RecordSet) => string[]) => {
  for (const [key, v] of Object.entries(got)) expect(v, key).toEqual(want(key.split(':')[1] as keyof RecordSet).sort());
};

describe('AC1 scope nhất quán list / detail / action đọc', () => {
  it('own: chỉ của mình; team: team_id ∈ nhóm mình (owner nhiều nhóm, null mơ hồ); none: không thấy cả của mình', async () => {
    const sets = [recA, recB, recNull];
    // A own → chỉ bộ của A (khách / hội thoại / chứng từ).
    expectSame(await seen(A, sets), (k) => [recA[k]]);
    // N team (nhóm A) → bộ team A (owner A) — không thấy bộ team B của B dù B cùng nhóm A với N (DC-299: không suy từ thành viên),
    // không thấy bộ team null của B (mơ hồ → chỉ owner).
    await roleWith(N.id, 'team');
    expectSame(await seen(N, sets), (k) => [recA[k]]);
    // B team (nhóm A + B) → bộ A (team A), bộ B (team B, của mình), bộ null (của mình).
    await roleWith(B.id, 'team');
    expectSame(await seen(B, sets), (k) => [recA[k], recB[k], recNull[k]]);
    // A none → không thấy kể cả bản ghi của chính mình (list = detail = action).
    await roleWith(A.id, 'none');
    const none = await seen(A, sets);
    for (const [k, v] of Object.entries(none)) expect(v, k).toEqual([]);
  });
});

describe('AC2 watcher đọc chứng từ / lịch hẹn của đúng khách', () => {
  it('thêm watcher → thấy bộ của khách đó (không thấy khách khác); gỡ → request kế tiếp không thấy', async () => {
    const db = await tenant();
    expectSame(await seen(W, [recA, recB]), () => []);
    await db.contactCollaborator.create({ data: { contactId: recB.contact, userId: W.id, role: 'watcher', addedBy: h.user } });
    expectSame(await seen(W, [recA, recB]), (k) => [recB[k]]);
    await db.contactCollaborator.delete({ where: { contactId_userId: { contactId: recB.contact, userId: W.id } } });
    expectSame(await seen(W, [recA, recB]), () => []);
  });

});

describe('AC8 index / EXPLAIN', () => {
  it('list team: equality team_id trước sort + id; quan hệ khách covering (user_id, contact_id) INCLUDE (role)', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string; indexdef: string }[]>`SELECT indexname, indexdef FROM pg_indexes WHERE indexname LIKE '%team_%' OR indexname LIKE 'contact_collaborator%'`);
    const names = idx.map((r) => r.indexname);
    expect(names).toEqual(expect.arrayContaining(['quote_team_recent_idx', 'contract_team_recent_idx', 'order_team_recent_idx', 'invoice_team_recent_idx', 'appointment_team_start_idx', 'conversation_team_recent_idx', 'ticket_team_recent_idx']));
    expect(idx.find((r) => r.indexname === 'contact_collaborator_user_id_contact_id_idx')?.indexdef).toMatch(/\(user_id, contact_id\) INCLUDE \(role\)/);
    const dbName = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName;
    const urlOf = (base: string) => base.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`);
    const c = new pg.Client({ connectionString: urlOf(env.TENANT_DATABASE_URL!) });
    await c.connect();
    try {
      // Tải thật: 5.000 báo giá rải 20 nhóm; ANALYZE bằng chủ bảng (user test không ANALYZE được).
      const teams = Array.from({ length: 20 }, () => `'${uuidv7()}'`).join(',');
      await c.query(`INSERT INTO quote (id, code, version, root_quote_id, contact_id, owner_user_id, team_id, created_at)
        SELECT u, 'BG-L' || g, 1, u, '${recA.contact}', '${A.id}', (ARRAY[${teams}]::uuid[])[1 + g % 20], now() - (g || ' minutes')::interval
        FROM (SELECT gen_random_uuid() u, g FROM generate_series(1, 5000) g) s`);
      const adm = new pg.Client({ connectionString: urlOf(env.PROVISIONER_DATABASE_URL!) });
      await adm.connect();
      await adm.query('ANALYZE quote; ANALYZE contact_collaborator');
      await adm.end();
      const plan = (sql: string) => c.query(`EXPLAIN ${sql}`).then((r) => r.rows.map((x) => x['QUERY PLAN']).join('\n'));
      const t = teams.split(',')[0];
      const team = await plan(`SELECT q.id FROM quote q WHERE q.deleted_at IS NULL AND q.team_id = ANY(ARRAY[${t}]::uuid[]) ORDER BY q.created_at DESC, q.id DESC LIMIT 20`);
      expect(team).toMatch(/quote_team_recent_idx/);
      expect(team).not.toMatch(/Seq Scan/);
      await c.query('SET enable_seqscan = off');
      const grant = await plan(`SELECT 1 FROM contact_collaborator cc WHERE cc.user_id = '${W.id}'::uuid AND cc.contact_id = '${recA.contact}'::uuid`);
      expect(grant).toMatch(/Index Only Scan|contact_collaborator_pkey|contact_collaborator_user_id_contact_id_idx/);
    } finally {
      await c.end();
    }
  });
});

// TIP-036 P1 — Khách thân thiết trên Postgres 16 thật: seed config một dòng (chạy lại không nhân, 2 tenant cô lập); điều chỉnh tay → sổ
// + lô FIFO + số dư + timeline cùng transaction, hoàn tác ghi bù (không xoá sổ), điều chỉnh âm trả đúng lô khi hoàn tác; trừ quá số dư
// 422; quyền: CS (không loyalty.adjust) 403, Kế toán (loyalty.adjust, không crm.edit) được, sales ngoài scope 404; update_config chỉ
// hệ số / bật tắt / đơn sàn, đủ 4 hạng; đọc /loyalty/* theo zod chung, scope, lookup ngoài scope không lộ; EXPLAIN index sổ / danh sách.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { loyaltyConfigSchema, loyaltyLedgerPageSchema, loyaltyMemberSchema, loyaltyMembersPageSchema } from '@appchat/shared';
import { runTenantSeeds, tenantSeedDb, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let h2: Harness;
let resolver: TenantDbResolver;
let lan: string;
let cs: { id: string; token: string };
let sales: { id: string; token: string };
let acc: { id: string; token: string };

type Who = { token: string };
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u?: Who): Record<string, string> => (u ? { authorization: `Bearer ${u.token}` } : {});
const act = (id: string, input: unknown, who?: Who) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...as(who) }).then(json);
const get = (path: string, who?: Who) => call(h, path, undefined, as(who)).then(json);
const undo = (logId: string) => call(h, `/action-logs/${logId}/undo`, {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));

beforeAll(async () => {
  [h, h2] = await Promise.all([startApi(), startApi()]);
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  lan = (await act('contact.create', { full_name: 'Chị Lan Điểm', phone: '0909360001' })).body.data.result.contact_id;
  [cs, sales, acc] = [await h.member('cs'), await h.member('sales'), await h.member('accountant')];
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await Promise.all([h?.close(), h2?.close()]);
});

describe('config + seed', () => {
  it('seed chạy hai lần → đúng 1 config, sổ không đổi; tenant khác cô lập', async () => {
    const db = await tenant();
    const ws = await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws }, select: { dbName: true } });
    await tenantSeedDb(env.TENANT_DATABASE_URL!)(ws.dbName, (d) => runTenantSeeds(d, { workspaceId: h.ws, now: h.clock.now() }));
    expect(await db.loyaltyConfig.count()).toBe(1);
    const r = await get('/loyalty/config');
    expect(loyaltyConfigSchema.safeParse(r.body.data).success).toBe(true);
    expect(r.body.data).toMatchObject({ enabled: true, earn_vnd_per_point: 10000, redeem_vnd_per_point: 100, max_redeem_pct: 50, expiry_months: 12, marketplace_earn: false });
    expect(await act('loyalty.update_config', { tiers: [{ key: 'member', mult: 1 }, { key: 'silver', mult: 1.2 }, { key: 'gold', mult: 1.5 }, { key: 'diamond', mult: 2 }] }).then((x) => x.status)).toBe(200);
    expect((await call(h2, '/loyalty/config', undefined, {}).then(json)).body.data.tiers[1].mult).toBe(1);
  });

  it('update_config: thiếu / trùng hạng → 422; Kế toán không có loyalty.config → 403', async () => {
    const r = await act('loyalty.update_config', { tiers: [{ key: 'member', mult: 1 }, { key: 'member', mult: 1 }, { key: 'gold', mult: 1.5 }, { key: 'diamond', mult: 2 }] });
    expect(r.status).toBe(422);
    expect((await act('loyalty.update_config', { enabled: false }, acc)).status).toBe(403);
  });
});

describe('loyalty.adjust_points', () => {
  it('cộng 200 → sổ + lô hạn 12 tháng + số dư + timeline; hoàn tác ghi bù, sổ không xoá', async () => {
    const r = await act('loyalty.adjust_points', { contact_id: lan, delta: 200, reason: 'compensation', note: 'Bù chậm' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ contact_id: lan, balance_after: 200, tier: 'member' });
    const db = await tenant();
    const lot = await db.loyaltyLedger.findFirstOrThrow({ where: { contactId: lan, kind: 'adjust' } });
    expect(lot).toMatchObject({ delta: 200n, remaining: 200n, balanceAfter: 200n, reason: 'compensation' });
    expect(lot.expiresAt!.toISOString().slice(0, 10)).toBe('2027-10-30');
    expect(await db.timelineEvent.count({ where: { contactId: lan, type: 'loyalty' } })).toBe(1);
    expect((await undo(r.body.data.action_log_id)).status).toBe(200);
    expect((await db.contact.findUniqueOrThrow({ where: { id: lan } })).pointsBalance).toBe(0n);
    expect(await db.loyaltyLedger.count({ where: { contactId: lan } })).toBe(2);
  });

  it('âm trả đúng lô khi hoàn tác; trừ quá số dư 422; CS / sales 403; Kế toán được', async () => {
    await act('loyalty.adjust_points', { contact_id: lan, delta: 500, reason: 'promotion' });
    const neg = await act('loyalty.adjust_points', { contact_id: lan, delta: -300, reason: 'order_error' });
    expect(neg.body.data.result.balance_after).toBe(200);
    const db = await tenant();
    const lot = await db.loyaltyLedger.findFirstOrThrow({ where: { contactId: lan, kind: 'adjust', delta: 500n } });
    expect(lot.remaining).toBe(200n);
    await undo(neg.body.data.action_log_id);
    expect((await db.loyaltyLedger.findUniqueOrThrow({ where: { id: lot.id } })).remaining).toBe(500n);
    expect((await act('loyalty.adjust_points', { contact_id: lan, delta: -501, reason: 'fraud' })).status).toBe(422);
    expect((await act('loyalty.adjust_points', { contact_id: lan, delta: 10, reason: 'other' }, cs)).status).toBe(403);
    expect((await act('loyalty.adjust_points', { contact_id: lan, delta: 10, reason: 'other' }, acc)).status).toBe(200);
    // Sales không có loyalty.adjust → 403 ở executor (trước khi đọc khách); ngoài scope đọc → 404 (mục đọc).
    expect((await act('loyalty.adjust_points', { contact_id: lan, delta: 10, reason: 'other' }, sales)).status).toBe(403);
    const c = await db.contact.findUniqueOrThrow({ where: { id: lan } });
    const lots = await db.loyaltyLedger.aggregate({ where: { contactId: lan, remaining: { gt: 0 } }, _sum: { remaining: true } });
    expect(c.pointsBalance).toBe(510n);
    expect(lots._sum.remaining).toBe(510n);
  });
});

describe('đọc /loyalty/*', () => {
  it('thành viên: zod chung, điểm / tích / sổ thật, lịch sử cursor', async () => {
    const m = await get(`/loyalty/members/${lan}`);
    expect(loyaltyMemberSchema.safeParse(m.body.data).success, JSON.stringify(m.body)).toBe(true);
    expect(m.body.data).toMatchObject({ contact_id: lan, points: 510, tier: 'member', can_adjust: true });
    expect(m.body.data.ledger.length).toBe(5);
    const p1 = await get(`/loyalty/members/${lan}/ledger?limit=3`);
    expect(loyaltyLedgerPageSchema.safeParse(p1.body).success).toBe(true);
    const p2 = await get(`/loyalty/members/${lan}/ledger?limit=3&cursor=${p1.body.next_cursor}`);
    expect(p2.body.data.map((r: { id: string }) => r.id)).not.toContain(p1.body.data[0].id);
  });

  it('danh sách D42 + lọc hạng / tìm; sales chỉ thấy khách mình; lookup ngoài scope không lộ', async () => {
    const r = await get('/loyalty/members?page=1&limit=20&q=lan%20diem');
    expect(loyaltyMembersPageSchema.safeParse(r.body).success).toBe(true);
    expect(r.body.data.map((x: { contact_id: string }) => x.contact_id)).toContain(lan);
    expect((await get('/loyalty/members?tier=gold')).body.meta.total).toBe(0);
    expect((await get('/loyalty/members', sales)).body.meta.total).toBe(0);
    expect((await get(`/loyalty/members/${lan}`, sales)).status).toBe(404);
    expect((await get('/loyalty/lookup?phone=0909360001', sales)).body.data).toEqual({ member: null, contact: null });
    expect((await get('/loyalty/lookup?phone=0909360001')).body.data.member.contact_id).toBe(lan);
  });
});

describe('EXPLAIN', () => {
  it('sổ theo khách dùng loyalty_ledger_contact_recent_idx · lô FIFO loyalty_ledger_lots_idx · danh sách contact_tier_recent_idx', async () => {
    const db = await tenant();
    const plan = (sql: string) =>
      db.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL enable_seqscan = off');
        return (await tx.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN (ANALYZE, BUFFERS) ${sql}`)).map((r) => r['QUERY PLAN']).join('\n');
      });
    expect(await plan(`SELECT id FROM loyalty_ledger WHERE contact_id = '${lan}'::uuid ORDER BY created_at DESC, id DESC LIMIT 20`)).toContain('loyalty_ledger_contact_recent_idx');
    expect(await plan(`SELECT id, remaining FROM loyalty_ledger WHERE contact_id = '${lan}'::uuid AND remaining > 0 ORDER BY expires_at, id`)).toContain('loyalty_ledger_lots_idx');
    expect(await plan(`SELECT id FROM contact c WHERE c.deleted_at IS NULL AND c.tier_key = 'gold' ORDER BY c.created_at DESC, c.id DESC LIMIT 20`)).toContain('contact_tier_recent_idx');
  });
});

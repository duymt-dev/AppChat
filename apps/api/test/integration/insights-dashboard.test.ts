// TIP-038 pha 2 — Tổng quan thật (AC04 cô lập theo quyền / scope), việc follow bền (AC05 sweep đồng thời + lịch đồng bộ), gia hạn T-30 (AC06)
// trên Postgres thật:
//   AC04 GET /v1/dashboard đúng `dashboardSchema`; Sales (own) chỉ thấy việc / khách của mình; CSKH không thấy hợp đồng (sales none); Credit
//        chỉ Owner; workspace thứ hai không thấy việc workspace này; onboarding 011 giữ nguyên (toggle → done_count).
//   AC05 khách im lặng 8 ngày → hai sweep song song + replay sinh đúng MỘT việc; dashboard ≤ 5; lịch hẹn trả cùng id; complete từ lịch →
//        biến mất ở dashboard; tương tác mới → việc cũ superseded, việc đã xong không sinh lại cho cùng mốc. Không gửi tin.
//   AC06 hợp đồng đã ký còn 20 ngày → một mục contract_renewal kèm câu nhờ Trợ lý soạn (không tự gửi); contracts.sweep chạy hai lần → một
//        renew_notice_at; xoá hợp đồng → mục biến mất. Tác vụ AI theo contract.expiring: người tạo bị thu scope → không chạy.
// EXPLAIN danh sách việc follow ghi .data/gate/038p2-explain.txt.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { ActionExecutor, eventRecordVisible, sweepContracts, sweepFollowUps, uuidv7 } from '@appchat/core';
import { authzForRole, dashboardSchema } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let h2: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let sales: { id: string; token: string };
let cs: { id: string; token: string };
let seq = 0;
const DAY = 86_400_000;
const code = (p: string) => `${p}-D${Date.now() % 100000}${++seq}`;

const get = async (path: string, token = h.token, hh = h) => {
  const r = await fetch(`${hh.base}/v1${path}`, { headers: { authorization: `Bearer ${token}`, 'x-workspace-id': hh.ws } });
  return { status: r.status, body: (await r.json()) as any }; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const act = (id: string, input: unknown, token = h.token) =>
  call(h, `/actions/${id}`, { input }, { authorization: `Bearer ${token}`, 'idempotency-key': uuidv7() }).then(async (r) => ({ status: r.status, body: (await r.json()) as any })); // eslint-disable-line @typescript-eslint/no-explicit-any
const sweep = () => sweepFollowUps({ platform: h.platform, executor: h.app.get(ActionExecutor, { strict: false }), now: () => h.clock.now() });

async function contact(owner: string, silentDays: number, stage: 'lead' | 'won' = 'lead') {
  const id = uuidv7();
  await db.contact.create({ data: { id, code: code('KH'), name: `Khách ${seq}`, source: 'manual', ownerUserId: owner, stage, lastInteractionAt: new Date(h.clock.now().getTime() - silentDays * DAY) } });
  return id;
}

beforeAll(async () => {
  h = await startApi();
  h2 = await startApi();
  sales = await h.member('sales');
  cs = await h.member('cs');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 'dashboard-test'));
}, 180_000);
afterAll(async () => {
  await resolver?.close();
  await h2?.close();
  await h?.close();
});

describe('AC05 việc follow bền', () => {
  it('hai sweep song song + replay → một việc mỗi khách; won / mới tương tác không sinh; không gửi tin', async () => {
    const quiet = await contact(h.user, 8);
    await contact(h.user, 3);
    await contact(h.user, 10, 'won');
    const before = await db.outboxEvent.count({ where: { topic: { startsWith: 'message.' } } });
    await Promise.all([sweep(), sweep()]);
    await sweep();
    const rows = await db.followUp.findMany({ where: { contactId: quiet } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: 'pending', version: 1 });
    expect(await db.followUp.count()).toBe(1);
    expect(await db.outboxEvent.count({ where: { topic: { startsWith: 'message.' } } })).toBe(before);
  });

  it('dashboard ≤ 5 theo hạn + tổng còn lại; lịch hẹn cùng id; complete từ lịch → biến mất ở dashboard', async () => {
    for (let i = 0; i < 6; i++) await contact(h.user, 9 + i);
    await sweep();
    const d = (await get('/dashboard')).body.data;
    expect(d.follow_ups).toHaveLength(5);
    expect(d.follow_up_count).toBe(7);
    expect(d.follow_ups.map((f: { due_at: string }) => f.due_at)).toEqual([...d.follow_ups.map((f: { due_at: string }) => f.due_at)].sort());
    const cal = (await get('/calendar/meta')).body.data.follow_ups as { id: string }[];
    expect(cal.map((f) => f.id)).toEqual(expect.arrayContaining(d.follow_ups.map((f: { id: string }) => f.id)));
    const first = d.follow_ups[0].id as string;
    expect((await act('follow_up.complete', { follow_up_id: first })).body.data.result.remaining).toBe(6);
    const after = (await get('/dashboard')).body.data;
    expect(after.follow_up_count).toBe(6);
    expect(after.follow_ups.map((f: { id: string }) => f.id)).not.toContain(first);
  });

  it('tương tác mới → việc cũ superseded; việc đã xong không sinh lại cho cùng mốc', async () => {
    const k = await contact(h.user, 8);
    await sweep();
    const f = await db.followUp.findFirstOrThrow({ where: { contactId: k } });
    expect((await act('follow_up.complete', { follow_up_id: f.id })).status).toBe(200);
    await sweep();
    expect(await db.followUp.count({ where: { contactId: k } })).toBe(1);
    const k2 = await contact(h.user, 8);
    await sweep();
    await db.contact.update({ where: { id: k2 }, data: { lastInteractionAt: h.clock.now() } });
    await sweep();
    expect((await db.followUp.findFirstOrThrow({ where: { contactId: k2 } })).status).toBe('superseded');
  });
});

describe('AC04 cô lập theo quyền / scope', () => {
  it('schema đúng; Sales (own) chỉ việc khách mình; CSKH không hợp đồng; Credit chỉ Owner; workspace khác không thấy', async () => {
    const mine = await contact(sales.id, 8);
    await sweep();
    const owner = await get('/dashboard');
    expect(owner.status, JSON.stringify(owner.body)).toBe(200);
    expect(dashboardSchema.safeParse(owner.body.data).success).toBe(true);
    expect(owner.body.data.credit).not.toBeNull();
    const s = (await get('/dashboard', sales.token)).body.data;
    expect(dashboardSchema.safeParse(s).success).toBe(true);
    expect(s.follow_ups.map((f: { contact_id: string }) => f.contact_id)).toEqual([mine]);
    expect(s.follow_up_count).toBe(1);
    expect(s.credit).toBeNull();
    expect(s.ai_today.credits).toBeNull();
    const c = (await get('/dashboard', cs.token)).body.data;
    expect(c.my_work.filter((w: { type: string }) => w.type === 'contract_renewal')).toEqual([]);
    const other = (await get('/dashboard', h2.token, h2)).body.data;
    expect(other.follow_up_count).toBe(0);
  });

  it('chờ duyệt: chỉ người QUYẾT ĐỊNH được thấy; onboarding 011 giữ nguyên', async () => {
    await db.approvalRequest.create({
      data: { id: uuidv7(), actionId: 'quote.send', input: {}, inputHash: 'x', risk: 'send', permission: 'quote.send', title: 'Gửi báo giá BG-1', source: 'agent', requestedAt: h.clock.now(), expiresAt: new Date(h.clock.now().getTime() + DAY) },
    });
    expect((await get('/dashboard')).body.data.my_work.some((w: { type: string }) => w.type === 'approval')).toBe(true);
    expect((await get('/dashboard', cs.token)).body.data.my_work.some((w: { type: string }) => w.type === 'approval')).toBe(false);
    expect((await act('onboarding.toggle_step', { step: 'channel', done: true })).status).toBe(200);
    expect((await get('/dashboard')).body.data.onboarding.done_count).toBe(1);
  });
});

describe('AC06 gia hạn T-30', () => {
  it('một mục gia hạn + câu nhờ Trợ lý; sweep hai lần → một notice; xoá → hết; tác vụ: người tạo mất scope → không chạy', async () => {
    const k = await contact(h.user, 1);
    const id = uuidv7();
    const end = new Date(Date.parse('2026-10-30T00:00:00Z') + 20 * DAY);
    const file = uuidv7();
    await db.file.create({ data: { id: file, storageKey: `t/${file}.pdf`, name: 'hd.pdf', mime: 'application/pdf', size: 1n, purpose: 'contract', confirmed: true } });
    await db.contract.create({ data: { id, code: code('HD'), contactId: k, title: 'Gói năm', status: 'signed', ownerUserId: h.user, endDate: end, signedFileId: file, signedSha256: 'a'.repeat(64) } });
    const items = (await get('/dashboard')).body.data.my_work.filter((w: { type: string }) => w.type === 'contract_renewal');
    expect(items).toEqual([expect.objectContaining({ id, route: `/contracts?open=${id}`, ask: expect.stringContaining('chỉ soạn nháp') })]);
    const deps = { platform: h.platform, tenants: resolver, executor: h.app.get(ActionExecutor, { strict: false }), now: () => h.clock.now() };
    await sweepContracts(deps);
    await sweepContracts(deps);
    expect(await db.outboxEvent.count({ where: { topic: 'contract.expiring', payload: { path: ['contract_id'], equals: id } } })).toBe(1);
    expect(await db.$transaction((tx) => eventRecordVisible(tx, authzForRole('sales', sales.id), { contract_id: id }))).toBe(false);
    expect(await db.$transaction((tx) => eventRecordVisible(tx, { ...authzForRole('owner', h.user), isOwner: true }, { contract_id: id }))).toBe(true);
    await db.contract.update({ where: { id }, data: { deletedAt: h.clock.now() } });
    expect((await get('/dashboard')).body.data.my_work.some((w: { id: string }) => w.id === id)).toBe(false);
  });
});

describe('EXPLAIN việc follow (migration 20261106003800)', () => {
  it('ghi kế hoạch ra .data/gate/038p2-explain.txt', async () => {
    const ws = await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws }, select: { dbName: true } });
    const url = new URL(env.TENANT_DATABASE_URL!);
    url.pathname = `/${ws.dbName}`;
    const c = new pg.Client({ connectionString: url.toString() });
    await c.connect();
    await c.query('SET enable_seqscan = off');
    const q = {
      pending_due: `SELECT f.id, f.contact_id, f.version FROM follow_up f WHERE f.status = 'pending' ORDER BY f.due_at, f.id LIMIT 5`,
      contact_pending: `SELECT id FROM follow_up WHERE contact_id = '${uuidv7()}' AND status = 'pending'`,
    };
    const out: string[] = [];
    for (const [k, sql] of Object.entries(q)) out.push(`## ${k}\n${sql}\n${(await c.query(`EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) ${sql}`)).rows.map((r) => r['QUERY PLAN']).join('\n')}\n`);
    await c.end();
    const dir = join(__dirname, '../../../../.data/gate');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '038p2-explain.txt'), out.join('\n'));
    expect(out[0]).toMatch(/follow_up_pending_due_idx/);
    expect(out[1]).toMatch(/follow_up_contact_pending_idx/);
  });
});

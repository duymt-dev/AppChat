// TIP-038 pha 1 — số liệu đọc sẵn (AC01 registry / tool, AC02 số học, AC03 thống kê agent) trên Postgres thật:
//   AC01 cùng params → HTTP GET /v1/insights/:metric = action insight.query (UI) = Trợ lý query_data (cùng rows / sources / window); metric
//        lạ / khoá lạ → 422; Sales (scope own) chỉ thấy đơn mình; CSKH thiếu order.view → nguồn bị loại rõ, không tổng; insights scope none → rỗng.
//   AC02 thu ròng = khoản thu xác nhận − hoàn xác nhận (điểm / chờ duyệt không tính), đơn huỷ không vào doanh số; tiền bigint lớn đúng từng
//        đồng (chuỗi); cửa sổ nửa mở theo giờ workspace (đơn lúc 23:59 ngày cuối ở trong, 00:00 ngày sau ở ngoài); mẫu số rỗng → null + n 0.
//   AC03 hai agent, lượt dry-run không tính, handoff vào mẫu số tỷ lệ lượt; CSAT chỉ ticket có điểm giao cho agent, đóng trong kỳ; người thật
//        so sánh cùng kỳ; Credit chỉ run thật; CSKH không quyền đơn → tỷ lệ chốt unavailable; người không quyền agents.manage không nhận Credit.
// EXPLAIN các truy vấn nguồn ghi ra .data/gate/038-explain.txt (index của migration 20261102003800_insights).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { uuidv7 } from '@appchat/core';
import { agentStatsSchema, insightResultSchema } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let sales: { id: string; token: string };
let cs: { id: string; token: string };
const ids = { bot: uuidv7(), bot2: uuidv7(), mine: uuidv7(), other: uuidv7(), served: uuidv7(), human: uuidv7() };
let seq = 0;
const code = (p: string) => `${p}-I${Date.now() % 100000}${++seq}`;

const get = async (path: string, token = h.token) => {
  const r = await fetch(`${h.base}/v1${path}`, { headers: { authorization: `Bearer ${token}`, 'x-workspace-id': h.ws } });
  return { status: r.status, body: (await r.json()) as any }; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const act = (input: unknown, token = h.token, headers: Record<string, string> = {}) =>
  call(h, '/actions/insight.query', { input }, { authorization: `Bearer ${token}`, ...headers }).then(async (r) => ({ status: r.status, body: (await r.json()) as any })); // eslint-disable-line @typescript-eslint/no-explicit-any

/** Giờ VN (UTC+7) → Date. */
const vn = (s: string) => new Date(`${s}+07:00`);

async function seed() {
  const contact = (id: string, owner: string, o: { lastOrderAt?: Date; spent?: bigint } = {}) =>
    db.contact.create({ data: { id, code: code('KH'), name: `Khách ${id.slice(-4)}`, source: 'manual', ownerUserId: owner, ...(o.lastOrderAt ? { lastOrderAt: o.lastOrderAt } : {}), ...(o.spent ? { totalSpent: o.spent } : {}) } });
  await contact(ids.mine, sales.id);
  await contact(ids.other, h.user, { lastOrderAt: vn('2026-08-01T10:00:00'), spent: 9_000_000n });
  await contact(ids.served, h.user);
  await contact(ids.human, h.user);
  const order = async (contactId: string, owner: string, status: 'new' | 'completed' | 'cancelled', total: bigint, at: Date) =>
    (await db.order.create({ data: { id: uuidv7(), code: code('DH'), contactId, ownerUserId: owner, status, total, subtotal: total, createdAt: at, ...(status === 'completed' ? { completedAt: at } : {}), ...(status === 'cancelled' ? { cancelReason: 'x' } : {}) } })).id;
  // Doanh số đặt: bigint lớn của Owner + đơn Sales + đơn huỷ (không tính) + mép cửa sổ.
  const big = await order(ids.other, h.user, 'new', 9_007_199_254_740_993n, vn('2026-10-05T09:00:00'));
  await order(ids.mine, sales.id, 'new', 1_500_000n, vn('2026-10-05T10:00:00'));
  await order(ids.other, h.user, 'cancelled', 7_000_000n, vn('2026-10-06T09:00:00'));
  await order(ids.other, h.user, 'new', 100_000n, vn('2026-10-31T23:59:00'));
  await order(ids.other, h.user, 'new', 200_000n, vn('2026-11-01T00:00:00'));
  await order(ids.served, h.user, 'completed', 3_000_000n, vn('2026-10-20T09:00:00'));
  // Thu tiền: 5tr + 2tr xác nhận, hoàn −1tr xác nhận, hoàn −500k chờ duyệt, điểm 300k → thu ròng 6.000.000.
  const pay = (kind: 'payment' | 'deposit' | 'refund' | 'points', amount: bigint, status: 'confirmed' | 'pending', at: Date) =>
    db.customerPayment.create({ data: { id: uuidv7(), contactId: ids.other, kind, amount, method: 'cash', status, paidAt: at, receiptCode: amount > 0n ? code('PT') : null, orderId: big, ...(kind === 'refund' ? { reason: 'hoàn' } : {}) } });
  await pay('payment', 5_000_000n, 'confirmed', vn('2026-10-10T09:00:00'));
  await pay('deposit', 2_000_000n, 'confirmed', vn('2026-10-12T09:00:00'));
  await pay('refund', -1_000_000n, 'confirmed', vn('2026-10-13T09:00:00'));
  await pay('refund', -500_000n, 'pending', vn('2026-10-14T09:00:00'));
  await pay('points', 300_000n, 'confirmed', vn('2026-10-15T09:00:00'));
  // Agent + hội thoại + lượt: bot 3 lượt thật (2 completed, 1 handoff) + 1 dry-run; bot2 không lượt.
  for (const [id, name] of [[ids.bot, 'Bot CSKH'], [ids.bot2, 'Bot Sales']] as const) await db.aiAgent.create({ data: { id, name, status: 'active' } });
  const account = uuidv7();
  await db.channelAccount.create({ data: { id: account, type: 'webchat', name: 'web', status: 'connected' } });
  const conv = async (contactId: string, assignee: string | null) => {
    const id = uuidv7();
    await db.conversation.create({ data: { id, channelAccountId: account, channelType: 'webchat', externalThreadId: `i-${id}`, title: 'K', contactId, assigneeUserId: assignee, lastMessageAt: vn('2026-10-20T09:00:00') } });
    return id;
  };
  const cServed = await conv(ids.served, h.user);
  const cHuman = await conv(ids.human, h.user);
  const run = (conversationId: string, status: 'completed' | 'handoff', dryRun = false, credits = 2) => {
    const id = uuidv7();
    return db.aiRun.create({ data: { id, rootRunId: id, kind: 'agent_reply', agentId: ids.bot, conversationId, status, dryRun, creditsUsed: credits, startedAt: vn('2026-10-20T09:00:00') } });
  };
  await run(cServed, 'completed');
  await run(cServed, 'completed');
  await run(cServed, 'handoff');
  await run(cServed, 'completed', true, 50);
  await db.message.create({ data: { id: uuidv7(), conversationId: cHuman, channelAccountId: account, direction: 'out', senderType: 'user', senderId: h.user, kind: 'text', body: 'Chào chị', externalMsgId: uuidv7(), status: 'sent', createdAt: vn('2026-10-20T10:00:00') } });
  // Ticket: agent 2 có điểm (5, 3) + 1 không điểm + 1 ngoài kỳ; người thật 1 có điểm (4).
  const ticket = (o: { agent?: string; user?: string; csat: number | null; closed: Date }) =>
    db.ticket.create({ data: { id: uuidv7(), code: code('TKT'), title: 't', category: 'Khác', status: 'closed', assigneeAgentId: o.agent ?? null, assigneeUserId: o.user ?? null, csat: o.csat, closedAt: o.closed, slaResult: 'met', frtDueAt: o.closed, ttrStartAt: o.closed, ttrDueAt: o.closed } });
  await ticket({ agent: ids.bot, csat: 5, closed: vn('2026-10-21T09:00:00') });
  await ticket({ agent: ids.bot, csat: 3, closed: vn('2026-10-22T09:00:00') });
  await ticket({ agent: ids.bot, csat: null, closed: vn('2026-10-23T09:00:00') });
  await ticket({ agent: ids.bot, csat: 1, closed: vn('2026-08-01T09:00:00') });
  await ticket({ user: h.user, csat: 4, closed: vn('2026-10-24T09:00:00') });
}

beforeAll(async () => {
  h = await startApi();
  sales = await h.member('sales');
  cs = await h.member('cs');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 'insights-test'));
  await seed();
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const OCT = { from: '2026-10-01', to: '2026-11-01' };

describe('AC01 registry / tool', () => {
  it('cùng params: HTTP = action UI = action nguồn Trợ lý (cùng rows / sources / window)', async () => {
    const http = await get(`/insights/sales.booked?from=${OCT.from}&to=${OCT.to}&bucket=month`);
    expect(http.status, JSON.stringify(http.body)).toBe(200);
    expect(insightResultSchema.safeParse(http.body.data).success).toBe(true);
    const viaUi = await act({ metric: 'sales.booked', params: { ...OCT, bucket: 'month' } });
    const viaAssistant = await act({ metric: 'sales.booked', params: { ...OCT, bucket: 'month' } }, h.token, { 'x-action-source': 'assistant' });
    expect(viaAssistant.status, JSON.stringify(viaAssistant.body)).toBe(200);
    const pick = (d: any) => ({ rows: d.rows, sources: d.sources, window: d.window, sample_count: d.sample_count }); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(pick(viaUi.body.data.result)).toEqual(pick(http.body.data));
    expect(pick(viaAssistant.body.data.result)).toEqual(pick(http.body.data));
  });

  it('metric lạ / khoá lạ / SQL → 422; thiếu insights.view → 403', async () => {
    expect((await get('/insights/revenue')).status).toBe(422);
    expect((await get(`/insights/sales.booked?from=${OCT.from}&sql=DROP`)).body.error).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect((await act({ metric: 'SELECT 1' })).status).toBe(422);
    const noInsights = await h.member('marketing_noinsights');
    expect((await get('/insights/sales.booked', noInsights.token)).status).toBe(403);
  });

  it('scope: Sales (own) chỉ đơn mình; CSKH thiếu order.view → nguồn loại rõ, không tổng', async () => {
    const s = await get(`/insights/sales.booked?from=${OCT.from}&to=${OCT.to}&bucket=month`, sales.token);
    expect(s.body.data.rows).toEqual([{ period: '2026-10-01', amount: '1500000', count: 1 }]);
    const c = await get(`/insights/sales.booked?from=${OCT.from}&to=${OCT.to}`, cs.token);
    expect(c.body.data).toMatchObject({ rows: [], sample_count: 0, availability: { status: 'unavailable', excluded: [{ source: 'order', reason: 'permission:order.view' }] } });
    expect((await get(`/insights/sales.collected?from=${OCT.from}&to=${OCT.to}`, cs.token)).body.data.availability.status).toBe('unavailable');
  });
});

describe('AC02 số học', () => {
  it('đặt: huỷ không tính, bigint đúng từng đồng, cửa sổ nửa mở theo giờ workspace', async () => {
    const r = await get(`/insights/sales.booked?from=${OCT.from}&to=${OCT.to}&bucket=month`);
    // 9 007 199 254 740 993 + 1 500 000 + 100 000 (23:59 ngày 31) + 3 000 000 (hoàn tất) — đơn 01/11 00:00 ngoài kỳ, đơn huỷ không tính.
    expect(r.body.data.rows).toEqual([{ period: '2026-10-01', amount: '9007199259340993', count: 4 }]);
    expect(r.body.data.window).toEqual({ ...OCT, timezone: 'Asia/Ho_Chi_Minh', bucket: 'month' });
    const nov = await get('/insights/sales.booked?from=2026-11-01&to=2026-11-02&bucket=day');
    expect(nov.body.data.rows).toEqual([{ period: '2026-11-01', amount: '200000', count: 1 }]);
  });

  it('thu ròng: xác nhận − hoàn xác nhận; hoàn chờ duyệt / điểm không tính; ngày trống điền 0', async () => {
    const r = await get(`/insights/sales.collected?from=2026-10-10&to=2026-10-16&bucket=day`);
    expect(r.body.data.rows.map((x: { amount: string }) => x.amount)).toEqual(['5000000', '0', '2000000', '-1000000', '0', '0']);
    const m = await get(`/insights/sales.collected?from=${OCT.from}&to=${OCT.to}&bucket=month`);
    expect(m.body.data.rows).toEqual([{ period: '2026-10-01', amount: '6000000', count: 2 }]);
  });

  it('khách sắp rời: có đơn trước kỳ, không đơn trong kỳ; nguồn là id trong scope', async () => {
    const r = await get('/insights/customers.at_risk?days=30');
    expect(r.body.data.sources[0].ids).toContain(ids.other);
    expect(r.body.data.rows.find((x: { total_spent: string }) => x.total_spent === '9000000')).toBeTruthy();
    expect((await get('/insights/customers.at_risk?days=30', sales.token)).body.data.sources[0].ids).not.toContain(ids.other);
  });

  it('hỗ trợ: mẫu số rỗng → null + n 0', async () => {
    const r = await get('/insights/support.performance?from=2026-10-21&to=2026-10-25&bucket=day');
    expect(r.body.data.rows).toEqual([
      { period: '2026-10-21', closed: 1, sla_met_rate: 100, csat: 5, csat_n: 1 },
      { period: '2026-10-22', closed: 1, sla_met_rate: 100, csat: 3, csat_n: 1 },
      { period: '2026-10-23', closed: 1, sla_met_rate: 100, csat: null, csat_n: 0 },
      { period: '2026-10-24', closed: 1, sla_met_rate: 100, csat: 4, csat_n: 1 },
    ]);
  });
});

describe('AC03 thống kê agent', () => {
  it('lượt thật / dry-run / handoff; CSAT có mẫu; người thật cùng kỳ; Credit chỉ run thật', async () => {
    const r = await get(`/agents/${ids.bot}/stats?from=${OCT.from}&to=${OCT.to}`);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(agentStatsSchema.safeParse(r.body.data).success).toBe(true);
    expect(r.body.data).toMatchObject({
      conversations: { value: 1, n: 3, available: true },
      resolve_rate: { value: 66.7, n: 3, available: true },
      csat: { value: 4, n: 2, available: true },
      close_rate: { value: 100, n: 1, available: true },
      credits: { value: 6, n: 3, available: true },
      human: { csat: { value: 4, n: 1 }, close_rate: { value: 0, n: 1 } },
    });
    const idle = await get(`/agents/${ids.bot2}/stats?from=${OCT.from}&to=${OCT.to}`);
    expect(idle.body.data.csat).toEqual({ value: null, n: 0, available: false, reason: 'no_samples' });
    expect((await get(`/agents/${uuidv7()}/stats`)).status).toBe(404);
  });

  it('thẻ agent (danh sách) dùng cùng service — CSAT thật, không 0 giả', async () => {
    const list = await get('/agents');
    const bot = list.body.data.find((a: { id: string }) => a.id === ids.bot);
    expect(bot.stats.agent_id).toBe(ids.bot);
    expect(bot.csat).toBe(bot.stats.csat.available ? bot.stats.csat.value : 0);
  });

  it('quyền nguồn: CSKH (không order.view) → tỷ lệ chốt unavailable; không agents.manage → không Credit', async () => {
    const r = await get(`/agents/${ids.bot}/stats?from=${OCT.from}&to=${OCT.to}`, cs.token);
    expect(r.body.data.close_rate).toMatchObject({ available: false, reason: 'permission:order.view' });
    expect(r.body.data.credits).toMatchObject({ available: false, value: null });
  });

  it('agents.performance qua insight.query khớp /agents/:id/stats', async () => {
    const r = await act({ metric: 'agents.performance', params: { ...OCT, agent_id: ids.bot } });
    const s = (await get(`/agents/${ids.bot}/stats?from=${OCT.from}&to=${OCT.to}`)).body.data;
    expect(r.body.data.result.rows).toEqual([expect.objectContaining({ agent_id: ids.bot, conversations: 1, resolve_rate: s.resolve_rate.value, csat: 4, csat_n: 2, credits: 6 })]);
  });
});

describe('EXPLAIN nguồn metric (index migration 038)', () => {
  it('ghi kế hoạch ra .data/gate/038-explain.txt', async () => {
    const ws = await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws }, select: { dbName: true } });
    const url = new URL(env.TENANT_DATABASE_URL!);
    url.pathname = `/${ws.dbName}`;
    const c = new pg.Client({ connectionString: url.toString() });
    await c.connect();
    const q = {
      agent_runs: `SELECT agent_id, count(*) FROM ai_run WHERE agent_id = '${ids.bot}' AND kind = 'agent_reply' AND NOT dry_run AND started_at >= '2026-10-01' AND started_at < '2026-11-01' GROUP BY agent_id`,
      agent_csat: `SELECT avg(csat) FROM ticket WHERE assignee_agent_id = '${ids.bot}'::uuid AND closed_at >= '2026-10-01' AND closed_at < '2026-11-01' AND csat IS NOT NULL`,
      support_closed: `SELECT count(*) FROM ticket WHERE closed_at >= '2026-10-01' AND closed_at < '2026-11-01'`,
      collected: `SELECT sum(amount) FROM customer_payment WHERE status = 'confirmed' AND kind <> 'points' AND paid_at >= '2026-10-01' AND paid_at < '2026-11-01'`,
    };
    await c.query('SET enable_seqscan = off');
    const out: string[] = [];
    for (const [k, sql] of Object.entries(q)) {
      const plan = (await c.query(`EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) ${sql}`)).rows.map((r) => r['QUERY PLAN']).join('\n');
      out.push(`## ${k}\n${sql}\n${plan}\n`);
    }
    await c.end();
    const dir = join(__dirname, '../../../../.data/gate');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '038-explain.txt'), out.join('\n'));
    expect(out.join()).toMatch(/ai_run_agent_reply_idx/);
    expect(out.find((x) => x.startsWith('## agent_csat'))).toMatch(/Index Only Scan using ticket_(agent_)?closed_idx/);
    expect(out.join()).toMatch(/ticket_closed_idx/);
    expect(out.join()).toMatch(/customer_payment_confirmed_paid_idx/);
  });
});

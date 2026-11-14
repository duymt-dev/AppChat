// TIP-026c AC2 / AC5–AC8 trên Postgres 16 + Memurai: Cơ hội / Sales Pipeline.
// (AC2) Hồ sơ 360°: thẻ cơ hội hiện hành (Tư vấn / Demo 48tr → 50%, dự báo 24tr, sản phẩm, bước tiếp theo); người thiếu quote.view thấy
// giai đoạn, không thấy tiền (VẮNG + amount_hidden). GET /v1/contacts/:id/opportunities + GET /v1/opportunities/:id cùng reader với action.
// (AC5) Thua "Giá cao": báo giá sent → rejected, nháp giữ, Thua 0%; Mở lại → Đủ điều kiện. (AC6) hai cơ hội mở + báo giá mở KHÔNG gắn cơ hội,
// cơ hội Đàm phán Thua → khách = Báo giá (sàn chứng từ); kéo tay trong 24 giờ thắng. (AC7) agent là nhân viên (DC-922): tạo từ hội thoại ở
// `quote` nguồn `conversation`, set_stage chạy thẳng (event actor agent), won thiếu chứng từ 422 như người, mark_lost thiếu lý do 422.
// (AC8) 100k khách / 300k cơ hội: openSummary một truy vấn cho cả trang, Index Only Scan trên contact_opportunity_open_idx; cột / chip có mặt.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, tenantDbName, withDatabase, type TenantDb } from '@appchat/db';
import { authzForRole, contact360Schema, opportunityDetailSchema, opportunityPageSchema } from '@appchat/shared';
import { ActionExecutor, uuidv7, type ActionContext } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let cs: { id: string; token: string };

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 't'));
  cs = await h.member('cs');
  await db.channelAccount.create({ data: { id: uuidv7(), type: 'email', name: 'cskh@spa.vn', externalId: 'cskh@spa.vn', status: 'connected', settings: {} } });
}, 60_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u?: { token: string }): Record<string, string> => (u ? { authorization: `Bearer ${u.token}` } : {});
const act = (id: string, input: unknown, who?: { token: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...as(who) }).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, as(who)).then(json);
const ok = (r: { status: number; body: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data.result;
};
const stage = async (id: string) => (await db.contact.findUniqueOrThrow({ where: { id } })).stage;
const line = { name: 'Gói chăm sóc', qty: 1, unit_price: '5000000', tax_rate: 0 };
let n = 0;
const customer = async () => ok(await act('contact.create', { full_name: `Khách pipeline ${++n}`, phone: `09096200${String(n).padStart(2, '0')}`, email: `pl${n}@example.com` })).contact_id as string;

describe('Hồ sơ 360° + đọc (AC2)', () => {
  it('Tư vấn / Demo 48tr → thẻ 50%, dự báo 24tr, sản phẩm, bước tiếp; CS thấy giai đoạn không thấy tiền', async () => {
    const c = await customer();
    const product = ok(await act('product.create', { name: 'HIFU nâng cơ', type: 'service', price: '24000000', tax_rate: 0 })).product_id;
    const o = ok(await act('contact_opportunity.create', { contact_id: c, title: 'Liệu trình HIFU', amount_vnd: '48000000', stage: 'demo', items: [{ product_id: product, name: 'HIFU', qty: 2 }] })).opportunity_id;
    const p = contact360Schema.parse((await get(`/contacts/${c}`)).body.data);
    expect(p.opportunity).toMatchObject({ id: o, stage: 'demo', probability: 50, amount_vnd: '48000000', forecast_vnd: '24000000', items: [{ name: 'HIFU', qty: 2 }], next_step: { key: 'send_quote', source: 'rule' } });
    expect(p.opportunities.map((x) => x.id)).toEqual([o]);
    const forCs = contact360Schema.parse((await get(`/contacts/${c}`, cs)).body.data);
    expect(forCs.opportunity!.stage).toBe('demo');
    expect('amount_vnd' in forCs.opportunity! || 'forecast_vnd' in forCs.opportunity!).toBe(false);
    expect(forCs.opportunity!.amount_hidden).toBe(true);
    // GET cùng reader với action list / get.
    const page = opportunityPageSchema.parse({ items: (await get(`/contacts/${c}/opportunities`)).body.data, next_cursor: null });
    expect(page.items[0]!.id).toBe(o);
    const d = opportunityDetailSchema.parse((await get(`/opportunities/${o}`)).body.data);
    expect([d.can_edit, d.events.map((e) => e.kind)]).toEqual([true, ['created']]);
    expect((await get(`/opportunities/${uuidv7()}`)).status).toBe(404);
    expect((await get(`/contacts/${c}/opportunities?limit=999`)).status).toBe(400);
  });
});

describe('Thua / Mở lại (AC5)', () => {
  it('báo giá sent → rejected, nháp giữ; Thua 0%, lý do; Mở lại → Đủ điều kiện; có đơn sống → 409', async () => {
    const c = await customer();
    const o = ok(await act('contact_opportunity.create', { contact_id: c, title: 'Gói năm', stage: 'qualified' })).opportunity_id;
    const sent = ok(await act('quote.create', { contact_id: c, items: [line], opportunity_id: o })).quote_id;
    ok(await act('quote.send', { quote_id: sent, channel: 'email' }));
    const draft = ok(await act('quote.create', { contact_id: c, items: [line], opportunity_id: o })).quote_id;
    const r = ok(await act('contact_opportunity.mark_lost', { opportunity_id: o, lost_reason: 'price' }));
    expect(r.rejected_quote_ids).toEqual([sent]);
    expect((await db.quote.findUniqueOrThrow({ where: { id: sent } })).status).toBe('rejected');
    expect((await db.quote.findUniqueOrThrow({ where: { id: draft } })).status).toBe('draft');
    expect(await db.outboxEvent.count({ where: { topic: 'quote.rejected', payload: { path: ['quote_id'], equals: sent } } })).toBe(1);
    const lost = (await get(`/contacts/${c}/opportunities`)).body.data[0];
    expect([lost.stage, lost.probability, lost.lost_reason]).toEqual(['lost', 0, 'price']);
    ok(await act('contact_opportunity.reopen', { opportunity_id: o }));
    expect((await db.contactOpportunity.findUniqueOrThrow({ where: { id: o } })).stage).toBe('qualified');
    ok(await act('order.create', { contact_id: c, items: [line], opportunity_id: o }));
    expect((await act('contact_opportunity.mark_lost', { opportunity_id: o, lost_reason: 'price' })).status).toBe(409);
    expect((await act('contact_opportunity.archive', { opportunity_id: o })).status).toBe(409);
  });
});

describe('giai đoạn khách suy từ cơ hội (AC6)', () => {
  it('Lead mới + Đàm phán + báo giá mở không gắn cơ hội; Đàm phán Thua → khách = Báo giá (sàn), không thấp hơn', async () => {
    const c = await customer();
    ok(await act('contact_opportunity.create', { contact_id: c, title: 'Mới', stage: 'lead' }));
    const neg = ok(await act('contact_opportunity.create', { contact_id: c, title: 'Đàm phán', stage: 'negotiation' })).opportunity_id;
    expect(await stage(c)).toBe('contract');
    const free = ok(await act('quote.create', { contact_id: c, items: [line] })).quote_id;
    ok(await act('quote.send', { quote_id: free, channel: 'email' }));
    ok(await act('contact_opportunity.mark_lost', { opportunity_id: neg, lost_reason: 'competitor' }));
    expect(await stage(c)).toBe('quote');
  });

  it('kéo tay trong 24 giờ thắng: đổi giai đoạn cơ hội không đổi khách; khách Đã mua không bị hạ', async () => {
    const c = await customer();
    await db.$executeRaw`UPDATE contact SET stage = 'lead', stage_set_manually_at = ${new Date(h.clock.now().getTime() - 3_600_000).toISOString()}::timestamptz WHERE id = ${c}::uuid`;
    const o = ok(await act('contact_opportunity.create', { contact_id: c, title: 'Giữ tay', stage: 'negotiation' })).opportunity_id;
    expect(await stage(c)).toBe('lead');
    const w = await customer();
    await db.$executeRaw`UPDATE contact SET stage = 'won' WHERE id = ${w}::uuid`;
    const wo = ok(await act('contact_opportunity.create', { contact_id: w, title: 'Mua lại', stage: 'quote' })).opportunity_id;
    ok(await act('contact_opportunity.mark_lost', { opportunity_id: wo, lost_reason: 'no_need' }));
    expect(await stage(w)).toBe('won');
    expect((await db.contactOpportunity.findUniqueOrThrow({ where: { id: o } })).stage).toBe('negotiation');
  });
});

describe('agent là nhân viên (AC7, DC-922)', () => {
  const agentCtx = (conv?: string): ActionContext => ({ workspaceId: h.ws, source: 'agent', actor: { type: 'agent', id: uuidv7() }, onBehalfOfUserId: h.user, ...(conv ? { servedConversationId: conv } : {}), authz: authzForRole('owner', h.user) as never, idempotencyKey: uuidv7() });

  it('tạo từ hội thoại ở quote → nguồn conversation; set_stage chạy thẳng (actor agent); won thiếu chứng từ 422; mark_lost thiếu lý do 422', async () => {
    const exec = h.app.get(ActionExecutor, { strict: false });
    const c = await customer();
    const acc = (await db.channelAccount.findFirstOrThrow({ where: { type: 'email' } })).id;
    const conv = uuidv7();
    await db.conversation.create({ data: { id: conv, channelAccountId: acc, channelType: 'email', contactId: c, externalThreadId: `e-${conv}`, title: 'Khách', lastMessageAt: h.clock.now() } });
    const created = await exec.execute<{ opportunity_id: string }>(agentCtx(conv), 'contact_opportunity.create', { contact_id: c, title: 'Từ hội thoại', stage: 'quote', source_conversation_id: conv });
    expect(created.status).toBe(200);
    const o = (created.data as { result: { opportunity_id: string } }).result.opportunity_id;
    expect(await db.contactOpportunity.findUniqueOrThrow({ where: { id: o } })).toMatchObject({ stage: 'quote', sourceKind: 'conversation' });
    expect((await exec.execute(agentCtx(), 'contact_opportunity.set_stage', { opportunity_id: o, stage: 'negotiation' })).status).toBe(200);
    expect((await db.contactOpportunityEvent.findFirstOrThrow({ where: { opportunityId: o, toStage: 'negotiation' } })).actorType).toBe('agent');
    await expect(exec.execute(agentCtx(), 'contact_opportunity.set_stage', { opportunity_id: o, stage: 'won' })).rejects.toMatchObject({ httpStatus: 422, fields: { stage: 'won_needs_document' } });
    await expect(exec.execute(agentCtx(), 'contact_opportunity.mark_lost', { opportunity_id: o })).rejects.toMatchObject({ httpStatus: 422 });
    // Lưu trữ (risk delete) không cấp cho agent.
    await expect(exec.execute(agentCtx(), 'contact_opportunity.archive', { opportunity_id: o })).rejects.toMatchObject({ httpStatus: 403 });
  });
});

describe('EXPLAIN 100k khách / 300k cơ hội (AC8)', () => {
  it('openSummary một truy vấn cho cả trang: Index Only Scan contact_opportunity_open_idx; cột Khách hàng có open_opportunity', async () => {
    const tag = `PL${Date.now()}`;
    await db.$executeRawUnsafe(`INSERT INTO contact (id, code, name, source, owner_user_id) SELECT gen_random_uuid(), '${tag}' || g, 'Nền ' || g, 'manual', '${h.user}'::uuid FROM generate_series(1, 100000) g`);
    await db.$executeRawUnsafe(`INSERT INTO contact_opportunity (id, contact_id, title, stage, amount_vnd, updated_at)
      SELECT gen_random_uuid(), c.id, 'o' || k, (ARRAY['lead','qualified','demo','quote','negotiation','won','lost'])[1 + (k + g) % 7]::contact_opportunity_stage, 1000000 * k, now() - (k || ' minutes')::interval
        FROM (SELECT id, row_number() OVER () AS g FROM contact WHERE code LIKE '${tag}%') c CROSS JOIN generate_series(1, 3) k`);
    const mig = new pg.Client({ connectionString: withDatabase(env.MIGRATOR_DATABASE_URL!, tenantDbName(h.ws)) });
    await mig.connect();
    try {
      // VACUUM như autovacuum chạy thật: bản đồ hiển thị (visibility map) cho phép Index Only Scan trên INCLUDE.
      await mig.query('VACUUM (ANALYZE) contact, contact_opportunity');
    } finally {
      await mig.end();
    }
    const ids = (await db.$queryRawUnsafe<{ id: string }[]>(`SELECT id FROM contact WHERE code LIKE '${tag}%' ORDER BY id LIMIT 50`)).map((r) => r.id);
    const plan = (
      await db.$transaction(async (tx) =>
        tx.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(
          `EXPLAIN (ANALYZE, BUFFERS) SELECT o.contact_id, count(*)::int AS n, sum(o.amount_vnd) AS total, array_agg(DISTINCT o.stage::text) AS stages
             FROM contact_opportunity o JOIN contact c ON c.id = o.contact_id
            WHERE o.contact_id = ANY($1::uuid[]) AND o.archived_at IS NULL AND o.stage NOT IN ('won', 'lost') AND c.deleted_at IS NULL
            GROUP BY o.contact_id`,
          ids,
        ),
      )
    )
      .map((r) => r['QUERY PLAN'])
      .join('\n');
    if (process.env.EXPLAIN_OUT) (await import('node:fs')).writeFileSync(process.env.EXPLAIN_OUT, plan);
    expect(plan).toMatch(/Index Only Scan using contact_opportunity_open_idx/);
    expect(plan).not.toMatch(/Seq Scan on contact_opportunity/);
    // Danh sách cơ hội theo khách — keyset trên contact_opportunity_contact_idx.
    const keyset = (await db.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN SELECT id FROM contact_opportunity WHERE contact_id = '${ids[0]}'::uuid AND archived_at IS NULL ORDER BY updated_at DESC, id DESC LIMIT 21`)).map((r) => r['QUERY PLAN']).join('\n');
    expect(keyset).toMatch(/contact_opportunity_contact_idx/);
    expect(keyset).not.toMatch(/Sort Method|Seq Scan/);
    // Bảng Khách hàng (50 dòng): cột cơ hội mở có mặt cho khách có cơ hội mở.
    const list = await get(`/contacts?q=${tag}&limit=50`);
    expect(list.status, JSON.stringify(list.body).slice(0, 300)).toBe(200);
    expect(list.body.data.some((r: { open_opportunity?: { count: number } }) => (r.open_opportunity?.count ?? 0) > 0)).toBe(true);
  }, 300_000);
});

// TIP-036 — contract FE ↔ BE khách thân thiết trên HTTP thật (Postgres 16): mọi GET /v1/loyalty/* parse đúng zod dùng chung với mock FE
// (`@appchat/shared` api/loyalty), output action loyalty.* / payment.redeem_points parse đúng `output` của ActionDef, lỗi theo envelope
// `{ error: { code, message, fields? } }` với mã trong ERROR_CODES, event outbox loyalty.* + order.completed (completion_id + basis) parse
// đúng EVENT_SCHEMAS. Đổi DTO một phía mà không đổi schema chung → file này đỏ.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { getAction } from '@appchat/actions';
import {
  ERROR_CODES,
  EVENT_SCHEMAS,
  loyaltyConfigSchema,
  loyaltyLedgerPageSchema,
  loyaltyLookupSchema,
  loyaltyMemberFileSchema,
  loyaltyMemberSchema,
  loyaltyMembersPageSchema,
  loyaltyOverviewSchema,
} from '@appchat/shared';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let nam: string;
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const get = (path: string) => call(h, path).then(json);
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const ok = async (id: string, input: unknown) => {
  const r = await act(id, input);
  if (r.status !== 200) throw new Error(`${id} ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.data.result;
};
/** Output action parse đúng zod `output` khai trong registry (một nguồn với FE useAction). */
const outputOf = (id: string, result: unknown) => getAction(id)!.output.safeParse(result);
const errorEnvelope = z.object({ error: z.object({ code: z.enum(ERROR_CODES), message: z.string(), fields: z.record(z.string(), z.string()).optional() }).strict() }).strict();
const parsed = <T extends z.ZodTypeAny>(s: T, v: unknown) => {
  const r = s.safeParse(v);
  return r.success ? 'ok' : r.error.issues.slice(0, 3).map((i) => `${i.path.join('.')} ${i.message}`).join('; ');
};

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  nam = (await ok('contact.create', { full_name: 'Anh Nam Hợp Đồng', phone: '0909369001' })).contact_id;
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('GET /v1/loyalty/* ↔ zod chung', () => {
  it('config · members (D42 meta) · member · ledger · lookup · overview · files', async () => {
    const adj = await ok('loyalty.adjust_points', { contact_id: nam, delta: 1250, reason: 'promotion' });
    expect(outputOf('loyalty.adjust_points', adj).success).toBe(true);
    expect(parsed(loyaltyConfigSchema, (await get('/loyalty/config')).body.data)).toBe('ok');
    const page = await get('/loyalty/members?page=1&limit=20');
    expect(parsed(loyaltyMembersPageSchema, page.body)).toBe('ok');
    expect(page.body.meta).toMatchObject({ page: 1, limit: 20 });
    expect(parsed(loyaltyMemberSchema, (await get(`/loyalty/members/${nam}`)).body.data)).toBe('ok');
    expect(parsed(loyaltyLedgerPageSchema, await get(`/loyalty/members/${nam}/ledger?limit=5`).then((r) => r.body))).toBe('ok');
    expect(parsed(loyaltyLookupSchema, (await get('/loyalty/lookup?phone=0909369001')).body.data)).toBe('ok');
    expect(parsed(loyaltyOverviewSchema, (await get('/loyalty/overview')).body.data)).toBe('ok');
    const files = (await get(`/loyalty/members/${nam}/files`)).body;
    expect(parsed(z.object({ data: z.array(loyaltyMemberFileSchema) }), files)).toBe('ok');
  });

  it('lỗi theo envelope chung: thành viên lạ 404, lookup SĐT ngắn 422, trừ quá số dư 422 kèm fields', async () => {
    const nf = await get('/loyalty/members/0190f000-0000-7000-8000-00000000beef');
    expect(nf.status).toBe(404);
    expect(parsed(errorEnvelope, nf.body)).toBe('ok');
    const short = await get('/loyalty/lookup?phone=09');
    expect(short.status).toBe(422);
    expect(parsed(errorEnvelope, short.body)).toBe('ok');
    const over = await act('loyalty.adjust_points', { contact_id: nam, delta: -999_999, reason: 'other' });
    expect(over.status).toBe(422);
    expect(parsed(errorEnvelope, over.body)).toBe('ok');
    expect(over.body.error.fields).toMatchObject({ delta: 'exceeds_balance' });
  });
});

describe('action output ↔ ActionDef.output', () => {
  it('get_member (có value = điểm × 100đ) · update_config · redeem_points', async () => {
    const m = await ok('loyalty.get_member', { contact_id: nam });
    expect(outputOf('loyalty.get_member', m).success).toBe(true);
    expect(m).toMatchObject({ points: 1250, value: '125000', vnd_per_point: 100 });
    expect(outputOf('loyalty.update_config', await ok('loyalty.update_config', { marketplace_earn: false })).success).toBe(true);
    const { order_id } = await ok('order.create', { contact_id: nam, items: [{ name: 'Gói hợp đồng điểm', qty: 1, unit_price: '100000', tax_rate: 0 }] });
    await ok('order.confirm', { order_id });
    const { invoice_id } = await ok('invoice.create', { order_id, contact_id: nam, kind: 'full', amount: '100000' });
    const r = await ok('payment.redeem_points', { invoice_id, points: 500 });
    expect(outputOf('payment.redeem_points', r).success).toBe(true);
    expect(r).toMatchObject({ points: 500, amount: '50000', balance_after: 750 });
    const cap = await act('payment.redeem_points', { invoice_id, points: 1 });
    expect(cap.status).toBe(422);
    expect(parsed(errorEnvelope, cap.body)).toBe('ok');
    expect(cap.body.error.fields).toMatchObject({ points: 'over_cap' });
  });
});

describe('outbox event ↔ EVENT_SCHEMAS', () => {
  it('loyalty.points_changed · loyalty.config_changed · order.completed (completion_id + basis)', async () => {
    const { order_id } = await ok('order.create', { contact_id: nam, items: [{ name: 'Gói hoàn tất', qty: 1, unit_price: '200000', tax_rate: 0 }] });
    await ok('order.confirm', { order_id });
    const { invoice_id } = await ok('invoice.create', { order_id, contact_id: nam, kind: 'full', amount: '200000' });
    await ok('invoice.record_payment', { invoice_id, amount: '200000', method: 'cash' });
    await ok('order.complete', { order_id });
    const db = await resolver.get(TenantContexts.system(h.ws, 't'));
    const topics = ['loyalty.points_changed', 'loyalty.config_changed', 'order.completed'] as const;
    for (const topic of topics) {
      const rows = await db.outboxEvent.findMany({ where: { topic }, orderBy: { createdAt: 'desc' }, take: 5 });
      expect(rows.length, topic).toBeGreaterThan(0);
      for (const e of rows) expect(parsed(EVENT_SCHEMAS[topic], e.payload), topic).toBe('ok');
    }
    const done = await db.outboxEvent.findFirstOrThrow({ where: { topic: 'order.completed', payload: { path: ['order_id'], equals: order_id } } });
    expect(done.payload).toMatchObject({ completion_id: expect.any(String), basis: expect.objectContaining({ base: 20, paid: '200000' }) });
  });
});

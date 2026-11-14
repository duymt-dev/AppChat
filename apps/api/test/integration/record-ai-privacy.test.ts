// TIP-023g §1.2, §4.3 (AC3, AC5) trên API thật: quyền / scope của người bấm kiểm TRƯỚC model — CSKH không có quote.view → 403; Sales
// (sales own) mở báo giá của người khác → 404 cùng envelope như id không tồn tại (không lộ "có nhưng bị ẩn"); không run, không binding.
// Erase privacy kind `record_proposal` (adapter domain ai) vô hiệu binding: GET trả invalidated/privacy_erased, không còn đề xuất cũ, chữ
// thô đã xoá; gửi lại cùng request_id không sinh lại.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { WalletService, privacyAdapterOf, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let p1: string;
let quote: string;

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (token?: string): Record<string, string> => (token ? { authorization: `Bearer ${token}` } : {});
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const turn = (body: Record<string, unknown>, token?: string) => call(h, '/assistant/messages', body, as(token)).then(json);
const propose = (body: Record<string, unknown>, token?: string) => call(h, '/assistant/record-proposals', body, as(token)).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 2000, { refType: 'test', refId: uuidv7() });
  p1 = (await act('product.create', { name: 'Gội đầu dưỡng sinh', type: 'service', price: '200000', status: 'active' })).body.data.result.product_id;
  const lan = (await act('contact.create', { full_name: 'Chị Lan Riêng', phone: '0909230701' })).body.data.result.contact_id;
  quote = (await act('quote.create', { contact_id: lan, items: [{ product_id: p1, name: 'Gội đầu dưỡng sinh', qty: 1, unit_price: '200000', tax_rate: 8 }] })).body.data.result.quote_id;
}, 180_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('quyền người bấm trước model', () => {
  it('CSKH không có quote.view → 403; Sales mở báo giá người khác → 404 y như id không có; 0 run mới', async () => {
    const db = await tenant();
    const runs0 = await db.aiRun.count();
    const cs = await h.member('cs');
    const sales = await h.member('sales');
    const ri = (o: Record<string, unknown> = {}) => ({ entity: 'quote', entity_id: quote, intent: 'inspect', request_id: uuidv7(), ...o });
    const denied = await turn({ text: 'Tóm tắt báo giá', mode: 'chat', request_id: uuidv7(), record_intent: ri() }, cs.token);
    expect(denied.status).toBe(403);
    const hidden = await turn({ text: 'Tóm tắt báo giá', mode: 'chat', request_id: uuidv7(), record_intent: ri() }, sales.token);
    const missing = await turn({ text: 'Tóm tắt báo giá', mode: 'chat', request_id: uuidv7(), record_intent: ri({ entity_id: uuidv7() }) }, sales.token);
    expect([hidden.status, missing.status]).toEqual([404, 404]);
    expect(hidden.body).toEqual(missing.body);
    expect(JSON.stringify(hidden.body)).not.toContain('Chị Lan');
    expect(await db.aiRun.count()).toBe(runs0);
    expect(await db.recordProposal.count()).toBe(0);
  });

  it('request_id đề xuất của người khác → 404; id không phải UUID → 404', async () => {
    const rid = uuidv7();
    expect((await propose({ entity: 'product', entity_id: p1, intent: 'product_campaign', request_id: rid })).status).toBe(200);
    const sales = await h.member('sales');
    const other = await call(h, `/assistant/record-proposals/${rid}`, undefined, as(sales.token)).then(json);
    expect(other.status).toBe(404);
    expect(JSON.stringify(other.body)).not.toContain('product_campaign');
    expect((await call(h, '/assistant/record-proposals/q_2041').then(json)).status).toBe(404);
  });
});

describe('erase privacy record_proposal', () => {
  it('vô hiệu binding: GET → invalidated/privacy_erased, không đề xuất cũ, chữ thô đã xoá; gửi lại không sinh lại', async () => {
    const db = await tenant();
    const rid = uuidv7();
    const body = { entity: 'product', entity_id: p1, intent: 'product_combo', request_id: rid };
    const r = await propose(body);
    expect(r.body.data.state).toBe('validated');
    await db.$transaction((tx) => privacyAdapterOf('ai').erase(tx as never, { kind: 'record_proposal', recordId: r.body.data.id }, 'erase_exclusive'));
    const row = await db.recordProposal.findUniqueOrThrow({ where: { id: r.body.data.id } });
    expect(row).toMatchObject({ phase: 'invalidated', safeReason: 'privacy_erased', privateGeneration: null, publishedResult: null });
    const read = await call(h, `/assistant/record-proposals/${rid}`).then(json);
    expect(read.status).toBe(200);
    expect(read.body.data).toMatchObject({ state: 'invalidated', reason: 'privacy_erased' });
    expect(read.body.data.combo).toBeUndefined();
    const runs = await db.aiRun.count();
    const again = await propose(body);
    expect(again.body.data).toMatchObject({ state: 'invalidated', reason: 'privacy_erased' });
    expect(await db.aiRun.count()).toBe(runs);
  });
});

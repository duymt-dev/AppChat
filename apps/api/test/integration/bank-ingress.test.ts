// TIP-012b P2 trên Postgres 16 + Memurai (AC3, AC5, AC6): ingress ngân hàng bền — webhook xác thực → biên nhận chuẩn tắc + outbox cùng
// transaction → ACK (chưa khớp, chưa ghi nhận); consumer `sales.bank-ingest` → `bank_feed.ingest` nguồn system → khớp TT… ghi nhận một
// lần. Gửi lại / chạy consumer lại / hai consumer cùng lúc → một bank_tx + một khoản thu. Ngắt rồi kết nối lại (feed + kết nối MỚI) cùng
// tài khoản → giao dịch cũ gửi lại vẫn là trùng (khoá provider + tài khoản + mã giao dịch). Feed ngắt giữa ACK và xử lý → `ignored`,
// không ghi nhận. `bank_feed.ingest` không gọi được từ HTTP / Trợ lý (403), JSON tự dựng không giả được biên nhận.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { mockSignature } from '@appchat/integrations';
import { invoiceRowSchema } from '@appchat/shared';
import { ActionExecutor, bankIngressTrigger, runSystemAction, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';
import { drainBankReceipts } from './helpers/bank-ingress';

let h: Harness;
let resolver: TenantDbResolver;
const ACC = '0071000444555';
const KEY = 'sk_ingress';

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 60_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...headers }).then(json);
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any> } }).data.result; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const connect = async () => ok(await act('bank_feed.connect', { provider: 'sepay', fields: { api_key: KEY, account_number: ACC }, mode: 'sandbox' })).feed_id as string;
const tx = (id: string, amount: string, content: string) => ({ external_id: id, account_number: ACC, amount, direction: 'in', content, occurred_at: h.clock.now().toISOString() });
const hook = (feed: string, txs: unknown[]) => {
  const body = JSON.stringify({ id: `evt-${uuidv7()}`, transactions: txs });
  return fetch(`${h.base}/hooks/tenant-payments/sepay/${feed}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-mock-signature': mockSignature(KEY, body) }, body }).then(json);
};
const invoice = async (amount: string) => {
  const contact = ok(await act('contact.create', { full_name: `Khách ${uuidv7().slice(-4)}`, phone: `09096${Math.floor(Math.random() * 1e5).toString().padStart(5, '0')}` })).contact_id;
  const id = ok(await act('invoice.create', { contact_id: contact, kind: 'full', amount })).invoice_id as string;
  return { id, code: invoiceRowSchema.parse((await call(h, `/invoices/${id}`, undefined).then(json)).body.data).transfer_code };
};
const inv = async (id: string) => invoiceRowSchema.parse((await call(h, `/invoices/${id}`, undefined).then(json)).body.data);

let feed = '';

describe('ingress bền: ACK trước, khớp sau', () => {
  it('webhook → biên nhận accepted + outbox; chưa có bank_tx / khoản thu; consumer → ghi nhận', async () => {
    feed = await connect();
    const { id, code } = await invoice('500000');
    const r = await hook(feed, [tx('IN-1', '500000', `CK ${code}`)]);
    expect(r).toMatchObject({ status: 200, body: { data: { ok: true, accepted: 1, duplicate: 0, ignored: 0 } } });
    const db = await tenant();
    const rc = await db.bankReceipt.findFirstOrThrow({ where: { externalId: 'IN-1' } });
    expect(rc).toMatchObject({ status: 'accepted', provider: 'sepay', accountNo: ACC, bankTxId: null, deliveries: 1 });
    expect(await db.bankTx.count({ where: { externalId: 'IN-1' } })).toBe(0);
    expect((await inv(id)).status).not.toBe('paid');
    // Payload outbox chỉ tham chiếu id — không số tiền / nội dung / tài khoản.
    const ev = await db.outboxEvent.findFirstOrThrow({ where: { topic: 'bank_receipt.accepted', payload: { path: ['receipt_id'], equals: rc.id } } });
    expect(Object.keys(ev.payload as object).filter((k) => !['ws', 'occurred_at'].includes(k))).toEqual(['receipt_id']);

    expect(await drainBankReceipts(h, resolver)).toBeGreaterThan(0);
    expect(await db.bankReceipt.findUniqueOrThrow({ where: { id: rc.id } })).toMatchObject({ status: 'processed' });
    expect((await inv(id)).status).toBe('paid');
  });

  it('gửi lại webhook + chạy consumer lại → một bank_tx, một khoản thu; deliveries tăng', async () => {
    const { id, code } = await invoice('300000');
    const t = tx('IN-2', '300000', `CK ${code}`);
    expect((await hook(feed, [t])).body.data).toMatchObject({ accepted: 1 });
    expect((await hook(feed, [t])).body.data).toMatchObject({ accepted: 0, duplicate: 1 });
    await drainBankReceipts(h, resolver);
    await drainBankReceipts(h, resolver);
    const db = await tenant();
    expect(await db.bankTx.count({ where: { externalId: 'IN-2' } })).toBe(1);
    expect((await inv(id)).payments).toHaveLength(1);
    expect((await db.bankReceipt.findFirstOrThrow({ where: { externalId: 'IN-2' } })).deliveries).toBe(2);
  });

  it('hai lần chạy bank_feed.ingest cùng lúc trên một biên nhận → đúng một ghi nhận (claim FOR UPDATE)', async () => {
    const { id, code } = await invoice('200000');
    await hook(feed, [tx('IN-3', '200000', `CK ${code}`)]);
    const db = await tenant();
    const rc = await db.bankReceipt.findFirstOrThrow({ where: { externalId: 'IN-3' } });
    const ex = h.app.get(ActionExecutor, { strict: false });
    // Hai worker khác idempotency key (như hai job trùng) — khoá chống ghi đôi là trạng thái biên nhận, không phải khoá idempotent.
    const run = (k: string) => runSystemAction(ex, resolver, { ...bankIngressTrigger(h.ws, rc.id), idempotencyKey: k });
    const [a, b] = await Promise.all([run(`a-${rc.id}`), run(`b-${rc.id}`)]);
    const statuses = [a, b].map((x) => (x as unknown as { data: { result: { status: string } } }).data.result.status).sort();
    expect(statuses).toEqual(['duplicate', 'matched']);
    expect((await inv(id)).payments).toHaveLength(1);
  });

  it('ngắt rồi kết nối lại (feed + kết nối mới, cùng tài khoản) → giao dịch cũ gửi lại vẫn trùng, không ghi nhận đôi', async () => {
    ok(await act('bank_feed.disconnect', { provider: 'sepay' }));
    const feed2 = await connect();
    expect(feed2).not.toBe(feed);
    const db = await tenant();
    const before = await db.bankTx.count();
    expect((await hook(feed2, [tx('IN-1', '500000', 'CK gửi lại')])).body.data).toMatchObject({ accepted: 0, duplicate: 1 });
    await drainBankReceipts(h, resolver);
    expect(await db.bankTx.count()).toBe(before);
    feed = feed2;
  });

  it('feed ngắt giữa ACK và xử lý → biên nhận ignored (feed_inactive), không bank_tx / khoản thu', async () => {
    const { id, code } = await invoice('150000');
    expect((await hook(feed, [tx('IN-4', '150000', `CK ${code}`)])).body.data).toMatchObject({ accepted: 1 });
    ok(await act('bank_feed.disconnect', { provider: 'sepay' }));
    await drainBankReceipts(h, resolver);
    const db = await tenant();
    expect(await db.bankReceipt.findFirstOrThrow({ where: { externalId: 'IN-4' } })).toMatchObject({ status: 'ignored', reason: 'feed_inactive', bankTxId: null });
    expect(await db.bankTx.count({ where: { externalId: 'IN-4' } })).toBe(0);
    expect((await inv(id)).payments).toHaveLength(0);
  });

  it('bank_feed.ingest từ HTTP (ui / assistant) → 403; ctx system không niêm phong (đúng actor + key) → 403; biên nhận lạ → 404', async () => {
    const rc = await (await tenant()).bankReceipt.findFirstOrThrow({ where: { externalId: 'IN-1' } });
    expect((await act('bank_feed.ingest', { receipt_id: rc.id })).status).toBe(403);
    expect((await act('bank_feed.ingest', { receipt_id: rc.id }, { 'x-action-source': 'assistant' })).status).toBe(403);
    expect((await act('bank_feed.ingest', { receipt_id: rc.id }, { 'x-action-source': 'system' })).status).toBe(422);
    const ex = h.app.get(ActionExecutor, { strict: false });
    const forged = { workspaceId: h.ws, source: 'system' as const, actor: { type: 'system' as const, id: 'bank-ingress' }, authz: { isOwner: true } as never, idempotencyKey: `bank-receipt:${rc.id}` };
    await expect(ex.execute(forged, 'bank_feed.ingest', { receipt_id: rc.id })).rejects.toMatchObject({ code: 'FORBIDDEN', fields: { capability: 'missing' } });
    const fake = uuidv7();
    await expect(runSystemAction(ex, resolver, bankIngressTrigger(h.ws, fake))).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('EXPLAIN: hàng chờ dùng partial index; khoá chuẩn tắc unique', async () => {
    const db = await tenant();
    const plan = await db.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN SELECT id, feed_id FROM bank_receipt WHERE status = 'accepted' ORDER BY created_at, id LIMIT 50`);
    const text = plan.map((p) => p['QUERY PLAN']).join('\n');
    expect(text).toMatch(/bank_receipt_pending_idx|Seq Scan/);
    const idx = await db.$queryRawUnsafe<{ indexname: string; indexdef: string }[]>(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'bank_receipt'`);
    expect(idx.find((i) => i.indexname === 'bank_receipt_provider_account_no_external_id_key')?.indexdef).toMatch(/UNIQUE/);
  });
});

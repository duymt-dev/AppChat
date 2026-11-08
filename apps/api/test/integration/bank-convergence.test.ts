// TIP-012b P5 trên Postgres 16 + Memurai (AC3, AC5): hội tụ đường vào ngân hàng — hook generic `/hooks/integrations/sepay/:connectionId`
// của kết nối CÓ feed tài chính đang bật đi vào cùng biên nhận chuẩn tắc với `/hooks/tenant-payments` (một giao dịch qua hai hook → một
// biên nhận, một khoản thu); kết nối KHÔNG có feed → sự kiện thô chưa gắn (không biên nhận, không khớp tiền). `bank_feed.connect` theo
// `connection_id` đã lưu: dùng khoá đã lưu (không gửi lại / không trả bí mật), không xoay khoá, if_version cũ → 409, provider lệch → 404,
// fields + connection_id cùng lúc → 422.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { mockSignature } from '@appchat/integrations';
import { invoiceRowSchema } from '@appchat/shared';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';
import { drainBankReceipts } from './helpers/bank-ingress';

let h: Harness;
let resolver: TenantDbResolver;
const ACC = '0071000666777';
const KEY = 'sk_converge';

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 60_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any> } }).data.result; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const tx = (id: string, amount: string, content: string) => ({ external_id: id, account_number: ACC, amount, direction: 'in', content, occurred_at: h.clock.now().toISOString() });
const post = (path: string, txs: unknown[]) => {
  const body = JSON.stringify({ id: `evt-${uuidv7()}`, transactions: txs });
  return fetch(`${h.base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-mock-signature': mockSignature(KEY, body) }, body }).then(json);
};
const invoice = async (amount: string) => {
  const contact = ok(await act('contact.create', { full_name: `Khách ${uuidv7().slice(-4)}`, phone: `09097${Math.floor(Math.random() * 1e5).toString().padStart(5, '0')}` })).contact_id;
  const id = ok(await act('invoice.create', { contact_id: contact, kind: 'full', amount })).invoice_id as string;
  return { id, code: invoiceRowSchema.parse((await call(h, `/invoices/${id}`, undefined).then(json)).body.data).transfer_code };
};

let connId = '';

describe('hook generic chưa gắn feed tài chính', () => {
  it('kết nối integrations (không feed) → sự kiện thô, không biên nhận ngân hàng', async () => {
    connId = ok(await act('integration.connect', { provider: 'sepay', fields: { api_key: KEY, account_number: ACC }, mode: 'sandbox' })).connection_id as string;
    const r = await post(`/hooks/integrations/sepay/${connId}`, [tx('GEN-0', '100000', 'CK')]);
    expect(r).toMatchObject({ status: 200, body: { data: { ok: true, duplicate: false } } });
    expect(r.body.data.accepted).toBeUndefined();
    const db = await tenant();
    expect(await db.bankReceipt.count({ where: { externalId: 'GEN-0' } })).toBe(0);
    expect(await db.integrationEvent.count({ where: { connectionId: connId } })).toBe(1);
  });
});

describe('bank_feed.connect theo connection_id', () => {
  it('loại trừ fields; provider lệch 404; if_version cũ 409; đúng → feed gắn, khoá không xoay, không trả bí mật', async () => {
    const both = await act('bank_feed.connect', { provider: 'sepay', fields: { api_key: KEY, account_number: ACC }, connection_id: connId });
    expect(both.status).toBe(422);
    expect((await act('bank_feed.connect', { provider: 'casso', connection_id: connId })).status).toBe(404);
    expect((await act('bank_feed.connect', { provider: 'sepay', connection_id: uuidv7() })).status).toBe(404);
    const db = await tenant();
    const before = await db.integrationConnection.findUniqueOrThrow({ where: { id: connId } });
    expect((await act('bank_feed.connect', { provider: 'sepay', connection_id: connId, if_version: before.credentialRev + 1 })).status).toBe(409);
    const r = await act('bank_feed.connect', { provider: 'sepay', connection_id: connId, if_version: before.credentialRev });
    const out = ok(r);
    expect(JSON.stringify(r.body)).not.toContain(KEY);
    expect(out.webhook_path).toBe(`/hooks/tenant-payments/sepay/${out.feed_id}`);
    const after = await db.integrationConnection.findUniqueOrThrow({ where: { id: connId } });
    expect(after.credentialRev).toBe(before.credentialRev);
    expect(await db.tenantBankFeed.findUniqueOrThrow({ where: { connectionId: connId } })).toMatchObject({ id: out.feed_id, status: 'active', accountNo: ACC });
    expect(await h.platform.tenantBankFeedRoute.findUnique({ where: { feedId: out.feed_id } })).toMatchObject({ workspaceId: h.ws, provider: 'sepay' });
  });
});

describe('hội tụ hai hook', () => {
  it('cùng giao dịch qua hook generic rồi hook tenant-payments → một biên nhận, một khoản thu', async () => {
    const db = await tenant();
    const feed = (await db.tenantBankFeed.findUniqueOrThrow({ where: { connectionId: connId } })).id;
    const { id, code } = await invoice('300000');
    const t = tx('CONV-1', '300000', `CK ${code}`);
    const a = await post(`/hooks/integrations/sepay/${connId}`, [t]);
    expect(a).toMatchObject({ status: 200, body: { data: { ok: true, accepted: 1, duplicate: false } } });
    const b = await post(`/hooks/tenant-payments/sepay/${feed}`, [t]);
    expect(b).toMatchObject({ status: 200, body: { data: { accepted: 0, duplicate: 1 } } });
    expect(await db.bankReceipt.count({ where: { externalId: 'CONV-1' } })).toBe(1);
    expect(await drainBankReceipts(h, resolver)).toBeGreaterThan(0);
    expect((await db.bankReceipt.findFirstOrThrow({ where: { externalId: 'CONV-1' } })).status).toBe('processed');
    expect(await db.customerPayment.count({ where: { invoiceId: id } })).toBe(1);
    // Gửi lại qua hook generic → trùng, không khoản thu thứ hai.
    expect((await post(`/hooks/integrations/sepay/${connId}`, [t])).body.data).toMatchObject({ accepted: 0, duplicate: true });
    await drainBankReceipts(h, resolver);
    expect(await db.customerPayment.count({ where: { invoiceId: id } })).toBe(1);
  });

  it('feed ngắt → hook generic quay về sự kiện thô (không biên nhận mới)', async () => {
    const db = await tenant();
    await db.tenantBankFeed.updateMany({ where: { connectionId: connId }, data: { status: 'disconnected' } });
    const r = await post(`/hooks/integrations/sepay/${connId}`, [tx('CONV-2', '1000', 'x')]);
    expect(r.status).toBe(200);
    expect(await db.bankReceipt.count({ where: { externalId: 'CONV-2' } })).toBe(0);
  });
});

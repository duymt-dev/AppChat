// TIP-012b P1 trên Postgres 16 + Memurai (AC1, AC2, AC10): kết nối SePay / Casso ở chế độ LIVE dùng adapter thật — chữ ký giả lập
// `x-mock-signature` bị từ chối (không lùi về mock); SePay HMAC-SHA256 + Apikey, Casso Webhook V2 HMAC-SHA512 → khớp TT… tự ghi nhận;
// payload sai (tiền thập phân / chiều lạ / thiếu tài khoản / giờ sai) → 400, không ghi bank_tx; giao dịch khác tài khoản feed → bỏ qua;
// chế độ ngoài manifest → 422; manifest bắt buộc tài khoản nhận + cách xác thực. Chữ ký dựng theo hợp đồng tài liệu provider —
// chưa nghiệm thu với provider thật (Q-004).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { cassoSignature, mockSignature, sepaySignature } from '@appchat/integrations';
import { invoiceRowSchema } from '@appchat/shared';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';
import { drainBankReceipts } from './helpers/bank-ingress';

let h: Harness;
let resolver: TenantDbResolver;
const ACC = '0071000777888';

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
const post = (path: string, body: string, headers: Record<string, string>) => fetch(`${h.base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body });
const nowS = () => String(Math.floor(Date.now() / 1000));

/** Đề nghị thanh toán đã gửi cho một khách mới → mã chuyển khoản TT… */
async function invoiceCode(amount: string) {
  const contact = ok(await act('contact.create', { full_name: `Khách ${uuidv7().slice(-4)}`, phone: `09095${Math.floor(Math.random() * 1e5).toString().padStart(5, '0')}` })).contact_id;
  const id = ok(await act('invoice.create', { contact_id: contact, kind: 'full', amount })).invoice_id as string;
  const r = await call(h, `/invoices/${id}`, undefined).then(json);
  return { id, code: invoiceRowSchema.parse(r.body.data).transfer_code };
}

describe('kết nối live: chế độ + trường', () => {
  it('chế độ ngoài manifest → 422; SePay thiếu cả API key lẫn khoá HMAC → 422; Casso thiếu khoá webhook / tài khoản → 422', async () => {
    expect((await act('bank_feed.connect', { provider: 'sepay', fields: { api_key: 'k', account_number: ACC }, mode: 'demo' })).status).toBe(422);
    expect((await act('bank_feed.connect', { provider: 'sepay', fields: { account_number: ACC } })).body.error.fields).toEqual({ api_key: 'required' });
    expect((await act('bank_feed.connect', { provider: 'casso', fields: { account_number: ACC } })).body.error.fields).toEqual({ webhook_secret: 'required' });
    expect((await act('bank_feed.connect', { provider: 'casso', fields: { webhook_secret: 'x' } })).body.error.fields).toEqual({ account_number: 'required' });
  });
});

describe('SePay live', () => {
  let feed = '';
  const path = () => `/hooks/tenant-payments/sepay/${feed}`;
  const body = (id: number, content: string, amount: unknown = 1500000, extra: Record<string, unknown> = {}) =>
    JSON.stringify({ id, gateway: 'Vietcombank', transactionDate: '2026-10-30 14:02:37', accountNumber: ACC, subAccount: null, code: null, content, transferType: 'in', description: content, transferAmount: amount, accumulated: 0, referenceCode: `FT${id}`, ...extra });

  it('kết nối mặc định live (không chọn mode) → kết nối lưu mode live', async () => {
    feed = ok(await act('bank_feed.connect', { provider: 'sepay', fields: { api_key: 'sk_live_real', hmac_secret: 'hs_live_real', account_number: ACC } })).feed_id;
    const db = await tenant();
    const f = await db.tenantBankFeed.findUniqueOrThrow({ where: { id: feed } });
    expect((await db.integrationConnection.findUniqueOrThrow({ where: { id: f.connectionId } })).mode).toBe('live');
  });

  it('chữ ký giả lập x-mock-signature → 401 (live không lùi về mock)', async () => {
    const b = body(5001, 'x');
    expect((await post(path(), b, { 'x-mock-signature': mockSignature('sk_live_real', b) })).status).toBe(401);
  });

  it('HMAC-SHA256 đúng → khớp TT… tự ghi nhận; Apikey đúng → nhận; gửi lại → không ghi lần hai', async () => {
    const { id, code } = await invoiceCode('1500000');
    const b = body(5002, `CK ${code} chi Lan`);
    const ts = nowS();
    const r = await post(path(), b, { 'x-sepay-signature': sepaySignature('hs_live_real', ts, b), 'x-sepay-timestamp': ts });
    expect(r.status).toBe(200);
    expect(((await r.json()) as { data: unknown }).data).toMatchObject({ accepted: 1 });
    await drainBankReceipts(h, resolver);
    expect(invoiceRowSchema.parse((await call(h, `/invoices/${id}`, undefined).then(json)).body.data).status).toBe('paid');
    const again = await post(path(), b, { authorization: 'Apikey sk_live_real' });
    expect(((await again.json()) as { data: unknown }).data).toMatchObject({ accepted: 0, duplicate: 1 });
    const stale = String(Number(ts) - 301);
    expect((await post(path(), b, { 'x-sepay-signature': sepaySignature('hs_live_real', stale, b), 'x-sepay-timestamp': stale })).status).toBe(401);
  });

  it('payload sai đã xác thực → 400, không ghi bank_tx; giao dịch khác tài khoản feed → bỏ qua', async () => {
    const db = await tenant();
    const before = await db.bankTx.count();
    for (const [n, b] of [
      ['fractional', body(5010, 'x', 1000.5)],
      ['exponent', body(5011, 'x', '1e6')],
      ['direction', body(5012, 'x', 1000, { transferType: 'IN' })],
      ['account', body(5013, 'x', 1000, { accountNumber: '' })],
      ['date', body(5014, 'x', 1000, { transactionDate: '2026-02-30 10:00:00' })],
    ] as const) {
      const r = await post(path(), b, { authorization: 'Apikey sk_live_real' });
      expect(r.status, n).toBe(400);
    }
    const other = await post(path(), body(5020, 'CK TT999999', 1000, { accountNumber: '0071000999000' }), { authorization: 'Apikey sk_live_real' });
    expect(((await other.json()) as { data: unknown }).data).toMatchObject({ accepted: 0, ignored: 1 });
    await drainBankReceipts(h, resolver);
    expect(await db.bankTx.count()).toBe(before);
    expect(await db.bankReceipt.findFirstOrThrow({ where: { externalId: '5020' } })).toMatchObject({ status: 'ignored', reason: 'account_mismatch', bankTxId: null });
  });
});

describe('Casso live (Webhook V2)', () => {
  let feed = '';
  const path = () => `/hooks/tenant-payments/casso/${feed}`;
  const payload = (id: number, description: string, amount: number) => ({
    error: 0,
    data: { id, reference: `FT${id}`, description, amount, runningBalance: 0, transactionDateTime: '2026-10-30 15:00:00', accountNumber: ACC, bankName: 'MBBank', bankAbbreviation: 'MBB', virtualAccountNumber: '', virtualAccountName: '', counterAccountName: '', counterAccountNumber: '', counterAccountBankId: '', counterAccountBankName: '' },
  });

  it('kết nối live → chữ ký V2 đúng khớp TT… tự ghi nhận; tiền ra (âm) không ghi nhận; sự kiện thử id 0 → 200 không giao dịch', async () => {
    feed = ok(await act('bank_feed.connect', { provider: 'casso', fields: { webhook_secret: 'cs_live_real', account_number: ACC } })).feed_id;
    const { id, code } = await invoiceCode('800000');
    const p = payload(7001, `Chuyển khoản ${code} chị Lan`, 800000);
    const r = await post(path(), JSON.stringify(p), { 'x-casso-signature': cassoSignature('cs_live_real', '1793000000000', p) });
    expect(r.status).toBe(200);
    expect(((await r.json()) as { data: unknown }).data).toMatchObject({ accepted: 1 });
    await drainBankReceipts(h, resolver);
    expect(invoiceRowSchema.parse((await call(h, `/invoices/${id}`, undefined).then(json)).body.data).status).toBe('paid');
    const out = payload(7002, 'chi', -193000);
    expect(((await (await post(path(), JSON.stringify(out), { 'x-casso-signature': cassoSignature('cs_live_real', '1', out) })).json()) as { data: unknown }).data).toMatchObject({ accepted: 0, ignored: 1 });
    const test = payload(0, 'giao dich thu nghiem', 599000);
    expect((await post(path(), JSON.stringify(test), { 'x-casso-signature': cassoSignature('cs_live_real', '1', test) })).status).toBe(200);
  });

  it('sai khoá / mock / webhook cũ secure-token → 401', async () => {
    const p = payload(7010, 'x', 1000);
    const raw = JSON.stringify(p);
    expect((await post(path(), raw, { 'x-casso-signature': cassoSignature('khac', '1', p) })).status).toBe(401);
    expect((await post(path(), raw, { 'x-mock-signature': mockSignature('cs_live_real', raw) })).status).toBe(401);
    expect((await post(path(), raw, { 'secure-token': 'cs_live_real' })).status).toBe(401);
  });
});

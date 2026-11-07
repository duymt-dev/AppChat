// TIP-010 AC1–AC7, AC9 trên Postgres 16 + Memurai: migration 010, billing.create_invoice (VietQR, mã, vat_info, idempotent),
// webhook /hooks/payments/mock (chữ ký, idempotent, khớp mã + số tiền, tiền về muộn), ghi nhận (credit / gói), report_transfer /
// cancel, admin.invoice.confirm_transfer + GET /v1/admin/transfers, quét hết hạn, GET /v1/billing/invoices đúng schema FE.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { InvoiceFulfiller, PAYMENTS_ENV, WalletService, uuidv7, type PaymentsEnv } from '@appchat/core';
import { mockSignature } from '@appchat/integrations';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { billInvoicesPageSchema, crc16 } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let penv: PaymentsEnv;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  penv = h.app.get(PAYMENTS_ENV, { strict: false });
  await h.platform.businessProfile.create({
    data: { workspaceId: h.ws, kind: 'enterprise', taxCode: '0312345678', legalName: 'Spa Hương Sen', address: '81 CMT8', businessDescription: 'Spa', declaredAt: h.clock.now() },
  });
  const trial = await h.platform.plan.findUniqueOrThrow({ where: { key: 'personal_pro' } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: trial.id, status: 'trialing', currentPeriodStart: h.clock.now(), trialEndsAt: new Date(h.clock.now().getTime() + 86_400_000) } });
});
afterAll(async () => {
  await h.platform.bankTransaction.deleteMany({ where: { providerTxId: { startsWith: 'tx-' } } });
  await h.platform.billingInvoice.deleteMany({ where: { workspaceId: h.ws } });
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (token: string) => ({ authorization: `Bearer ${token}` });
const idem = () => ({ 'idempotency-key': uuidv7() });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, headers).then(json);
const buy = (kind: string, item: string, period?: string) => act('billing.create_invoice', { kind, item, ...(period ? { period } : {}) }, idem());
const invoices = async (q = '') => (await json(await call(h, `/billing/invoices${q}`))).body;
const invoice = (id: string) => h.platform.billingInvoice.findUniqueOrThrow({ where: { id } });
const wallet = () => h.app.get(WalletService, { strict: false }).balance(h.ws);
const outbox = async (topic: string) => (await (await resolver.get(TenantContexts.system(h.ws, 't'))).outboxEvent.findMany({ where: { topic } })).map((e) => e.payload as Record<string, unknown>);

let txSeq = 0;
const bankTx = (amount: string, content: string, extra: Record<string, unknown> = {}) => ({
  external_id: `tx-${uuidv7()}-${++txSeq}`,
  account_number: penv.PLATFORM_BANK_ACCOUNT_NO,
  amount,
  direction: 'in',
  content,
  occurred_at: h.clock.now().toISOString(),
  ...extra,
});
const hook = (transactions: unknown[], sig?: string, provider = 'mock') => {
  const body = JSON.stringify({ id: `evt-${uuidv7()}`, transactions });
  return fetch(`${h.base}/hooks/payments/${provider}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-mock-signature': sig ?? mockSignature(penv.MOCK_BANK_FEED_KEY, body) },
    body,
  }).then(json);
};

describe('schema', () => {
  it('AC1 migration 010: bảng, unique, partial index chờ, sequence mã', async () => {
    const c = new pg.Client({ connectionString: env.MIGRATOR_DATABASE_URL! });
    await c.connect();
    try {
      const idx = await c.query(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('billing_invoice','bank_transaction')`);
      const by = Object.fromEntries(idx.rows.map((r) => [r.indexname, r.indexdef]));
      expect(by.billing_invoice_open_idx).toMatch(/WHERE \(status = ANY/);
      expect(Object.keys(by)).toEqual(expect.arrayContaining(['billing_invoice_code_key', 'billing_invoice_transfer_code_key', 'bank_transaction_provider_provider_tx_id_key']));
      expect((await c.query(`SELECT to_regclass('billing_invoice_seq') AS s`)).rows[0].s).toBe('billing_invoice_seq');
    } finally {
      await c.end();
    }
  });
});

describe('hoá đơn + đối soát', () => {
  let creditId: string;

  it('AC2 create_invoice credit_1000: tiền, mã, QR VietQR (CRC đúng), hết hạn 15 phút, vat_info; cùng mặt hàng → cùng hoá đơn; luật', async () => {
    const r = await buy('credit', 'credit_1000');
    expect(r.status).toBe(200);
    const res = r.body.data.result;
    creditId = res.invoice_id;
    expect(res).toMatchObject({ amount: '1000000', transfer_code: expect.stringMatching(/^APPCHAT INV2026\d{4,}$/) });
    expect(res.transfer_code.length).toBeLessThanOrEqual(25);
    const qr: string = res.qr;
    expect(qr).toContain(`54071000000`); // trường 54 = số tiền
    expect(qr).toContain(res.transfer_code);
    expect(qr).toContain(penv.PLATFORM_BANK_ACCOUNT_NO);
    expect(qr.slice(-4)).toBe(crc16(qr.slice(0, -4)));
    const row = await invoice(creditId);
    expect(row).toMatchObject({ code: expect.stringMatching(/^INV-2026-\d{4,}$/), kind: 'credits', credits: 1050n, status: 'pending', vatInfo: { tax_code: '0312345678', legal_name: 'Spa Hương Sen' } });
    expect(row.expiresAt.getTime() - h.clock.now().getTime()).toBe(15 * 60_000);
    expect((await buy('credit', 'credit_1000')).body.data.result.invoice_id).toBe(creditId);

    expect((await act('billing.create_invoice', { kind: 'credit', item: 'credit_500' })).body.error).toMatchObject({ fields: { idempotency_key: 'required' } });
    for (const [kind, item] of [['plan', 'enterprise'], ['plan', 'free'], ['plan', 'personal_pro'], ['credit', 'nope']]) {
      expect((await buy(kind!, item!)).body.error).toMatchObject({ code: 'VALIDATION_FAILED', fields: { item: 'not_purchasable' } });
    }
    const sales = await h.member('sales');
    expect((await act('billing.create_invoice', { kind: 'credit', item: 'credit_500' }, { ...idem(), ...as(sales.token) })).status).toBe(403);
  });

  it('AC9 GET /v1/billing/invoices khớp schema FE; qr chỉ khi pending; lọc status / q; sales → 403', async () => {
    const page = await invoices();
    expect(billInvoicesPageSchema.safeParse(page).success).toBe(true);
    const row = page.data.find((i: { id: string }) => i.id === creditId);
    expect(row).toMatchObject({ desc: 'Nạp 1.050 credit', amount: '1000000', kind: 'credit', item: 'credit_1000', method: 'qr', status: 'pending', qr: { bank: penv.PLATFORM_BANK_NAME, account_no: penv.PLATFORM_BANK_ACCOUNT_NO } });
    expect((await invoices('?status=paid')).data).toEqual([]);
    const one = await json(await call(h, `/billing/invoices/${creditId}`));
    expect(one.body.data).toEqual(row);
    expect((await call(h, `/billing/invoices/${uuidv7()}`)).status).toBe(404);
    expect((await call(h, '/billing/invoices/abc')).status).toBe(404);
    expect((await invoices(`?q=${row.code.slice(-4)}`)).data.map((i: { id: string }) => i.id)).toEqual([creditId]);
    const sales = await h.member('sales');
    expect((await call(h, '/billing/invoices', undefined, as(sales.token))).status).toBe(403);
  });

  it('AC3 webhook: chữ ký sai 401, provider khác 404; thiếu tiền / sai mã / chiều ra → không khớp; khớp → paid + topup 1050; gửi lại → không cộng lần 2', async () => {
    const inv = await invoice(creditId);
    expect((await hook([bankTx('1000000', inv.transferCode)], 'sai')).status).toBe(401);
    expect((await hook([bankTx('1000000', inv.transferCode)], undefined, 'sepay')).status).toBe(404);
    const short = await hook([bankTx('999999', `CK ${inv.transferCode}`), bankTx('1000000', 'APPCHAT INV20269999'), bankTx('1000000', inv.transferCode, { direction: 'out' }), bankTx('1000000', inv.transferCode, { account_number: '123456789' })]);
    expect(short.body.data).toEqual({ ok: true, received: 2, matched: 0 });
    expect((await invoice(creditId)).status).toBe('pending');

    const before = await wallet();
    const tx = bankTx('1000000', `MBVCB.889 ${inv.transferCode.replace(' ', '')} ck goi`);
    expect((await hook([tx])).body.data).toEqual({ ok: true, received: 1, matched: 1 });
    const paid = await invoice(creditId);
    expect(paid).toMatchObject({ status: 'paid', method: 'qr', bankTxId: expect.any(String), fulfilledAt: expect.any(Date) });
    expect((await h.platform.bankTransaction.findUniqueOrThrow({ where: { id: paid.bankTxId! } })).matchedInvoiceId).toBe(creditId);
    expect((await wallet()).topup).toBe(before.topup + 1050);
    expect(await h.platform.creditLedger.count({ where: { workspaceId: h.ws, refType: 'invoice', refId: creditId } })).toBe(1);
    expect(await outbox('billing.invoice_paid')).toContainEqual(expect.objectContaining({ invoice_id: creditId, kind: 'credits', amount: '1000000' }));

    expect((await hook([tx])).body.data).toEqual({ ok: true, received: 1, matched: 0 });
    expect((await wallet()).topup).toBe(before.topup + 1050);
    expect(await h.platform.bankTransaction.count({ where: { provider: 'mock', providerTxId: tx.external_id } })).toBe(1);
    expect((await invoices('?status=paid')).data[0]).not.toHaveProperty('qr');
  });

  it('AC4 hoá đơn gói Team / tháng trả qua webhook → subscription active gói Team, credit gói cấp lại; outbox subscription.changed', async () => {
    const r = await buy('plan', 'team', 'month');
    const inv = await invoice(r.body.data.result.invoice_id);
    const team = await h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
    expect(inv).toMatchObject({ kind: 'plan', months: 1, amount: team.priceMonth });
    expect((await hook([bankTx(String(inv.amount), inv.transferCode)])).body.data.matched).toBe(1);
    expect(await h.platform.subscription.findUniqueOrThrow({ where: { workspaceId: h.ws } })).toMatchObject({ planId: team.id, status: 'active' });
    expect((await wallet()).plan).toBe(Number(team.creditsMonth));
    expect(await outbox('subscription.changed')).toContainEqual(expect.objectContaining({ plan_key: 'team', status: 'active', from_plan_key: 'personal_pro' }));
    // Gói chưa có giá năm (price_year null) → không bán kỳ năm.
    if (team.priceYear) expect(await invoice((await buy('plan', 'team', 'year')).body.data.result.invoice_id)).toMatchObject({ months: 12, amount: team.priceYear });
    else expect((await buy('plan', 'team', 'year')).body.error.fields).toEqual({ item: 'not_purchasable' });
  });

  it('AC5 report_transfer → pending_review (gọi lại giữ nguyên); cancel → cancelled; cancel hoá đơn đã trả → 409; id lạ → 404', async () => {
    const a = (await buy('credit', 'credit_2000')).body.data.result.invoice_id;
    expect((await act('billing.report_transfer', { invoice_id: a })).body.data.result).toEqual({ invoice_id: a, status: 'pending_review' });
    expect((await act('billing.report_transfer', { invoice_id: a })).body.data.result.status).toBe('pending_review');
    expect(await invoice(a)).toMatchObject({ status: 'pending_review', reportedAt: expect.any(Date) });
    const b = (await buy('addon', 'addon_user')).body.data.result.invoice_id;
    expect((await act('billing.cancel_invoice', { invoice_id: b })).status).toBe(200);
    expect((await invoice(b)).status).toBe('cancelled');
    expect((await act('billing.cancel_invoice', { invoice_id: b })).status).toBe(409);
    expect((await act('billing.cancel_invoice', { invoice_id: creditId })).body.error).toMatchObject({ code: 'CONFLICT', fields: { status: 'paid' } });
    expect((await act('billing.report_transfer', { invoice_id: uuidv7() })).status).toBe(404);
    expect((await act('billing.report_transfer', { invoice_id: 'bi_1' })).status).toBe(404);
  });

  it('AC6 admin.invoice.confirm_transfer: user thường 403; admin → paid + topup; GET /v1/admin/transfers chỉ admin', async () => {
    const a = (await invoices('?status=pending_review')).data[0].id as string;
    expect((await act('admin.invoice.confirm_transfer', { invoice_id: a, note: 'đã thấy tiền VCB', evidence: 'VCB FT001' }, idem())).status).toBe(403);
    expect((await call(h, '/admin/transfers')).status).toBe(403);
    await h.platform.user.update({ where: { id: h.user }, data: { isPlatformAdmin: true } });
    try {
      const list = (await json(await call(h, '/admin/transfers?status=pending_review'))).body.data;
      expect(list).toContainEqual(expect.objectContaining({ id: a, workspace_id: h.ws, amount: '2000000', status: 'pending_review', vat_info: expect.objectContaining({ tax_code: '0312345678' }) }));
      const before = await wallet();
      expect((await act('admin.invoice.confirm_transfer', { invoice_id: a, note: 'đã thấy tiền VCB', evidence: 'VCB FT001' })).body.error.fields).toEqual({ idempotency_key: 'required' });
      const r = await act('admin.invoice.confirm_transfer', { invoice_id: a, note: 'đã thấy tiền VCB', evidence: 'VCB FT001' }, idem());
      expect(r.body.data.result).toEqual({ invoice_id: a, status: 'paid' });
      expect(await invoice(a)).toMatchObject({ status: 'paid', method: 'bank_transfer', confirmedBy: h.user, fulfilledAt: expect.any(Date) });
      expect((await wallet()).topup).toBe(before.topup + 2200);
      expect((await act('admin.invoice.confirm_transfer', { invoice_id: a, note: 'đã thấy tiền VCB', evidence: 'VCB FT001' }, idem())).status).toBe(409);
    } finally {
      await h.platform.user.update({ where: { id: h.user }, data: { isPlatformAdmin: false } });
    }
  });

  it('AC7 quét hết hạn: pending quá 15 phút → expired, pending_review giữ; tiền về sau khi hết hạn vẫn khớp → paid', async () => {
    const f = h.app.get(InvoiceFulfiller, { strict: false });
    const late = (await buy('credit', 'credit_5000')).body.data.result.invoice_id;
    const review = (await buy('credit', 'credit_500')).body.data.result.invoice_id;
    await act('billing.report_transfer', { invoice_id: review });
    h.clock.advance(15 * 60_000 + 1);
    expect(await f.expire()).toBeGreaterThanOrEqual(1);
    expect((await invoice(late)).status).toBe('expired');
    expect((await invoice(review)).status).toBe('pending_review');
    const inv = await invoice(late);
    expect((await hook([bankTx('5000000', inv.transferCode)])).body.data.matched).toBe(1);
    expect(await invoice(late)).toMatchObject({ status: 'paid', fulfilledAt: expect.any(Date) });
    // Hoá đơn paid chưa ghi nhận (vd. tiến trình chết sau markPaid) → scheduler ghi nhận.
    const stuck = (await buy('credit', 'credit_500')).body.data.result.invoice_id;
    await h.platform.billingInvoice.update({ where: { id: stuck }, data: { status: 'paid', paidAt: h.clock.now() } });
    expect(await f.fulfilPending()).toBe(1);
    expect((await invoice(stuck)).fulfilledAt).not.toBeNull();
  });
});

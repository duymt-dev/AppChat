// TIP-040 pha 3 (AC06, AC09 một phần) trên Postgres thật — đối soát chuyển khoản ở ngữ cảnh nền tảng (DC-372):
//   - GET /admin/bank-transactions: chỉ tiền VÀO chưa khớp, lọc nội dung / provider, cursor đi hết không trùng (> 1 trang), không có raw.
//   - admin.bank_transaction.match: đúng số tiền → paid + gắn giao dịch + ghi nhận một lần; thừa / thiếu → 422, không gắn; giao dịch đã
//     khớp → 409; tiền RA / sai tài khoản → 422; hai admin gắn cùng giao dịch vào hai hoá đơn song song → một thắng.
//   - duyệt tay (confirm_transfer) bắt buộc lý do + bằng chứng; audit ghi workspace hoá đơn + lý do.
//   - GET /admin/transfers cursor (không cắt 200), /admin/sales-inquiries; người thường 403.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readPaymentsEnv, uuidv7 } from '@appchat/core';
import { env, startApi, testEmail, type Harness } from './setup';

let h: Harness;
let admin: { id: string; token: string };
const ACC = readPaymentsEnv(env).PLATFORM_BANK_ACCOUNT_NO;
const PROVIDER = `rc${uuidv7().slice(-5)}`;
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const get = (path: string, token = admin.token) => fetch(`${h.base}/v1${path}`, { headers: { authorization: `Bearer ${token}` } }).then(json);
const act = (id: string, input: unknown, token = admin.token) =>
  fetch(`${h.base}/v1/actions/${id}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'idempotency-key': uuidv7() }, body: JSON.stringify({ input }) }).then(json);

async function invoice() {
  const r = await fetch(`${h.base}/v1/actions/billing.create_invoice`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${h.token}`, 'x-workspace-id': h.ws, 'idempotency-key': uuidv7() },
    body: JSON.stringify({ input: { kind: 'credit', item: 'credit_500' } }),
  }).then(json);
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return h.platform.billingInvoice.findUniqueOrThrow({ where: { id: r.body.data.result.invoice_id } });
}
async function bankTx(amount: bigint, o: { content?: string; direction?: string; accountNo?: string; at?: Date } = {}) {
  const id = uuidv7();
  await h.platform.bankTransaction.create({
    data: { id, provider: PROVIDER, providerTxId: id, amount, direction: o.direction ?? 'in', content: o.content ?? 'CK nham ma', accountNo: o.accountNo ?? ACC, occurredAt: o.at ?? new Date(), raw: { secret_raw: 'RAW-PAYLOAD' } },
  });
  return id;
}

beforeAll(async () => {
  h = await startApi();
  admin = { id: uuidv7(), token: '' };
  h.track(admin.id);
  await h.platform.user.create({ data: { id: admin.id, email: testEmail('rcadmin'), name: 'Rc Admin', isPlatformAdmin: true } });
  admin.token = h.tokenFor(admin.id);
}, 240_000);
afterAll(async () => {
  await h?.platform.bankTransaction.deleteMany({ where: { provider: PROVIDER } });
  await h?.platform.adminOperation.deleteMany({ where: { actorUserId: admin.id } });
  await h?.platform.platformAuditLog.deleteMany({ where: { actorUserId: admin.id } });
  await h?.close();
});

describe('admin.bank_transaction.match (AC06)', () => {
  it('đúng tiền → paid + gắn + ghi nhận một lần; thừa / thiếu / đã khớp / tiền ra → từ chối', async () => {
    const inv = await invoice();
    const wallet0 = await h.platform.creditWallet.findUnique({ where: { workspaceId: h.ws } });
    const over = await bankTx(inv.amount + 1n);
    const under = await bankTx(inv.amount - 1n);
    const out = await bankTx(inv.amount, { direction: 'out' });
    const other = await bankTx(inv.amount, { accountNo: '9999999999' });
    const exact = await bankTx(inv.amount);
    const m = (tx: string, id = inv.id) => act('admin.bank_transaction.match', { bank_transaction_id: tx, invoice_id: id, reason: 'khach ghi sai ma' });
    expect((await m(over)).body.error.fields).toEqual({ amount: 'overpaid' });
    expect((await m(under)).body.error.fields).toEqual({ amount: 'underpaid' });
    expect((await m(out)).body.error.fields).toEqual({ bank_transaction_id: 'not_platform_income' });
    expect((await m(other)).body.error.fields).toEqual({ bank_transaction_id: 'not_platform_income' });
    const ok = await m(exact);
    expect(ok.status, JSON.stringify(ok.body)).toBe(200);
    expect(ok.body.data.result).toEqual({ invoice_id: inv.id, bank_transaction_id: exact, status: 'paid' });
    const after = await h.platform.billingInvoice.findUniqueOrThrow({ where: { id: inv.id } });
    expect(after).toMatchObject({ status: 'paid', method: 'bank_transfer', bankTxId: exact, confirmedBy: admin.id, fulfilledAt: expect.any(Date) });
    expect((await h.platform.bankTransaction.findUniqueOrThrow({ where: { id: exact } })).matchedInvoiceId).toBe(inv.id);
    expect(Number((await h.platform.creditWallet.findUniqueOrThrow({ where: { workspaceId: h.ws } })).topupBalance) - Number(wallet0?.topupBalance ?? 0)).toBe(500);
    for (const id of [over, under]) expect((await h.platform.bankTransaction.findUniqueOrThrow({ where: { id } })).matchedInvoiceId).toBeNull();
    // Gắn lại / gắn giao dịch đã khớp vào hoá đơn khác → 409; ghi nhận không chạy lần hai.
    const inv2 = await invoice();
    expect((await m(exact, inv2.id)).body.error.fields).toEqual({ bank_transaction_id: 'already_matched' });
    expect((await m(under, inv.id)).status).toBe(409);
    const audit = await h.platform.platformAuditLog.findUniqueOrThrow({ where: { id: ok.body.data.action_log_id } });
    expect(audit).toMatchObject({ actionId: 'admin.bank_transaction.match', workspaceId: h.ws, actorUserId: admin.id });
    expect(audit.result).toMatchObject({ after: { reason: 'khach ghi sai ma' } });
    await h.platform.billingInvoice.update({ where: { id: inv2.id }, data: { status: 'cancelled' } });
  });

  it('hai admin gắn cùng giao dịch vào hai hoá đơn song song → đúng một thắng', async () => {
    const [a, b] = [await invoice(), await invoice()];
    const tx = await bankTx(a.amount);
    const rs = await Promise.all([a, b].map((inv) => act('admin.bank_transaction.match', { bank_transaction_id: tx, invoice_id: inv.id, reason: 'song song' })));
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409]);
    const paid = await h.platform.billingInvoice.count({ where: { id: { in: [a.id, b.id] }, status: 'paid' } });
    expect(paid).toBe(1);
    await h.platform.billingInvoice.updateMany({ where: { id: { in: [a.id, b.id] }, status: { not: 'paid' } }, data: { status: 'cancelled' } });
  });

  it('duyệt tay bắt buộc lý do + bằng chứng', async () => {
    const inv = await invoice();
    expect((await act('admin.invoice.confirm_transfer', { invoice_id: inv.id })).status).toBe(422);
    expect((await act('admin.invoice.confirm_transfer', { invoice_id: inv.id, note: 'ok tiền', evidence: 'x' })).body.error.fields).toMatchObject({ evidence: expect.any(String) });
    const r = await act('admin.invoice.confirm_transfer', { invoice_id: inv.id, note: 'chuyển từ ngân hàng khác', evidence: 'ACB FT9001' });
    expect(r.status).toBe(200);
    const audit = await h.platform.platformAuditLog.findUniqueOrThrow({ where: { id: r.body.data.action_log_id } });
    expect(audit.result).toMatchObject({ after: { evidence: 'ACB FT9001', bank_transaction: null } });
  });
});

describe('đọc đối soát (AC06 / AC09)', () => {
  it('giao dịch chưa khớp: cursor đi hết không trùng, lọc nội dung, không raw; transfers cursor; người thường 403', async () => {
    const base = Date.UTC(2026, 9, 1);
    for (let i = 0; i < 7; i++) await bankTx(1000n + BigInt(i), { content: i % 2 ? `MARK-${PROVIDER} ${i}` : 'khac', at: new Date(base + i * 60_000) });
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const r: { body: { data: { id: string; provider: string }[]; next_cursor: string | null } } = await get(`/admin/bank-transactions?provider=${PROVIDER}&limit=3${cursor ? `&cursor=${cursor}` : ''}`);
      seen.push(...r.body.data.map((x) => x.id));
      cursor = r.body.next_cursor;
      pages++;
    } while (cursor && pages < 10);
    expect(pages).toBeGreaterThan(1);
    expect(new Set(seen).size).toBe(seen.length);
    const all = await h.platform.bankTransaction.count({ where: { provider: PROVIDER, matchedInvoiceId: null, direction: 'in' } });
    expect(seen.length).toBe(all);
    const marked = await get(`/admin/bank-transactions?provider=${PROVIDER}&q=mark-${PROVIDER}`);
    expect(marked.body.data).toHaveLength(3);
    expect(JSON.stringify(marked.body)).not.toContain('RAW-PAYLOAD');
    expect((await get('/admin/bank-transactions?limit=0')).status).toBe(400);
    expect((await get('/admin/bank-transactions?cursor=zzz')).status).toBe(400);

    const t = await get(`/admin/transfers?status=paid&workspace_id=${h.ws}&limit=1`);
    expect(t.body.data).toHaveLength(1);
    expect(t.body.next_cursor).toEqual(expect.any(String));
    const t2 = await get(`/admin/transfers?status=paid&workspace_id=${h.ws}&limit=1&cursor=${t.body.next_cursor}`);
    expect(t2.body.data[0].id).not.toBe(t.body.data[0].id);
    expect((await get('/admin/sales-inquiries')).status).toBe(200);
    for (const p of ['/admin/bank-transactions', '/admin/transfers', '/admin/sales-inquiries']) expect((await get(p, h.token)).status).toBe(403);
    expect((await act('admin.bank_transaction.match', { bank_transaction_id: uuidv7(), invoice_id: uuidv7(), reason: 'abc' }, h.token)).status).toBe(403);
  });

  it('EXPLAIN dùng index đối soát mới', async () => {
    const plan = async (sql: string) => (await h.platform.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN ${sql}`)).map((r) => r['QUERY PLAN']).join('\n');
    await h.platform.$executeRawUnsafe('SET enable_seqscan = off');
    try {
      expect(await plan(`SELECT id, occurred_at FROM bank_transaction WHERE matched_invoice_id IS NULL AND direction = 'in' ORDER BY occurred_at DESC, id DESC LIMIT 51`)).toMatch(/bank_transaction_unmatched_idx/);
      expect(await plan(`SELECT id, created_at FROM billing_invoice WHERE status = 'pending_review' ORDER BY created_at DESC, id DESC LIMIT 51`)).toMatch(/billing_invoice_status_created_idx/);
      expect(await plan(`SELECT id FROM sales_inquiry WHERE status = 'new' ORDER BY created_at DESC, id DESC LIMIT 51`)).toMatch(/sales_inquiry_status_created_idx/);
    } finally {
      await h.platform.$executeRawUnsafe('SET enable_seqscan = on');
    }
  });
});

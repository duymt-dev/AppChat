// TIP-032 AC trên Postgres 16 + Memurai: đề nghị thanh toán + khoản thu + liệu trình — migration 032 + index (EXPLAIN danh sách / quét hạn),
// tạo (TT-001001, hạn +7 ngày, ≤ còn phải thu của đơn, đơn sàn / huỷ 409) + hoàn tác; gửi Zalo (PDF đóng băng + tin + VietQR, nháp → đã gửi)
// rồi nhắc; ghi nhận tay (phiếu thu PT-, vượt còn phải thu 422, đơn → Đã cọc / Đã thanh toán, liệu trình sinh khi đủ) + hoàn tác; huỷ
// (đã thu 409); tài khoản nhận + bank feed SePay (giả lập `mock`) → webhook khớp TT… tự ghi nhận / lệch tiền + thiếu mã → hàng "Cần đối
// soát" → đối soát tay; idempotent; hoàn tiền luôn duyệt (yêu cầu / duyệt / từ chối, tách người duyệt); huỷ đơn đã thu → yêu cầu hoàn;
// liệu trình gia hạn / chỉnh buổi + hoàn tác; quét quá hạn + nhắc T+1 một lần; PDF đề nghị / phiếu thu; quyền + scope; D42 + meta.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { mockSignature } from '@appchat/integrations';
import { invoiceRowSchema, invoicesMetaSchema, invoicesPageSchema, paymentSettingsSchema } from '@appchat/shared';
import { QuoteDeps, CrmMembers, markOverdue, remindDue, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';
import { drainBankReceipts } from './helpers/bank-ingress';

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
let accountant: { id: string; token: string };
let cs: { id: string; token: string };
let zalo: string;

beforeAll(async () => {
  h = await startApi();
  [sales, accountant, cs] = [await h.member('sales'), await h.member('accountant'), await h.member('cs')];
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 60_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { id: string }) => ({ authorization: `Bearer ${h.tokenFor(u.id)}` });
const act = (id: string, input: unknown, who?: { id: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...(who ? as(who) : {}) }).then(json);
const get = (path: string, who?: { id: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any>; action_log_id: string } }).data; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const undo = (logId: string) => call(h, `/action-logs/${logId}/undo`, {}).then(json);
const inv = async (id: string, who?: { id: string }) => invoiceRowSchema.parse((await get(`/invoices/${id}`, who)).body.data);
const order = async (id: string) => (await tenant()).order.findUniqueOrThrow({ where: { id } });
const line = (name: string, unit_price: string, qty = 1, product_id?: string) => ({ name, qty, unit_price, tax_rate: 0 as const, ...(product_id ? { product_id } : {}) });

const ids = {} as Record<'lan' | 'vy' | 'serum' | 'pkg' | 'o1' | 'o2' | 'i1' | 'i2' | 'pk', string>;
let feed = '';

async function zaloConversation(contactId: string) {
  const db = await tenant();
  const id = uuidv7();
  await db.conversation.create({ data: { id, channelAccountId: zalo, channelType: 'zalo_personal', contactId, externalThreadId: `z-${id}`, title: 'Khách', lastMessageAt: h.clock.now() } });
  return id;
}

/** Đơn đã xác nhận cho khách (tổng = `price` × qty). */
async function confirmedOrder(contact: string, items: ReturnType<typeof line>[], who?: { id: string }) {
  const o = ok(await act('order.create', { contact_id: contact, items }, who)).result.order_id as string;
  ok(await act('order.confirm', { order_id: o }, who));
  return o;
}

type HookOut = { data: { accepted: number; duplicate: number; ignored: number } };
const hookData = async (r: Response) => ((await r.json()) as HookOut).data;
const hook = (body: string, sig = mockSignature('sk_tenant', body), path = `/hooks/tenant-payments/sepay/${feed}`) =>
  fetch(`${h.base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-mock-signature': sig }, body });
const tx = (id: string, amount: string, content: string, account = '0071000123456') => ({ external_id: id, account_number: account, amount, direction: 'in', content, occurred_at: h.clock.now().toISOString() });

describe('chuẩn bị', () => {
  it('khách, sản phẩm (liệu trình 10 buổi / 90 ngày), Zalo', async () => {
    ids.lan = ok(await act('contact.create', { full_name: 'Chị Lan', phone: '0909400001' })).result.contact_id;
    ids.vy = ok(await act('contact.create', { full_name: 'Phương Vy', phone: '0909400002' }, sales)).result.contact_id;
    ids.serum = ok(await act('product.create', { name: 'Serum B5', type: 'physical', price: '600000', stock: 10 })).result.product_id;
    ids.pkg = ok(await act('product.create', { name: 'Liệu trình trẻ hoá', type: 'package', price: '10000000', sessions: 10, valid_days: 90, tax_rate: 0 })).result.product_id;
    const db = await tenant();
    zalo = uuidv7();
    await db.channelAccount.create({ data: { id: zalo, type: 'zalo_personal', name: 'Zalo Spa', externalId: 'z-spa', status: 'connected', settings: {} } });
    await zaloConversation(ids.lan);
  });
});

describe('migration 032', () => {
  it('bảng + index; EXPLAIN danh sách D42 / quét hạn', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename IN ('invoice', 'customer_payment', 'bank_tx', 'customer_package')`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['invoice_recent_idx', 'invoice_owner_idx', 'invoice_contact_idx', 'invoice_open_due_idx', 'invoice_code_key', 'customer_payment_bank_tx_id_key', 'customer_payment_receipt_code_key', 'bank_tx_feed_id_external_id_key', 'bank_tx_review_idx', 'customer_package_legacy_key', 'customer_package_order_item_key']));
    const dbName = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName;
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const plan = async (sql: string) => (await c.query(`EXPLAIN ${sql}`)).rows.map((x) => x['QUERY PLAN']).join('\n');
      expect(await plan(`SELECT i.id FROM invoice i ORDER BY i.created_at DESC, i.id DESC LIMIT 20`)).toMatch(/invoice_recent_idx/);
      expect(await plan(`SELECT id FROM invoice WHERE status IN ('sent', 'partial') AND due_date < '2026-11-01'`)).toMatch(/invoice_open_due_idx/);
      // Hoàn tiền là số âm; khoản dương phải có phiếu thu.
      await expect(c.query(`INSERT INTO customer_payment (id, contact_id, order_id, kind, amount, method, status, paid_at) VALUES (gen_random_uuid(), '${ids.lan}', NULL, 'refund', 100, 'cash', 'pending', now())`)).rejects.toThrow();
    } finally {
      await c.end();
    }
  });
});

describe('đề nghị thanh toán', () => {
  it('create: TT-001001, hạn +7 ngày, phụ trách theo đơn; vượt còn phải thu 422; hoàn tác khi nháp', async () => {
    ids.o1 = await confirmedOrder(ids.lan, [line('Serum B5', '600000', 2, ids.serum), line('Liệu trình trẻ hoá', '10000000', 1, ids.pkg)]);
    const over = await act('invoice.create', { order_id: ids.o1, contact_id: ids.lan, kind: 'full', amount: '11200001' });
    expect(over.body.error?.fields, JSON.stringify(over.body)).toEqual({ amount: 'invoice.amount_over' });
    expect((await act('invoice.create', { order_id: ids.o1, contact_id: ids.vy, kind: 'full', amount: '100' })).status).toBe(422);
    const d = ok(await act('invoice.create', { order_id: ids.o1, contact_id: ids.lan, kind: 'deposit', amount: '3000000' }));
    ids.i1 = d.result.invoice_id;
    expect(d.result.code).toBe('TT-001001');
    const i = await inv(ids.i1);
    expect(i).toMatchObject({ status: 'draft', amount: '3000000', left: '3000000', transfer_code: 'TT001001', order_code: 'DH-001001', kind: 'deposit', qr: null });
    expect(i.due_date).toBe(new Date(h.clock.now().getTime() + 7 * 86_400_000 + 7 * 3_600_000).toISOString().slice(0, 10));
    // Đề nghị đang mở trừ vào còn phải thu của đơn.
    expect((await act('invoice.create', { order_id: ids.o1, contact_id: ids.lan, kind: 'full', amount: '8200001' })).status).toBe(422);
    const tmp = ok(await act('invoice.create', { contact_id: ids.lan, kind: 'full', amount: '500000', title: 'Tạm' }));
    expect((await undo(tmp.action_log_id)).status).toBe(200);
    expect(await (await tenant()).invoice.count({ where: { id: tmp.result.invoice_id } })).toBe(0);
  });

  it('tài khoản nhận (finance.manage — sales 403) → VietQR có trong đề nghị đã gửi', async () => {
    expect((await act('payment_account.update', { bank: 'Vietcombank', bank_bin: '970436', account_no: '0071000123456', account_name: 'Spa An Nhien' }, sales)).status).toBe(403);
    ok(await act('payment_account.update', { bank: 'Vietcombank', bank_bin: '970436', account_no: '0071000123456', account_name: 'Spa An Nhien' }));
    expect((await act('payment_account.update', { bank: 'X', bank_bin: '97A', account_no: '1', account_name: 'Y' })).status).toBe(422);
  });

  it('send: PDF đóng băng + tin Zalo kèm tệp, nháp → đã gửi, timeline; lần 2 = nhắc (không PDF mới)', async () => {
    const d = ok(await act('invoice.send_payment_qr', { invoice_id: ids.i1, channel: 'zalo_personal' }));
    expect(d.result.status).toBe('sent');
    const db = await tenant();
    const row = await db.invoice.findUniqueOrThrow({ where: { id: ids.i1 } });
    expect(row.fileId).toBeTruthy();
    expect(await db.file.findUniqueOrThrow({ where: { id: row.fileId! } })).toMatchObject({ mime: 'application/pdf', confirmed: true });
    const msg = await db.message.findFirstOrThrow({ where: { conversationId: row.conversationId! }, orderBy: { createdAt: 'desc' } });
    expect(msg.body).toContain('TT001001');
    expect(msg.body).toContain('Vietcombank 0071000123456');
    const i = await inv(ids.i1);
    expect(i.qr).toMatchObject({ amount: '3000000', content: 'TT001001', bin: '970436', account_name: 'SPA AN NHIEN' });
    expect(i.qr!.payload).toContain('TT001001');
    ok(await act('invoice.send_payment_qr', { invoice_id: ids.i1, channel: 'zalo_personal' }));
    const again = await db.invoice.findUniqueOrThrow({ where: { id: ids.i1 } });
    expect(again.fileId).toBe(row.fileId);
    expect((again.remindersSent as { key: string }[]).map((r) => r.key)).toEqual(['manual']);
    expect((await inv(ids.i1)).events.map((e) => e.type)).toEqual(['created', 'sent', 'reminded']);
    const pdf = await call(h, `/invoices/${ids.i1}/pdf`);
    expect(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('record_payment: vượt 422; phiếu thu PT-; đơn → Đã cọc; hoàn tác trả lại; huỷ khi đã thu 409', async () => {
    expect((await act('invoice.record_payment', { invoice_id: ids.i1, amount: '3000001', method: 'cash' })).body.error.fields).toEqual({ amount: 'invoice.amount_over' });
    expect((await act('invoice.record_payment', { invoice_id: ids.i1, amount: '100', method: 'cash' }, sales)).status).toBe(403);
    const r = ok(await act('invoice.record_payment', { invoice_id: ids.i1, amount: '1000000', method: 'cash', reference: 'Thu tại quầy' }, accountant));
    expect(r.result).toMatchObject({ status: 'partial', receipt_code: 'PT-001001' });
    expect((await inv(ids.i1)).paid_pct).toBe(33);
    expect((await order(ids.o1)).paidTotal).toBe(1_000_000n);
    expect((await undo(r.action_log_id)).status).toBe(200);
    expect(await inv(ids.i1)).toMatchObject({ status: 'sent', paid_amount: '0', payments: [] });
    expect((await order(ids.o1)).paidTotal).toBe(0n);
    ok(await act('invoice.record_payment', { invoice_id: ids.i1, amount: '3000000', method: 'bank_transfer' }));
    expect((await inv(ids.i1)).status).toBe('paid');
    expect((await order(ids.o1)).payStatus).toBe('partial');
    expect((await act('invoice.void', { invoice_id: ids.i1, reason: 'Nhầm' })).body.error).toMatchObject({ code: 'INVALID_STATE' });
    const rc = await call(h, `/invoices/receipts/${(await inv(ids.i1)).payments[0]!.id}/pdf`);
    expect(rc.status).toBe(200);
    expect(Buffer.from(await rc.arrayBuffer()).subarray(0, 5).toString()).toBe('%PDF-');
    expect(await (await tenant()).customerPayment.count({ where: { invoiceId: ids.i1, receiptFileId: { not: null } } })).toBe(1);
  });

  it('void nháp (lý do bắt buộc), void lần 2 409; đơn sàn / đơn huỷ không tạo đề nghị', async () => {
    const d = ok(await act('invoice.create', { contact_id: ids.lan, kind: 'full', amount: '200000' }));
    expect((await act('invoice.void', { invoice_id: d.result.invoice_id, reason: ' ' })).status).toBe(422);
    expect(ok(await act('invoice.void', { invoice_id: d.result.invoice_id, reason: 'Khách đổi ý' })).result.status).toBe('void');
    expect((await act('invoice.void', { invoice_id: d.result.invoice_id, reason: 'x' })).status).toBe(409);
    const c = ok(await act('order.create', { contact_id: ids.lan, items: [line('X', '1000')] })).result.order_id;
    ok(await act('order.cancel', { order_id: c, reason: 'Thử' }));
    expect((await act('invoice.create', { order_id: c, contact_id: ids.lan, kind: 'full', amount: '1000' })).body.error.fields).toEqual({ order_id: 'cancelled' });
  });
});

describe('bank feed SePay của DN (adapter mock)', () => {
  it('connect: finance.manage, kết nối port bank_feed + route nền tảng; settings trả link webhook', async () => {
    expect((await act('bank_feed.connect', { provider: 'sepay', fields: { api_key: 'sk_tenant', account_number: '0071000123456' }, mode: 'sandbox' }, accountant)).status).toBe(403);
    const d = ok(await act('bank_feed.connect', { provider: 'sepay', fields: { api_key: 'sk_tenant', account_number: '0071 000 123 456' }, mode: 'sandbox' }));
    feed = d.result.feed_id;
    expect(d.result.webhook_path).toBe(`/hooks/tenant-payments/sepay/${feed}`);
    expect(await h.platform.tenantBankFeedRoute.findUniqueOrThrow({ where: { feedId: feed } })).toMatchObject({ workspaceId: h.ws, provider: 'sepay' });
    const s = paymentSettingsSchema.parse((await get('/settings/payments')).body.data);
    expect(s.bank_feeds).toEqual([expect.objectContaining({ provider: 'sepay', feed_id: feed, account_no: '0071000123456' })]);
    expect((await get('/settings/payments', sales)).status).toBe(403);
  });

  it('webhook: chữ ký sai 401, feed lạ 404; khớp mã + đúng tiền → tự ghi nhận (một lần); lệch / thiếu mã → Cần đối soát', async () => {
    ids.o2 = await confirmedOrder(ids.lan, [line('Liệu trình trẻ hoá', '10000000', 1, ids.pkg)]);
    ids.i2 = ok(await act('invoice.create', { order_id: ids.o2, contact_id: ids.lan, kind: 'full', amount: '10000000' })).result.invoice_id;
    ok(await act('invoice.send_payment_qr', { invoice_id: ids.i2, channel: 'zalo_personal' }));
    const code = (await inv(ids.i2)).transfer_code;
    const body = JSON.stringify({ id: 'evt-1', transactions: [tx('FT-1', '4000000', `CK ${code} chi Lan`), tx('FT-2', '777000', 'CK KHONG MA'), tx('FT-OUT', '5', 'x', '999')] });
    expect((await hook(body, 'bad')).status).toBe(401);
    expect((await hook(body, undefined, `/hooks/tenant-payments/sepay/${uuidv7()}`)).status).toBe(404);
    expect((await hook(body, undefined, `/hooks/tenant-payments/casso/${feed}`)).status).toBe(404);
    const r = await hook(body);
    expect(r.status).toBe(200);
    // Webhook chỉ ACK biên nhận (TIP-012b P2): 2 nhận, giao dịch sai tài khoản giữ làm bằng chứng (ignored). Khớp chạy ở consumer.
    expect(await hookData(r)).toMatchObject({ accepted: 2, duplicate: 0, ignored: 1 });
    expect(await drainBankReceipts(h, resolver)).toBe(2);
    // 4tr ≠ 10tr còn phải thu → lệch tiền.
    const m = invoicesMetaSchema.parse((await get('/invoices/meta')).body.data);
    expect(m.bank_txs.map((b) => b.reason).sort()).toEqual(['amount_mismatch', 'missing_code']);
    expect(m.bank_txs.find((b) => b.reason === 'amount_mismatch')!.suggested_invoice_id).toBe(ids.i2);
    expect(invoicesMetaSchema.parse((await get('/invoices/meta', sales)).body.data).bank_txs).toEqual([]);
    // Đúng tiền → tự ghi nhận; webhook gửi lại cùng giao dịch → không ghi lần hai.
    const exact = JSON.stringify({ id: 'evt-2', transactions: [tx('FT-3', '10000000', `${code.slice(0, 2)}-${code.slice(2)} THANH TOAN`)] });
    expect(await hookData(await hook(exact))).toMatchObject({ accepted: 1, duplicate: 0 });
    expect(await hookData(await hook(exact))).toMatchObject({ accepted: 0, duplicate: 1 });
    await drainBankReceipts(h, resolver);
    await drainBankReceipts(h, resolver);
    const i = await inv(ids.i2);
    expect(i).toMatchObject({ status: 'paid', paid_amount: '10000000' });
    expect(i.payments[0]).toMatchObject({ method: 'bank_transfer', auto: true, by: 'system' });
    expect((await order(ids.o2)).payStatus).toBe('paid');
    // Đơn có liệu trình đã xác nhận + thu đủ → sinh gói 10 buổi, hạn 90 ngày.
    const pk = await (await tenant()).customerPackage.findFirstOrThrow({ where: { orderId: ids.o2 } });
    expect(pk).toMatchObject({ totalSessions: 10, usedSessions: 0, status: 'active', contactId: ids.lan });
    ids.pk = pk.id;
    expect((await get(`/contacts/${ids.lan}/packages`)).body.data).toEqual([expect.objectContaining({ id: pk.id, total: 10, used: 0 })]);
  });

  it('resolve_bank_match: gán giao dịch thiếu mã cho đề nghị → ghi nhận + hoàn tác trả về hàng đối soát', async () => {
    const i3 = ok(await act('invoice.create', { contact_id: ids.lan, kind: 'full', amount: '777000' })).result.invoice_id;
    const bt = invoicesMetaSchema.parse((await get('/invoices/meta')).body.data).bank_txs.find((b) => b.reason === 'missing_code')!;
    expect((await act('invoice.resolve_bank_match', { bank_tx_id: bt.id, invoice_id: i3 }, sales)).status).toBe(403);
    const r = ok(await act('invoice.resolve_bank_match', { bank_tx_id: bt.id, invoice_id: i3 }, accountant));
    expect(r.result.status).toBe('paid');
    expect((await act('invoice.resolve_bank_match', { bank_tx_id: bt.id, invoice_id: i3 })).status).toBe(409);
    expect((await undo(r.action_log_id)).status).toBe(200);
    expect((await (await tenant()).bankTx.findUniqueOrThrow({ where: { id: bt.id } })).status).toBe('needs_review');
    expect((await inv(i3)).status).toBe('draft');
    ok(await act('invoice.resolve_bank_match', { bank_tx_id: bt.id, invoice_id: i3 }));
  });
});

describe('hoàn tiền (luôn duyệt) + liệu trình', () => {
  it('yêu cầu theo liệu trình (tỉ lệ buổi còn lại) → chờ duyệt; người yêu cầu không tự duyệt; duyệt → đơn hoàn một phần, gói refunded', async () => {
    await (await tenant()).customerPackage.update({ where: { id: ids.pk }, data: { usedSessions: 4 } });
    expect((await act('payment.refund', { package_id: ids.pk, invoice_id: ids.i2, reason: 'x' })).status).toBe(422);
    expect((await act('payment.refund', { package_id: ids.pk, reason: 'Khách chuyển nơi ở' }, cs)).status).toBe(403);
    const r = ok(await act('payment.refund', { package_id: ids.pk, reason: 'Khách chuyển nơi ở' }, accountant));
    expect(r.result).toMatchObject({ status: 'pending', amount: '6000000' });
    expect((await order(ids.o2)).refundPending).toBe(true);
    expect((await act('payment.refund', { package_id: ids.pk, reason: 'lần 2' }, accountant)).body.error.fields).toEqual({ package_id: 'refund_pending' });
    const db = await tenant();
    const notes = await db.outboxEvent.findMany({ where: { topic: 'notify.requested' }, orderBy: { createdAt: 'desc' }, take: 5 });
    const payloads = notes.map((n) => n.payload as { kind: string; to: { permission?: string } });
    expect(payloads.some((n) => n.kind === 'refund_approval' && n.to.permission === 'payment.refund_approve')).toBe(true);
    const m = invoicesMetaSchema.parse((await get('/invoices/meta')).body.data);
    expect(m.refunds).toEqual([expect.objectContaining({ id: r.result.payment_id, amount: '6000000', package_id: ids.pk })]);
    expect((await act('payment.refund_approve', { payment_id: r.result.payment_id }, accountant)).status).toBe(403);
    ok(await act('payment.refund_approve', { payment_id: r.result.payment_id, note: 'OK' }));
    const o = await order(ids.o2);
    expect(o).toMatchObject({ refundedTotal: 6_000_000n, payStatus: 'partially_refunded', refundPending: false });
    expect((await db.customerPackage.findUniqueOrThrow({ where: { id: ids.pk } })).status).toBe('refunded');
    expect((await act('payment.refund_approve', { payment_id: r.result.payment_id })).status).toBe(409);
  });

  it('yêu cầu theo đề nghị: vượt 422 → từ chối (cờ chờ hoàn tắt); huỷ đơn đã thu → yêu cầu hoàn toàn bộ', async () => {
    expect((await act('payment.refund', { invoice_id: ids.i1, amount: '3000001', reason: 'x' }, accountant)).body.error.fields).toEqual({ amount: 'over_refundable' });
    const r = ok(await act('payment.refund', { invoice_id: ids.i1, amount: '500000', reason: 'Giảm giá sau' }, accountant));
    ok(await act('payment.refund_reject', { payment_id: r.result.payment_id, note: 'Không đủ điều kiện' }));
    expect((await order(ids.o1)).refundPending).toBe(false);
    expect((await inv(ids.i1)).events.map((e) => e.type)).toEqual(expect.arrayContaining(['refund_requested', 'refund_rejected']));
    const c = ok(await act('order.cancel', { order_id: ids.o1, reason: 'Khách huỷ' }));
    expect(c.result.refund_requested).toBe(true);
    const pending = await (await tenant()).customerPayment.findFirstOrThrow({ where: { orderId: ids.o1, kind: 'refund', status: 'pending' } });
    expect(pending.amount).toBe(-3_000_000n);
    ok(await act('payment.refund_approve', { payment_id: pending.id }));
    expect(await order(ids.o1)).toMatchObject({ payStatus: 'refunded', refundPending: false });
  });

  it('liệu trình: gia hạn (gói hết hạn mở lại) + hoàn tác; chỉnh buổi < đã dùng 422; lý do bắt buộc', async () => {
    const o = await confirmedOrder(ids.lan, [line('Liệu trình trẻ hoá', '10000000', 1, ids.pkg)]);
    const i = ok(await act('invoice.create', { order_id: o, contact_id: ids.lan, kind: 'full', amount: '10000000' })).result.invoice_id;
    ok(await act('invoice.record_payment', { invoice_id: i, amount: '10000000', method: 'card' }));
    const db = await tenant();
    const pk = await db.customerPackage.findFirstOrThrow({ where: { orderId: o } });
    await db.customerPackage.update({ where: { id: pk.id }, data: { status: 'expired', expiresAt: new Date(h.clock.now().getTime() - 86_400_000), usedSessions: 3 } });
    expect((await act('package.extend', { package_id: pk.id, days: 30 }, sales)).status).toBe(404);
    const e = ok(await act('package.extend', { package_id: pk.id, days: 30 }));
    expect(e.result.status).toBe('active');
    expect((await undo(e.action_log_id)).status).toBe(200);
    expect((await db.customerPackage.findUniqueOrThrow({ where: { id: pk.id } })).status).toBe('expired');
    expect((await act('package.adjust_sessions', { package_id: pk.id, total_sessions: 2, reason: 'x' })).body.error.fields).toEqual({ total_sessions: 'below_used' });
    expect((await act('package.adjust_sessions', { package_id: pk.id, total_sessions: 12, reason: '' })).status).toBe(422);
    expect(ok(await act('package.adjust_sessions', { package_id: pk.id, total_sessions: 3, reason: 'Tặng bù' })).result.status).toBe('exhausted');
  });
});

describe('quét + đọc + quyền', () => {
  it('quá hạn → overdue + event; nhắc T+1 một lần qua hội thoại đã gửi', async () => {
    const i = ok(await act('invoice.create', { contact_id: ids.lan, kind: 'installment', amount: '2000000', due_date: new Date(h.clock.now().getTime() + 7 * 3_600_000).toISOString().slice(0, 10) })).result.invoice_id;
    ok(await act('invoice.send_payment_qr', { invoice_id: i, channel: 'zalo_personal' }));
    h.clock.advance(86_400_000);
    const db = await tenant();
    expect(await markOverdue(db, h.ws, h.clock.now(), 'Asia/Ho_Chi_Minh')).toBeGreaterThanOrEqual(1);
    expect((await inv(i)).status).toBe('overdue');
    const d = h.app.get(QuoteDeps, { strict: false });
    const members = h.app.get(CrmMembers, { strict: false });
    const queued: unknown[] = [];
    const n = await remindDue(db, h.ws, h.clock.now(), 'Asia/Ho_Chi_Minh', d, members, async (o) => void queued.push(o));
    expect(n).toBeGreaterThanOrEqual(1);
    expect(((await db.invoice.findUniqueOrThrow({ where: { id: i } })).remindersSent as { key: string }[]).map((r) => r.key)).toEqual(['T+1']);
    expect(await remindDue(db, h.ws, h.clock.now(), 'Asia/Ho_Chi_Minh', d, members, async () => undefined)).toBe(0);
    const conv = (await db.invoice.findUniqueOrThrow({ where: { id: i } })).conversationId!;
    const msg = await db.message.findFirstOrThrow({ where: { conversationId: conv }, orderBy: { createdAt: 'desc' } });
    expect(msg.body).toContain('quá hạn 1 ngày');
  });

  it('D42 page + tìm không dấu + lọc trạng thái; meta thống kê; scope sales own / cs 403 / kế toán thấy hết', async () => {
    const all = invoicesPageSchema.parse((await get('/invoices?page=1&limit=3')).body);
    expect(all.data).toHaveLength(3);
    expect(all.next_cursor).toBe('2');
    expect(invoicesPageSchema.parse((await get('/invoices?q=tt-001001&page=1&limit=20')).body).data.map((x) => x.code)).toEqual(['TT-001001']);
    expect(invoicesPageSchema.parse((await get('/invoices?q=chi lan&page=1&limit=50')).body).meta.total).toBe(all.meta.total);
    expect(invoicesPageSchema.parse((await get('/invoices?status=overdue&page=1&limit=20')).body).data.every((x) => x.status === 'overdue')).toBe(true);
    const m = invoicesMetaSchema.parse((await get(`/invoices/meta?invoice_id=${ids.i2}`)).body.data);
    expect(m.stats.total).toBeGreaterThan(0);
    expect(m.payment_account).toMatchObject({ bin: '970436' });
    expect(m.crm.total).toBeGreaterThan(0);
    expect(m.files.length).toBeGreaterThanOrEqual(1);
    // Sales chỉ thấy đề nghị mình phụ trách.
    const mine = ok(await act('invoice.create', { contact_id: ids.vy, kind: 'full', amount: '300000' }, sales)).result.invoice_id;
    const list = invoicesPageSchema.parse((await get('/invoices?page=1&limit=50', sales)).body);
    expect(list.data.map((x) => x.id)).toEqual([mine]);
    expect((await get(`/invoices/${ids.i1}`, sales)).status).toBe(404);
    expect((await get('/invoices', cs)).status).toBe(403);
    expect(invoicesPageSchema.parse((await get('/invoices?page=1&limit=50', accountant)).body).meta.total).toBe(all.meta.total + 1);
  });

  it('ngắt bank feed: route nền tảng xoá → webhook 404', async () => {
    ok(await act('bank_feed.disconnect', { provider: 'sepay' }));
    expect(await h.platform.tenantBankFeedRoute.count({ where: { feedId: feed } })).toBe(0);
    expect((await hook(JSON.stringify({ id: 'evt-9', transactions: [] }))).status).toBe(404);
  });
});

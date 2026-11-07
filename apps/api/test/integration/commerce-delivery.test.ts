// TIP-032b P2 AC2 + review độc lập trên Postgres 16 + Memurai + LibreOffice thật: PDF đề nghị thanh toán có ảnh VietQR — rasterize trang
// PDF rồi decode QR (không tìm byte PNG), đúng tài khoản / số tiền / nội dung CK; `GET /invoices/:id/qr` 200 / 403 theo scope;
// `invoice.send_payment_qr` qua webchat ghi tin có link công khai, link chỉ đọc đúng tệp đã gửi, sửa token / hết hạn / thu hồi → 410;
// Zalo kèm ảnh QR riêng ngoài PDF; `order.send_confirmation` + `receipt.send` ghi tin hội thoại + đẩy hàng gửi kênh (outbox); báo giá dạng
// ảnh đủ trang từ cùng PDF đóng băng, kênh không gửi được ảnh → 422.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { DocRenderer, uuidv7 } from '@appchat/core';
import { vietQrPayload } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let lan: string;
let webConv: string;
let zaloConv: string;
const ids: Record<string, string> = {};

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const act = (id: string, input: unknown, who?: { token: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...(who ? as(who) : {}) }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any> } }).data.result; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const lastOut = async (conv: string) => (await tenant()).message.findFirstOrThrow({ where: { conversationId: conv, direction: 'out' }, orderBy: { createdAt: 'desc' } });
const decode = (png: Buffer) => {
  const img = PNG.sync.read(png);
  return jsQR(new Uint8ClampedArray(img.data), img.width, img.height)?.data ?? null;
};
const tokenOf = (body: string) => /\/documents\/([0-9a-f-]{36}\.[A-Za-z0-9_-]{32})/.exec(body)?.[1] ?? '';

async function conversation(type: 'webchat' | 'zalo_personal') {
  const db = await tenant();
  const account = uuidv7();
  await db.channelAccount.create({ data: { id: account, type, name: type, externalId: `x-${account}`, status: 'connected', settings: {} } });
  const id = uuidv7();
  await db.conversation.create({ data: { id, channelAccountId: account, channelType: type, contactId: lan, externalThreadId: `t-${id}`, title: 'Chị Lan', lastMessageAt: h.clock.now() } });
  return id;
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  lan = ok(await act('contact.create', { full_name: 'Chị Lan CD', phone: '0909500001', email: 'lan.cd@example.com' })).contact_id;
  webConv = await conversation('webchat');
  zaloConv = await conversation('zalo_personal');
  ok(await act('payment_account.update', { bank: 'Vietcombank', bank_bin: '970436', account_no: '0071000123456', account_name: 'Spa An Nhien' }));
  ids.order = ok(await act('order.create', { contact_id: lan, items: [{ name: 'Gói chăm sóc da', qty: 2, unit_price: '3200000', tax_rate: 0 }] })).order_id;
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('VietQR ảnh thật', () => {
  it('PDF đề nghị thanh toán có ảnh QR decode đúng tài khoản / số tiền / nội dung; Zalo kèm ảnh QR riêng', async () => {
    ids.inv = ok(await act('invoice.create', { order_id: ids.order, contact_id: lan, kind: 'deposit', amount: '2500000' })).invoice_id;
    ok(await act('invoice.send_payment_qr', { invoice_id: ids.inv, channel: 'zalo_personal' }));
    const db = await tenant();
    const i = await db.invoice.findUniqueOrThrow({ where: { id: ids.inv } });
    const want = vietQrPayload({ bin: '970436', account_no: '0071000123456', amount: '2500000', content: i.code.replace(/[^A-Za-z0-9]/g, '') });
    const pdf = Buffer.from(await (await call(h, `/invoices/${ids.inv}/pdf`)).arrayBuffer());
    const renderer = h.app.get(DocRenderer, { strict: false });
    const [page1] = await renderer.pdfPages(pdf);
    expect(decode(page1!)).toBe(want);
    const m = await lastOut(zaloConv);
    const atts = m.attachments as { mime: string; name?: string }[];
    expect(atts.map((a) => a.mime)).toEqual(['application/pdf', 'image/png']);
    expect(atts[1]!.name).toContain(i.code);
    const ob = await db.outboxMessage.findFirstOrThrow({ where: { messageId: m.id } });
    expect((ob.payload as { attachments: { fileId?: string; sha256?: string }[] }).attachments.every((a) => a.fileId && /^[0-9a-f]{64}$/.test(a.sha256 ?? ''))).toBe(true);
    expect(await db.outboxMessage.count({ where: { messageId: m.id } })).toBe(1);
  }, 180_000);

  it('GET /invoices/:id/qr: PNG no-store decode đúng; Sales không thấy đề nghị → 403 / 404; id lạ 404', async () => {
    const r = await call(h, `/invoices/${ids.inv}/qr`);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('image/png');
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(decode(Buffer.from(await r.arrayBuffer()))).toContain('0071000123456');
    const cs = await h.member('cs');
    expect((await call(h, `/invoices/${ids.inv}/qr`, undefined, as(cs))).status).toBe(403);
    const sales = await h.member('sales');
    expect((await call(h, `/invoices/${ids.inv}/qr`, undefined, as(sales))).status).toBe(404);
    expect((await call(h, `/invoices/${uuidv7()}/qr`)).status).toBe(404);
  });
});

describe('webchat + link công khai', () => {
  it('đề nghị gửi webchat → tin có link; link mở đúng tệp đã gửi; sửa token / thu hồi / hết hạn → 410', async () => {
    const inv = ok(await act('invoice.create', { contact_id: lan, kind: 'full', amount: '900000', title: 'Phí tư vấn' })).invoice_id;
    ok(await act('invoice.send_payment_qr', { invoice_id: inv, channel: 'webchat' }));
    const m = await lastOut(webConv);
    const token = tokenOf(m.body);
    expect(token).toBeTruthy();
    const db = await tenant();
    const i = await db.invoice.findUniqueOrThrow({ where: { id: inv } });
    const view = await json(await call(h, `/public/documents/${token}`, undefined, { authorization: '' }));
    expect(view.status).toBe(200);
    expect(view.body.data).toMatchObject({ kind: 'payment_request', code: i.code, file_name: expect.stringContaining(i.code) });
    const pdf = await call(h, `/public/documents/${token}/pdf`, undefined, { authorization: '' });
    expect(pdf.headers.get('content-disposition')).toMatch(/^attachment/);
    const stored = await db.file.findUniqueOrThrow({ where: { id: i.fileId! } });
    expect(Buffer.from(await pdf.arrayBuffer()).length).toBe(Number(stored.size));
    const bad = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;
    expect((await call(h, `/public/documents/${bad}`, undefined, { authorization: '' })).status).toBe(410);
    // Token đúng chữ ký nhưng không có trong commerce_link (vd token miền khác dán vào) → 410.
    expect((await call(h, `/public/documents/${uuidv7()}.${'A'.repeat(32)}`, undefined, { authorization: '' })).status).toBe(410);
    const platform = h.platform;
    await platform.commerceLink.updateMany({ where: { documentId: inv }, data: { expiresAt: new Date(h.clock.now().getTime() - 1000) } });
    expect((await call(h, `/public/documents/${token}`, undefined, { authorization: '' })).status).toBe(410);
    await platform.commerceLink.updateMany({ where: { documentId: inv }, data: { expiresAt: new Date(h.clock.now().getTime() + 86_400_000), revokedAt: h.clock.now() } });
    expect((await call(h, `/public/documents/${token}/pdf`, undefined, { authorization: '' })).status).toBe(410);
  }, 180_000);

  it('đề nghị huỷ → link hết hiệu lực dù chưa hết hạn', async () => {
    const inv = ok(await act('invoice.create', { contact_id: lan, kind: 'full', amount: '300000', title: 'Phí khác' })).invoice_id;
    ok(await act('invoice.send_payment_qr', { invoice_id: inv, channel: 'webchat' }));
    const token = tokenOf((await lastOut(webConv)).body);
    expect((await call(h, `/public/documents/${token}`, undefined, { authorization: '' })).status).toBe(200);
    ok(await act('invoice.void', { invoice_id: inv, reason: 'nhầm' }));
    expect((await call(h, `/public/documents/${token}`, undefined, { authorization: '' })).status).toBe(410);
  }, 180_000);
});

describe('xác nhận đơn + phiếu thu', () => {
  it('order.send_confirmation: tin + PDF vào hội thoại, outbox, timeline; preview có người nhận + kênh', async () => {
    const pv = await call(h, `/actions/order.send_confirmation`, { input: { order_id: ids.order, channel: 'zalo_personal' } }, { 'idempotency-key': uuidv7(), 'x-action-source': 'assistant' }).then(json);
    expect(pv.status).toBe(202);
    expect(pv.body.data.preview).toMatchObject({ risk: 'send', changes: [{ entity: 'message', after: { kind: 'order_confirmation', channel: 'zalo_personal', to: 'Chị Lan' } }] });
    const r = ok(await act('order.send_confirmation', { order_id: ids.order, channel: 'zalo_personal' }));
    expect(r.conversation_id).toBe(zaloConv);
    const db = await tenant();
    const m = await db.message.findUniqueOrThrow({ where: { id: r.message_id } });
    expect(m.kind).toBe('file');
    expect((m.attachments as { mime: string }[])[0]!.mime).toBe('application/pdf');
    expect(await db.outboxMessage.count({ where: { messageId: m.id } })).toBe(1);
    expect(await db.outboxEvent.count({ where: { topic: 'order.confirmation_sent' } })).toBe(1);
    expect(await db.timelineEvent.count({ where: { contactId: lan, type: 'order', refId: ids.order, summary: { contains: 'xác nhận đơn' } } })).toBe(1);
  }, 180_000);

  it('receipt.send: khoản thu đã xác nhận → PDF phiếu thu (dùng chung bản đóng băng) vào hội thoại; khoản chưa có phiếu → 404 / 409', async () => {
    const pay = ok(await act('invoice.record_payment', { invoice_id: ids.inv, amount: '2500000', method: 'cash' }));
    const r = ok(await act('receipt.send', { payment_id: pay.payment_id }));
    expect(r.receipt_code).toMatch(/^PT-/);
    expect(r.conversation_id).toBe(zaloConv);
    const db = await tenant();
    const p = await db.customerPayment.findUniqueOrThrow({ where: { id: pay.payment_id } });
    const m = await db.message.findUniqueOrThrow({ where: { id: r.message_id } });
    expect((m.attachments as { url: string }[])[0]!.url).toContain(p.receiptFileId!);
    // Ràng buộc bất biến (TIP-014b): payload outbox mang file_id + sha256 của bản đóng băng; dòng tin (DTO) không lộ ràng buộc.
    const ob = await db.outboxMessage.findFirstOrThrow({ where: { messageId: m.id } });
    const f = await db.file.findUniqueOrThrow({ where: { id: p.receiptFileId! } });
    expect((ob.payload as { attachments: unknown[] }).attachments[0]).toMatchObject({ fileId: f.id, sha256: f.sha256 });
    expect((m.attachments as object[])[0]).not.toHaveProperty('sha256');
    const again = await call(h, `/invoices/receipts/${pay.payment_id}/pdf`);
    expect(Buffer.from(await again.arrayBuffer()).length).toBe(Number((await db.file.findUniqueOrThrow({ where: { id: p.receiptFileId! } })).size));
    expect((await act('receipt.send', { payment_id: uuidv7() })).status).toBe(404);
  }, 180_000);
});

describe('báo giá dạng ảnh', () => {
  it('format image qua Zalo → mỗi trang một PNG từ cùng PDF đóng băng; webchat kèm link; quote.send PDF mặc định không đổi', async () => {
    const items = Array.from({ length: 40 }, (_, k) => ({ name: `Dịch vụ chăm sóc số ${k + 1}`, qty: 1, unit_price: '100000', tax_rate: 0 }));
    const q = ok(await act('quote.create', { contact_id: lan, items })).quote_id;
    ok(await act('quote.send', { quote_id: q, channel: 'zalo_personal', format: 'image' }));
    const db = await tenant();
    const quote = await db.quote.findUniqueOrThrow({ where: { id: q } });
    const pdf = Buffer.from(await (await call(h, `/quotes/${q}/pdf`)).arrayBuffer());
    const pages = await h.app.get(DocRenderer, { strict: false }).pdfPages(pdf);
    expect(pages.length).toBeGreaterThan(1);
    const m = await lastOut(zaloConv);
    expect(m.kind).toBe('image');
    const atts = m.attachments as { mime: string; name: string }[];
    expect(atts).toHaveLength(pages.length);
    expect(atts.map((a) => a.name)).toEqual(pages.map((_, k) => expect.stringContaining(`-trang-${k + 1}.png`)));
    expect(atts.every((a) => a.mime === 'image/png')).toBe(true);
    expect(quote.fileId).toBeTruthy();
    const q2 = ok(await act('quote.create', { contact_id: lan, items: items.slice(0, 2) })).quote_id;
    ok(await act('quote.send', { quote_id: q2, channel: 'webchat' }));
    const w = await lastOut(webConv);
    expect(w.kind).toBe('file');
    expect(tokenOf(w.body)).toBeTruthy();
  }, 300_000);
});

// Chứng từ đề nghị thanh toán + phiếu thu (templates.md §2–3, §6): DocData dựng từ bản ghi (số tiền, hạn, tài khoản nhận + nội dung CK),
// render bằng DocRenderer theo mẫu mặc định của loại `payment_request` / `receipt`; dòng "không thay thế hoá đơn GTGT" luôn có
// (renderRich tự chèn). PDF đề nghị đóng băng lúc gửi (`invoice.file_id`); phiếu thu render khi tải lần đầu rồi giữ (`receipt_file_id`).
import type { TenantDb } from '@appchat/db';
import { AppError, createFmt, interpolate, invoiceTransferCode, serverMessages, vndWords, type DocData } from '@appchat/shared';
import { businessData } from '../../../documents/public';
import type { QuoteDocDeps } from '../../quotes/services/quote-doc';
import type { InvoiceRecord } from '../invoice-access';
import { invoiceQrOf, pngDataUri, qrPng } from './invoice-qr';

type Db = Pick<TenantDb, 'contact' | 'docTemplate' | 'file' | 'paymentAccount' | 'order'>;
type PaymentRow = { amount: bigint; method: string; receiptCode: string | null; paidAt: Date; reference: string };

async function base(db: Db, d: QuoteDocDeps, ws: string, contactId: string) {
  const [{ business, locale, timeZone }, contact, account] = await Promise.all([
    businessData(d.platform, ws),
    db.contact.findUnique({ where: { id: contactId }, select: { name: true, taxCode: true, address: true, phone: true, email: true } }),
    db.paymentAccount.findUnique({ where: { id: 1 } }),
  ]);
  const fmt = createFmt({ locale, timeZone });
  const bank = account ? `${account.accountNo} · ${account.bank} · ${account.accountName}` : '';
  return {
    account,
    locale,
    fmt,
    business: { ...business, bank_account: bank } as Record<string, string>,
    customer: { name: contact?.name ?? '', tax_code: contact?.taxCode ?? '', address: contact?.address ?? '', phone: contact?.phone ?? '', email: contact?.email ?? '', representative: '' },
  };
}

const item = (no: number, name: string, amount: string) => ({ no: String(no), name, unit: '', qty: '1', price: amount, discount: '', tax_rate: '', amount });

export async function invoiceDocData(db: Db, d: QuoteDocDeps, ws: string, i: InvoiceRecord) {
  const b = await base(db, d, ws, i.contactId);
  const m = serverMessages(b.locale).sales.invoice;
  const order = i.orderId ? await db.order.findUnique({ where: { id: i.orderId }, select: { code: true } }) : null;
  const left = i.amount - i.paidAmount;
  const qr = invoiceQrOf(i, b.account);
  const name = i.title || (order ? interpolate(m.forOrder, { code: order.code }) : m.kind[i.kind]);
  const data: DocData = {
    business: b.business,
    customer: b.customer,
    doc: { code: i.code, date: b.fmt.date(i.sentAt ?? i.createdAt), valid_until: b.fmt.date(i.dueDate), owner: await d.ownerName(i.ownerUserId) },
    items: [item(1, name, b.fmt.money(String(i.amount)))],
    totals: { subtotal: b.fmt.money(String(i.amount)), discount: b.fmt.money('0'), vat: '', total: b.fmt.money(String(left)), total_words: vndWords(String(left), b.locale) },
    contract: {},
    // Ảnh VietQR thật (TIP-032b P2) cùng payload với màn chi tiết / GET /invoices/:id/qr — mẫu rich chèn sau dòng VietQR.
    payment: {
      vietqr: b.business.bank_account ? interpolate(m.qrLine, { amount: b.fmt.money(String(left)), code: invoiceTransferCode(i.code) }) : '',
      transfer_note: invoiceTransferCode(i.code),
      vietqr_img: qr ? pngDataUri(await qrPng(qr.payload)) : '',
    },
    signatures: { seller: b.business.representative ?? '', buyer: b.customer.name },
  };
  return { data, locale: b.locale, business: b.business, fmt: b.fmt, qr };
}

export async function receiptDocData(db: Db, d: QuoteDocDeps, ws: string, i: InvoiceRecord, p: PaymentRow) {
  const b = await base(db, d, ws, i.contactId);
  const m = serverMessages(b.locale).sales.invoice;
  const amount = b.fmt.money(String(p.amount));
  const data: DocData = {
    business: b.business,
    customer: b.customer,
    doc: { code: p.receiptCode ?? '', date: b.fmt.date(p.paidAt), valid_until: '', owner: await d.ownerName(i.ownerUserId) },
    items: [item(1, interpolate(m.receiptFor, { code: i.code, method: m.method[p.method as keyof typeof m.method] ?? p.method }), amount)],
    totals: { subtotal: amount, discount: b.fmt.money('0'), vat: '', total: amount, total_words: vndWords(String(p.amount), b.locale) },
    contract: {},
    payment: { vietqr: '', transfer_note: p.reference },
    signatures: { seller: b.business.representative ?? '', buyer: b.customer.name },
  };
  return { data, locale: b.locale };
}

/** PDF theo mẫu mặc định của loại. */
export async function renderDocPdf(db: Db, d: QuoteDocDeps, kind: 'payment_request' | 'receipt', data: DocData, locale: string): Promise<Buffer> {
  if (!d.renderer) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '028' }, 'DocRenderer chưa cấu hình');
  const t = await db.docTemplate.findFirst({ where: { kind, isDefault: true, deletedAt: null } });
  if (!t) throw new AppError('INVALID_STATE', 409, { template_id: 'missing' });
  return d.renderer.pdf(db, { kind: t.kind, name: t.name, source: t.source, bodyHtml: t.bodyHtml, docxFileId: t.docxFileId, fieldMap: t.fieldMap }, data, locale);
}

/** Lưu PDF thành tệp chứng từ (chưa xác nhận — action xác nhận trong transaction của mình). */
export async function savePdf(db: Db, d: QuoteDocDeps, ws: string, name: string, pdf: Buffer, uploadedBy: string | null) {
  if (!d.files) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '020' }, 'FilesService chưa cấu hình');
  const f = await d.files.upload(db, ws, { name, mime: 'application/pdf', body: pdf, purpose: 'document', uploadedBy });
  return { fileId: f.id, name };
}

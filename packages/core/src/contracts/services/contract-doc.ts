// Chứng từ hợp đồng (templates.md §2–3, §7; COMMERCE §9): DocData dựng từ bản ghi (giá trị, hiệu lực, dòng hàng của báo giá nguồn
// nếu có); PDF nội dung render bằng DocRenderer theo mẫu hợp đồng mặc định (hoặc mẫu ghi trên hợp đồng). Lúc Owner "Duyệt & ký" nội dung
// được đóng băng (`file_id` + `file_sha256`) — sửa mẫu sau đó không đổi chứng từ. Khách ký xong: bản cuối = PDF đóng băng + trang chữ
// ký hai bên + trang chứng nhận (`contract-sign-pdf.ts`).
import type { TenantDb } from '@appchat/db';
import { AppError, createFmt, htmlPage, interpolate, quoteTotals, serverMessages, vndWords, type DocData, type Discount } from '@appchat/shared';
import { businessData, pickContractTemplate, type ContractKind } from '../../documents/public';
import type { ContractRecord } from '../contract-access';
import type { ContractDeps } from './contract-deps';
import { mergePdfs } from './contract-sign-pdf';
import { keptHtml } from '../files/suggestions';

type Db = Pick<TenantDb, 'quoteItem' | 'quote' | 'contact' | 'product' | 'docTemplate' | 'file'>;

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

export async function contractDocData(db: Db, d: ContractDeps, ws: string, c: ContractRecord) {
  const { business, locale, timeZone } = await businessData(d.need('platform'), ws);
  const fmt = createFmt({ locale, timeZone });
  const m = serverMessages(locale).sales.contract;
  const contact = await db.contact.findUnique({ where: { id: c.contactId }, select: { name: true, taxCode: true, address: true, phone: true, email: true } });
  // Dòng hàng: từ báo giá nguồn (→ Hợp đồng); không có thì một dòng = tên dịch vụ × giá trị.
  const rows = c.quoteId ? await db.quoteItem.findMany({ where: { quoteId: c.quoteId }, orderBy: { sort: 'asc' } }) : [];
  const quote = c.quoteId ? await db.quote.findUnique({ where: { id: c.quoteId }, select: { headerDiscount: true } }) : null;
  const lines = rows.map((r) => ({ name: r.variant ? `${r.name} (${r.variant})` : r.name, qty: Number(r.qty), unit_price: String(r.unitPrice), tax_rate: r.taxRate, discount: (r.discount as Discount | null) ?? null }));
  const t = lines.length ? quoteTotals(lines, (quote?.headerDiscount as Discount | null) ?? null) : null;
  const value = String(c.value);
  const data: DocData = {
    business,
    customer: { name: contact?.name ?? '', tax_code: contact?.taxCode ?? '', address: contact?.address ?? '', phone: contact?.phone ?? '', email: contact?.email ?? '', representative: contact?.name ?? '' },
    doc: { code: c.number || c.code, date: fmt.date(c.signedDate ?? c.createdAt), valid_until: c.endDate ? fmt.date(c.endDate) : '', owner: await d.ownerName(c.ownerUserId) },
    items: lines.length
      ? lines.map((l, i) => ({ no: String(i + 1), name: l.name, unit: '', qty: fmt.number(l.qty), price: fmt.money(l.unit_price), discount: '', tax_rate: `${l.tax_rate}%`, amount: fmt.money(t!.lines[i]!.net) }))
      : [{ no: '1', name: c.title || m.kind[c.kind], unit: '', qty: '1', price: fmt.money(value), discount: '', tax_rate: '', amount: fmt.money(value) }],
    totals: { subtotal: fmt.money(t?.subtotal ?? value), discount: fmt.money(t?.discount_total ?? '0'), vat: fmt.money(t?.tax_total ?? '0'), total: fmt.money(value), total_words: vndWords(value, locale) },
    contract: { kind: m.kind[c.kind], value: fmt.money(value), start: c.startDate ? fmt.date(iso(c.startDate)) : '', end: c.endDate ? fmt.date(iso(c.endDate)) : '' },
    payment: { vietqr: '', transfer_note: c.code },
    signatures: { seller: business.representative ?? '', buyer: contact?.name ?? '' },
  };
  return { data, locale, timeZone, fmt, business, contact };
}

/** PDF nội dung hợp đồng theo mẫu (ghi trên hợp đồng → mặc định loại contract). */
export async function renderContractPdf(db: Db, d: ContractDeps, ws: string, c: ContractRecord) {
  if (!d.renderer) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '028' }, 'DocRenderer chưa cấu hình');
  // Mẫu ghi trên hợp đồng (cả khi đã xoá mềm — nội dung đã chọn lúc tạo) → mẫu theo loại hợp đồng → mặc định chung (TIP-030b spec 8).
  const picked = c.templateId ? null : await pickContractTemplate(db, c.kind as ContractKind);
  const id = c.templateId ?? picked?.id;
  const t = id ? await db.docTemplate.findFirst({ where: { id } }) : null;
  if (!t) throw new AppError('INVALID_STATE', 409, { template_id: 'missing' });
  const doc = await contractDocData(db, d, ws, c);
  const body = await d.renderer.pdf(db, { kind: t.kind, name: t.name, source: t.source, bodyHtml: t.bodyHtml, docxFileId: t.docxFileId, fieldMap: t.fieldMap }, doc.data, doc.locale);
  // Điều khoản AI đã Giữ (TIP-030b spec 11): trang riêng sau thân mẫu — mẫu render nguyên văn, khối bỏ không xuất hiện.
  const kept = keptHtml(c.aiSuggestions, serverMessages(doc.locale).sales.contract.keptClauses);
  const pdf = kept ? await mergePdfs([body, await d.renderer.htmlPdf(htmlPage(c.code, kept))]) : body;
  return { pdf, doc, templateId: t.id, templateVersion: t.version };
}

/** Lưu PDF thành tệp chứng từ (`purpose document`) → `{ fileId, sha256, name }`. Tệp `confirmed` trong transaction của action. */
export async function storeContractPdf(db: Pick<TenantDb, 'file'>, d: ContractDeps, ws: string, c: ContractRecord, pdf: Buffer, uploadedBy: string | null, locale: string, signed: boolean) {
  const m = serverMessages(locale).sales.contract;
  const name = interpolate(signed ? m.signedPdfName : m.pdfName, { code: c.code });
  const f = await d.need('files').upload(db, ws, { name, mime: 'application/pdf', body: pdf, purpose: 'document', uploadedBy });
  return { fileId: f.id, sha256: f.sha256, name };
}

// Chứng từ báo giá (templates.md §2–3, §7): DocData dựng từ bản ghi có cấu trúc (giá, thuế, tổng — quoteTotals; mẫu chỉ trình bày),
// PDF render bằng DocRenderer theo mẫu báo giá mặc định (hoặc mẫu đã ghi trên báo giá). Lúc gửi PDF được lưu thành tệp
// (`purpose document`) và đóng băng `file_id + sha256` — sửa mẫu sau đó không đổi chứng từ đã phát hành.
import type { PlatformDb, TenantDb } from '@appchat/db';
import { AppError, createFmt, quoteTotals, serverMessages, interpolate, vndWords, type DocData, type Discount } from '@appchat/shared';
import type { FilesService } from '../../../kernel/files/files.service';
import { businessData, type DocRenderer } from '../../../documents/public';
import type { QuoteRecord } from '../quote-access';
import { linesOf } from './quote-write';

type Db = Pick<TenantDb, 'quoteItem' | 'contact' | 'product' | 'docTemplate' | 'file'>;

export interface QuoteDocDeps {
  platform: Pick<PlatformDb, 'businessProfile' | 'workspace'>;
  renderer: DocRenderer | null;
  files: FilesService | null;
  ownerName: (id: string | null) => Promise<string>;
}

export async function quoteDocData(db: Db, d: QuoteDocDeps, ws: string, q: QuoteRecord, validUntil: Date | null) {
  const { business, locale, timeZone } = await businessData(d.platform, ws);
  const fmt = createFmt({ locale, timeZone });
  const lines = await linesOf(db as never, q.id);
  const t = quoteTotals(lines, q.headerDiscount as Discount | null);
  const ids = lines.map((l) => l.product_id).filter((x): x is string => !!x);
  const [contact, units] = await Promise.all([
    db.contact.findUnique({ where: { id: q.contactId }, select: { name: true, taxCode: true, address: true, phone: true, email: true } }),
    ids.length ? db.product.findMany({ where: { id: { in: ids } }, select: { id: true, unit: true } }) : [],
  ]);
  const unitOf = new Map(units.map((u) => [u.id, u.unit]));
  const disc = (x: Discount | null | undefined) => (!x ? '' : x.kind === 'pct' ? `${x.value}%` : fmt.money(x.value));
  const data: DocData = {
    business,
    customer: { name: contact?.name ?? '', tax_code: contact?.taxCode ?? '', address: contact?.address ?? '', phone: contact?.phone ?? '', email: contact?.email ?? '', representative: '' },
    doc: { code: q.version > 1 ? `${q.code}-L${q.version}` : q.code, date: fmt.date(q.sentAt ?? q.createdAt), valid_until: validUntil ? fmt.date(validUntil) : '', owner: await d.ownerName(q.ownerUserId) },
    items: lines.map((l, i) => ({
      no: String(i + 1),
      name: l.variant ? `${l.name} (${l.variant})` : l.name,
      unit: (l.product_id && unitOf.get(l.product_id)) || '',
      qty: fmt.number(l.qty),
      price: fmt.money(l.unit_price),
      discount: disc(l.discount),
      tax_rate: `${l.tax_rate}%`,
      amount: fmt.money(t.lines[i]!.net),
    })),
    totals: { subtotal: fmt.money(t.subtotal), discount: fmt.money(t.discount_total), vat: fmt.money(t.tax_total), total: fmt.money(t.total), total_words: vndWords(t.total, locale) },
    contract: {},
    payment: { vietqr: '', transfer_note: q.code },
    signatures: { seller: business.representative ?? '', buyer: contact?.name ?? '' },
  };
  return { data, locale, timeZone, totals: t, fmt, business };
}

/** PDF của báo giá theo mẫu (ghi trên báo giá → mặc định loại quote) + dữ liệu đã điền (tin gửi khách dùng lại). */
export async function renderQuotePdf(db: Db, d: QuoteDocDeps, ws: string, q: QuoteRecord, validUntil: Date | null) {
  if (!d.renderer) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '028' }, 'DocRenderer chưa cấu hình');
  const byDefault = { kind: 'quote' as const, isDefault: true, deletedAt: null };
  const t = (q.templateId ? await db.docTemplate.findFirst({ where: { id: q.templateId } }) : null) ?? (await db.docTemplate.findFirst({ where: byDefault }));
  if (!t) throw new AppError('INVALID_STATE', 409, { template_id: 'missing' });
  const doc = await quoteDocData(db, d, ws, q, validUntil);
  const pdf = await d.renderer.pdf(db, { kind: t.kind, name: t.name, source: t.source, bodyHtml: t.bodyHtml, docxFileId: t.docxFileId, fieldMap: t.fieldMap }, doc.data, doc.locale);
  return { pdf, doc, templateId: t.id, templateVersion: t.version };
}

/** Lưu PDF đóng băng → `{ fileId, sha256, name }` (tệp `confirmed` trong transaction của action gửi; lỗi giữa chừng → tệp mồ côi chưa xác nhận). */
export async function freezeQuotePdf(db: Db, d: QuoteDocDeps, ws: string, q: QuoteRecord, pdf: Buffer, uploadedBy: string | null, locale: string) {
  if (!d.files) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '020' }, 'FilesService chưa cấu hình');
  const name = interpolate(serverMessages(locale).sales.quote.pdfName, { code: q.code, version: q.version });
  const f = await d.files.upload(db, ws, { name, mime: 'application/pdf', body: pdf, purpose: 'document', uploadedBy });
  return { fileId: f.id, sha256: f.sha256, name };
}

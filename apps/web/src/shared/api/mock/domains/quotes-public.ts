// Mock "Tải PDF" + trang xem báo giá công khai (TIP-029). Mock không có LibreOffice: PDF là trang HTML điền bằng renderRich với mẫu
// báo giá mặc định (cùng hàm của server). Token công khai ở mock = id báo giá (server: token ký HMAC); mở trang → `viewed`.
import { ApiRequestError, createFmt, htmlPage, quoteTotals, renderRich, vndWords, type DocData, type PublicQuote } from '@appchat/shared';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { MOCK_NOW, enrich, type Quote } from './quotes';

const fmt = createFmt({ locale: 'vi', timeZone: 'Asia/Ho_Chi_Minh' });
const BUSINESS = { legal_name: 'Spa Hoa Sen', tax_code: '0301234567', address: '12 Lê Lợi, Q1' };

const live = (db: MockDb, id: string) => db.quotes.quotes.find((q) => q.id === id && !q.deleted);

function docOf(q: Quote): DocData {
  const t = quoteTotals(q.items, q.header_discount);
  return {
    business: { ...BUSINESS, representative: 'Thùy Trâm', logo: '', bank_account: '' },
    customer: { name: q.contact_name, tax_code: '', address: '', phone: q.phone, email: '', representative: '' },
    doc: { code: q.code, date: fmt.date(q.sent_at ?? q.created_at), valid_until: fmt.date(enrich(q).valid_until), owner: q.owner_name },
    items: q.items.map((l, i) => ({
      no: String(i + 1),
      name: l.name,
      unit: '',
      qty: fmt.number(l.qty),
      price: fmt.money(l.unit_price),
      discount: !l.discount ? '' : l.discount.kind === 'pct' ? `${l.discount.value}%` : fmt.money(l.discount.value),
      tax_rate: `${l.tax_rate}%`,
      amount: fmt.money(t.lines[i]!.net),
    })),
    totals: { subtotal: fmt.money(t.subtotal), discount: fmt.money(t.discount_total), vat: fmt.money(t.tax_total), total: fmt.money(t.total), total_words: vndWords(t.total, 'vi') },
    contract: {},
    payment: { vietqr: '', transfer_note: q.code },
    signatures: { seller: 'Thùy Trâm', buyer: q.contact_name },
  };
}

/** GET /quotes/:id/pdf | /public/quotes/:token/pdf → HTML (mock). */
export function quotePdf(db: MockDb, path: string): string | null {
  const m = path.match(/^\/(?:public\/)?quotes\/([^/]+)\/pdf$/);
  const q = m ? live(db, m[1]!) : undefined;
  if (!q) return null;
  const tpl = db.docTemplates.list.find((t) => t.kind === 'quote' && t.is_default && !t.deleted && t.source === 'rich');
  return htmlPage(q.code, renderRich('quote', tpl?.body ?? '{{#items}}<p>{{name}} · {{amount}}</p>{{/items}}', docOf(q), ''));
}

export const quotesPublicRoute = (path: string): MockRoute | undefined => {
  const m = path.match(/^\/public\/quotes\/([^/]+)$/);
  if (!m) return undefined;
  return (db): PublicQuote => {
    const q = live(db, m[1]!);
    if (!q || !q.sent_at) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: m[1]! });
    if (!q.viewed_at) {
      q.viewed_at = MOCK_NOW;
      if (q.status === 'sent') q.status = 'viewed';
    }
    const d = docOf(q);
    const row = enrich(q);
    return {
      code: q.code,
      version: q.version,
      status: q.status,
      business: { name: BUSINESS.legal_name, tax_code: BUSINESS.tax_code, address: BUSINESS.address },
      customer: q.contact_name,
      items: q.items.map((l, i) => ({ name: l.name, variant: l.variant ?? '', qty: l.qty, unit_price: d.items[i]!.price, discount: d.items[i]!.discount, tax_rate: l.tax_rate, amount: d.items[i]!.amount })),
      subtotal: d.totals.subtotal!,
      discount_total: d.totals.discount!,
      tax_total: d.totals.vat!,
      total: d.totals.total!,
      total_words: d.totals.total_words!,
      valid_until: fmt.date(row.valid_until),
      payment_terms: q.payment_terms,
      gift: q.gift,
      expired: q.status === 'expired' || row.valid_until < MOCK_NOW,
      pdf: true,
    };
  };
};

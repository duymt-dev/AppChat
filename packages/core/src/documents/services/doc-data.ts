// Dữ liệu điền mẫu chứng từ (templates.md §3). `businessData` đọc hồ sơ DN (khai báo lúc onboarding — DB nền tảng). Bản xem trước
// mẫu (`sampleData`) dùng chứng từ minh hoạ có tiền tính bằng quoteTotals — chứng từ thật (báo giá / hợp đồng / đề nghị thanh toán —
// TIP-029 / 030 / 032) dựng DocData từ bản ghi có cấu trúc và gọi cùng `DocRenderer`.
import type { PlatformDb } from '@appchat/db';
import { createFmt, interpolate, quoteTotals, serverMessages, vndWords, type DocData, type DocKind } from '@appchat/shared';

export async function businessData(platform: Pick<PlatformDb, 'businessProfile' | 'workspace'>, ws: string): Promise<{ business: Record<string, string>; locale: string; timeZone: string }> {
  const [p, w] = await Promise.all([
    platform.businessProfile.findUnique({ where: { workspaceId: ws } }),
    platform.workspace.findUnique({ where: { id: ws }, select: { name: true, locale: true, timezone: true } }),
  ]);
  return {
    business: {
      legal_name: p?.legalName ?? w?.name ?? '',
      tax_code: p?.taxCode ?? '',
      address: p?.address ?? '',
      representative: p?.representative ?? '',
      logo: '',
      bank_account: '',
    },
    locale: w?.locale ?? 'vi',
    timeZone: w?.timezone ?? 'Asia/Ho_Chi_Minh',
  };
}

const CODE: Record<DocKind, string> = { quote: 'BG-0001', contract: 'HD-0001', payment_request: 'DNTT-0001', receipt: 'PT-0001' };
const DAY = 86_400_000;

/** Chứng từ minh hoạ cho xem trước mẫu: 2 dòng hàng, chiết khấu dòng 10%, thuế 8%. */
export function sampleData(kind: DocKind, business: Record<string, string>, o: { locale: string; timeZone: string; now: Date; owner: string }): DocData {
  const m = serverMessages(o.locale).documents.sample;
  const fmt = createFmt({ locale: o.locale, timeZone: o.timeZone });
  const lines = [
    { name: m.item1, unit: m.unit1, qty: 1, unit_price: '6500000', tax_rate: 8, discount: { kind: 'pct' as const, value: 10 } },
    { name: m.item2, unit: m.unit2, qty: 2, unit_price: '680000', tax_rate: 8, discount: null },
  ];
  const tot = quoteTotals(lines);
  const money = (v: string) => fmt.money(v);
  const code = CODE[kind];
  return {
    business: { ...business, bank_account: business.bank_account || '0123456789 · Vietcombank' },
    customer: { name: m.customer, tax_code: '0312345678', address: m.customerAddress, phone: '0901 234 567', email: 'khachhang@example.com', representative: m.representative },
    doc: { code, date: fmt.date(o.now), valid_until: fmt.date(o.now.getTime() + 15 * DAY), owner: o.owner || m.owner },
    items: lines.map((l, i) => ({
      no: String(i + 1),
      name: l.name,
      unit: l.unit,
      qty: fmt.number(l.qty),
      price: money(l.unit_price),
      discount: l.discount ? `${l.discount.value}%` : '',
      tax_rate: `${l.tax_rate}%`,
      amount: money(tot.lines[i]!.net),
    })),
    totals: { subtotal: money(tot.subtotal), discount: money(tot.discount_total), vat: money(tot.tax_total), total: money(tot.total), total_words: vndWords(tot.total, o.locale) },
    contract: { kind: m.contractKind, value: money(tot.total), start: fmt.date(o.now), end: fmt.date(o.now.getTime() + 180 * DAY) },
    payment: { vietqr: m.vietqr, transfer_note: interpolate(m.transferNote, { code }) },
    signatures: { seller: m.seller, buyer: m.buyer },
  };
}

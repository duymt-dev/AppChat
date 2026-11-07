// PDF xác nhận đơn (TIP-032b P2, COMMERCE §4): dòng hàng + giảm giá + thuế + tổng + đã thu / còn lại + trạng thái thanh toán, theo ngôn ngữ
// workspace. HTML dựng ở server (escape mọi chữ), chuyển PDF bằng DocRenderer.htmlPdf như trang chứng nhận ký — không theo mẫu người dùng
// (đơn không có loại mẫu trong templates.md). Dòng "không thay thế hoá đơn GTGT" luôn có.
import type { TenantDb } from '@appchat/db';
import { createFmt, htmlPage, interpolate, serverMessages } from '@appchat/shared';
import type { OrderRecord } from '../orders/order-access';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function orderConfirmationHtml(db: Pick<TenantDb, 'orderItem' | 'contact'>, o: OrderRecord, place: { locale: string; timeZone: string; business: string }): Promise<string> {
  const m = serverMessages(place.locale).sales.delivery.order;
  const fmt = createFmt(place);
  const [items, contact] = await Promise.all([
    db.orderItem.findMany({ where: { orderId: o.id }, orderBy: { sort: 'asc' } }),
    db.contact.findUnique({ where: { id: o.contactId }, select: { name: true, phone: true } }),
  ]);
  const money = (v: bigint) => esc(fmt.money(String(v)));
  const rows = items
    .map((it) => `<tr><td>${esc(it.name)}${it.variant ? ` · ${esc(it.variant)}` : ''}</td><td style="text-align:right">${it.qty}</td><td style="text-align:right">${money(it.unitPrice)}</td><td style="text-align:right">${money(it.lineTotal)}</td></tr>`)
    .join('');
  const left = o.total - o.paidTotal + o.refundedTotal;
  const sum = (label: string, v: string, bold = false) => `<tr><td colspan="3" style="text-align:right">${bold ? '<b>' : ''}${esc(label)}${bold ? '</b>' : ''}</td><td style="text-align:right">${bold ? '<b>' : ''}${v}${bold ? '</b>' : ''}</td></tr>`;
  const pay = (m.pay as Record<string, string>)[o.payStatus] ?? o.payStatus;
  const body =
    `<h2>${esc(interpolate(m.title, { code: o.code }))}</h2>` +
    `<p>${esc(place.business)}<br>${esc(m.date)}: ${esc(fmt.date(o.confirmedAt ?? o.createdAt))}<br>${esc(m.customer)}: ${esc(contact?.name ?? '')}${contact?.phone ? ` · ${esc(contact.phone)}` : ''}</p>` +
    `<table><tr><th>${esc(m.item)}</th><th>${esc(m.qty)}</th><th>${esc(m.price)}</th><th>${esc(m.amount)}</th></tr>${rows}` +
    (o.discountTotal > 0n ? sum(m.discount, `-${money(o.discountTotal)}`) : '') +
    (o.taxTotal > 0n ? sum(m.tax, money(o.taxTotal)) : '') +
    sum(m.total, money(o.total), true) +
    sum(m.paid, money(o.paidTotal - o.refundedTotal)) +
    sum(m.left, money(left < 0n ? 0n : left), true) +
    `</table><p>${esc(m.payStatus)}: <b>${esc(pay)}</b></p><p><i>${esc(m.notVat)}</i></p>`;
  return htmlPage(interpolate(m.title, { code: o.code }), body);
}

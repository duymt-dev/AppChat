// Seed suite `insights` (TIP-038 — Trợ lý `query_data`): trên workspace fixture `[ai-live]`, bổ sung phần thiếu, không xoá gì.
//   - Owner: một đơn 37.400.000đ (khách Phạm Thu Trang) đã xác nhận + đề nghị trả góp 12.600.000đ ĐÃ THU — đơn đặt ≠ thu thực trong tháng.
//   - Sales (scope own, dùng lại tài khoản của suite kênh): một khách + một đơn 4.200.000đ của chính mình. Tổng đơn của Owner là dấu
//     hiệu lộ scope nếu xuất hiện trong câu trả lời cho Sales.
// Số liệu chấm lại bằng `GET /insights/:metric` cùng tham số model dùng (insights-judge.ts) — seed chỉ cần có dữ liệu thật trong kỳ.
import { randomUUID } from 'node:crypto';
import { seedChannelSales } from './channel-seed.mjs';

export const IN_OWNER_ORDER = '37400000';
export const IN_OWNER_PAID = '12600000';
export const IN_SALES_ORDER = '4200000';
const IN_SALES_CONTACT = 'Khách số liệu Sales ai-live';

async function act(c, id, input) {
  const r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': randomUUID() });
  if (r.status >= 300) throw new Error(`${id} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.data.result;
}

/** Đơn đã xác nhận của khách với tổng đúng `total` (tìm lại theo khách + tổng — chạy lại không tạo thêm). */
async function order(c, contactId, total, name) {
  const list = (await c.req('GET', '/orders?limit=100')).body?.data ?? [];
  const found = list.find((o) => o.contact_id === contactId && o.total === total && o.status !== 'cancelled');
  if (found) return found.id;
  const o = await act(c, 'order.create', {
    contact_id: contactId,
    items: [{ name, qty: 1, unit_price: total, tax_rate: 0 }],
    note: 'ai-live insights',
  });
  await act(c, 'order.confirm', { order_id: o.order_id });
  return o.order_id;
}

export async function seedInsights(c, base, o) {
  const trang = base.contacts['Phạm Thu Trang'];
  const ownerOrder = await order(c, trang.id, IN_OWNER_ORDER, 'Gói liệu trình năm');
  const invs = (await c.req('GET', `/invoices?limit=100`)).body?.data ?? [];
  if (!invs.some((i) => i.order_id === ownerOrder && i.status !== 'void')) {
    const i = await act(c, 'invoice.create', {
      order_id: ownerOrder,
      contact_id: trang.id,
      kind: 'installment',
      amount: IN_OWNER_PAID,
    });
    await act(c, 'invoice.record_payment', {
      invoice_id: i.invoice_id,
      amount: IN_OWNER_PAID,
      method: 'bank_transfer',
    });
  }

  const sales = await seedChannelSales(c, o);
  const mine = (
    (await sales.req('GET', `/contacts?q=${encodeURIComponent(IN_SALES_CONTACT)}&limit=5`)).body?.data ?? []
  ).find((x) => x.name === IN_SALES_CONTACT || x.full_name === IN_SALES_CONTACT);
  const contactId =
    mine?.id ??
    (await act(sales, 'contact.create', { full_name: IN_SALES_CONTACT, phone: '0903000777' })).contact_id;
  await order(sales, contactId, IN_SALES_ORDER, 'Gói chăm sóc tháng');
  return { ...base, insights: { owner_booked: IN_OWNER_ORDER, owner_collected: IN_OWNER_PAID }, sales };
}

// Ma trận contact.get_360 (TIP-023b R2): happy (số đếm báo giá / đơn / đề nghị thanh toán / ticket mở + lịch hẹn kế tiếp + trí nhớ khách TIP-015b) · mỗi số đếm áp
// scope + quyền của người gọi: cs (crm all, sales none, không quote.view) thấy khách nhưng đếm bán hàng = 0 — không lộ chứng từ người khác
// chỉ vì cùng khách · sales own → 404 với khách người khác · nguồn assistant. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;

beforeAll(async () => {
  m = await matrix('contact.get_360');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan 360', phone: '0909340001' })).contact_id;
  const p = (await m.seed('product.create', { name: 'Gói 360', type: 'service', price: '500000', tax_rate: 8 })).product_id;
  const item = { product_id: p, name: 'Gói 360', qty: 1, unit_price: '500000', tax_rate: 8 };
  await m.seed('quote.create', { contact_id: lan, items: [item] });
  await m.seed('order.create', { contact_id: lan, items: [item] });
  await m.seed('ticket.create', { title: 'Khách hỏi lịch', contact_id: lan, channel: 'webchat', category: 'Khác', priority: 'medium' });
  await m.seed('contact.remember', { contact_id: lan, fact: 'Dị ứng tinh dầu sả' });
}, 120_000);
afterAll(() => m?.close());

describe('contact.get_360', () => {
  it('happy (owner): hồ sơ + số đếm', async () => {
    const r = await m.act({ contact_id: lan });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ id: lan, name: 'Chị Lan 360', open_quotes: 1, open_orders: 1, unpaid_invoices: 0, open_tickets: 1, next_appointment: null, memory: ['Dị ứng tinh dầu sả'] });
  });

  it('cs: thấy khách (crm all) nhưng không quyền / scope bán hàng → đếm bán hàng = 0', async () => {
    const r = await m.act({ contact_id: lan }, m.cs);
    expect(r.status).toBe(200);
    expect(r.body.data.result).toMatchObject({ open_quotes: 0, open_orders: 0, unpaid_invoices: 0 });
  });

  it('scope: sales own đọc khách người khác → 404', async () => {
    expect((await m.act({ contact_id: lan }, m.sales)).status).toBe(404);
  });

  it('nguồn assistant: chạy ngay', async () => {
    expect((await m.act({ contact_id: lan }, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});

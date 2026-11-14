// Ma trận order.get (TIP-023b R2): happy (projection an toàn, uiTarget mở drawer) · 403 (cs) · scope (sales own đọc bản ghi người khác →
// 404 như không tồn tại) · id lạ → 404 · nguồn assistant chạy ngay. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let rec: { order_id: string; code: string };

beforeAll(async () => {
  m = await matrix('order.get');
  const lan = (await m.seed('contact.create', { full_name: 'Chị Lan xem order', phone: '0909320001' })).contact_id;
  const p = (await m.seed('product.create', { name: 'Gói xem order', type: 'service', price: '500000', tax_rate: 8 })).product_id;
  const item = { product_id: p, name: 'Gói xem order', qty: 1, unit_price: '500000', tax_rate: 8 };
  void item;
  rec = (await m.seed('order.create', { contact_id: lan, items: [item] }));
}, 120_000);
afterAll(() => m?.close());

describe('order.get', () => {
  it('happy: đúng bản ghi, tiền string VND, mở drawer, không trả tệp / link / token', async () => {
    const r = await m.act({ order_id: rec.order_id });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ id: rec.order_id, code: rec.code, contact: 'Chị Lan xem order' });
    expect(JSON.stringify(r.body.data.result)).not.toMatch(/token|file_id|sign_link|account_number/);
    expect(r.body.data.ui_target).toEqual({ type: 'open', entity: 'order', id: rec.order_id, view: 'drawer' });
  });

  it('403: cs không có order.view', async () => {
    expect((await m.act({ order_id: rec.order_id }, m.cs)).status).toBe(403);
  });

  it('scope: sales own → 404; id lạ → 404', async () => {
    const r = await m.act({ order_id: rec.order_id }, m.sales);
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe('NOT_FOUND');
    expect((await m.act({ order_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('nguồn assistant: chạy ngay', async () => {
    expect((await m.act({ order_id: rec.order_id }, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});

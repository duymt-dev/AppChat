// Ma trận quote.get (TIP-023b R2): happy (dòng hàng + tổng string VND, uiTarget mở drawer) · 403 (cs) · scope (sales own đọc báo giá người
// khác → 404 như không tồn tại) · id lạ → 404 · nguồn assistant chạy ngay. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let q: { quote_id: string; code: string };
let p: string;

beforeAll(async () => {
  m = await matrix('quote.get');
  const lan = (await m.seed('contact.create', { full_name: 'Chị Lan Xem', phone: '0909300011' })).contact_id;
  p = (await m.seed('product.create', { name: 'Gói xem', type: 'service', price: '1000000', tax_rate: 10 })).product_id;
  q = await m.seed('quote.create', { contact_id: lan, items: [{ product_id: p, name: 'Gói xem', qty: 2, unit_price: '1000000', tax_rate: 10 }] });
}, 120_000);
afterAll(() => m?.close());

describe('quote.get', () => {
  it('happy: dòng hàng, tổng, mở drawer', async () => {
    const r = await m.act({ quote_id: q.quote_id });
    expect(r.status).toBe(200);
    expect(r.body.data.result).toMatchObject({ id: q.quote_id, code: q.code, status: 'draft', subtotal: '2000000', tax_total: '200000', total: '2200000', items: [{ product_id: p, name: 'Gói xem', qty: 2, unit_price: '1000000', tax_rate: 10, amount: '2000000' }] });
    expect(r.body.data.ui_target).toEqual({ type: 'open', entity: 'quote', id: q.quote_id, view: 'drawer' });
  });

  it('403: cs không có quote.view', async () => {
    expect((await m.act({ quote_id: q.quote_id }, m.cs)).status).toBe(403);
  });

  it('scope: sales own đọc báo giá người khác → 404 (không xác nhận tồn tại); id lạ → 404', async () => {
    const r = await m.act({ quote_id: q.quote_id }, m.sales);
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe('NOT_FOUND');
    expect((await m.act({ quote_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('nguồn assistant: chạy ngay', async () => {
    expect((await m.act({ quote_id: q.quote_id }, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});

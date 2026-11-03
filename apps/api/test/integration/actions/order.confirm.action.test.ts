// Ma trận order.confirm (TIP-023b): xác nhận → trạng thái + số dòng trừ kho + sản phẩm xuống dưới ngưỡng (cảnh báo, không chặn); undo về
// mới + hoàn kho. 403 cs · sales own → 404 · id lạ 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let serum: string;
let o: { order_id: string; code: string };
const O = () => o.order_id;

beforeAll(async () => {
  m = await matrix('order.confirm');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan ĐH', phone: '0909490001' })).contact_id;
  serum = (await m.seed('product.create', { name: 'Serum B5', type: 'physical', price: '600000', tax_rate: 10, stock: 3, low_stock_threshold: 2 })).product_id;
  o = await m.seed('order.create', { contact_id: lan, items: [{ product_id: serum, name: 'Serum B5', qty: 2, unit_price: '600000', tax_rate: 10 }] });
}, 120_000);
afterAll(() => m?.close());

describe('order.confirm', () => {
  it('403 thiếu quyền · ngoài scope (sales own) → 404 · id lạ → 404', async () => {
    expect((await m.act({ order_id: O() }, m.cs)).status).toBe(403);
    expect((await m.act({ order_id: O() }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ order_id: O() }, order_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ order_id: O() });
    expect(preview).toEqual({ summary: `${o.code} · Chị Lan ĐH · 1.320.000₫`, risk: 'write', changes: [{ entity: 'order', id: O(), before: { status: 'new', stock_lines: 0 }, after: { status: 'processing', stock_lines: 1 } }], warnings: ['low_stock:Serum B5'] });
    // Output ActionDef (`st`) không kèm low_stock — kiểm tồn thật dưới ngưỡng (1 ≤ 2).
    expect(done.body.data.result.status).toBe('processing');
    const db = await m.db();
    expect((await db.product.findUniqueOrThrow({ where: { id: serum } })).stock).toBe(1);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await db.product.findUniqueOrThrow({ where: { id: serum } })).stock).toBe(3);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

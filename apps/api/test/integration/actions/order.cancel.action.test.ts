// Ma trận order.cancel (TIP-023b): huỷ (risk money) → trạng thái + lý do + hoàn kho + đã thu → yêu cầu hoàn tiền chờ duyệt. Huỷ không hoàn
// tác (ActionDef không khai undo). 403 cs (không có order.cancel) · sales own → 404 · id lạ 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let serum: string;
let o: { order_id: string; code: string };
const O = () => o.order_id;

beforeAll(async () => {
  m = await matrix('order.cancel');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan ĐH', phone: '0909490001' })).contact_id;
  serum = (await m.seed('product.create', { name: 'Serum B5', type: 'physical', price: '600000', tax_rate: 10, stock: 3, low_stock_threshold: 2 })).product_id;
  o = await m.seed('order.create', { contact_id: lan, items: [{ product_id: serum, name: 'Serum B5', qty: 2, unit_price: '600000', tax_rate: 10 }] });
  await m.seed('order.confirm', { order_id: o.order_id });
}, 120_000);
afterAll(() => m?.close());

describe('order.cancel', () => {
  it('403 thiếu quyền · ngoài scope (sales own) → 404 · id lạ → 404', async () => {
    expect((await m.act({ order_id: O(), reason: 'x' }, m.cs)).status).toBe(403);
    expect((await m.act({ order_id: O(), reason: 'x' }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ order_id: O(), reason: 'x' }, order_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ order_id: O(), reason: ' Khách đổi ý ' });
    expect(preview).toEqual({ summary: `${o.code} · Chị Lan ĐH · 1.320.000₫`, risk: 'money', changes: [{ entity: 'order', id: O(), before: { status: 'processing', reason: null }, after: { status: 'cancelled', reason: 'Khách đổi ý' } }], warnings: ['restock'] });
    expect(done.body.data.result).toMatchObject({ status: 'cancelled', refund_requested: false });
    expect((await (await m.db()).product.findUniqueOrThrow({ where: { id: serum } })).stock).toBe(3);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

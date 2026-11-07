// Ma trận order.update_shipping (TIP-023b): vận chuyển → trước / sau từng trường đổi; đơn đã huỷ → 409 ở preview; undo trả vận chuyển cũ.
// 403 cs · sales own → 404 · id lạ 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let serum: string;
let o: { order_id: string; code: string };
const O = () => o.order_id;
const row = async () => (await m.db()).order.findUniqueOrThrow({ where: { id: O() } });

beforeAll(async () => {
  m = await matrix('order.update_shipping');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan ĐH', phone: '0909490001' })).contact_id;
  serum = (await m.seed('product.create', { name: 'Serum B5', type: 'physical', price: '600000', tax_rate: 10, stock: 3, low_stock_threshold: 2 })).product_id;
  o = await m.seed('order.create', { contact_id: lan, items: [{ product_id: serum, name: 'Serum B5', qty: 2, unit_price: '600000', tax_rate: 10 }] });
}, 120_000);
afterAll(() => m?.close());

describe('order.update_shipping', () => {
  it('403 thiếu quyền · ngoài scope (sales own) → 404 · id lạ → 404', async () => {
    expect((await m.act({ order_id: O(), shipping: { carrier: 'GHN' } }, m.cs)).status).toBe(403);
    expect((await m.act({ order_id: O(), shipping: { carrier: 'GHN' } }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ order_id: O(), shipping: { carrier: 'GHN' } }, order_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ order_id: O(), shipping: { carrier: ' GHN ', tracking: 'GHN123' } });
    expect(preview).toEqual({ summary: `${o.code} · Chị Lan ĐH`, risk: 'write', changes: [{ entity: 'order_shipping', id: O(), before: { carrier: '', tracking: '' }, after: { carrier: 'GHN', tracking: 'GHN123' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await row()).shipping).toMatchObject({ carrier: 'GHN', tracking: 'GHN123' });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await row()).shipping).toMatchObject({ carrier: '', tracking: '' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

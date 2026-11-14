// Ma trận order.set_deposit (TIP-023b): đặt cọc → cọc + trạng thái thanh toán trước / sau; vượt tổng → 422 ở preview; undo trả cọc cũ.
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
  m = await matrix('order.set_deposit');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan ĐH', phone: '0909490001' })).contact_id;
  serum = (await m.seed('product.create', { name: 'Serum B5', type: 'physical', price: '600000', tax_rate: 10, stock: 3, low_stock_threshold: 2 })).product_id;
  o = await m.seed('order.create', { contact_id: lan, items: [{ product_id: serum, name: 'Serum B5', qty: 2, unit_price: '600000', tax_rate: 10 }] });
}, 120_000);
afterAll(() => m?.close());

describe('order.set_deposit', () => {
  it('403 thiếu quyền · ngoài scope (sales own) → 404 · id lạ → 404', async () => {
    expect((await m.act({ order_id: O(), deposit_amount: '1' }, m.cs)).status).toBe(403);
    expect((await m.act({ order_id: O(), deposit_amount: '1' }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ order_id: O(), deposit_amount: '1' }, order_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo; vượt tổng → 422', async () => {
    const before = (await row()).payStatus;
    const { preview, done } = await m.confirm({ order_id: O(), deposit_amount: '300000' });
    expect(preview).toMatchObject({ summary: `${o.code} · Chị Lan ĐH`, risk: 'write', changes: [{ entity: 'order', id: O(), before: { deposit: '0', pay_status: before }, after: { deposit: '300000' } }] });
    expect(preview.changes[0].after.pay_status).toBe(done.body.data.result.pay_status);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await row()).depositAmount).toBe(0n);
    expect((await m.act({ order_id: O(), deposit_amount: '9999999' }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ deposit_amount: 'over_total' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

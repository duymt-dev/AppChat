// Ma trận order.complete (TIP-023b): hoàn tất (risk money) → trạng thái + tổng + điểm dự tính (net trước VAT / 10.000 × hệ số hạng);
// mới (chưa xác nhận) → 409 ở preview; undo về đang xử lý. 403 cs · sales own → 404 · id lạ 404.
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
  m = await matrix('order.complete');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan ĐH', phone: '0909490001' })).contact_id;
  serum = (await m.seed('product.create', { name: 'Serum B5', type: 'physical', price: '600000', tax_rate: 10, stock: 3, low_stock_threshold: 2 })).product_id;
  o = await m.seed('order.create', { contact_id: lan, items: [{ product_id: serum, name: 'Serum B5', qty: 2, unit_price: '600000', tax_rate: 10 }] });
}, 120_000);
afterAll(() => m?.close());

describe('order.complete', () => {
  it('chưa xác nhận → preview 409', async () => {
    expect((await m.act({ order_id: O() }, undefined, { 'x-action-source': 'assistant' })).body.error.code).toBe('INVALID_TRANSITION');
  });

  it('403 thiếu quyền · ngoài scope (sales own) → 404 · id lạ → 404', async () => {
    expect((await m.act({ order_id: O() }, m.cs)).status).toBe(403);
    expect((await m.act({ order_id: O() }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ order_id: O() }, order_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo (hạng gold × hệ số)', async () => {
    await m.seed('order.confirm', { order_id: O() });
    await (await m.db()).contact.update({ where: { id: lan }, data: { tierKey: 'gold' } });
    const { preview, done } = await m.confirm({ order_id: O() });
    expect(preview).toMatchObject({ summary: `${o.code} · Chị Lan ĐH · 1.320.000₫`, risk: 'money', changes: [{ entity: 'order', id: O(), before: { status: 'processing', points: 0 }, after: { status: 'completed', total: '1320000' } }] });
    expect(preview.changes[0].after.points).toBe(done.body.data.result.points);
    expect(done.body.data.result.points).toBeGreaterThan(120);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await row()).status).toBe('processing');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

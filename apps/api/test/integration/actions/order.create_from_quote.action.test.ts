// Ma trận order.create_from_quote (TIP-023b): từ báo giá đã chốt → khách + dòng của báo giá + tổng + mã báo giá; chưa chốt → 409; đã có đơn →
// preview báo `existing:<mã>`. 403 cs · id lạ 404 · undo xoá đơn + gỡ liên kết báo giá.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let serum: string;
let quote: { quote_id: string; code: string };

beforeAll(async () => {
  m = await matrix('order.create_from_quote');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan ĐH', phone: '0909490001' })).contact_id;
  serum = (await m.seed('product.create', { name: 'Serum B5', type: 'physical', price: '600000', tax_rate: 10, stock: 3, low_stock_threshold: 2 })).product_id;
  await m.seed('order.create', { contact_id: lan, items: [{ product_id: serum, name: 'Serum B5', qty: 2, unit_price: '600000', tax_rate: 10 }] });
  quote = await m.seed('quote.create', { contact_id: lan, items: [{ product_id: serum, name: 'Serum B5', qty: 1, unit_price: '600000', tax_rate: 10 }] });
}, 120_000);
afterAll(() => m?.close());

describe('order.create_from_quote', () => {
  it('403 cs · id lạ 404 · báo giá chưa chốt → 409', async () => {
    expect((await m.act({ quote_id: quote.quote_id }, m.cs)).status).toBe(403);
    expect((await m.act({ quote_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    expect((await m.act({ quote_id: quote.quote_id }, undefined, { 'x-action-source': 'assistant' })).body.error.code).toBe('INVALID_TRANSITION');
  });

  it('preview Trợ lý → xác nhận → lần hai báo đơn sẵn có → undo', async () => {
    await (await m.db()).quote.update({ where: { id: quote.quote_id }, data: { status: 'accepted' } });
    const { preview, done } = await m.confirm({ quote_id: quote.quote_id });
    expect(preview).toEqual({ summary: 'Chị Lan ĐH · 660.000₫', risk: 'write', changes: [{ entity: 'order', after: { contact: 'Chị Lan ĐH', owner: 'Chủ Spa', source: 'quote', from: `${quote.code} · L1`, items: 1, total: '660000' } }] });
    const code = done.body.data.result.code;
    expect((await m.act({ quote_id: quote.quote_id }, undefined, { 'x-action-source': 'assistant' })).body.data.preview).toEqual({ summary: `${code} · Chị Lan ĐH`, risk: 'write', changes: [], warnings: [`existing:${code}`] });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).quote.findUniqueOrThrow({ where: { id: quote.quote_id } })).orderId).toBeNull();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

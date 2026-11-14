// Ma trận quote.create (TIP-023b): tạo nháp → khách + phụ trách (theo tên) + số dòng + tổng; chạm ngưỡng → cảnh báo; Trợ lý thêm dòng
// ngoài danh mục → buộc duyệt (COMMERCE §12); undo xoá nháp. 403 cs · sales: khách của owner → 404 · idempotency.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let product: string;


beforeAll(async () => {
  m = await matrix('quote.create');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan BG', phone: '0909470001', email: 'lan.bg@example.com' })).contact_id;
  product = (await m.seed('product.create', { name: 'HIFU nâng cơ', type: 'service', price: '1500000', tax_rate: 8 })).product_id;
  await m.seed('quote.create', { contact_id: lan, items: [{ product_id: product, name: 'HIFU nâng cơ', qty: 2, unit_price: '1500000', tax_rate: 8 }] });
}, 120_000);
afterAll(() => m?.close());

describe('quote.create', () => {
  it('403 cs · sales: khách ngoài scope → 404', async () => {
    const inp = { contact_id: lan, items: [{ name: 'X', qty: 1, unit_price: '1000', tax_rate: 0 }] };
    expect((await m.act(inp, m.cs)).status).toBe(403);
    expect((await m.act(inp, m.sales)).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ contact_id: lan, items: [{ product_id: product, name: 'HIFU nâng cơ', qty: 2, unit_price: '1500000', tax_rate: 8 }] });
    expect(preview).toEqual({ summary: 'Chị Lan BG · 3.240.000₫', risk: 'write', changes: [{ entity: 'quote', after: { contact: 'Chị Lan BG', owner: 'Chủ Spa', items: 1, discount_total: '0', total: '3240000', valid_days: 15 } }] });
    const id = done.body.data.result.quote_id;
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await (await m.db()).quote.count({ where: { id } })).toBe(0);
  });

  it('Trợ lý: dòng ngoài danh mục + tổng > 20tr → cảnh báo duyệt', async () => {
    const r = await m.act({ contact_id: lan, items: [{ name: 'Gói VIP', qty: 1, unit_price: '25000000', tax_rate: 8 }] }, undefined, { 'x-action-source': 'assistant' });
    expect(r.body.data.preview.warnings).toEqual(['needs_approval:total', 'needs_approval:off_catalog']);
  });

  it('idempotency', async () => {
    const inp = { contact_id: lan, items: [{ name: 'Phí', qty: 1, unit_price: '1000', tax_rate: 0 }] };
    const a = await m.actWithKey('bg-create-idem', inp);
    expect((await m.actWithKey('bg-create-idem', inp)).body.data.result).toEqual(a.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

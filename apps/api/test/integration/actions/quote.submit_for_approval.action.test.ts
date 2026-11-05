// Ma trận quote.submit_for_approval (TIP-023b): gửi duyệt → khách + tổng + lý do chạm ngưỡng + người nhận thông báo (quote.approve).
// 403 cs · sales own → 404 · id lạ 404. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let q: { quote_id: string; code: string };
let lan: string;
let product: string;
const Q = () => q.quote_id;
const row = async () => (await m.db()).quote.findUniqueOrThrow({ where: { id: Q() } });

beforeAll(async () => {
  m = await matrix('quote.submit_for_approval');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan BG', phone: '0909470001', email: 'lan.bg@example.com' })).contact_id;
  product = (await m.seed('product.create', { name: 'HIFU nâng cơ', type: 'service', price: '25000000', tax_rate: 8 })).product_id;
  q = await m.seed('quote.create', { contact_id: lan, items: [{ product_id: product, name: 'HIFU nâng cơ', qty: 2, unit_price: '25000000', tax_rate: 8 }] });
}, 120_000);
afterAll(() => m?.close());

describe('quote.submit_for_approval', () => {
  it('403 thiếu quyền · ngoài scope (sales own) → 404 · id lạ → 404', async () => {
    expect((await m.act({ quote_id: Q() }, m.cs)).status).toBe(403);
    expect((await m.act({ quote_id: Q() }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ quote_id: Q() }, quote_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ quote_id: Q() });
    expect(preview).toEqual({ summary: `${q.code} · L1 · Chị Lan BG · 54.000.000₫`, risk: 'write', changes: [{ entity: 'quote', id: Q(), before: { status: 'draft', notify: null }, after: { status: 'pending_approval', notify: 'quote.approve' } }], warnings: ['needs_approval:total'] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await row()).status).toBe('pending_approval');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

// Ma trận quote.comment (TIP-023b): trao đổi nội bộ → nội dung; undo xoá.
// 403 cs (không có quote.view) · sales own → 404 · id lạ 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let q: { quote_id: string; code: string };
let lan: string;
let product: string;
const Q = () => q.quote_id;

beforeAll(async () => {
  m = await matrix('quote.comment');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan BG', phone: '0909470001', email: 'lan.bg@example.com' })).contact_id;
  product = (await m.seed('product.create', { name: 'HIFU nâng cơ', type: 'service', price: '1500000', tax_rate: 8 })).product_id;
  q = await m.seed('quote.create', { contact_id: lan, items: [{ product_id: product, name: 'HIFU nâng cơ', qty: 2, unit_price: '1500000', tax_rate: 8 }] });
}, 120_000);
afterAll(() => m?.close());

describe('quote.comment', () => {
  it('403 thiếu quyền · ngoài scope (sales own) → 404 · id lạ → 404', async () => {
    expect((await m.act({ quote_id: Q(), text: 'x' }, m.cs)).status).toBe(403);
    expect((await m.act({ quote_id: Q(), text: 'x' }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ quote_id: Q(), text: 'x' }, quote_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ quote_id: Q(), text: '  Gọi lại chiều nay ' });
    expect(preview).toEqual({ summary: `${q.code} · L1`, risk: 'write', changes: [{ entity: 'quote_comment', after: { text: 'Gọi lại chiều nay' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    const db = await m.db();
    expect(await db.quoteComment.count({ where: { quoteId: Q() } })).toBe(1);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await db.quoteComment.count({ where: { quoteId: Q() } })).toBe(0);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

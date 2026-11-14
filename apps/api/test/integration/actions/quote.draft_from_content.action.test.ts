// Ma trận quote.draft_from_content (TIP-023b): AI soạn nháp → preview ước lượng bằng bộ luật (không gọi model, không trừ
// Credit): số dòng, dòng ngoài danh mục, tổng tạm + cảnh báo ai_estimate / buộc duyệt; undo xoá nháp. 403 cs · sales ngoài scope 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let product: string;


beforeAll(async () => {
  m = await matrix('quote.draft_from_content');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan BG', phone: '0909470001', email: 'lan.bg@example.com' })).contact_id;
  product = (await m.seed('product.create', { name: 'HIFU nâng cơ', type: 'service', price: '1500000', tax_rate: 8 })).product_id;
  await m.seed('quote.create', { contact_id: lan, items: [{ product_id: product, name: 'HIFU nâng cơ', qty: 2, unit_price: '1500000', tax_rate: 8 }] });
}, 120_000);
afterAll(() => m?.close());

describe('quote.draft_from_content', () => {
  const content = 'HIFU nâng cơ x2, thêm Massage đá nóng';

  it('403 cs · sales: khách ngoài scope → 404', async () => {
    expect((await m.act({ contact_id: lan, content }, m.cs)).status).toBe(403);
    expect((await m.act({ contact_id: lan, content }, m.sales)).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const runs = await (await m.db()).aiRun.count();
    const { preview, done } = await m.confirm({ contact_id: lan, content });
    expect(preview).toEqual({
      summary: `Chị Lan BG · ${content}`,
      risk: 'write',
      changes: [{ entity: 'quote', after: { contact: 'Chị Lan BG', status: 'draft', items: 2, off_catalog: 1, total: '3240000' } }],
      warnings: ['ai_estimate', 'needs_approval:off_catalog'],
    });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    // Preview không chạy model: chỉ lần xác nhận ghi một run.
    expect(await (await m.db()).aiRun.count()).toBe(runs + 1);
    const id = done.body.data.result.quote_id;
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await (await m.db()).quote.count({ where: { id } })).toBe(0);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

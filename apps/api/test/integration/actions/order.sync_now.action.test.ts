// Ma trận order.sync_now (TIP-023b): đồng bộ ngay → số kết nối sàn / POS đang kết nối (không gọi sàn trong preview); chưa có kết nối →
// cảnh báo no_connection, chạy trả 0 đơn. 403 sales (không có integrations.manage). Không id. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let serum: string;

beforeAll(async () => {
  m = await matrix('order.sync_now');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan ĐH', phone: '0909490001' })).contact_id;
  serum = (await m.seed('product.create', { name: 'Serum B5', type: 'physical', price: '600000', tax_rate: 10, stock: 3, low_stock_threshold: 2 })).product_id;
  await m.seed('order.create', { contact_id: lan, items: [{ product_id: serum, name: 'Serum B5', qty: 2, unit_price: '600000', tax_rate: 10 }] });
}, 120_000);
afterAll(() => m?.close());

describe('order.sync_now', () => {
  it('403 sales', async () => {
    expect((await m.act({}, m.sales)).status).toBe(403);
  });

  it('preview Trợ lý → xác nhận (chưa có kết nối)', async () => {
    const { preview, done } = await m.confirm({});
    expect(preview).toEqual({ summary: '0', risk: 'write', count: 0, changes: [], warnings: ['no_connection'] });
    expect(done.body.data.result).toEqual({ imported: 0, blocked: 0, failed: 0 });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

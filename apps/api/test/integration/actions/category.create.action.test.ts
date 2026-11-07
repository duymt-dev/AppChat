// Ma trận category.create (TIP-023b): tạo danh mục (risk config) → tên; đã có cùng tên (không phân biệt hoa thường) → cảnh báo dùng lại.
// 403 sales (không có catalog.manage). Undo: ActionDef không khai. Gọi lặp cùng tên → cùng danh mục.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('category.create');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
}, 120_000);
afterAll(() => m?.close());

describe('category.create', () => {
  it('403 sales', async () => {
    expect((await m.act({ name: 'Da' }, m.sales)).status).toBe(403);
  });

  it('preview Trợ lý → xác nhận; tên sẵn có → cảnh báo, cùng kết quả', async () => {
    const { preview, done } = await m.confirm({ name: ' Chăm sóc da ' });
    expect(preview).toEqual({ summary: 'Chăm sóc da', risk: 'config', changes: [{ entity: 'product_category', after: { name: 'Chăm sóc da' } }] });
    expect(done.body.data.result).toEqual({ name: 'Chăm sóc da' });
    const again = await m.act({ name: 'CHĂM SÓC DA' }, undefined, { 'x-action-source': 'assistant' });
    expect(again.body.data.preview).toEqual({ summary: 'Chăm sóc da', risk: 'config', changes: [], warnings: ['existing:Chăm sóc da'] });
    expect(await (await m.db()).$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM product_category WHERE lower(name) = lower('Chăm sóc da')`).toEqual([{ n: 1n }]);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

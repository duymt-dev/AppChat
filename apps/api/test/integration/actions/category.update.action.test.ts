// Ma trận category.update (TIP-032b): đổi tên / màu (risk config); tên trùng (không phân biệt hoa thường) → 409; id lạ 404; 403 sales.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let a: string;

beforeAll(async () => {
  m = await matrix('category.update');
  await m.seed('category.create', { name: 'Chăm sóc da' });
  await m.seed('category.create', { name: 'Gội đầu' });
  a = (await (await m.db()).productCategory.findFirstOrThrow({ where: { name: 'Chăm sóc da' } })).id;
}, 120_000);
afterAll(() => m?.close());

describe('category.update', () => {
  it('403 sales · id lạ 404 · tên trùng 409', async () => {
    expect((await m.act({ category_id: a, name: 'Da' }, m.sales)).status).toBe(403);
    expect((await m.act({ category_id: '0190f000-0000-7000-8000-00000000beef', name: 'X' })).status).toBe(404);
    expect((await m.act({ category_id: a, name: 'GỘI ĐẦU' })).status).toBe(409);
  });

  it('preview Trợ lý → xác nhận đổi tên + màu', async () => {
    const { preview, done } = await m.confirm({ category_id: a, name: 'Da mặt', color: '#14B8A6' });
    expect(preview).toMatchObject({ summary: 'Chăm sóc da', risk: 'config' });
    expect(done.body.data.result).toEqual({ category_id: a, name: 'Da mặt', color: '#14B8A6' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

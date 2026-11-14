// Ma trận product.media_list (TIP-027b): happy (theo vị trí, ảnh chính, version, metadata an toàn — không URL / storage) · sales
// (catalog.view) đọc được, can_edit=false · sản phẩm lưu trữ → 404 · nguồn assistant chạy ngay (risk read). Idempotency / undo / trạng
// thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setValidatorEntry } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { attachImage, productOf, useBuiltValidator } from '../helpers/product-media-fixtures';

let m: Matrix;
let p: string;

beforeAll(async () => {
  useBuiltValidator();
  m = await matrix('product.media_list');
  p = await productOf(m, 'Danh sách');
  for (const n of ['1', '2']) await attachImage(m, p, `${n}.png`);
}, 240_000);
afterAll(async () => {
  setValidatorEntry(undefined);
  await m?.close();
});

describe('product.media_list', () => {
  it('happy: theo vị trí, ảnh chính, version, metadata an toàn', async () => {
    const r = await m.act({ product_id: p });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ version: 2, can_edit: true, limits: { image: 10, document: 20 } });
    expect(r.body.data.result.items.map((x: { name: string; position: number; is_primary: boolean }) => [x.name, x.position, x.is_primary])).toEqual([
      ['1.png', 0, true],
      ['2.png', 1, false],
    ]);
    expect(JSON.stringify(r.body)).not.toMatch(/storage|sig=|"url"/);
  });

  it('sales (catalog.view) đọc được, can_edit=false', async () => {
    const r = await m.act({ product_id: p }, m.sales);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.can_edit).toBe(false);
  });

  it('sản phẩm lưu trữ → 404; nguồn assistant chạy ngay (risk read)', async () => {
    const q = await productOf(m, 'Lưu trữ');
    await m.seed('product.archive', { product_id: q });
    expect((await m.act({ product_id: q })).status).toBe(404);
    expect((await m.act({ product_id: p }, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

// Ma trận product.media_reorder (TIP-027b): happy (thứ tự mới, version +1, ảnh chính không đổi) · 403 sales · nguồn assistant: xem trước
// rồi xác nhận · idempotency · trạng thái: thiếu / trùng id → 422 not_permutation, version lệch → 409. Không undo.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setValidatorEntry } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { attachImage, productOf, useBuiltValidator } from '../helpers/product-media-fixtures';

let m: Matrix;

async function three(name: string) {
  const p = await productOf(m, name);
  const ids: string[] = [];
  for (const n of ['1', '2', '3']) ids.push((await attachImage(m, p, `${n}.png`)).media_id);
  return { p, ids };
}

beforeAll(async () => {
  useBuiltValidator();
  m = await matrix('product.media_reorder');
}, 240_000);
afterAll(async () => {
  setValidatorEntry(undefined);
  await m?.close();
});

describe('product.media_reorder', () => {
  it('happy: thứ tự mới, version +1, ảnh chính giữ nguyên', async () => {
    const { p, ids } = await three('Sắp xếp');
    const r = await m.act({ product_id: p, kind: 'image', media_ids: [ids[2], ids[0], ids[1]], if_version: 3 });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toEqual({ version: 4 });
    const list = await m.seed('product.media_list', { product_id: p });
    expect(list.items.map((x: { media_id: string }) => x.media_id)).toEqual([ids[2], ids[0], ids[1]]);
    expect(list.items.find((x: { is_primary: boolean }) => x.is_primary).media_id).toBe(ids[0]);
  });

  it('403: sales không có catalog.manage', async () => {
    const { p, ids } = await three('Sales xếp');
    expect((await m.act({ product_id: p, kind: 'image', media_ids: ids, if_version: 3 }, m.sales)).status).toBe(403);
  });

  it('nguồn assistant: xem trước write rồi xác nhận', async () => {
    const { p, ids } = await three('Trợ lý xếp');
    const { preview, done } = await m.confirm({ product_id: p, kind: 'image', media_ids: [ids[1], ids[0], ids[2]], if_version: 3 });
    expect(preview).toMatchObject({ risk: 'write' });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
  });

  it('idempotency: cùng khoá → cùng kết quả', async () => {
    const { p, ids } = await three('Idem xếp');
    const inp = { product_id: p, kind: 'image', media_ids: [ids[1], ids[2], ids[0]], if_version: 3 };
    const first = await m.actWithKey('product-media-reorder-idem', inp);
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    expect((await m.actWithKey('product-media-reorder-idem', inp)).body.data.result).toEqual(first.body.data.result);
  });

  it('trạng thái: thiếu / trùng id → 422 not_permutation; version lệch → 409', async () => {
    const { p, ids } = await three('Trạng thái xếp');
    expect((await m.act({ product_id: p, kind: 'image', media_ids: [ids[0], ids[1]], if_version: 3 })).body.error.fields).toEqual({ media_ids: 'not_permutation' });
    expect((await m.act({ product_id: p, kind: 'image', media_ids: [ids[0], ids[0], ids[1]], if_version: 3 })).body.error.fields).toEqual({ media_ids: 'not_permutation' });
    expect((await m.act({ product_id: p, kind: 'image', media_ids: ids, if_version: 2 })).body.error.code).toBe('STALE_VERSION');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

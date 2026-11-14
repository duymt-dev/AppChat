// Ma trận product.media_set_primary (TIP-027b): happy (đúng một ảnh chính, version +1) · 403 sales · nguồn assistant: xem trước rồi xác
// nhận · idempotency · trạng thái: version lệch → 409, đã gỡ → 409. Không undo.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setValidatorEntry } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { attachImage, mediaVersion, productOf, useBuiltValidator } from '../helpers/product-media-fixtures';

let m: Matrix;

async function two(name: string) {
  const p = await productOf(m, name);
  return { p, a: await attachImage(m, p, 'a.png'), b: await attachImage(m, p, 'b.png') };
}

beforeAll(async () => {
  useBuiltValidator();
  m = await matrix('product.media_set_primary');
}, 240_000);
afterAll(async () => {
  setValidatorEntry(undefined);
  await m?.close();
});

describe('product.media_set_primary', () => {
  it('happy: đúng một ảnh chính sau khi đổi', async () => {
    const { p, b } = await two('Ảnh chính');
    const r = await m.act({ product_id: p, media_id: b.media_id, if_version: 2 });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toEqual({ media_id: b.media_id, version: 3, primary_id: b.media_id });
    const rows = await (await m.db()).productMedia.findMany({ where: { productId: p, isPrimary: true, detachedAt: null } });
    expect(rows.map((x) => x.id)).toEqual([b.media_id]);
  });

  it('403: sales không có catalog.manage', async () => {
    const { p, b } = await two('Sales chính');
    expect((await m.act({ product_id: p, media_id: b.media_id, if_version: 2 }, m.sales)).status).toBe(403);
  });

  it('nguồn assistant: xem trước write rồi xác nhận', async () => {
    const { p, b } = await two('Trợ lý chính');
    const { preview, done } = await m.confirm({ product_id: p, media_id: b.media_id, if_version: 2 });
    expect(preview).toMatchObject({ risk: 'write' });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
  });

  it('idempotency: cùng khoá → cùng kết quả', async () => {
    const { p, b } = await two('Idem chính');
    const inp = { product_id: p, media_id: b.media_id, if_version: 2 };
    const first = await m.actWithKey('product-media-primary-idem', inp);
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    expect((await m.actWithKey('product-media-primary-idem', inp)).body.data.result).toEqual(first.body.data.result);
  });

  it('trạng thái: version lệch → 409; đã gỡ → 409', async () => {
    const { p, a, b } = await two('Trạng thái chính');
    expect((await m.act({ product_id: p, media_id: b.media_id, if_version: 0 })).body.error.code).toBe('STALE_VERSION');
    await m.seed('product.media_detach', { product_id: p, media_id: a.media_id, if_version: 2 });
    expect((await m.act({ product_id: p, media_id: a.media_id, if_version: await mediaVersion(m, p) })).body.error.fields).toEqual({ media_id: 'detached' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

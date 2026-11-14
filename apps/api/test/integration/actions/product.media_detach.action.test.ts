// Ma trận product.media_detach (TIP-027b): happy (đánh dấu gỡ, ảnh chính chuyển ảnh kế, tệp + claim giữ) · 403 sales · nguồn assistant:
// xem trước delete + cảnh báo tệp vẫn giữ · idempotency · trạng thái: version lệch → 409, đã gỡ → 409, media của sản phẩm khác → 404.
// Không undo (gắn lại cần tải mới).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setValidatorEntry } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { attachImage, mediaVersion, productOf, useBuiltValidator } from '../helpers/product-media-fixtures';

let m: Matrix;

beforeAll(async () => {
  useBuiltValidator();
  m = await matrix('product.media_detach');
}, 240_000);
afterAll(async () => {
  setValidatorEntry(undefined);
  await m?.close();
});

describe('product.media_detach', () => {
  it('happy: gỡ ảnh chính → ảnh kế thành chính; tệp + claim giữ nguyên', async () => {
    const p = await productOf(m, 'Gỡ ảnh');
    const a = await attachImage(m, p, 'a.png');
    const b = await attachImage(m, p, 'b.png');
    const r = await m.act({ product_id: p, media_id: a.media_id, if_version: await mediaVersion(m, p) });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ media_id: a.media_id, primary_id: b.media_id, version: 3 });
    const db = await m.db();
    expect(await db.file.count({ where: { id: a.file_id } })).toBe(1);
    expect(await db.fileClaim.count({ where: { fileId: a.file_id } })).toBe(1);
  });

  it('403: sales không có catalog.manage', async () => {
    const p = await productOf(m, 'Sales gỡ');
    const a = await attachImage(m, p, 's.png');
    expect((await m.act({ product_id: p, media_id: a.media_id, if_version: 1 }, m.sales)).status).toBe(403);
  });

  it('nguồn assistant: xem trước delete + cảnh báo file_kept, xác nhận mới gỡ', async () => {
    const p = await productOf(m, 'Trợ lý gỡ');
    const a = await attachImage(m, p, 'tro-ly.png');
    const { preview, done } = await m.confirm({ product_id: p, media_id: a.media_id, if_version: 1 });
    expect(preview).toMatchObject({ risk: 'delete', warnings: ['file_kept'] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
  });

  it('idempotency: cùng khoá → cùng kết quả, không gỡ hai lần', async () => {
    const p = await productOf(m, 'Idem gỡ');
    const a = await attachImage(m, p, 'i.png');
    const inp = { product_id: p, media_id: a.media_id, if_version: 1 };
    const first = await m.actWithKey('product-media-detach-idem', inp);
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    expect((await m.actWithKey('product-media-detach-idem', inp)).body.data.result).toEqual(first.body.data.result);
  });

  it('trạng thái: version lệch → 409; media của sản phẩm khác → 404; đã gỡ → 409', async () => {
    const p = await productOf(m, 'Trạng thái gỡ');
    const q = await productOf(m, 'Khác gỡ');
    const a = await attachImage(m, p, 't.png');
    expect((await m.act({ product_id: p, media_id: a.media_id, if_version: 9 })).body.error.code).toBe('STALE_VERSION');
    expect((await m.act({ product_id: q, media_id: a.media_id, if_version: 0 })).status).toBe(404);
    expect((await m.act({ product_id: p, media_id: a.media_id, if_version: 1 })).status).toBe(200);
    expect((await m.act({ product_id: p, media_id: a.media_id, if_version: 2 })).body.error.fields).toEqual({ media_id: 'detached' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

// Ma trận product.media_attach (TIP-027b): happy (ảnh đầu = ảnh chính, version +1, sự kiện, staging tiêu) · 403 sales (catalog.view, không
// catalog.manage) · nguồn assistant: xem trước nêu đúng sản phẩm + tệp rồi xác nhận · idempotency (cùng khoá → cùng biên nhận) · trạng
// thái: version lệch → 409, tệp tải cho sản phẩm khác → 409, sản phẩm lưu trữ → 404. Không undo (gỡ là thao tác riêng).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setValidatorEntry } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { productOf, uploadImage, useBuiltValidator } from '../helpers/product-media-fixtures';

let m: Matrix;
const handle = (file_id: string) => ({ kind: 'target_upload_handle', file_id });

beforeAll(async () => {
  useBuiltValidator();
  m = await matrix('product.media_attach');
}, 240_000);
afterAll(async () => {
  setValidatorEntry(undefined);
  await m?.close();
});

describe('product.media_attach', () => {
  it('happy: ảnh đầu = ảnh chính, version 1, sự kiện product.media_changed, staging đã tiêu', async () => {
    const p = await productOf(m, 'Gắn ảnh');
    const fid = await uploadImage(m, p, 'dau.png');
    const r = await m.act({ product_id: p, source: handle(fid), if_version: 0 });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ file_id: fid, kind: 'image', version: 1, reused: false });
    expect(r.body.data.result.primary_id).toBe(r.body.data.result.media_id);
    const db = await m.db();
    expect(await db.attachmentStaging.count({ where: { fileId: fid } })).toBe(0);
    expect(await db.outboxEvent.count({ where: { topic: 'product.media_changed' } })).toBeGreaterThanOrEqual(1);
  });

  it('403: sales không có catalog.manage (tải lên cũng bị chặn trước khi lưu)', async () => {
    const p = await productOf(m, 'Sales gắn');
    const fid = await uploadImage(m, p, 's.png');
    expect((await m.act({ product_id: p, source: handle(fid), if_version: 0 }, m.sales)).status).toBe(403);
    await expect(uploadImage(m, p, 's2.png', m.sales)).rejects.toThrow(/upload 403/);
  });

  it('nguồn assistant: xem trước write nêu tên tệp, xác nhận mới gắn', async () => {
    const p = await productOf(m, 'Trợ lý gắn');
    const fid = await uploadImage(m, p, 'tro-ly.png');
    const { preview, done } = await m.confirm({ product_id: p, source: handle(fid), if_version: 0 });
    expect(preview).toMatchObject({ risk: 'write' });
    expect(preview.summary).toContain('tro-ly.png');
    expect(done.status, JSON.stringify(done.body)).toBe(200);
  });

  it('idempotency: cùng khoá → cùng biên nhận, một liên kết', async () => {
    const p = await productOf(m, 'Idem gắn');
    const fid = await uploadImage(m, p, 'idem.png');
    const inp = { product_id: p, source: handle(fid), if_version: 0 };
    const first = await m.actWithKey('product-media-attach-idem', inp);
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    expect((await m.actWithKey('product-media-attach-idem', inp)).body.data.result).toEqual(first.body.data.result);
    expect(await (await m.db()).productMedia.count({ where: { productId: p } })).toBe(1);
  });

  it('trạng thái: version lệch → 409; tệp tải cho sản phẩm khác → 409; sản phẩm lưu trữ → 404', async () => {
    const p = await productOf(m, 'Trạng thái');
    const q = await productOf(m, 'Khác');
    const fid = await uploadImage(m, p, 'v.png');
    expect((await m.act({ product_id: p, source: handle(fid), if_version: 5 })).body.error.code).toBe('STALE_VERSION');
    expect((await m.act({ product_id: q, source: handle(fid), if_version: 0 })).body.error.fields).toEqual({ file_id: 'other_target' });
    await m.seed('product.archive', { product_id: p });
    expect((await m.act({ product_id: p, source: handle(fid), if_version: 0 })).status).toBe(404);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});

// TIP-027b §1.2, §1.4, §1.6 (thuần, không DB): giới hạn ảnh đọc từ header — PNG / JPEG / WEBP đúng kích thước; APNG / WEBP động → animated;
// cạnh > 8000 hoặc > 40 MP → image_too_large; header hỏng → corrupt. Hồ sơ kiểm `product` (ảnh qua image-bounds + tài liệu), `record` giữ
// nguyên 032d (ảnh lớn vẫn qua kiểm hình dạng cũ). Hoàn tác tạo sản phẩm: media đã chạm / ý định đang chép / claim → 409 HAS_DEPENDENCIES.
import { describe, expect, it } from 'vitest';
import { imageBounds } from '../src/kernel/files/image-bounds';
import { validateAttachment } from '../src/kernel/files/attachment-validator-entry';
import { assertMediaPristine } from '../src/catalog/media/pristine';
import type { TenantTx } from '../src/kernel/actions/action-context';
import { pdf } from '../../../fixtures/contracts/files/build-fixtures';
import { jpegOf, pngOf, webpOf } from '../../../fixtures/product-media/images';

describe('imageBounds', () => {
  it('PNG / JPEG / WEBP tĩnh → kích thước đúng', () => {
    expect(imageBounds('png', pngOf(640, 480))).toEqual({ ok: true, width: 640, height: 480 });
    expect(imageBounds('jpeg', jpegOf(1200, 800))).toEqual({ ok: true, width: 1200, height: 800 });
    expect(imageBounds('webp', webpOf(300, 200))).toEqual({ ok: true, width: 300, height: 200 });
  });
  it('APNG / WEBP động → animated', () => {
    expect(imageBounds('png', pngOf(10, 10, true))).toEqual({ ok: false, reason: 'animated' });
    expect(imageBounds('webp', webpOf(10, 10, true))).toEqual({ ok: false, reason: 'animated' });
  });
  it('cạnh > 8000 / > 40 megapixel → image_too_large; header hỏng → corrupt', () => {
    expect(imageBounds('png', pngOf(8001, 10))).toEqual({ ok: false, reason: 'image_too_large' });
    expect(imageBounds('jpeg', jpegOf(7000, 7000))).toEqual({ ok: false, reason: 'image_too_large' });
    expect(imageBounds('png', pngOf(0, 10))).toEqual({ ok: false, reason: 'corrupt' });
    expect(imageBounds('jpeg', new Uint8Array([0xff, 0xd8, 0x00, 0x01, 0, 0, 0, 0, 0, 0, 0, 0]))).toEqual({ ok: false, reason: 'corrupt' });
  });
});

describe('validateAttachment — hồ sơ product', () => {
  it('ảnh hợp lệ / tài liệu PDF → hợp lệ; ảnh quá cỡ / động → từ chối có lý do', () => {
    expect(validateAttachment(pngOf(800, 600), 'anh.png', 'product')).toEqual({ ok: true, kind: 'png' });
    expect(validateAttachment(new Uint8Array(pdf({ text: 'x' })), 'tl.pdf', 'product')).toEqual({ ok: true, kind: 'pdf' });
    expect(validateAttachment(pngOf(9000, 100), 'lon.png', 'product')).toEqual({ ok: false, reason: 'image_too_large' });
    expect(validateAttachment(webpOf(20, 20, true), 'dong.webp', 'product')).toEqual({ ok: false, reason: 'animated' });
  });
  it('SVG / HTML đổi đuôi .png → từ chối; hồ sơ record giữ luật 032d', () => {
    expect(validateAttachment(new TextEncoder().encode('<svg onload="x()"></svg>'), 'a.png', 'product')).toMatchObject({ ok: false });
    expect(validateAttachment(pngOf(9000, 100), 'lon.png', 'record')).toEqual({ ok: true, kind: 'png' });
  });
});

describe('assertMediaPristine — hoàn tác tạo sản phẩm', () => {
  const tx = (r: { touched: boolean; intents: number; claims: number }) =>
    ({ $queryRaw: async (s: TemplateStringsArray) => (s.join('').includes('FOR UPDATE') ? [] : [{ touched: r.touched, intents: BigInt(r.intents), claims: BigInt(r.claims) }]) }) as unknown as TenantTx;
  const code = (p: Promise<void>) => p.then(() => null, (e: { httpStatus?: number; code?: string }) => [e.httpStatus, e.code]);
  it('nguyên sơ → cho xoá; đã chạm / ý định / claim → 409 HAS_DEPENDENCIES', async () => {
    expect(await code(assertMediaPristine(tx({ touched: false, intents: 0, claims: 0 }), 'p'))).toBeNull();
    for (const r of [{ touched: true, intents: 0, claims: 0 }, { touched: false, intents: 1, claims: 0 }, { touched: false, intents: 0, claims: 1 }])
      expect(await code(assertMediaPristine(tx(r), 'p'))).toEqual([409, 'HAS_DEPENDENCIES']);
  });
});

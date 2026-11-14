// TIP-027b (mock ↔ BE): `product.media_list` + khối `media` của chi tiết trả đúng output schema; tải `record_attachment` đích product cần
// catalog.manage; ảnh đầu tiên là ảnh chính; version lệch → 409 STALE; gửi lại cùng tệp → reused; sắp xếp cần hoán vị đủ; gỡ ảnh chính
// → ảnh kế tiếp; tài liệu không làm ảnh chính; ảnh động → 422; mô tả có tài liệu: chữ khác phép chiếu → 422, chữ cũ gửi lại giữ định dạng.
import { beforeEach, describe, expect, it } from 'vitest';
import { productMediaList } from '@appchat/actions';
import { productMediaSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { mockDb, setMockRole } from './store';
import { createProductsState } from './domains/products';

const P = 'pd_1';
const png = (name: string) => new File([new Uint8Array([137, 80, 78, 71])], name, { type: 'image/png' });
const act = async <T = Record<string, unknown>>(id: string, input: unknown) => ((await mockTransport.action(id, input)) as { data: { result: T } }).data.result;
const err = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
    return null;
  } catch (e) {
    const x = e as { status?: number; error?: { code: string; fields?: Record<string, string> } };
    return { status: x.status, code: x.error?.code, fields: x.error?.fields };
  }
};
const up = (name: string, id = P) => mockTransport.upload(png(name), 'record_attachment', undefined, { parent_type: 'product', parent_id: id });
const list = () => act<{ items: { media_id: string; kind: string; is_primary: boolean; name: string }[]; version: number }>('product.media_list', { product_id: P });
async function attach(name: string) {
  const v = (await list()).version;
  const f = await up(name);
  return act<{ media_id: string; version: number; primary_id: string | null; reused: boolean }>('product.media_attach', { product_id: P, source: { kind: 'target_upload_handle', file_id: f.file_id }, if_version: v });
}

describe('mock ảnh / tài liệu sản phẩm', () => {
  beforeEach(() => {
    mockDb().products = createProductsState();
    setMockRole('owner');
  });

  it('media_list + chi tiết khớp schema; ảnh đầu tiên là ảnh chính; gửi lại cùng tệp → reused', async () => {
    const before = (await list()).version;
    const f = await up('a.png');
    const r = await act<{ primary_id: string; media_id: string; reused: boolean }>('product.media_attach', { product_id: P, source: { kind: 'target_upload_handle', file_id: f.file_id }, if_version: before });
    expect(r.primary_id).toBe(r.media_id);
    const again = await act<{ reused: boolean; media_id: string }>('product.media_attach', { product_id: P, source: { kind: 'target_upload_handle', file_id: f.file_id }, if_version: before });
    expect(again).toMatchObject({ reused: true, media_id: r.media_id });
    expect(productMediaList.output.safeParse(await list()).success).toBe(true);
    const detail = await mockTransport.get<{ media: unknown }>(`/products/${P}`);
    expect(productMediaSchema.safeParse(detail.media).success).toBe(true);
  });

  it('version lệch → 409 STALE; tệp tải cho sản phẩm khác → 409 other_target; ảnh động → 422', async () => {
    await attach('a.png');
    const f = await up('b.png');
    expect(await err(() => mockTransport.action('product.media_attach', { product_id: P, source: { kind: 'target_upload_handle', file_id: f.file_id }, if_version: 0 }))).toMatchObject({ status: 409, code: 'STALE_VERSION' });
    const other = await up('c.png', 'pd_2');
    const v = (await list()).version;
    expect(await err(() => mockTransport.action('product.media_attach', { product_id: P, source: { kind: 'target_upload_handle', file_id: other.file_id }, if_version: v }))).toMatchObject({ status: 409, fields: { file_id: 'other_target' } });
    const anim = await up('animated.png');
    expect(await err(() => mockTransport.action('product.media_attach', { product_id: P, source: { kind: 'target_upload_handle', file_id: anim.file_id }, if_version: v }))).toMatchObject({ status: 422, fields: { file_id: 'animated' } });
  });

  it('sắp xếp cần hoán vị đủ; đặt ảnh chính; gỡ ảnh chính → ảnh kế tiếp', async () => {
    const a = await attach('a.png');
    const b = await attach('b.png');
    const c = await attach('c.png');
    const v = (await list()).version;
    expect(await err(() => mockTransport.action('product.media_reorder', { product_id: P, kind: 'image', media_ids: [b.media_id, a.media_id], if_version: v }))).toMatchObject({ status: 422, fields: { media_ids: 'not_permutation' } });
    await act('product.media_reorder', { product_id: P, kind: 'image', media_ids: [c.media_id, a.media_id, b.media_id], if_version: v });
    expect((await list()).items.map((m) => m.name)).toEqual(['c.png', 'a.png', 'b.png']);
    await act('product.media_set_primary', { product_id: P, media_id: b.media_id, if_version: (await list()).version });
    const r = await act<{ primary_id: string }>('product.media_detach', { product_id: P, media_id: b.media_id, if_version: (await list()).version });
    expect(r.primary_id).toBe(c.media_id);
    expect((await list()).items.filter((m) => m.is_primary).map((m) => m.media_id)).toEqual([c.media_id]);
  });

  it('sales (không catalog.manage) không tải được tệp cho sản phẩm', async () => {
    setMockRole('sales');
    expect(await err(() => up('a.png'))).toMatchObject({ status: 403 });
  });

  it('mô tả: tài liệu + chữ lệch → 422; chữ cũ gửi lại nguyên giữ định dạng; chữ đổi → một đoạn', async () => {
    const doc = { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Đậm', marks: ['bold'] }] }] };
    expect(await err(() => mockTransport.action('product.update', { product_id: P, patch: { description: 'Khác', description_doc: doc } }))).toMatchObject({ status: 422, fields: { description: 'mismatch_doc' } });
    await act('product.update', { product_id: P, patch: { description_doc: doc } });
    await act('product.update', { product_id: P, patch: { description: 'Đậm', name: 'Tên mới' } });
    expect((await mockTransport.get<{ description_doc: unknown }>(`/products/${P}`)).description_doc).toEqual(doc);
    await act('product.update', { product_id: P, patch: { description: 'Mới' } });
    expect(await mockTransport.get(`/products/${P}`)).toMatchObject({ description: 'Mới', description_doc: null });
  });
});

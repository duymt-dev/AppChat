// Dựng dữ liệu cho ma trận media sản phẩm (TIP-027b): bundle validator thật (dùng lại build của 032d), sản phẩm qua executor, tải ảnh
// `record_attachment` cho đích `product` qua `POST /v1/files` (cùng đường UI), gắn qua executor.
import { pngOf } from '../../../../../fixtures/product-media/images';
import type { Matrix, Who } from './action-matrix';

export { useBuiltValidator } from './commerce-files-fixtures';

export async function productOf(m: Matrix, name: string): Promise<string> {
  return (await m.seed('product.create', { name, type: 'physical', price: '100000' })).product_id as string;
}

export async function uploadImage(m: Matrix, productId: string, name = 'anh.png', who?: Who, w = 120): Promise<string> {
  const form = new FormData();
  form.set('purpose', 'record_attachment');
  form.set('parent_type', 'product');
  form.set('parent_id', productId);
  form.set('file', new Blob([pngOf(w, 80)], { type: 'image/png' }), name);
  const r = await fetch(`${m.h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': m.h.ws, authorization: `Bearer ${who?.token ?? m.h.tokenFor(m.h.user)}` }, body: form });
  if (r.status !== 201) throw new Error(`upload ${r.status} ${await r.text()}`);
  return ((await r.json()) as { data: { file_id: string } }).data.file_id;
}

export const mediaVersion = async (m: Matrix, productId: string): Promise<number> => (await m.seed('product.media_list', { product_id: productId })).version as number;

/** Gắn một ảnh mới (qua executor) → { media_id, file_id }. */
export async function attachImage(m: Matrix, productId: string, name: string, w = 120): Promise<{ media_id: string; file_id: string }> {
  const fid = await uploadImage(m, productId, name, undefined, w);
  return m.seed('product.media_attach', { product_id: productId, source: { kind: 'target_upload_handle', file_id: fid }, if_version: await mediaVersion(m, productId) });
}

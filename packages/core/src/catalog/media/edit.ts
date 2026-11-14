// Gỡ / sắp xếp / đặt ảnh chính media sản phẩm (TIP-027b §1.3–1.4): khoá sản phẩm → bộ media (CAS version). Gỡ chỉ đánh dấu `detached_at`
// (không xoá bytes / claim — lineage cho dọn tệp, quên khách); gỡ ảnh chính → ảnh sống đầu tiên. Sắp xếp nhận hoán vị ĐỦ id sống của một
// loại (thiếu / thừa / trùng → 422), không vị trí tuỳ ý. Ảnh chính chỉ là ảnh sống.
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { bumpMedia, liveMedia, lockMedia, lockProduct, mediaById, primaryOf, promoteFirst, setPrimary, type MediaKind } from './repository';

export async function detachMedia(tx: TenantTx, userId: string | null, i: { product_id: string; media_id: string; if_version: number }, now: Date) {
  await lockProduct(tx, i.product_id);
  const m = await mediaById(tx, i.product_id, i.media_id);
  await lockMedia(tx, i.product_id, i.if_version);
  if (m.detached_at) throw new AppError('CONFLICT', 409, { media_id: 'detached' });
  await tx.productMedia.update({ where: { id: m.id }, data: { detachedAt: now, detachedBy: userId, isPrimary: false, version: { increment: 1 } } });
  const primary = m.is_primary ? await promoteFirst(tx, i.product_id) : await primaryOf(tx, i.product_id);
  return { media_id: m.id, version: await bumpMedia(tx, i.product_id, now), primary_id: primary };
}

export async function reorderMedia(tx: TenantTx, i: { product_id: string; kind: MediaKind; media_ids: string[]; if_version: number }, now: Date) {
  await lockProduct(tx, i.product_id);
  await lockMedia(tx, i.product_id, i.if_version);
  const live = await liveMedia(tx, i.product_id, i.kind);
  const want = new Set(i.media_ids);
  if (want.size !== i.media_ids.length || want.size !== live.length || live.some((m) => !want.has(m.id))) throw new AppError('VALIDATION_FAILED', 422, { media_ids: 'not_permutation' });
  // position không unique → ghi thẳng vị trí mới trong cùng transaction (người đọc khác thấy trước / sau, không thấy nửa chừng).
  for (const [n, id] of i.media_ids.entries()) await tx.$executeRaw`UPDATE product_media SET position = ${n}, version = version + 1 WHERE id = ${id}::uuid AND position <> ${n}`;
  return { version: await bumpMedia(tx, i.product_id, now) };
}

export async function setPrimaryMedia(tx: TenantTx, i: { product_id: string; media_id: string; if_version: number }, now: Date) {
  await lockProduct(tx, i.product_id);
  const m = await mediaById(tx, i.product_id, i.media_id);
  await lockMedia(tx, i.product_id, i.if_version);
  if (m.detached_at) throw new AppError('CONFLICT', 409, { media_id: 'detached' });
  if (m.kind !== 'image') throw new AppError('VALIDATION_FAILED', 422, { media_id: 'not_image' });
  await setPrimary(tx, i.product_id, m.id);
  return { media_id: m.id, version: await bumpMedia(tx, i.product_id, now), primary_id: m.id };
}

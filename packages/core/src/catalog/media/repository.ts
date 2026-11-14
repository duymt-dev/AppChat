// Kho liên kết media sản phẩm (TIP-027b §1.1, §1.4, §4.3): thứ tự khoá sản phẩm (FOR UPDATE, còn sống) → bộ media (`product_media_state`
// FOR UPDATE, CAS version) → giành tệp (`file_claim`) → liên kết. Ảnh đầu tiên thành ảnh chính cùng transaction; đổi ảnh chính bỏ ảnh cũ
// trước (unique một phần chặn hai ảnh chính); gỡ ảnh chính → ảnh sống đầu tiên theo (position, id). Mọi thao tác tăng version bộ media +
// đánh dấu `touched` — không đổi giá / tồn / version sản phẩm.
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

export const MEDIA_LIMITS = { image: 10, document: 20 } as const;
export type MediaKind = keyof typeof MEDIA_LIMITS;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface MediaRow {
  id: string;
  product_id: string;
  file_id: string;
  kind: MediaKind;
  position: number;
  is_primary: boolean;
  version: number;
  created_at: Date;
  detached_at: Date | null;
}

/** Sản phẩm còn sống, khoá FOR UPDATE (cùng khoá với product.update / create-undo). Lưu trữ / không có → 404. */
export async function lockProduct(tx: TenantTx, id: string): Promise<{ id: string; code: string; name: string }> {
  const [p] = UUID.test(id) ? await tx.$queryRaw<{ id: string; code: string; name: string; deleted_at: Date | null }[]>`SELECT id, code, name, deleted_at FROM product WHERE id = ${id}::uuid FOR UPDATE` : [];
  if (!p || p.deleted_at) throw new AppError('NOT_FOUND', 404, { product_id: 'not_found' });
  return p;
}

/** Khoá bộ media + so version (lệch → 409). `null` = không so (gửi lại đã có biên nhận). */
export async function lockMedia(tx: TenantTx, productId: string, ifVersion: number | null): Promise<number> {
  await tx.$executeRaw`INSERT INTO product_media_state (product_id) VALUES (${productId}::uuid) ON CONFLICT DO NOTHING`;
  const [row] = await tx.$queryRaw<{ version: number }[]>`SELECT version FROM product_media_state WHERE product_id = ${productId}::uuid FOR UPDATE`;
  const v = row?.version ?? 0;
  if (ifVersion !== null && ifVersion !== v) throw new AppError('STALE_VERSION', 409, { if_version: 'changed' });
  return v;
}

export async function bumpMedia(tx: TenantTx, productId: string, now: Date): Promise<number> {
  const [row] = await tx.$queryRaw<{ version: number }[]>`
    UPDATE product_media_state SET version = version + 1, touched = true, updated_at = ${now} WHERE product_id = ${productId}::uuid RETURNING version`;
  return row!.version;
}

export const mediaVersion = async (tx: Pick<TenantTx, 'productMediaState'>, productId: string) =>
  (await tx.productMediaState.findUnique({ where: { productId } }))?.version ?? 0;

export async function liveMedia(tx: TenantTx, productId: string, kind?: MediaKind): Promise<MediaRow[]> {
  return kind
    ? tx.$queryRaw<MediaRow[]>`SELECT id, product_id, file_id, kind::text AS kind, position, is_primary, version, created_at, detached_at FROM product_media
        WHERE product_id = ${productId}::uuid AND kind = ${kind}::product_media_kind AND detached_at IS NULL ORDER BY position, id LIMIT 50`
    : tx.$queryRaw<MediaRow[]>`SELECT id, product_id, file_id, kind::text AS kind, position, is_primary, version, created_at, detached_at FROM product_media
        WHERE product_id = ${productId}::uuid AND detached_at IS NULL ORDER BY kind, position, id LIMIT 50`;
}

export async function mediaById(tx: TenantTx, productId: string, id: string): Promise<MediaRow> {
  const [m] = UUID.test(id) ? await tx.$queryRaw<MediaRow[]>`SELECT id, product_id, file_id, kind::text AS kind, position, is_primary, version, created_at, detached_at FROM product_media WHERE id = ${id}::uuid` : [];
  if (!m || m.product_id !== productId) throw new AppError('NOT_FOUND', 404, { media_id: 'not_found' });
  return m;
}

export const primaryOf = async (tx: TenantTx, productId: string) =>
  (await tx.$queryRaw<{ id: string }[]>`SELECT id FROM product_media WHERE product_id = ${productId}::uuid AND is_primary AND detached_at IS NULL`)[0]?.id ?? null;

/** Ảnh sống đầu tiên thành ảnh chính (sau khi gỡ ảnh chính) — không còn ảnh → không có ảnh chính. */
export async function promoteFirst(tx: TenantTx, productId: string): Promise<string | null> {
  const [first] = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM product_media WHERE product_id = ${productId}::uuid AND kind = 'image' AND detached_at IS NULL ORDER BY position, id LIMIT 1`;
  if (!first) return null;
  await tx.$executeRaw`UPDATE product_media SET is_primary = true, version = version + 1 WHERE id = ${first.id}::uuid`;
  return first.id;
}

export async function setPrimary(tx: TenantTx, productId: string, id: string): Promise<void> {
  await tx.$executeRaw`UPDATE product_media SET is_primary = false, version = version + 1 WHERE product_id = ${productId}::uuid AND is_primary AND detached_at IS NULL AND id <> ${id}::uuid`;
  await tx.$executeRaw`UPDATE product_media SET is_primary = true, version = version + 1 WHERE id = ${id}::uuid AND NOT is_primary`;
}

/** Vị trí cuối + đếm theo loại (giới hạn 10 ảnh / 20 tài liệu sống). */
export async function nextSlot(tx: TenantTx, productId: string, kind: MediaKind): Promise<{ position: number; count: number }> {
  const [r] = await tx.$queryRaw<{ n: bigint; p: number | null }[]>`
    SELECT count(*) AS n, max(position) AS p FROM product_media WHERE product_id = ${productId}::uuid AND kind = ${kind}::product_media_kind AND detached_at IS NULL`;
  return { position: (r?.p ?? -1) + 1, count: Number(r?.n ?? 0) };
}

export const holdsFile = async (tx: TenantTx, fileId: string) =>
  !!(await tx.productMedia.findFirst({ where: { fileId, detachedAt: null }, select: { id: true } }));

export const liveByFile = (tx: TenantTx, productId: string, fileId: string) =>
  tx.productMedia.findFirst({ where: { productId, fileId, detachedAt: null } });

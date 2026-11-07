// Biến thể sản phẩm là thực thể riêng (TIP-032b, Blueprint §3.4 `product_variant.*`): SKU unique (không phân biệt hoa thường) giữa các
// biến thể chưa lưu trữ — unique partial ở migration 032b, kiểm trước để trả 409 có lý do; giá string VND không âm (CHECK); tồn chỉ đổi
// qua đơn / stock action. Lưu trữ thay vì xoá: dòng báo giá / đơn cũ giữ tham chiếu, dòng mới không chọn được (đọc / nhập đơn lọc active).
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { UUID } from './catalog-write';

export type VariantRecord = { id: string; productId: string; sku: string; name: string; attrs: unknown; price: bigint | null; status: string; version: number };

/** Khoá dòng biến thể (FOR UPDATE) của sản phẩm còn sống. Không thấy → 404. */
export async function lockVariant(tx: TenantTx, id: string): Promise<VariantRecord> {
  const rows = UUID.test(id) ? await tx.$queryRaw<{ id: string }[]>`SELECT v.id FROM product_variant v JOIN product p ON p.id = v.product_id WHERE v.id = ${id}::uuid AND p.deleted_at IS NULL FOR UPDATE OF v` : [];
  if (!rows[0]) throw new AppError('NOT_FOUND', 404, { variant_id: 'not_found' });
  return (await tx.productVariant.findUniqueOrThrow({ where: { id } })) as VariantRecord;
}

/** SKU đã có ở biến thể chưa lưu trữ khác (hoặc là mã của một sản phẩm còn sống) → 409. */
export async function assertSkuFree(tx: TenantTx, sku: string, selfId: string | null) {
  const hit = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM product_variant WHERE lower(sku) = lower(${sku}) AND status <> 'archived' AND (${selfId}::uuid IS NULL OR id <> ${selfId}::uuid) LIMIT 1`;
  const product = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM product WHERE lower(code) = lower(${sku}) AND deleted_at IS NULL LIMIT 1`;
  if (hit[0] || product[0]) throw new AppError('CONFLICT', 409, { sku: 'duplicate' });
}

export const variantSnap = (v: VariantRecord) => ({ id: v.id, sku: v.sku, name: v.name, attrs: v.attrs, price: v.price === null ? null : String(v.price), status: v.status, version: v.version });
export type VariantSnap = ReturnType<typeof variantSnap>;

/** Khôi phục ảnh chụp (hoàn tác sửa / lưu trữ): SKU phải còn trống nếu bản khôi phục chưa lưu trữ. */
export async function restoreVariant(tx: TenantTx, b: VariantSnap, now: Date) {
  await tx.$queryRaw`SELECT 1 FROM product_variant WHERE id = ${b.id}::uuid FOR UPDATE`;
  if (b.status !== 'archived') await assertSkuFree(tx, b.sku, b.id);
  await tx.productVariant.update({
    where: { id: b.id },
    data: { sku: b.sku, name: b.name, attrs: (b.attrs ?? {}) as object, price: b.price === null ? null : BigInt(b.price), status: b.status as 'active' | 'archived', version: { increment: 1 }, updatedAt: now },
  });
}

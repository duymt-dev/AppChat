// Preview sản phẩm (TIP-023b R2.8): tạo → tên + loại + giá (chuỗi VND) + mã (SKU hoặc mã tự cấp) + danh mục (mới → cảnh báo tạo danh mục)
// + tồn ban đầu; SKU trùng → 409, combo thiếu thành phần → 422 như execute; sửa → trước / sau chỉ trường đổi, `if_version` lệch → 409
// STALE_VERSION; lưu trữ (risk delete) → tên + mã + combo đang chứa sản phẩm. Chỉ đọc — không cấp mã, không tạo danh mục.
import type { ActionInput, ActionPreview, productArchive, productCreate, productUpdate } from '@appchat/actions';
import { AppError, createFmt } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { created, line, preview, removed, updated } from '../../../kernel/actions/preview-kit';
import { liveProduct } from '../../services/catalog-write';

export const money = (v: string | bigint) => createFmt({ locale: 'vi' }).money(String(v));

/** Danh mục theo tên (không phân biệt hoa thường) — chưa có → tên mới sẽ được tạo. */
async function categoryOf(tx: TenantTx, name: string | undefined) {
  const n = name?.trim();
  if (!n) return { name: undefined, isNew: false };
  const hit = await tx.$queryRaw<{ name: string }[]>`SELECT name FROM product_category WHERE lower(name) = lower(${n}) LIMIT 1`;
  return { name: hit[0]?.name ?? n, isNew: !hit[0] };
}

export async function createPreview(tx: TenantTx, i: ActionInput<typeof productCreate>): Promise<ActionPreview> {
  if (i.type === 'combo' && !i.components?.length) throw new AppError('VALIDATION_FAILED', 422, { components: 'required' });
  const sku = i.sku?.trim();
  if (sku && (await tx.product.findUnique({ where: { code: sku }, select: { id: true } }))) throw new AppError('CONFLICT', 409, { sku: 'duplicate' });
  const cat = await categoryOf(tx, i.category);
  return preview('write', line(i.name.trim(), money(i.price)), {
    changes: [created('product', { name: i.name.trim(), type: i.type, price: i.price, code: sku, category: cat.name, stock: i.type === 'physical' && i.stock ? i.stock : undefined, components: i.components?.length })],
    ...(cat.isNew ? { warnings: [`new_category:${cat.name}`] } : {}),
  });
}

export async function updatePreview(tx: TenantTx, i: ActionInput<typeof productUpdate>): Promise<ActionPreview> {
  const p = await liveProduct(tx, i.product_id);
  if (i.if_version !== undefined && i.if_version !== p.version) throw new AppError('STALE_VERSION', 409, { version: String(p.version) });
  const x = i.patch;
  if (x.type && x.type !== p.type) throw new AppError('VALIDATION_FAILED', 422, { 'patch.type': 'immutable' });
  const sku = x.sku?.trim() && x.sku.trim() !== p.code ? x.sku.trim() : undefined;
  if (sku && (await tx.product.findUnique({ where: { code: sku }, select: { id: true } }))) throw new AppError('CONFLICT', 409, { sku: 'duplicate' });
  const curCat = p.categoryId ? (await tx.productCategory.findUnique({ where: { id: p.categoryId }, select: { name: true } }))?.name ?? null : null;
  const cat = x.category !== undefined ? await categoryOf(tx, x.category) : null;
  const cur = { name: p.name, price: String(p.price), unit: p.unit, code: p.code, category: curCat, status: p.status };
  const patch = { name: x.name?.trim(), price: x.price, unit: x.unit?.trim() || undefined, code: sku, category: cat ? (cat.name ?? null) : undefined, status: x.status };
  return preview('write', line(p.code, p.name), { changes: updated('product', p.id, cur, patch), ...(cat?.isNew ? { warnings: [`new_category:${cat.name}`] } : {}) });
}

export async function archivePreview(tx: TenantTx, i: ActionInput<typeof productArchive>): Promise<ActionPreview> {
  const p = await liveProduct(tx, i.product_id);
  const parents = await tx.productComponent.findMany({ where: { childId: p.id }, select: { product: { select: { name: true } } } });
  return preview('delete', line(p.code, p.name), {
    changes: [removed('product', p.id, { name: p.name, code: p.code, price: String(p.price) })],
    ...(parents.length ? { warnings: parents.map((x) => `in_combo:${x.product.name}`) } : {}),
  });
}

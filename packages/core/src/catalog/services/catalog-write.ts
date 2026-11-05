// Ghi catalog dùng chung cho handler (transaction của executor): danh mục theo tên (tạo nếu chưa có), thành phần combo theo tên,
// biến thể sinh từ thuộc tính (≤ 24 — prototype), sổ kho `stock_movement` (concurrency §3 — khoá dòng sản phẩm rồi ghi movement +
// cache `product.stock` cùng transaction; unique (ref_type, ref_id, product_id) chống ghi đôi khi chạy lại).
import { AppError, CATEGORY_COLORS, validateCustomValues, type AuthzContext, type CustomValues } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { fieldDefs } from '../../crm/public';

export const MAX_VARIANTS = 24;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Attr = { name: string; values: string[] };

/** Danh mục theo tên (không phân biệt hoa thường); chưa có → tạo với màu kế tiếp. `''` / undefined → không phân loại. */
export async function categoryByName(tx: TenantTx, name: string | undefined, now: Date): Promise<string | null> {
  const n = name?.trim();
  if (!n) return null;
  const hit = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM product_category WHERE lower(name) = lower(${n}) LIMIT 1`;
  if (hit[0]) return hit[0].id;
  const count = await tx.productCategory.count();
  const id = uuidv7(now.getTime());
  // ON CONFLICT: hai request tạo cùng tên song song → một bản ghi (index unique lower(name)).
  await tx.$executeRaw`INSERT INTO product_category (id, name, color, sort, created_at)
    VALUES (${id}::uuid, ${n}, ${CATEGORY_COLORS[count % CATEGORY_COLORS.length]!}, ${count}, ${now}) ON CONFLICT DO NOTHING`;
  const row = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM product_category WHERE lower(name) = lower(${n}) LIMIT 1`;
  return row[0]!.id;
}

/** Thành phần combo theo tên sản phẩm còn sống (không dấu không phân biệt) — tên lạ / trỏ chính nó → 422. */
export async function componentsByName(tx: TenantTx, list: { name: string; qty: number }[], selfId: string | null) {
  const out: { childId: string; qty: number }[] = [];
  for (const [i, c] of list.entries()) {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM product WHERE deleted_at IS NULL AND (f_unaccent(lower(name)) = f_unaccent(lower(${c.name.trim()})) OR lower(code) = lower(${c.name.trim()}))
      ORDER BY created_at LIMIT 1`;
    const id = rows[0]?.id;
    if (!id || id === selfId) throw new AppError('VALIDATION_FAILED', 422, { [`components.${i}.name`]: 'not_found' });
    const dup = out.find((x) => x.childId === id);
    if (dup) dup.qty += c.qty;
    else out.push({ childId: id, qty: c.qty });
  }
  return out;
}

export async function writeComponents(tx: TenantTx, productId: string, list: { childId: string; qty: number }[]) {
  await tx.productComponent.deleteMany({ where: { productId } });
  if (list.length) await tx.productComponent.createMany({ data: list.map((c) => ({ productId, childId: c.childId, qty: c.qty })) });
}

/** Tổ hợp biến thể của thuộc tính (thứ tự như form — `variantsOf` FE). */
export function combos(attrs: Attr[]): Record<string, string>[] {
  const lists = attrs.filter((a) => a.name.trim() && a.values.length);
  if (!lists.length) return [];
  let acc: Record<string, string>[] = [{}];
  for (const a of lists) acc = acc.flatMap((c) => a.values.map((v) => ({ ...c, [a.name.trim()]: v.trim() })));
  return acc.slice(0, MAX_VARIANTS);
}

/** Ghi lại biến thể từ thuộc tính; biến thể trùng tên giữ id / tồn cũ, biến thể không còn → lưu trữ nếu đã có dòng báo giá / đơn tham
 * chiếu (giữ lịch sử — TIP-032b), chưa có → xoá. Biến thể đã lưu trữ không tự hồi sinh (khôi phục qua action biến thể). */
export async function syncVariants(tx: TenantTx, p: { id: string; code: string }, attrs: Attr[], now: Date) {
  const want = combos(attrs);
  const cur = await tx.productVariant.findMany({ where: { productId: p.id, status: { not: 'archived' } }, select: { id: true, name: true } });
  const names = want.map((c) => Object.values(c).join(' · '));
  const keep = new Set(cur.filter((v) => names.includes(v.name)).map((v) => v.id));
  const gone = cur.filter((v) => !keep.has(v.id)).map((v) => v.id);
  const used = gone.length ? new Set((await tx.orderItem.findMany({ where: { variantId: { in: gone } }, select: { variantId: true }, distinct: ['variantId'] })).map((r) => r.variantId)) : new Set();
  const archive = gone.filter((id) => used.has(id));
  if (archive.length) await tx.productVariant.updateMany({ where: { id: { in: archive } }, data: { status: 'archived', version: { increment: 1 }, updatedAt: now } });
  await tx.productVariant.deleteMany({ where: { id: { in: gone.filter((id) => !used.has(id)) } } });
  const have = new Set(cur.filter((v) => keep.has(v.id)).map((v) => v.name));
  const fresh = want.map((c, i) => ({ c, i, name: names[i]! })).filter((x) => !have.has(x.name));
  if (!fresh.length) return;
  // SKU tự sinh `<mã>-<n>`; đã có ở biến thể chưa lưu trữ (unique partial) → thêm hậu tố cho tới khi trống.
  const prefix = `${p.code.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}-%`;
  const taken = new Set((await tx.$queryRaw<{ sku: string }[]>`SELECT lower(sku) AS sku FROM product_variant WHERE status <> 'archived' AND lower(sku) LIKE ${prefix}`).map((r) => r.sku));
  const skuOf = (n: number) => {
    let sku = `${p.code}-${n}`;
    for (let k = 2; taken.has(sku.toLowerCase()); k++) sku = `${p.code}-${n}-${k}`;
    taken.add(sku.toLowerCase());
    return sku;
  };
  await tx.productVariant.createMany({
    data: fresh.map((x) => ({ id: uuidv7(now.getTime()), productId: p.id, sku: skuOf(x.i + 1), name: x.name, attrs: x.c, createdAt: now, updatedAt: now })),
  });
}

export const fieldRole = (authz: AuthzContext, roleKey: string) => (authz.isOwner ? 'owner' : roleKey);

export async function checkCustom(tx: TenantTx, values: CustomValues | undefined, role: string, mode: 'create' | 'update') {
  if (mode === 'update' && values === undefined) return;
  const errs = validateCustomValues(await fieldDefs(tx, 'product'), values, role, mode);
  if (Object.keys(errs).length) throw new AppError('VALIDATION_FAILED', 422, errs);
}

export async function liveProduct(tx: TenantTx, id: string) {
  const p = UUID.test(id) ? await tx.product.findUnique({ where: { id } }) : null;
  if (!p || p.deletedAt) throw new AppError('NOT_FOUND', 404, { product_id: 'not_found' });
  return p;
}

export interface Movement {
  productId: string;
  kind: 'sale' | 'return' | 'adjust' | 'import';
  qty: number;
  refType: string;
  refId: string;
  reason?: string | null;
  actorId?: string | null;
  variantId?: string | null;
}

/**
 * Ghi một dòng sổ kho + cập nhật tồn cache trong transaction đang mở (dùng chung cho đơn hàng TIP-031). Khoá dòng sản phẩm
 * (`FOR UPDATE`) trước khi đọc → hai lệnh song song không mất số. Ghi lại cùng (ref_type, ref_id, product_id) → bỏ qua (idempotent).
 * Trả tồn sau ghi + cờ `low` (≤ ngưỡng — cho âm, chỉ cảnh báo, COMMERCE §2).
 */
export async function recordMovement(tx: TenantTx, m: Movement, now: Date): Promise<{ stock: number; low: boolean; applied: boolean; movementId: string | null }> {
  const rows = await tx.$queryRaw<{ stock: number | null; low_stock_threshold: number | null }[]>`
    SELECT stock, low_stock_threshold FROM product WHERE id = ${m.productId}::uuid FOR UPDATE`;
  const row = rows[0];
  if (!row) throw new AppError('NOT_FOUND', 404, { product_id: 'not_found' });
  const id = uuidv7(now.getTime());
  const n = await tx.$executeRaw`INSERT INTO stock_movement (id, product_id, variant_id, kind, qty, ref_type, ref_id, reason, actor_id, created_at)
    VALUES (${id}::uuid, ${m.productId}::uuid, ${m.variantId ?? null}::uuid, ${m.kind}::stock_movement_kind, ${m.qty}, ${m.refType}, ${m.refId}, ${m.reason ?? null}, ${m.actorId ?? null}, ${now})
    ON CONFLICT (ref_type, ref_id, product_id) DO NOTHING`;
  const before = row.stock ?? 0;
  const stock = n ? before + m.qty : before;
  if (n) await tx.product.update({ where: { id: m.productId }, data: { stock } });
  return { stock, low: lowOf(stock, row.low_stock_threshold), applied: n > 0, movementId: n ? id : null };
}

/** Sắp hết: tồn ≤ ngưỡng (mặc định 0 — chỉ hết / âm mới cảnh báo). */
export const lowOf = (stock: number | null, threshold: number | null) => stock !== null && stock <= (threshold ?? 0);

// Ghi một dòng nhập sản phẩm (TIP-032b) + biên nhận `product_import_row (import_id, row_no)` trong CÙNG transaction: dòng đã có biên nhận
// → bỏ qua (chạy lại / huỷ / worker khởi động lại không nhập lại); biên nhận cùng row_no khác `payload_hash` → 409 (tệp đã đổi giữa hai lần
// chạy). SKU trùng sản phẩm còn sống → cập nhật sản phẩm đó (giá / tên / mô tả / thuế / đơn vị / danh mục — không đổi loại, không đổi tồn:
// tồn chỉ qua stock action); không SKU / SKU mới → tạo (mã = SKU hoặc mã tự cấp). Sản phẩm đã lưu trữ cùng SKU không hồi sinh → lỗi dòng.
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { nextCode } from '../../kernel/sequence';
import { categoryByName } from '../services/catalog-write';
import { normalizeDescription } from '../description/normalize';
import type { RowError, ValidRow } from './validate';

export type RowOutcome = 'created' | 'updated' | 'failed' | 'skipped';

/** Biên nhận đã có của dòng: khớp hash → 'skipped'; lệch → 409. */
async function prior(tx: TenantTx, importId: string, rowNo: number, hash: string): Promise<'skipped' | null> {
  const r = await tx.productImportRow.findUnique({ where: { importId_rowNo: { importId, rowNo } }, select: { payloadHash: true } });
  if (!r) return null;
  if (r.payloadHash !== hash) throw new AppError('CONFLICT', 409, { row: 'payload_mismatch' });
  return 'skipped';
}

const receipt = (tx: TenantTx, importId: string, rowNo: number, hash: string, status: 'created' | 'updated' | 'failed', productId: string | null, error: string | null, now: Date) =>
  tx.$executeRaw`INSERT INTO product_import_row (import_id, row_no, payload_hash, status, product_id, error, created_at)
    VALUES (${importId}::uuid, ${rowNo}, ${hash}, ${status}, ${productId}::uuid, ${error}, ${now}) ON CONFLICT (import_id, row_no) DO NOTHING`;

export async function writeRow(tx: TenantTx, importId: string, r: ValidRow | RowError, actorId: string | null, now: Date): Promise<RowOutcome> {
  const seen = await prior(tx, importId, r.rowNo, r.hash);
  if (seen) return seen;
  if ('error' in r) {
    await receipt(tx, importId, r.rowNo, r.hash, 'failed', null, r.error, now);
    return 'failed';
  }
  const categoryId = r.category ? await categoryByName(tx, r.category, now) : undefined;
  const cols = {
    name: r.name,
    price: BigInt(r.price),
    ...(r.unit ? { unit: r.unit } : {}),
    ...(r.taxRate !== undefined ? { taxRate: r.taxRate } : {}),
    ...(categoryId !== undefined ? { categoryId } : {}),
    ...(r.sessions ? { sessions: r.sessions } : {}),
    ...(r.validDays ? { validDays: r.validDays } : {}),
  };
  const hit = r.sku ? await tx.$queryRaw<{ id: string; type: string; deleted_at: Date | null }[]>`SELECT id, type::text, deleted_at FROM product WHERE lower(code) = lower(${r.sku}) LIMIT 1 FOR UPDATE` : [];
  const p = hit[0];
  if (p?.deleted_at) {
    await receipt(tx, importId, r.rowNo, r.hash, 'failed', p.id, 'sku:archived', now);
    return 'failed';
  }
  if (p && r.typeGiven && p.type !== r.type) {
    await receipt(tx, importId, r.rowNo, r.hash, 'failed', p.id, 'type:immutable', now);
    return 'failed';
  }
  if (p) {
    // Mô tả qua cùng bộ chuẩn hoá với product.update (TIP-027b §2.3): chữ thuần trùng chữ hiện có → giữ định dạng; khác → một đoạn mỗi dòng.
    const cur = r.description || r.descriptionDoc ? await tx.product.findUnique({ where: { id: p.id }, select: { description: true, descriptionDoc: true } }) : null;
    const desc = r.descriptionDoc ? normalizeDescription({ description_doc: r.descriptionDoc }, cur) : r.description ? normalizeDescription({ description: r.description }, cur) : {};
    await tx.product.update({ where: { id: p.id }, data: { ...cols, ...desc, version: { increment: 1 }, updatedAt: now } });
    await receipt(tx, importId, r.rowNo, r.hash, 'updated', p.id, null, now);
    return 'updated';
  }
  const id = uuidv7(now.getTime());
  const code = r.sku ?? (await nextCode(tx, 'product'));
  await tx.product.create({ data: { ...cols, ...(r.descriptionDoc ? normalizeDescription({ description_doc: r.descriptionDoc }, null) : r.description ? normalizeDescription({ description: r.description }, null) : {}), id, code, type: r.type, unit: r.unit ?? 'Cái', stock: r.type === 'physical' ? 0 : null, createdBy: actorId, createdAt: now, updatedAt: now } });
  await receipt(tx, importId, r.rowNo, r.hash, 'created', id, null, now);
  return 'created';
}

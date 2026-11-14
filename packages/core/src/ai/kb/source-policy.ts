// Chính sách nguồn KB (TIP-020b, rag §2–3): visibility nguồn mới = giá trị chỉ định, bỏ trống → mặc định của thư mục (đọc trong
// transaction — không tin FE), không thư mục → public; nguồn lưu snapshot (đổi thư mục / đổi mặc định thư mục sau đó không đổi nguồn cũ).
// Nguồn đồng bộ catalog (`origin=catalog`) là bản sao của sản phẩm — người / agent không sửa, xoá, hoàn tác được; consumer catalog-sync
// ghi thẳng repo nên không đi qua guard này.
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

export type KbVisibility = 'public' | 'internal';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Thư mục tồn tại (id lạ / tenant khác → 404) — trả visibility mặc định của nó. */
export async function folderVisibility(tx: TenantTx, id: string | null): Promise<KbVisibility | null> {
  if (!id) return null;
  const f = UUID.test(id) ? await tx.kbFolder.findUnique({ where: { id }, select: { visibility: true } }) : null;
  if (!f) throw new AppError('NOT_FOUND', 404, { folder_id: 'not_found' });
  return f.visibility;
}

/** Visibility nguồn mới: chỉ định > mặc định thư mục > public. */
export function resolveVisibility(explicit: KbVisibility | undefined, folder: KbVisibility | null): KbVisibility {
  return explicit ?? folder ?? 'public';
}

/** Chặn sửa / xoá / hoàn tác nguồn đồng bộ từ catalog — sửa sản phẩm gốc, catalog-sync cập nhật nguồn. */
export function assertEditable(s: { origin: string; productId?: string | null }): void {
  if (s.origin === 'catalog') throw new AppError('CONFLICT', 409, { source_id: 'catalog_managed', reason: 'edit_product', ...(s.productId ? { product_id: s.productId } : {}) });
}

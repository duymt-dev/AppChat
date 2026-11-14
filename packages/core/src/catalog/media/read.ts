// Đọc media sản phẩm (TIP-027b §1.5, §3.1, §4.3): id trước theo (product_id, kind, position, id) trên index một phần sống, ≤ 50 dòng; rồi
// nạp metadata tệp MỘT lượt cho đúng các id đã chọn (không N+1, không đọc bytes). Không storage key / URL — tải qua route đã kiểm quyền
// sản phẩm hiện hành. Sản phẩm lưu trữ → 404 (ẩn media theo cha). Quyền đọc = catalog.view (không theo người tải, không giá vốn).
import { AppError, can, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { MEDIA_LIMITS, UUID, liveMedia, mediaVersion, type MediaKind } from './repository';

export async function readableProduct(tx: TenantTx, id: string) {
  const p = UUID.test(id) ? await tx.product.findUnique({ where: { id }, select: { id: true, code: true, name: true, deletedAt: true } }) : null;
  if (!p || p.deletedAt) throw new AppError('NOT_FOUND', 404, { product_id: 'not_found' });
  return p;
}

export const canEdit = (authz: AuthzContext) => authz.isOwner || can(authz, 'catalog.manage');

export async function listMedia(tx: TenantTx, authz: AuthzContext, productId: string, kind?: MediaKind) {
  await readableProduct(tx, productId);
  const [rows, version] = await Promise.all([liveMedia(tx, productId, kind), mediaVersion(tx, productId)]);
  const files = new Map((rows.length ? await tx.file.findMany({ where: { id: { in: rows.map((r) => r.file_id) } }, select: { id: true, name: true, mime: true, size: true } }) : []).map((f) => [f.id, f]));
  const items = rows.map((r) => {
    const f = files.get(r.file_id);
    return { media_id: r.id, file_id: r.file_id, kind: r.kind, name: f?.name ?? '', mime: f?.mime ?? '', bytes: Number(f?.size ?? 0), position: r.position, is_primary: r.is_primary, version: r.version, created_at: r.created_at.toISOString(), available: !!f };
  });
  return { items, version, can_edit: canEdit(authz), limits: { ...MEDIA_LIMITS } };
}

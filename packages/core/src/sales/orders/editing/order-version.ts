// Phiên bản dòng đơn (TIP-032c §2): trigger `commerce_row_guard` tăng `version` mỗi UPDATE thành công của dòng cha (handler, đồng bộ sàn,
// sổ thu, kho) — app không tự cộng. Khoá đơn theo thứ tự chung (khách gốc → đơn) rồi so `if_version` trên dòng đã khoá TRƯỚC khi dựng patch
// hay đụng kho. Biên nhận hoàn tác lưu `after_version` = phiên bản cuối sau toàn bộ ghi của action (đọc lại sau mọi hook).
import { AppError, assertVersion, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { lockContactRow } from '../../../kernel/ownership/root-lock';
import { UUID, visibleOrder, type OrderRecord } from '../order-access';

/** Khoá khách gốc của đơn → khoá đơn → kiểm quyền GHI → so `if_version` (lệch → 409 STALE_VERSION). Đơn đổi khách giữa chừng → 409. */
export async function lockOrderVersion(tx: TenantTx, authz: AuthzContext, id: string, ifVersion?: number): Promise<OrderRecord> {
  if (UUID.test(id)) {
    const pre = (await tx.$queryRaw<{ contact_id: string }[]>`SELECT contact_id FROM "order" WHERE id = ${id}::uuid`)[0];
    await lockContactRow(tx, pre?.contact_id);
    await tx.$queryRaw`SELECT 1 FROM "order" WHERE id = ${id}::uuid FOR UPDATE`;
    const o = await visibleOrder(tx, authz, id, 'write');
    if (pre && o.contactId !== pre.contact_id) throw new AppError('CONFLICT', 409, { contact_id: 'changed' });
    assertVersion(o.version, ifVersion);
    return o;
  }
  return visibleOrder(tx, authz, id, 'write');
}

/** Phiên bản cuối của đơn trong transaction hiện tại (sau mọi ghi của action). */
export async function orderVersion(tx: TenantTx, id: string): Promise<number> {
  return (await tx.order.findUniqueOrThrow({ where: { id }, select: { version: true } })).version;
}

/** Biên nhận hoàn tác: chưa có / không có phiên bản tin cậy (log cũ) → 409; đơn đã có bản ghi sau (kể cả sửa không liên quan) → 409. */
export function assertReceiptFresh(current: number, receipt: { after_version?: unknown }) {
  if (typeof receipt.after_version !== 'number') throw new AppError('CONFLICT', 409, { receipt: 'legacy' });
  if (current !== receipt.after_version) throw new AppError('CONFLICT', 409, { version: 'changed' });
}

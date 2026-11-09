// Kiểm kê Lịch hẹn cho "Quên khách" (TIP-015c §2.3 hàng 8): giữ amounts/state/usage/SLA/IDs; chỉ ghi chú tự do đổi được — ở pha 1
// coi cả bản ghi là exclusive (xoá sau này chỉ scrub cột ghi chú, không xoá dòng — cleanup.ts pha sau quyết định cụ thể).
import type { TenantTx } from '../../kernel/actions/action-context';
import { idsSql, toInventory, type InvRow } from '../../kernel/privacy/sql';

export async function bookingInventory(tx: TenantTx, contactIds: readonly string[]) {
  const ids = idsSql(contactIds);
  const rows = await tx.$queryRaw<InvRow[]>`SELECT 'appointment' AS kind, id AS record_id, 1 AS revision, 'exclusive' AS ownership FROM appointment WHERE contact_id = ANY(${ids})`;
  return toInventory(rows);
}

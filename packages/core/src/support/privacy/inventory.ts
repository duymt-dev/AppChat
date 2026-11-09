// Kiểm kê Ticket cho "Quên khách" (TIP-015c §2.3 hàng 8): giữ amounts/state/SLA/IDs; ticket có contact_id null (đã ẩn danh trước) bỏ qua.
import type { TenantTx } from '../../kernel/actions/action-context';
import { idsSql, toInventory, type InvRow } from '../../kernel/privacy/sql';

export async function supportInventory(tx: TenantTx, contactIds: readonly string[]) {
  const ids = idsSql(contactIds);
  const rows = await tx.$queryRaw<InvRow[]>`SELECT 'ticket' AS kind, id AS record_id, 1 AS revision, 'exclusive' AS ownership FROM ticket WHERE contact_id = ANY(${ids})`;
  return toInventory(rows);
}

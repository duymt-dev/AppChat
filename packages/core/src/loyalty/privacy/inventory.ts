// Kiểm kê Khách thân thiết cho "Quên khách" (TIP-015c §2.3 hàng 8/10): sổ điểm giữ amounts/balance (bằng chứng kế toán điểm) —
// retained_issued (không xoá dòng sổ cộng dồn, chỉ scrub `note` tự do ở pha sau).
import type { TenantTx } from '../../kernel/actions/action-context';
import { idsSql, toInventory, type InvRow } from '../../kernel/privacy/sql';

export async function loyaltyInventory(tx: TenantTx, contactIds: readonly string[]) {
  const ids = idsSql(contactIds);
  const rows = await tx.$queryRaw<InvRow[]>`SELECT 'loyalty_ledger' AS kind, id AS record_id, 1 AS revision, 'exclusive' AS ownership, true AS retained_issued FROM loyalty_ledger WHERE contact_id = ANY(${ids})`;
  return toInventory(rows);
}

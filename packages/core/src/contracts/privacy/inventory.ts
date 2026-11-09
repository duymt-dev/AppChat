// Kiểm kê Hợp đồng cho "Quên khách" (TIP-015c §2.3 hàng 10, DC-259): đã KÝ (status=signed) hoặc đang có hiệu lực pháp lý
// (pending_signature trở lên) = retained_issued; nháp (draft/pending_approval) = exclusive, xoá được.
import type { TenantTx } from '../../kernel/actions/action-context';
import { idsSql, toInventory, type InvRow } from '../../kernel/privacy/sql';

export async function contractsInventory(tx: TenantTx, contactIds: readonly string[]) {
  const ids = idsSql(contactIds);
  const rows = await tx.$queryRaw<InvRow[]>`
    SELECT 'contract' AS kind, id AS record_id, version AS revision, 'exclusive' AS ownership,
      (status IN ('pending_signature', 'signed')) AS retained_issued
      FROM contract WHERE contact_id = ANY(${ids})`;
  return toInventory(rows);
}

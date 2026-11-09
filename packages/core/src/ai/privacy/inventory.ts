// Kiểm kê AI cho "Quên khách" (TIP-015c §2.3 hàng 5): AI Run/Step/Assistant message gắn qua conversation_id → join conversation.contact_id.
// Chỉ hội thoại TRỰC TIẾP của khách tính exclusive (nhóm → shared, nhất quán với inbox/privacy/inventory.ts).
import type { TenantTx } from '../../kernel/actions/action-context';
import { idsSql, toInventory, type InvRow } from '../../kernel/privacy/sql';

export async function aiInventory(tx: TenantTx, contactIds: readonly string[]) {
  const ids = idsSql(contactIds);
  const rows = await tx.$queryRaw<InvRow[]>`
    SELECT 'ai_run' AS kind, r.id AS record_id, 1 AS revision, CASE WHEN c.kind = 'direct' THEN 'exclusive' ELSE 'shared' END AS ownership
      FROM ai_run r JOIN conversation c ON c.id = r.conversation_id
      WHERE c.contact_id = ANY(${ids})`;
  return toInventory(rows);
}

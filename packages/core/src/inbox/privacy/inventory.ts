// Kiểm kê Hộp thư cho "Quên khách" (TIP-015c §2.3 hàng 3-4): hội thoại TRỰC TIẾP (kind=direct) của khách = exclusive (xoá nội dung
// được — DC264); hội thoại NHÓM (kind=group, khách chỉ là một thành viên) = shared (DC265 cách ly, không xoá của người khác).
import type { TenantTx } from '../../kernel/actions/action-context';
import { idsSql, toInventory, type InvRow } from '../../kernel/privacy/sql';

export async function inboxInventory(tx: TenantTx, contactIds: readonly string[]) {
  const ids = idsSql(contactIds);
  const rows = await tx.$queryRaw<InvRow[]>`
    SELECT 'conversation_direct' AS kind, id AS record_id, 1 AS revision, 'exclusive' AS ownership
      FROM conversation WHERE contact_id = ANY(${ids}) AND kind = 'direct'
    UNION ALL
    SELECT 'conversation_group_membership', conversation_id, 1, 'shared'
      FROM conversation_participant WHERE contact_id = ANY(${ids})
    UNION ALL
    SELECT 'message_direct', m.id, 1, 'exclusive'
      FROM message m JOIN conversation c ON c.id = m.conversation_id
      WHERE c.contact_id = ANY(${ids}) AND c.kind = 'direct'`;
  return toInventory(rows);
}

// Kiểm kê CRM cho "Quên khách" (TIP-015c §2.3 bảng disposition — hàng 1): identity/custom/tags/collaborators/access request/
// timeline/note/activity đều "scrub exclusive operational PII" — exclusive theo contact (không chia sẻ nhóm/người khác).
import type { TenantTx } from '../../kernel/actions/action-context';
import { idsSql, toInventory, type InvRow } from '../../kernel/privacy/sql';

export async function crmInventory(tx: TenantTx, contactIds: readonly string[]) {
  const ids = idsSql(contactIds);
  const rows = await tx.$queryRaw<InvRow[]>`
    SELECT 'contact_identity' AS kind, id AS record_id, 1 AS revision, 'exclusive' AS ownership FROM contact_identity WHERE contact_id = ANY(${ids})
    UNION ALL SELECT 'contact_tag', contact_id, 1, 'exclusive' FROM contact_tag WHERE contact_id = ANY(${ids})
    UNION ALL SELECT 'contact_collaborator', contact_id, 1, 'exclusive' FROM contact_collaborator WHERE contact_id = ANY(${ids})
    UNION ALL SELECT 'contact_access_request', id, 1, 'exclusive' FROM contact_access_request WHERE contact_id = ANY(${ids})
    UNION ALL SELECT 'timeline_event', id, 1, 'exclusive' FROM timeline_event WHERE contact_id = ANY(${ids})
    UNION ALL SELECT 'contact_note', id, version, 'exclusive' FROM contact_note WHERE contact_id = ANY(${ids}) AND deleted_at IS NULL
    UNION ALL SELECT 'contact_task', id, 1, 'exclusive' FROM contact_task WHERE contact_id = ANY(${ids})
    UNION ALL SELECT 'contact_opportunity', id, 1, 'exclusive' FROM contact_opportunity WHERE contact_id = ANY(${ids})`;
  return toInventory(rows);
}

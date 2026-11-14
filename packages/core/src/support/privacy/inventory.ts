// Kiểm kê Ticket cho "Quên khách" (TIP-015c §2.3 hàng 8): giữ amounts/state/SLA/IDs; ticket có contact_id null (đã ẩn danh trước) bỏ qua.
// TIP-034d: dấu vết quan sát tồn ticket theo nguồn GỐC lúc chụp (kể cả ticket đã xoá cứng / đổi khách) + tập đóng góp kết quả action theo
// khoá nguồn chuẩn hoá (index — không quét JSON). Ghi thành artifact `ticket_stock` theo id ticket (một dòng / ticket) — erase xoá mọi
// dòng quan sát + kết quả có ticket đó góp số.
import type { TenantTx } from '../../kernel/actions/action-context';
import { idsSql, toInventory, type InvRow } from '../../kernel/privacy/sql';

export async function supportInventory(tx: TenantTx, contactIds: readonly string[]) {
  const ids = idsSql(contactIds);
  const rows = await tx.$queryRaw<InvRow[]>`SELECT 'ticket' AS kind, id AS record_id, 1 AS revision, 'exclusive' AS ownership FROM ticket WHERE contact_id = ANY(${ids})`;
  const [schema] = await tx.$queryRaw<{ ok: boolean }[]>`SELECT to_regclass('ticket_stock_result_source') IS NOT NULL AS ok`;
  if (!schema?.ok) return toInventory(rows);
  const stock = await tx.$queryRaw<InvRow[]>`
    SELECT DISTINCT 'ticket_stock' AS kind, x.ticket_id AS record_id, 1 AS revision, 'exclusive' AS ownership FROM (
      SELECT o.ticket_id FROM ticket_stock_observation o WHERE o.source_contact_id = ANY(${ids})
      UNION SELECT o.ticket_id FROM ticket_stock_observation o JOIN conversation c ON c.id = o.source_conversation_id WHERE c.contact_id = ANY(${ids})
      UNION SELECT s.ticket_id FROM ticket_stock_result_source s WHERE s.source_kind = 'contact' AND s.source_id = ANY(${ids})
      UNION SELECT s.ticket_id FROM ticket_stock_result_source s JOIN conversation c ON c.id = s.source_id WHERE s.source_kind = 'conversation' AND c.contact_id = ANY(${ids})
    ) x`;
  return toInventory([...rows, ...stock]);
}

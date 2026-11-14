// Kiểm kê Kernel cho "Quên khách" (TIP-015c §2.3 hàng 7): ActionLog/Idempotency/Notifications/secret-vault không có cột contact_id
// lập chỉ mục (nội dung nằm trong JSON input/before/after) — pha sau cần legacy-scanner quét JSON theo con trỏ (SPEC3 §3.3).
// TIP-003b §6.1: event outbox v2 có aggregate lập chỉ mục — liệt kê event của stream khách (aggregate_kind = 'contact') qua index
// (kind, id, seq), không quét JSON. Event v1 cũ chưa có aggregate → vẫn chờ legacy-scanner.
import type { TenantTx } from '../actions/action-context';
import { idsSql, toInventory, type InvRow } from './sql';
import type { InventoryArtifact } from './types';

export async function kernelInventory(tx: TenantTx, contactIds: readonly string[]): Promise<InventoryArtifact[]> {
  if (!contactIds.length) return [];
  const rows = await tx.$queryRaw<InvRow[]>`
    SELECT 'outbox_event' AS kind, id AS record_id, 1 AS revision, 'exclusive' AS ownership
      FROM outbox_event WHERE aggregate_kind = 'contact' AND aggregate_id = ANY(${idsSql(contactIds)}) AND aggregate_seq IS NOT NULL`;
  return toInventory(rows);
}

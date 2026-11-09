// Kiểm kê Kernel cho "Quên khách" (TIP-015c §2.3 hàng 7): ActionLog/Idempotency/Outbox/Notifications/secret-vault không có cột
// contact_id lập chỉ mục (nội dung nằm trong JSON input/before/after) — quét theo contact ở pha 1 sẽ không có chỉ mục, rỗng ở đây;
// pha sau cần legacy-scanner quét JSON theo con trỏ (SPEC3 §3.3), không phải truy vấn SQL trực tiếp như 12 domain khác.
import type { TenantTx } from '../actions/action-context';
import type { InventoryArtifact } from './types';

export async function kernelInventory(_tx: TenantTx, _contactIds: readonly string[]): Promise<InventoryArtifact[]> {
  void _tx;
  void _contactIds;
  return [];
}

// Kiểm kê Nhập/xuất dữ liệu cho "Quên khách" (TIP-015c §2.3 hàng 11): kế hoạch/dòng/xem trước/xuất của 038b — rỗng ở pha 1 (plan
// không khoá theo contact_id đơn lẻ, cần duyệt lại khi pha "files/review" nối revoke export link cũ).
import type { TenantTx } from '../../kernel/actions/action-context';
import type { InventoryArtifact } from '../../kernel/privacy/types';

export async function dataTransferInventory(_tx: TenantTx, _contactIds: readonly string[]): Promise<InventoryArtifact[]> {
  void _tx;
  void _contactIds;
  return [];
}

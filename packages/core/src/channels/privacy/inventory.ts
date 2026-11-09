// Kiểm kê Kênh cho "Quên khách" (TIP-015c §2.3 hàng 8): bảng domain này không có cột contact_id trực tiếp — liên kết khách nằm ở
// contact_identity (CRM, đã kiểm trong crm/privacy/inventory.ts). Domain chỉ trả rỗng — KHÔNG bỏ đăng ký port (fail-closed vẫn áp
// cho identity token / dedupe / route, xử lý riêng ở kernel/privacy/identity-tokens.ts theo §4, không qua inventory chung).
import type { TenantTx } from '../../kernel/actions/action-context';
import type { InventoryArtifact } from '../../kernel/privacy/types';

export async function channelsInventory(_tx: TenantTx, _contactIds: readonly string[]): Promise<InventoryArtifact[]> {
  void _tx;
  void _contactIds;
  return [];
}

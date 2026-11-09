// Kiểm kê Tích hợp cho "Quên khách" (TIP-015c §2.3 hàng 9): external order / mail audience chưa có cột contact_id trực tiếp ở
// pha 1 — rỗng, không bỏ port (fail-closed giữ nguyên, đủ chỗ đăng ký khi pha sau nối theo đúng bảng tích hợp).
import type { TenantTx } from '../../kernel/actions/action-context';
import type { InventoryArtifact } from '../../kernel/privacy/types';

export async function integrationsInventory(_tx: TenantTx, _contactIds: readonly string[]): Promise<InventoryArtifact[]> {
  void _tx;
  void _contactIds;
  return [];
}

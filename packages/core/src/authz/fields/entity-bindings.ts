// Ràng buộc trường hệ thống / dẫn xuất theo quyền hành động (TIP-045b annex C): giữ nguyên ma trận quyền đã chốt (rbac §3.5) — không thêm
// permission mới. Trường hệ thống ẩn khi người xem thiếu quyền tương ứng; agent trực kênh không có quyền nào ở đây trừ khi tool được cấp.
import type { AuthzContext, CustomFieldEntity, PermissionKey } from '@appchat/shared';

/** entity → (trường hệ thống / dẫn xuất → quyền cần có). Rỗng = không ràng buộc ngoài quyền đọc entity. */
export const SYSTEM_FIELD_BINDINGS: Record<CustomFieldEntity, Record<string, PermissionKey>> = {
  // Giá vốn chỉ người có `catalog.cost_view` (Sales thấy sản phẩm, không thấy giá vốn — §3.5).
  product: { cost: 'catalog.cost_view' },
  contact: {},
  quote: {},
  order: {},
  ticket: {},
  appointment: {},
};

export function hiddenSystemFields(entity: CustomFieldEntity, a: AuthzContext): Set<string> {
  const out = new Set<string>();
  if (a.isOwner) return out;
  for (const [field, perm] of Object.entries(SYSTEM_FIELD_BINDINGS[entity])) if (!a.permissions.has(perm)) out.add(field);
  return out;
}

// Khối GenUI `appointment_order` (TIP-033c §2.2): model chỉ đưa id lịch (+ hội thoại). Lúc render, server đọc lại qua CHÍNH bộ đọc gợi ý
// của booking với quyền hiện hành của người dùng — lịch lạ / ngoài scope / không còn đủ điều kiện (liệu trình, đã có đơn, chưa xong, không
// thấy giá) → lỗi ngắn để model bỏ khối, không dựng thẻ từ chữ model. Lúc hiển thị (lượt mới / mở lại phiên) thẻ web tự đọc lại cùng action
// `appointment.order_suggestions` — giá / quyền tạo luôn là của hiện tại; tạo đơn chỉ qua `order.create_from_appointment` có xem trước.
import type { TenantDb } from '@appchat/db';
import { AppError, walkTree, type AuthzContext, type UiTree } from '@appchat/shared';
import { readSuggestions } from '../../../booking/order-suggestions/read';

export type OrderCardCheck = (authz: AuthzContext, appointmentId: string) => Promise<boolean>;

/** Lịch còn một thẻ gợi ý cho người dùng này (đọc trong transaction riêng, không ghi). Lỗi nghiệp vụ (404 / 422) → không. */
export function orderCardCheck(db: TenantDb): OrderCardCheck {
  return async (authz, appointmentId) => {
    try {
      const p = await db.$transaction((tx) => readSuggestions(tx, authz, { appointment_id: appointmentId }));
      return p.data.length > 0;
    } catch (e) {
      if (e instanceof AppError) return false;
      throw e;
    }
  };
}

/** Lỗi của các khối `appointment_order` trong cây (rỗng = hợp lệ). */
export async function appointmentOrderIssues(check: OrderCardCheck | undefined, authz: AuthzContext, tree: UiTree): Promise<string[]> {
  const nodes: { path: string; id: string }[] = [];
  walkTree(tree.root, (b, path) => {
    if (b.type === 'appointment_order') nodes.push({ path, id: b.appointment_id });
  });
  const issues: string[] = [];
  for (const n of nodes) {
    if (!check || !(await check(authz, n.id)))
      issues.push(`node ${n.path || 'root'}: appointment ${n.id} has no order suggestion for this user (not found, not done, package session or already has an order) — call appointment.order_suggestions first and only show ids it returned`);
  }
  return issues;
}

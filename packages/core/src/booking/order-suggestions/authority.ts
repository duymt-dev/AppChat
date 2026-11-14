// Gợi ý tạo đơn từ lịch hẹn (TIP-033c §1.1–1.3, COMMERCE 8b): điều kiện đủ từ dữ kiện bền (lịch sống, done, ngoài liệu trình, chưa có đơn,
// khách gốc sống, dịch vụ còn bán) + quyền HIỆN HÀNH của người xem. Đọc thẻ: scope booking ĐỌC. Tạo được: thêm `order.manage` + scope sales
// GHI (cùng bảng chân trị authz/data-access, không xét theo tên vai trò). Giá dịch vụ lộ ra chỉ khi người xem có `catalog.view` — thiếu
// thì bỏ thẻ (không có xem trước tối thiểu có nghĩa). Booking không import Sales: đọc bảng `product` / `contact` trực tiếp như sales đọc lịch.
import { can, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { POLICIES, allows } from '../../authz/data-access';
import { contactState } from '../../crm/lifecycle/identity-state';

export type Ineligible = 'not_done' | 'package' | 'linked' | 'deleted' | 'contact' | 'service';

export interface SuggestionSource {
  id: string;
  code: string;
  contactId: string;
  ownerUserId: string | null;
  teamId: string | null;
  serviceId: string;
  conversationId: string | null;
  status: string;
  packageId: string | null;
  orderId: string | null;
  deletedAt: Date | null;
  version: number;
  startAt: Date;
  endAt: Date;
}

export interface ServiceRow {
  id: string;
  name: string;
  price: bigint;
  taxRate: number;
  version: number;
  status: string;
  deletedAt: Date | null;
}

const REF = (a: SuggestionSource) => ({ owner: a.ownerUserId, team: a.teamId, contact: a.contactId });

/** Lý do lịch không còn đủ điều kiện gợi ý (null = đủ) — chỉ dữ kiện bền, không tin cờ `suggest_order` của lần hoàn thành. */
export function ineligible(a: SuggestionSource, svc: ServiceRow | null | undefined): Ineligible | null {
  if (a.deletedAt) return 'deleted';
  if (a.orderId) return 'linked';
  if (a.status !== 'done') return 'not_done';
  if (a.packageId) return 'package';
  if (!svc || svc.deletedAt || svc.status !== 'active') return 'service';
  return null;
}

/** Người xem thấy lịch (scope booking đọc) và được xem giá dịch vụ — thiếu một trong hai → không thẻ. */
export async function canSeeSuggestion(tx: Pick<TenantTx, 'contactCollaborator'>, authz: AuthzContext, a: SuggestionSource): Promise<boolean> {
  return can(authz, 'catalog.view') && (await allows(tx, authz, POLICIES.booking, 'read', REF(a)));
}

/** Nút tạo đơn: quyền action hiện có (`order.manage`) + scope sales GHI trên lịch (giống handler chuyển đổi). Không cấp quyền mới. */
export async function canCreateOrder(tx: Pick<TenantTx, 'contactCollaborator'>, authz: AuthzContext, a: SuggestionSource): Promise<boolean> {
  return can(authz, 'order.manage') && (await allows(tx, authz, POLICIES.sales, 'write', REF(a)));
}

/** Khách của lịch còn sống (đi theo gộp tới gốc) — gốc đã xoá / chuỗi gộp hỏng → không gợi ý. Trả id gốc + thế hệ vòng đời. */
export async function liveRoot(tx: Pick<TenantTx, 'contact'>, contactId: string): Promise<{ id: string; lifecycle: number } | null> {
  const s = await contactState(tx, contactId);
  if (s.kind !== 'active') return null;
  const c = await tx.contact.findUnique({ where: { id: s.contactId }, select: { lifecycleRevision: true } });
  return c ? { id: s.contactId, lifecycle: c.lifecycleRevision } : null;
}

/**
 * Dữ kiện ràng vào xác nhận (§3.1): version lịch + version / giá / thuế dịch vụ + khách gốc và thế hệ vòng đời. Lúc thực thi đọc lại cùng
 * khoá → lệch bất kỳ trường nào = 409 xem trước lại (kernel/actions/preview-binding.ts).
 */
export function factsOf(a: SuggestionSource, svc: ServiceRow, root: { id: string; lifecycle: number }): Record<string, string | number> {
  return {
    appointment_version: a.version,
    service_id: svc.id,
    service_version: svc.version,
    unit_price: String(svc.price),
    tax_rate: svc.taxRate,
    contact_root: root.id,
    contact_lifecycle: root.lifecycle,
  };
}

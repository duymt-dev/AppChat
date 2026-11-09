// Port phụ thuộc vòng đời khách (TIP-015f §2.1): CRM xoá / khôi phục / hoàn tác tạo khách hỏi từng domain TRONG transaction của nó
// (TenantTx do người gọi cấp; tập id họ khách đã khoá). Port tự chứa SQL của domain — không import CRM hay module domain khác, không gọi
// mạng / provider / LLM. Chặn = tồn tại không theo scope người xem (không dùng tổng KPI đã cắt theo scope); cảnh báo = số đếm giữ lại.
import type { TenantTx } from '../actions/action-context';

export type LifecycleDomain = 'sales' | 'contracts' | 'inbox' | 'booking' | 'support' | 'loyalty' | 'marketing';
export const LIFECYCLE_DOMAINS: readonly LifecycleDomain[] = ['booking', 'contracts', 'inbox', 'loyalty', 'marketing', 'sales', 'support'];

/** Một loại phụ thuộc: `block` chặn xoá; `warn` giữ lại (không huỷ / không xoá theo). Chỉ số đếm — không id / tiền ẩn. */
export interface LifecycleDependency {
  kind: string;
  count: number;
  level: 'block' | 'warn';
}

export interface ContactLifecyclePort {
  readonly domain: LifecycleDomain;
  /** Phụ thuộc của họ khách (mỗi quan hệ gốc đếm một lần trên cả họ) — chỉ loại có count > 0. */
  dependencies(tx: TenantTx, contactIds: readonly string[]): Promise<LifecycleDependency[]>;
  /**
   * Có quan hệ nghiệp vụ nào với khách (kể cả đã đóng) — dùng cho hoàn tác tạo khách "nguyên trạng" (chặt hơn xoá thường). Không đếm bản
   * ghi CRM con (ghi chú / timeline) — CRM tự so với biên nhận tạo.
   */
  hasRelations(tx: TenantTx, contactIds: readonly string[]): Promise<boolean>;
}

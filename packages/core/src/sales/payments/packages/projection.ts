// Chiếu liệu trình ra ngoài (TIP-033b §4.2): chỉ id / khách / sản phẩm / tên / tổng / đã dùng / còn lại / trạng thái / hạn + order_id
// CHỈ khi người xem có order.view và đọc được đơn đó. Không số tiền / giá / thanh toán / trường ẩn. `remaining = max(total - used, 0)`
// KHÔNG phải "còn đặt được" (lịch đang giữ chỗ trong gói tính riêng ở chỗ đặt lịch); hết hạn / hoàn / hết buổi giữ nguyên trạng thái.
import type { PackageStatusKey } from '@appchat/shared';

export interface PackageRow {
  id: string;
  contact_id: string;
  product_id: string;
  order_id: string;
  name: string;
  total_sessions: number;
  used_sessions: number;
  status: string;
  expires_at: Date | null;
  created_at: Date;
  order_visible: boolean;
}

export interface PackageDto {
  id: string;
  contact_id: string;
  product_id: string;
  name: string;
  total: number;
  used: number;
  remaining: number;
  status: PackageStatusKey;
  expires_at: string | null;
  /** Chỉ có khi người xem có order.view + đọc được đơn sinh ra gói. */
  order_id: string | null;
}

export const toPackageDto = (r: PackageRow): PackageDto => ({
  id: r.id,
  contact_id: r.contact_id,
  product_id: r.product_id,
  name: r.name,
  total: r.total_sessions,
  used: r.used_sessions,
  remaining: Math.max(r.total_sessions - r.used_sessions, 0),
  status: r.status as PackageStatusKey,
  expires_at: r.expires_at?.toISOString() ?? null,
  order_id: r.order_visible ? r.order_id : null,
});

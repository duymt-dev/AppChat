// Port `order_sync` (provider-ports §1 + "Đồng bộ đơn", D31, COMMERCE §4b): kéo đơn từ sàn / POS (poll + webhook) về dạng chuẩn hoá.
// Core không biết trạng thái riêng của sàn — adapter ánh xạ `platform_status` về 2 trục. Đẩy trạng thái / tồn lên sàn: P2.
import type { ConnectorAdapter, ConnectionCtx } from '../types';

export interface ExternalOrderLine {
  /** SKU / mã sản phẩm phía sàn — core khớp với `product.code` / `product_variant.sku` hoặc `integration_mapping`. */
  sku: string;
  name: string;
  qty: number;
  /** Đơn giá sau giảm giá của sàn (string VND). */
  unit_price: string;
}

export interface ExternalOrder {
  /** Mã đơn phía sàn — khoá idempotent cùng connection. */
  external_id: string;
  /** Sàn / phần mềm gốc (shopee, tiktok_shop, sapo…). */
  platform: string;
  platform_status: string;
  /** Người mua — sàn thường che SĐT; khớp khách theo `buyer.id`. */
  buyer: { id: string; name: string; phone?: string | null };
  lines: ExternalOrderLine[];
  /** Tổng sàn tính (string VND) — nguồn sự thật, không tính lại. */
  total: string;
  /** Sàn đã thu tiền người mua (đơn trả trước); COD → false tới khi hoàn tất. */
  paid: boolean;
  shipping?: { carrier?: string; tracking?: string; eta?: string };
  created_at: string;
  updated_at: string;
}

export interface MappedStatus {
  status: 'new' | 'processing' | 'completed' | 'cancelled';
  /** Đã thu đủ theo sàn (thanh toán trước / COD hoàn tất). */
  paid: boolean;
}

export type StockMaster = 'appchat' | 'external';

/** Bên giữ tồn chuẩn của kết nối (`external` hoặc mặc định `appchat`). */
export const stockMasterOf = (config?: Record<string, unknown> | null): StockMaster =>
  config?.stock_master === 'external' ? 'external' : 'appchat';

export interface StockSnapshotItem {
  sku: string;
  on_hand: number;
  as_of: string;
  snapshot_id: string;
}

export interface StockPullResult {
  items: StockSnapshotItem[];
  next_cursor?: string | null;
}

export interface OrderSyncProvider extends ConnectorAdapter {
  /** Đơn tạo / đổi từ `since` (poll — queue `order-sync`). */
  pull(conn: ConnectionCtx, since: Date | null): Promise<ExternalOrder[]>;
  /** Bản chụp tồn kho từ hệ ngoài theo cursor (TIP-031c, chế độ `stock_master = external`). */
  pullStock?(conn: ConnectionCtx, cursor: string | null): Promise<StockPullResult>;
  /** Payload webhook đã xác thực → đơn chuẩn hoá. */
  handleWebhook(conn: ConnectionCtx, payload: unknown): ExternalOrder[];
  mapStatus(o: Pick<ExternalOrder, 'platform_status' | 'paid'>): MappedStatus;
}

/** Adapter có hiện thực port `order_sync`. */
export const isOrderSync = (a: ConnectorAdapter | null | undefined): a is OrderSyncProvider =>
  !!a && typeof (a as Partial<OrderSyncProvider>).pull === 'function' && typeof (a as Partial<OrderSyncProvider>).mapStatus === 'function';

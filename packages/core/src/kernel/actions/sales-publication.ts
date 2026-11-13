// Cổng quan sát tồn kho trung lập cho câu trả lời bán hàng (TIP-022c §3.1–3.3, §8a): domain catalog cài + đăng ký
// (`catalog/services/sales-stock-observation.ts`), AI (ai/sales-behavior) và đường gửi (inbox / channels) gọi qua đây — kernel không import AI,
// catalog không import AI, inbox / channels không import AiModule. Chỉ đọc, chạy trong transaction của bên gọi (không Executor lồng, không
// mạng / model). Quan sát KHÔNG phải giữ hàng: bán đồng thời sau khi quan sát có thể đổi tồn — câu gửi khách luôn kèm "tại thời điểm kiểm".
import type { TenantTx } from './action-context';

/** Kết luận cho MỘT sản phẩm với số lượng khách hỏi (không bao giờ là con số model tự viết). */
export type StockClaim = 'available_now' | 'shortage' | 'unknown' | 'not_stock_tracked';

export interface StockRequest {
  productId: string;
  /** Số lượng khách hỏi (> 0, nguyên). */
  qty: number;
}

export interface StockObservation {
  productId: string;
  code: string;
  name: string;
  type: string;
  unit: string;
  /** Giá hiện hành (VND, chưa VAT) — chuỗi như API; không có giá vốn / trường nội bộ. */
  price: string;
  qty: number;
  claim: StockClaim;
  /** Tồn hiện tại của sản phẩm vật lý (chỉ khi `claim` là available_now / shortage) — số server đọc, không phải model. */
  stock: number | null;
  /** Lý do `unknown` (không tìm thấy / không bán / combo quá giới hạn / vòng / thành phần thiếu / biến thể chưa xác định). */
  reason?: string;
  /** Combo: tồn của từng lá vật lý (đã gộp lá lặp + nhân số lượng) — cùng kết luận tổng. */
  leaves?: { productId: string; need: number; stock: number | null }[];
}

export interface StockObservationResult {
  items: StockObservation[];
  /** Thời điểm đọc (đồng hồ server) — câu gửi khách nói "tại thời điểm kiểm". */
  checkedAt: string;
  /** sha256 ổn định của các kết luận (id + claim + stock + giá) — ràng vào nội dung gửi; đổi → soạn lại / chuyển người. */
  digest: string;
}

export type StockObserver = (tx: TenantTx, requests: readonly StockRequest[], now: Date) => Promise<StockObservationResult>;

let observer: StockObserver | null = null;

/** CatalogModule đăng ký khi khởi động (một lần mỗi tiến trình; đăng ký lại thay thế — nhiều app Nest trong một tiến trình test). */
export function registerStockObserver(fn: StockObserver): void {
  observer = fn;
}

/** Chưa đăng ký (tiến trình không nạp catalog) → mọi kết luận `unknown`, không bao giờ "còn hàng". */
export async function observeStock(tx: TenantTx, requests: readonly StockRequest[], now: Date): Promise<StockObservationResult> {
  if (observer) return observer(tx, requests, now);
  return { items: requests.map((r) => ({ productId: r.productId, code: '', name: '', type: '', unit: '', price: '0', qty: r.qty, claim: 'unknown', stock: null, reason: 'unavailable' })), checkedAt: now.toISOString(), digest: '' };
}

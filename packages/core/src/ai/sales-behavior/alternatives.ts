// Sản phẩm thay thế có kiểm (TIP-022c §3.4): chỉ id model đề xuất mà server đọc lại được — sản phẩm đang bán, khác sản phẩm khách hỏi,
// còn hàng cho đúng số lượng khách hỏi tại thời điểm kiểm (quan sát hiện tại), tối đa 3. Mô tả sản phẩm là dữ liệu không tin cậy, không kích
// hoạt công cụ / quyền. "Không tìm thấy" chỉ có nghĩa chưa kiểm được thay thế nào — không khẳng định không có ở đâu.
import type { StockObservation } from '../../kernel/actions/sales-publication';

export const MAX_ALTERNATIVES = 3;

/**
 * Lọc thay thế từ quan sát đã đọc: bỏ sản phẩm khách hỏi, bỏ không đọc được / không bán / không đủ hàng; giữ thứ tự model đề xuất.
 * Dịch vụ (không quản lý tồn) không được giới thiệu như "còn hàng" thay cho hàng vật lý.
 */
export function verifiedAlternatives(requested: readonly string[], observed: readonly StockObservation[]): StockObservation[] {
  const skip = new Set(requested);
  const out: StockObservation[] = [];
  for (const o of observed) {
    if (skip.has(o.productId) || o.claim !== 'available_now') continue;
    skip.add(o.productId);
    out.push(o);
    if (out.length >= MAX_ALTERNATIVES) break;
  }
  return out;
}

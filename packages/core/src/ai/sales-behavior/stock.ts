// Tồn kho có căn cứ cho câu trả lời bán hàng (TIP-022c §3.1–3.2): kết luận từng sản phẩm khách hỏi đọc từ quan sát HIỆN TẠI qua cổng
// kernel (`observeStock` — catalog cài; chỉ đọc, chung luật chiếu với product.get / stock.get), dưới quyền đọc hiện hành của lượt (agent
// phải còn được cấp `stock.get` / `product.get` — không có thì `unknown`, không bao giờ "còn hàng"). Không RAG, không trí nhớ, không số model.
import type { TenantDb } from '@appchat/db';
import { can, type AuthzContext } from '@appchat/shared';
import { observeStock, type StockObservationResult, type StockRequest } from '../../kernel/actions/sales-publication';

/** Quyền đọc cần cho một câu tồn / giá (catalog.view là permission của product.get + stock.get). */
export const canReadStock = (authz: AuthzContext) => can(authz, 'catalog.view');

/** Quan sát trong một transaction đọc riêng (ngoài mọi khoá domain; không model / mạng). */
export async function groundStock(db: TenantDb, authz: AuthzContext, requests: readonly StockRequest[], now: Date): Promise<StockObservationResult> {
  if (!canReadStock(authz)) {
    return { items: requests.map((r) => ({ productId: r.productId, code: '', name: '', type: '', unit: '', price: '0', qty: r.qty, claim: 'unknown', stock: null, reason: 'read_denied' })), checkedAt: now.toISOString(), digest: '' };
  }
  return db.$transaction((tx) => observeStock(tx as never, requests, now));
}

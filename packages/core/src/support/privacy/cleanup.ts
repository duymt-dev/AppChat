// Erase Ticket (TIP-015c §2.3 hàng 8) — không đóng ticket / đổi khách; scrub nội dung tự do của ticket cài ở pha sau (NOT_IMPLEMENTED).
// TIP-034d: artifact `ticket_stock` (dấu vết quan sát / kết quả tồn ticket) xoá thật — dưới khoá control, sau khoá của privacy; idempotent.
import type { TenantTx } from '../../kernel/actions/action-context';
import type { InventoryArtifact } from '../../kernel/privacy/types';
import { eraseNotImplemented } from '../../kernel/privacy/sql';
import { eraseStockForTicket } from '../trends/cleanup';

export async function supportErase(tx: TenantTx, artifact: Pick<InventoryArtifact, 'kind' | 'recordId'>): Promise<void> {
  if (artifact.kind === 'ticket_stock') return eraseStockForTicket(tx, artifact.recordId);
  return eraseNotImplemented();
}

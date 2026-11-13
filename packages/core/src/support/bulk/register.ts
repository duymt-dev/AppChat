// Đăng ký của sửa ticket hàng loạt (TIP-034c): verifier nguồn cho hai con riêng (003c), map hoàn tác ticket.bulk_update → ticket.bulk_undo
// (kernel trung lập), kind việc dữ liệu 045b (runner `dispatch` — con qua Executor, biên nhận trong transaction của con). Cùng một runner
// cho đợt ≤ 50 chạy ngay (API) và việc nền 51–200 (ROLE=jobs) — không có scheduler / engine thứ hai.
import { BULK_SYNC_MAX } from '@appchat/shared';
import { registerSystemVerifier } from '../../kernel/actions/system';
import { registerUndoAction } from '../../kernel/actions/undo-action-registry';
import { registerDataJobKind } from '../../kernel/jobs/bulk-dispatch';
import { dataJobUrl } from '../../kernel/jobs/data-jobs/handlers';
import { itemDispatch, verifyBulkItem } from './item';
import { markForwardUndo } from './undo';
import { TICKET_BULK_KIND, TICKET_BULK_UNDO_KIND } from './results';
import type { TicketBulkDeps } from './providers';

export function registerTicketBulk(d: TicketBulkDeps): void {
  registerSystemVerifier('ticket.bulk_item', verifyBulkItem);
  registerSystemVerifier('ticket.bulk_item_undo', verifyBulkItem);
  registerUndoAction('ticket.bulk_update', 'ticket.bulk_undo');
  // Đợt ≤ 50 chạy ngay trong yêu cầu (người gọi đã thấy kết quả) — không gửi thông báo xong việc.
  const silent = (j: { total: number }) => j.total <= BULK_SYNC_MAX;
  registerDataJobKind(TICKET_BULK_KIND, { label: 'Cập nhật hàng loạt ticket', link: dataJobUrl, silent, dispatch: itemDispatch(d, 'ticket.bulk_item') });
  registerDataJobKind(TICKET_BULK_UNDO_KIND, { label: 'Hoàn tác cập nhật hàng loạt ticket', link: dataJobUrl, silent, dispatch: itemDispatch(d, 'ticket.bulk_item_undo', markForwardUndo) });
}

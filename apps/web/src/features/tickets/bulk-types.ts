// Kiểu sửa ticket hàng loạt phía web (TIP-034c §4.1): thao tác đã nhận (tập id CHỐT lúc gửi — không theo bộ lọc / trang đang xem), log
// cha, việc nền, lượt hoàn tác; kết quả từng id đọc từ biên nhận (`/data-jobs/:id/result`), không suy từ vòng lặp phía client.
import type { TicketBulkOutcome, TicketBulkResult, TicketBulkUndoResult } from '@appchat/shared';
import type { Priority } from './types';

export type { TicketBulkOutcome, TicketBulkResult, TicketBulkUndoResult };

export type BulkPatch = { assignee_user_id?: string; assignee_agent_id?: string; priority?: Priority };

/** Thao tác đang theo dõi — gắn workspace: đổi workspace không áp kết quả muộn sang workspace khác. */
export interface BulkOp {
  ws: string;
  jobId: string;
  logId: string | null;
  ids: string[];
  /** Giao cho AI Agent: chỉ là phân công — agent CHƯA chạy / xử lý ticket. */
  agent: boolean;
  undoJobId: string | null;
  /** Đã giữ chọn các ticket chưa áp dụng được (một lần khi kết thúc). */
  settled: boolean;
}

const TERMINAL = new Set(['completed', 'cancelled', 'failed']);
export const isTerminal = (r: { operation: { status: string } } | null | undefined): boolean =>
  !!r && TERMINAL.has(r.operation.status);
export const failedOutcomes = (o: TicketBulkOutcome[]) => o.filter((x) => !x.ok && !x.pending);

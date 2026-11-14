// Kiểu nội bộ quan sát tồn ticket (TIP-034d). Hợp đồng công khai (DTO / action) ở `@appchat/shared` api/ticket-stock.ts.
import type { AuthzContext, StockCounts, StockUnavailableReason } from '@appchat/shared';

export interface StockViewer {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}

/** Một lần quan sát hoàn tất đủ điều kiện làm mốc so sánh. */
export interface StockBaseline {
  id: string;
  observedAt: Date;
  localDate: string;
}

/** Kết quả so sánh nội bộ trước khi định dạng giờ (read.ts → DTO). */
export type StockComparison =
  | { status: 'available'; baseline: StockBaseline; prior: StockCounts }
  | { status: 'unavailable'; reason: StockUnavailableReason };

export interface CaptureOutcome {
  status: 'captured' | 'exists' | 'skipped';
  batchId?: string;
  localDate: string;
  rows?: number;
}

/** Cửa sổ giữ cache kỹ thuật: hôm nay + 7 ngày trước (theo múi giờ ghi ở mỗi lần chụp). */
export const STOCK_RETENTION_DAYS = 8;
/** Tập đóng góp của kết quả action giữ 30 ngày (ràng buộc nguồn cho lịch sử, DC-451). */
export const STOCK_RESULT_RETENTION_DAYS = 30;
/** Mỗi transaction dọn tối đa 100 lần chụp. */
export const STOCK_RETENTION_BATCH = 100;

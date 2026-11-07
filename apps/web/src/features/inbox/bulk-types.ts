// Kiểu thao tác hàng loạt của Hộp thư (TIP-025b §C, Q-019 / DC-250): kết quả từng hội thoại của conversation.bulk_update.
export const BULK_MAX = 100;

export type BulkOp = 'assign' | 'tag' | 'close' | 'archive';

export interface BulkItemResult {
  id: string;
  status: 'done' | 'skipped' | 'failed';
  error: string | null;
}

export interface BulkOutcome {
  updated: number;
  failed: number;
  items: BulkItemResult[];
  /** > 50 hội thoại: việc nền đã nhận — CHƯA xong (kết quả từng id ở trang việc dữ liệu / thông báo). */
  jobId?: string;
}

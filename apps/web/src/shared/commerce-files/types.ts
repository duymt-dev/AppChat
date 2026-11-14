// Tệp đính kèm bản ghi bán hàng (TIP-032d §3.1) — shape của `order|invoice.files_list` (packages/actions commerce-file-schemas). Danh tính
// bản ghi phân biệt theo loại (đơn / đề nghị) + UUID — không dùng tên tệp / vị trí dòng làm khoá.

/** Bản ghi cha — Drawer truyền đúng loại + id bản ghi đang mở. */
export type RecordRef = { type: 'order'; id: string } | { type: 'invoice'; id: string };

export type RecordFileKind = 'user_attachment' | 'generated_invoice' | 'generated_receipt';

export interface RecordFile {
  /** null với chứng từ đã sinh (PDF đề nghị / phiếu thu) — không gỡ được. */
  attachment_id: string | null;
  file_id: string;
  name: string;
  mime: string;
  bytes: number;
  created_at: string;
  created_by: string | null;
  created_by_name: string;
  kind: RecordFileKind;
  version: number | null;
  /** Bản gốc không còn → không mở / tải được (không bịa đường dẫn). */
  available: boolean;
  can_detach: boolean;
}

export interface RecordFilePage {
  files: RecordFile[];
  /** Revision bộ tệp — gửi kèm khi gắn (CAS). */
  revision: number;
  can_attach: boolean;
  next_cursor: string | null;
}

/** Trạng thái thao tác của panel (§3.2): chọn tệp ≠ đã gắn; chỉ biên nhận 200 mới là "đã gắn". */
export type PanelOp =
  | { kind: 'idle' }
  | { kind: 'uploading'; name: string }
  | { kind: 'attaching'; name: string }
  | { kind: 'failed'; name: string; reason: string }
  | { kind: 'stale' };

// Registry loại chứng từ render qua queue `doc-render` (TIP-028b §1). Domain chủ (sales: báo giá…) đăng ký một lần lúc bootstrap:
// `render` dựng PDF theo bản ghi đã chụp lúc phát hành (mẫu + dữ liệu — không đọc lại mẫu mặc định), `publish` gắn tệp vào chứng từ +
// gửi tin trong transaction của job. Documents không biết nghiệp vụ của chứng từ — chỉ điều phối trạng thái / thử lại / sự kiện.
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';

export interface RenderJobRow {
  id: string;
  kind: string;
  documentId: string;
  generation: number;
  request: Record<string, unknown>;
}

export interface RenderedFile {
  /** Tệp đã lưu (`confirmed=false`) — id tất định theo (render, thế hệ) để chạy lại không sinh tệp thứ hai. */
  fileId: string;
  sha256: string;
  name: string;
  /** Tệp phụ (ảnh trang báo giá…) — cùng quy tắc id tất định. */
  extra?: { fileId: string; name: string; mime: string }[];
  /** Dữ liệu domain cần ở bước phát hành (chữ tin, hạn…) — chỉ trong bộ nhớ job. */
  meta?: Record<string, unknown>;
}

export interface PublishOutcome {
  events: { topic: string; payload: Record<string, unknown> }[];
  /** Tin gửi khách (Outgoing của inbox) — job đẩy hàng gửi kênh SAU commit; documents không đọc nội dung. */
  out?: unknown[];
}

export interface RenderKind {
  /** Ngoài transaction (LibreOffice chậm): render + lưu tệp (`confirmed=false`). */
  render(db: TenantDb, ws: string, row: RenderJobRow): Promise<RenderedFile>;
  /** Trong transaction đã khoá dòng render: xác nhận tệp, ghi chứng từ + tin. Chứng từ không còn hợp lệ → ném AppError (lỗi vĩnh viễn). */
  publish(tx: TenantTx, ws: string, row: RenderJobRow, file: RenderedFile, now: Date): Promise<PublishOutcome>;
}

const kinds = new Map<string, RenderKind>();

export function registerRenderKind(kind: string, k: RenderKind): void {
  kinds.set(kind, k);
}

export const renderKindOf = (kind: string): RenderKind | undefined => kinds.get(kind);

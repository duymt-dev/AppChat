// Nguồn sao chép tệp có đồng ý cho tệp đính kèm bản ghi (TIP-032d §3.3): kernel trung lập — KHÔNG import AI / sales. Domain AI đăng ký
// adapter theo loại nguồn (vd. `assistant_artifact_ref`): kiểm người / phiên / artifact / revision / quyền nguồn HIỆN HÀNH và trả bộ định vị
// bytes GỐC được bảo vệ (id tệp + digest + tên) — không phần đã trích, không id tệp tuỳ ý. Sales chỉ gọi registry này; nguồn bị thu hồi /
// lệch revision → adapter ném lỗi có kiểu, không im lặng đổi nguồn.
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../actions/action-context';

export interface AttachmentSourceRef {
  kind: string;
  id: string;
  revision: number;
}

/** Bộ định vị bytes gốc — chỉ dùng phía server để sao chép; không bao giờ trả cho model / trình duyệt. */
export interface OriginalLocator {
  fileId: string;
  digest: string;
  name: string;
}

export interface AttachmentSourceAdapter {
  kind: string;
  /** Kiểm quyền nguồn hiện hành của `userId` (phiên run nếu có) → bộ định vị; sai bất kỳ điều kiện → AppError (404 / 409 / 422). */
  locate(db: Pick<TenantTx, 'assistantInputArtifact' | 'aiRun' | 'file'>, a: { userId: string; runId?: string; ref: AttachmentSourceRef }): Promise<OriginalLocator>;
}

const adapters = new Map<string, AttachmentSourceAdapter>();

export function registerAttachmentSource(a: AttachmentSourceAdapter): void {
  adapters.set(a.kind, a);
}

/** Nguồn chưa đăng ký (vd. vai trò không nạp AI) → 422 rõ ràng, người dùng vẫn còn đường tải thủ công. */
export function attachmentSource(kind: string): AttachmentSourceAdapter {
  const a = adapters.get(kind);
  if (!a) throw new AppError('VALIDATION_FAILED', 422, { source: 'artifact_copy_unavailable' });
  return a;
}

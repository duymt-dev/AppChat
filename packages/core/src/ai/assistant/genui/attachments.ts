// Tệp đính kèm của lượt Trợ lý (TIP-023c 8c, AC 9): client chỉ gửi `file_id` (tên client gửi kèm KHÔNG được tin). Trước khi tạo run /
// gọi model, server kiểm từng tệp bằng guard kernel (tenant hiện tại, người tải lên = người gọi, purpose `attachment`, chưa hết hạn,
// mime / size cho phép) — tệp workspace khác / người khác → 422 trước model, không lộ là có. Vào ngữ cảnh lượt chỉ id + tên + mime +
// size (KHÔNG storage key / URL / nội dung); extension domain (registry) đọc tệp sau qua cùng guard.
import type { TenantDb } from '@appchat/db';
import { requireFiles, type FileAccessRule } from '../../../kernel/files/file-access';
import { extensionsFor } from './extension-registry';

export const ATTACHMENT_RULE: FileAccessRule = {
  purposes: ['attachment'],
  ownerOnly: true,
  mimes: ['image/', 'application/pdf', 'text/plain', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};
export const ATTACHMENTS_MAX = 10;

export interface TurnAttachment {
  id: string;
  name: string;
  mime?: string;
  size?: number;
  /** Extension domain nhận được tệp (gợi ý cho model). */
  handlers?: string[];
  /** Gợi ý của extension (chuỗi action nên gọi) — không chứa dữ liệu tệp. */
  hints?: string[];
}

/** Tệp của lượt đã kiểm (thứ tự client gửi, bỏ trùng). Rỗng → []. */
export async function resolveAttachments(db: Pick<TenantDb, 'file'>, userId: string, ids: readonly string[], now: Date): Promise<TurnAttachment[]> {
  if (!ids.length) return [];
  const files = await requireFiles(db, userId, ids.slice(0, ATTACHMENTS_MAX), ATTACHMENT_RULE, now);
  return files.map((f) => {
    const ext = extensionsFor(f);
    const handlers = ext.map((e) => e.key);
    return { id: f.id, name: f.name, mime: f.mime, size: f.size, ...(handlers.length ? { handlers, hints: ext.map((e) => e.hint) } : {}) };
  });
}

// Guard tệp hợp đồng (TIP-030b spec 5): lớp 1 = guard kernel của 023c (tenant hiện tại / người tải lên hoặc quyền từ tin nhắn / purpose /
// hạn / mime / cỡ) — chạy TRƯỚC khi đọc bytes; lớp 2 = kiểm theo loại tài liệu trên bytes thật (đuôi tệp / mime không được tin: tệp
// `.exe` đổi tên `.pdf` bị từ chối vì bytes không phải PDF). Trả bytes + SHA-256 (bằng chứng nguồn bất biến) + loại thật. Không có
// đường tải từ URL ngoài.
import { createHash } from 'node:crypto';
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { checkFile, type FileAccessRule } from '../../kernel/files/file-access';
import type { FilesService } from '../../kernel/files/files.service';
import { DOCX_LIMITS, inspectDocx } from './docx-container';
import { PDF_LIMITS, inspectPdf } from './pdf-inspection';

export const CONTRACT_PDF = 'application/pdf';
export const CONTRACT_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Tệp hợp đồng người dùng tự tải lên (`POST /v1/files` purpose document) — chính người tải mới dùng được. */
export const CONTRACT_UPLOAD_RULE: FileAccessRule = { purposes: ['document'], ownerOnly: true, mimes: [CONTRACT_PDF, CONTRACT_DOCX, 'application/octet-stream'], maxBytes: PDF_LIMITS.maxBytes };

export interface GuardedDocument {
  fileId: string;
  name: string;
  /** Loại thật theo bytes (không theo đuôi / mime khai báo). */
  type: 'pdf' | 'docx';
  mime: string;
  sha256: string;
  body: Buffer;
  pages?: number;
}

const sniff = (b: Uint8Array): 'pdf' | 'docx' | null => {
  if (b.length >= 5 && String.fromCharCode(...b.subarray(0, 5)) === '%PDF-') return 'pdf';
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return 'docx';
  return null;
};

/** Kiểm bytes (đã qua guard truy cập). PDF ≤ 25MB, DOCX ≤ 10MB; loại không phải PDF / DOCX → 422 `unsupported_type`. */
export async function inspectContractBytes(body: Buffer): Promise<{ type: 'pdf' | 'docx'; mime: string; pages?: number }> {
  const type = sniff(body);
  if (type === 'pdf') return { type, mime: CONTRACT_PDF, pages: (await inspectPdf(body)).pages };
  if (type === 'docx') {
    if (body.length > DOCX_LIMITS.maxBytes) throw new AppError('VALIDATION_FAILED', 422, { file: 'too_large' });
    inspectDocx(body);
    return { type, mime: CONTRACT_DOCX };
  }
  throw new AppError('VALIDATION_FAILED', 422, { file: 'unsupported_type' });
}

/**
 * Tệp hợp đồng của người dùng: guard truy cập trước (từ chối → 422 `file_id: <lý do>`, chưa đọc bytes), rồi kiểm bytes. `rule` cho phép
 * caller nới `ownerOnly` khi quyền đến từ ràng buộc khác (tệp đính kèm của tin trong hội thoại đã kiểm scope — attachment-source.ts).
 */
export async function guardContractFile(db: Pick<TenantDb, 'file'>, files: FilesService, userId: string, fileId: string, now: Date, rule: FileAccessRule = CONTRACT_UPLOAD_RULE): Promise<GuardedDocument> {
  const g = await checkFile(db, userId, fileId, rule, now);
  if ('denied' in g) throw new AppError('VALIDATION_FAILED', 422, { file_id: g.denied });
  const f = await files.read(db, g.id);
  if (!f) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'not_found' });
  const t = await inspectContractBytes(f.body);
  return { fileId: g.id, name: g.name, ...t, sha256: createHash('sha256').update(f.body).digest('hex'), body: f.body };
}

// Nguồn tệp của hợp đồng (TIP-030b spec 2, 4): tệp qua guard 2 lớp (document-guard) → cột nguồn bất biến `source_file_id` /
// `source_hash` (SHA-256 bytes gốc) / `source_mime` + `source_version`. Bản gốc không bao giờ bị sửa. PDF: nội dung ký = chính bản gốc;
// DOCX: đổi PDF qua launcher cô lập (`render-isolation.ts`) → `rendered_unsigned_file_id` / `_hash` đóng băng trước khi duyệt. Đổi PDF
// lỗi → lỗi rõ, không có bản để ký; thử lại cùng tệp giữ nguyên danh tính nguồn.
import { createHash } from 'node:crypto';
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { FileAccessRule } from '../../kernel/files/file-access';
import type { FilesService } from '../../kernel/files/files.service';
import { CONTRACT_UPLOAD_RULE, guardContractFile, inspectContractBytes, type GuardedDocument, type IsolatedConverter } from '../../documents/public';
import type { ContractRecord } from '../contract-access';

export interface SourceCols {
  source: 'file';
  sourceFileId: string;
  sourceHash: string;
  sourceMime: string;
}

export const sourceCols = (g: GuardedDocument): SourceCols => ({ source: 'file', sourceFileId: g.fileId, sourceHash: g.sha256, sourceMime: g.mime });

/** Guard tệp người dùng tải lên (chính người tải — CONTRACT_UPLOAD_RULE) rồi kiểm bytes. */
export function guardUpload(db: Pick<TenantDb, 'file'>, files: FilesService, userId: string, fileId: string, now: Date, rule: FileAccessRule = CONTRACT_UPLOAD_RULE) {
  return guardContractFile(db, files, userId, fileId, now, rule);
}

const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');

/**
 * Nội dung PDF để ký của hợp đồng nguồn tệp: đọc lại bản gốc, kiểm hash khớp `source_hash` (bất biến) + kiểm lại bytes; PDF → nguyên
 * bản; DOCX → bản đã đổi (đã có thì dùng lại nếu hash khớp, chưa có thì đổi qua launcher cô lập). Trả kèm id / hash bản chưa ký.
 */
export async function signingContent(
  db: Pick<TenantDb, 'file'>,
  files: FilesService,
  converter: IsolatedConverter | null,
  c: Pick<ContractRecord, 'sourceFileId' | 'sourceHash' | 'sourceMime' | 'renderedUnsignedFileId' | 'renderedUnsignedHash'>,
): Promise<{ pdf: Buffer; rendered: Buffer | null }> {
  if (!c.sourceFileId || !c.sourceHash) throw new AppError('INVALID_STATE', 409, { source: 'missing' });
  const src = await files.read(db, c.sourceFileId);
  if (!src || sha(src.body) !== c.sourceHash) throw new AppError('INVALID_STATE', 409, { source: 'hash_mismatch' });
  const t = await inspectContractBytes(src.body);
  if (t.type === 'pdf') return { pdf: src.body, rendered: null };
  if (c.renderedUnsignedFileId && c.renderedUnsignedHash) {
    const r = await files.read(db, c.renderedUnsignedFileId);
    if (r && sha(r.body) === c.renderedUnsignedHash) return { pdf: r.body, rendered: null };
  }
  if (!converter) throw new AppError('NOT_IMPLEMENTED', 501, { render: 'render_isolation_unavailable' });
  const pdf = await converter.docxToPdf(src.body);
  return { pdf, rendered: pdf };
}

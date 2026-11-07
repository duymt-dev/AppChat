// Đóng băng nội dung ký của hợp đồng nguồn tệp lúc Owner "Duyệt & ký" (TIP-030b spec 4, AC1): PDF gốc → `file_id` của hợp đồng trỏ
// CHÍNH tệp gốc (bytes không đổi, `file_sha256` = `source_hash`); DOCX → bản PDF đổi trong launcher cô lập lưu thành tệp mới
// (`rendered_unsigned_*`, đóng băng trước khi duyệt). Bản cuối sau khi khách ký = nội dung này + trang chứng nhận, lưu tệp MỚI —
// không ghi đè bản gốc. Đổi DOCX lỗi → lỗi rõ, không có bản để ký.
import type { TenantDb } from '@appchat/db';
import type { ContractRecord } from '../contract-access';
import type { ContractDeps } from '../services/contract-deps';
import { storeContractPdf } from '../services/contract-doc';
import { signingContent } from './source';

export async function freezeFileSource(db: Pick<TenantDb, 'file'>, d: ContractDeps, ws: string, c: ContractRecord, me: string | null) {
  const files = d.need('files');
  const { rendered } = await signingContent(db, files, d.isolated, c);
  if (!rendered) {
    // PDF gốc (hoặc DOCX đã đổi + đóng băng từ trước): ký đúng tệp đó.
    const fileId = c.sourceMime === 'application/pdf' ? c.sourceFileId! : c.renderedUnsignedFileId!;
    const hash = c.sourceMime === 'application/pdf' ? c.sourceHash! : c.renderedUnsignedHash!;
    return { fileId, sha256: hash, templateId: null, templateVersion: null, sourceVersion: c.sourceVersion, rendered: false };
  }
  const p = await d.place(ws);
  const f = await storeContractPdf(db, d, ws, c, rendered, me, p.locale, false);
  return { fileId: f.fileId, sha256: f.sha256, templateId: null, templateVersion: null, sourceVersion: c.sourceVersion, rendered: true };
}

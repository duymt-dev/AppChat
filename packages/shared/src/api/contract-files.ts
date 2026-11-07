// Tệp của hợp đồng (TIP-030b spec 17–18): `GET /v1/contracts/:id/files` — nguồn gốc (PDF / DOCX tải lên, bất biến), bản PDF chưa ký
// (DOCX đã đổi cô lập / bản mẫu đóng băng lúc Duyệt & ký), bản cuối đã ký. Tải: `GET /v1/contracts/:id/files/:fileId` (kiểm lại scope
// hợp đồng + tệp thuộc đúng hợp đồng — không link công khai dài hạn).
import { z } from 'zod';

export const CONTRACT_FILE_ROLES = ['source', 'unsigned', 'signed'] as const;
export type ContractFileRole = (typeof CONTRACT_FILE_ROLES)[number];

export const contractFileSchema = z.object({
  id: z.string(),
  role: z.enum(CONTRACT_FILE_ROLES),
  name: z.string(),
  mime: z.string(),
  ext: z.string(),
  size: z.number().int(),
  sha256: z.string(),
  at: z.string(),
  /** Người tải lên (tên) — tệp hệ thống tạo (bản ký) để trống. */
  by: z.string(),
});
export type ContractFile = z.infer<typeof contractFileSchema>;

export const contractFilesSchema = z.object({ data: z.array(contractFileSchema) });

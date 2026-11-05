// Quản lý nguồn KB (TIP-020b): thư mục có visibility mặc định / cha / version (CAS cho kb.folder.update / delete) + nguồn có `origin`
// (catalog → khoá sửa / xoá trên UI) — trường thêm, tương thích ngược với `kbDataSchema` (TIP-020). Tải nguồn không có tệp gốc trả
// JSON mô tả hành động (`kbSourceLinkSchema`) thay cho byte; có tệp / văn bản → byte (`GET /v1/kb/sources/:id/download`).
import { z } from 'zod';

export const KB_ORIGINS = ['upload', 'url', 'text', 'catalog', 'conversation', 'drive'] as const;

export const kbFolderSchema = z.object({
  id: z.string(),
  name: z.string(),
  visibility: z.enum(['public', 'internal']).optional(),
  parent_id: z.string().nullable().optional(),
  version: z.number().int().optional(),
});
export type KbFolderDto = z.infer<typeof kbFolderSchema>;

export const kbSourceLinkSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('url'), url: z.string().url() }),
  z.object({ kind: z.literal('product'), product_id: z.string() }),
]);
export type KbSourceLinkDto = z.infer<typeof kbSourceLinkSchema>;

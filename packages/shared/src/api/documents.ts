// Shape đọc domain documents (FE ↔ BE — gap-filling §5, TIP-028): GET /v1/doc-templates?kind= — mock transport (apps/web) và
// API thật parse cùng schema. Mẫu `docx` chỉ trả metadata tệp (nội dung tải qua /v1/files/:id); PDF xem trước qua
// GET /v1/doc-templates/:id/preview (application/pdf).
import { z } from 'zod';
import { DOC_KINDS } from '../documents/variables';

export const docFieldSchema = z.object({ placeholder: z.string(), variable: z.string() });

export const docTemplateRowSchema = z.object({
  id: z.string(),
  kind: z.enum(DOC_KINDS as unknown as [string, ...string[]]),
  name: z.string(),
  source: z.enum(['rich', 'docx']),
  /** Thân HTML của mẫu `rich`. */
  body: z.string().optional(),
  /** Tên tệp Word gốc của mẫu `docx`. */
  file_name: z.string().optional(),
  file_id: z.string().optional(),
  fields: z.array(docFieldSchema),
  /** Mục bảng kiểm pháp lý còn thiếu (cảnh báo — templates.md §6). */
  checklist_missing: z.array(z.string()),
  is_default: z.boolean(),
  /** Loại hợp đồng của mẫu hợp đồng (null = mẫu chung mọi loại; loại chứng từ khác luôn null) — TIP-030b. */
  contract_kind: z.enum(['service', 'sale', 'framework']).nullable(),
  version: z.number().int(),
  updated_by: z.string(),
  updated_at: z.string(),
});
export type DocTemplateRow = z.infer<typeof docTemplateRowSchema>;

export const docTemplatesListSchema = z.object({ data: z.array(docTemplateRowSchema), next_cursor: z.null() });

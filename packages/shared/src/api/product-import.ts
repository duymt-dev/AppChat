// Theo dõi lần nhập sản phẩm (TIP-032b): `GET /v1/product-imports/:id` (trạng thái + đếm từ biên nhận dòng) và `/rows` · `/errors`
// (D42 page + limit). `processed` = số dòng đã có biên nhận; `total` = số dòng dữ liệu của tệp.
import { z } from 'zod';

export const PRODUCT_IMPORT_STATUSES = ['queued', 'running', 'cancelling', 'cancelled', 'completed', 'failed'] as const;

export const productImportStatusSchema = z.object({
  id: z.string(),
  status: z.enum(PRODUCT_IMPORT_STATUSES),
  file_name: z.string(),
  total: z.number().int(),
  processed: z.number().int(),
  created: z.number().int(),
  updated: z.number().int(),
  failed: z.number().int(),
  error: z.string().nullable(),
  created_at: z.string(),
  finished_at: z.string().nullable(),
});
export type ProductImportStatus = z.infer<typeof productImportStatusSchema>;

export const productImportRowSchema = z.object({
  row_no: z.number().int(),
  status: z.enum(['created', 'updated', 'failed']),
  product_id: z.string().nullable(),
  error: z.string().nullable(),
});
export type ProductImportRow = z.infer<typeof productImportRowSchema>;

/** Lần nhập đã xong (không còn chạy) — dừng theo dõi. */
export const importDone = (s: ProductImportStatus['status']) => s === 'completed' || s === 'cancelled' || s === 'failed';

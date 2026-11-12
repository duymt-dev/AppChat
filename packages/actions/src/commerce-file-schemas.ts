// Schema dùng chung của tệp đính kèm bản ghi (TIP-032d §1.3, §2.3) — order-files / invoice-files dùng; không phải ActionDef.
import { z } from 'zod';

export const uuid = z.string().min(1).max(64);

/** Nguồn gắn: tệp tải lên cho đúng bản ghi, HOẶC artifact Trợ lý (id + revision) — model không tự bịa file_id. */
export const attachmentSource = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('target_upload_handle'), file_id: uuid }).strict(),
  z.object({ kind: z.literal('assistant_artifact_ref'), artifact_id: uuid, revision: z.number().int().min(1) }).strict(),
]);

export const attachmentRow = z.object({
  attachment_id: z.string().nullable(),
  file_id: z.string(),
  name: z.string(),
  mime: z.string(),
  bytes: z.number().int(),
  created_at: z.string(),
  created_by: z.string().nullable(),
  /** user_attachment gỡ được; chứng từ đã sinh (PDF đề nghị / phiếu thu) chỉ mở / tải. */
  kind: z.enum(['user_attachment', 'generated_invoice', 'generated_receipt']),
  version: z.number().int().nullable(),
  /** Bản gốc chứng từ không còn (tệp mất) — không bịa đường dẫn. */
  available: z.boolean(),
  can_detach: z.boolean(),
});

export const attachmentList = z.object({ files: z.array(attachmentRow), revision: z.number().int(), can_attach: z.boolean(), next_cursor: z.string().nullable() });
export const attachReceipt = z.object({ attachment_id: z.string(), file_id: z.string(), version: z.number().int(), revision: z.number().int(), reused: z.boolean() });
export const detachReceipt = z.object({ attachment_id: z.string(), revision: z.number().int() });

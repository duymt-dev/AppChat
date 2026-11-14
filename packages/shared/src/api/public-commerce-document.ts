// Trang chứng từ công khai (TIP-032b P2): `GET /v1/public/documents/:token` — khách mở link gửi qua webchat / Zalo / email để xem và tải
// PDF đã đóng băng (`/pdf`). Chỉ thông tin hiển thị; không số tiền / ghi chú nội bộ ngoài tệp đã gửi. Link hỏng / hết hạn → 410.
import { z } from 'zod';

export const PUBLIC_DOCUMENT_KINDS = ['quote', 'payment_request', 'contract', 'order_confirmation', 'receipt'] as const;

export const publicDocumentViewSchema = z.object({
  kind: z.enum(PUBLIC_DOCUMENT_KINDS),
  code: z.string(),
  version: z.number().int(),
  business: z.string(),
  file_name: z.string(),
  expires_at: z.string(),
});
export type PublicDocumentView = z.infer<typeof publicDocumentViewSchema>;

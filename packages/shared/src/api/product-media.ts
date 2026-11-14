// Hợp đồng đọc media sản phẩm (TIP-027b §3.1): khối `media` của chi tiết sản phẩm — id liên kết + id tệp, loại, vị trí, ảnh chính, version
// bộ media, quyền sửa. KHÔNG URL / storage key: trình duyệt tải bytes qua `GET /v1/files/:id` (kiểm quyền sản phẩm hiện hành) rồi tạo object
// URL tạm, thu hồi khi đổi sản phẩm / đóng.
import { z } from 'zod';

export const productMediaItemSchema = z.object({
  media_id: z.string(),
  file_id: z.string(),
  kind: z.enum(['image', 'document']),
  name: z.string(),
  mime: z.string(),
  bytes: z.number().int(),
  position: z.number().int(),
  is_primary: z.boolean(),
  version: z.number().int(),
  created_at: z.string(),
  available: z.boolean(),
});
export type ProductMediaItemDto = z.infer<typeof productMediaItemSchema>;

export const productMediaSchema = z.object({
  items: z.array(productMediaItemSchema),
  version: z.number().int(),
  can_edit: z.boolean(),
  limits: z.object({ image: z.number().int(), document: z.number().int() }),
});
export type ProductMediaDto = z.infer<typeof productMediaSchema>;

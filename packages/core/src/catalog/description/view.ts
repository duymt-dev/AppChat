// Mô tả có định dạng ra DTO chi tiết (TIP-027b §2.6): cột hợp lệ → `description_doc`; null (sản phẩm cũ) / hỏng → không có khoá (đọc chữ
// thuần, không bịa định dạng). Danh sách không chọn cột này — chỉ chi tiết theo PK.
import { descriptionDocSchema, type DescriptionDoc } from '@appchat/shared';

export function docOf(raw: unknown): { description_doc?: DescriptionDoc } {
  if (!raw) return {};
  const d = descriptionDocSchema.safeParse(raw);
  return d.success ? { description_doc: d.data } : {};
}

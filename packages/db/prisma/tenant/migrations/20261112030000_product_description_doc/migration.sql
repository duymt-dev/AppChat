-- TIP-027b §2.1-2.2 (pha 1): mô tả sản phẩm có định dạng. `description_doc` JSONB nullable — tài liệu đóng có phiên bản (schema ở packages/shared
-- catalog/description.ts, kiểm ở action + catalog/description/normalize.ts). Sản phẩm cũ giữ NULL (đọc như chữ thuần, không viết lại);
-- `product.description` vẫn là phép chiếu văn bản thuần cho API cũ / tìm kiếm / KB / xuất. Đọc theo PK (chi tiết) — không thêm index.
ALTER TABLE "product" ADD COLUMN "description_doc" JSONB;

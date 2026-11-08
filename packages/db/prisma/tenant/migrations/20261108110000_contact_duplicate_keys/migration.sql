-- TIP-015e §5: khoá khớp ứng viên trùng trên khách sống — self-join bằng nhau (Index Scan / Merge Join) thay vì quét toàn bảng. Email đã có
-- `contact_email_lower_idx` (lower(email) WHERE deleted_at IS NULL AND email IS NOT NULL). Thêm: MST và họ tên không dấu (B-tree — index
-- trigram `contact_name_trgm_idx` chỉ phục vụ LIKE, không phục vụ phép bằng). Một phần: chỉ khách sống.
CREATE INDEX "contact_tax_code_live_idx" ON "contact" ("tax_code", "id") WHERE "deleted_at" IS NULL AND "tax_code" IS NOT NULL;
CREATE INDEX "contact_name_key_live_idx" ON "contact" (f_unaccent(lower("name")), "id") WHERE "deleted_at" IS NULL;

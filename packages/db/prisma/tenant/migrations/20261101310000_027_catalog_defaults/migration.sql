-- TIP-027 (2/2): 5 danh mục mặc định theo prototype (chạy trên template + mọi DB tenant đang có qua tenant-migrate — DC-154)
-- và index biểu thức cho lịch sử sản phẩm (`GET /v1/products/:id/activity` đọc action_log product.* theo product_id).
INSERT INTO "product_category" ("id", "name", "color", "sort") VALUES
  (gen_random_uuid(), 'Liệu trình', '#1F9C4F', 0),
  (gen_random_uuid(), 'Combo', '#2B9EF3', 1),
  (gen_random_uuid(), 'Gói năm', '#8B5CF6', 2),
  (gen_random_uuid(), 'Dịch vụ lẻ', '#C9820B', 3),
  (gen_random_uuid(), 'Sản phẩm', '#0E9B94', 4)
ON CONFLICT DO NOTHING;

CREATE INDEX "action_log_product_idx" ON "action_log" ((coalesce("result" ->> 'product_id', "input" ->> 'product_id')), "created_at" DESC)
  WHERE "action_id" LIKE 'product.%';

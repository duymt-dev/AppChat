-- TIP-032b P1: chính sách bán hàng (ngưỡng duyệt cấu hình được — COMMERCE §3 Q5). Chỉ thêm bảng; seed giá trị luật (20.000.000đ / 5%),
-- không ghi đè nếu đã có dòng.
CREATE TABLE "commerce_settings" (
    "id" SMALLINT NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "approval_total_vnd" BIGINT NOT NULL DEFAULT 20000000,
    "approval_discount_pct" SMALLINT NOT NULL DEFAULT 5,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "commerce_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "commerce_settings_singleton_chk" CHECK ("id" = 1),
    CONSTRAINT "commerce_settings_total_chk" CHECK ("approval_total_vnd" >= 0),
    CONSTRAINT "commerce_settings_pct_chk" CHECK ("approval_discount_pct" BETWEEN 0 AND 100)
);
INSERT INTO "commerce_settings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;

-- TIP-032b P3: liệu trình khi cọc + nhắc gia hạn (COMMERCE §6).
-- · product.grant_on_deposit — sản phẩm liệu trình cho dùng khi mới cọc.
-- · order_item: ảnh chụp liệu trình lúc ghi dòng (loại / số buổi / hạn / cờ cọc) — đổi danh mục sau này không đổi gói đã / sẽ sinh.
-- · customer_package: nguồn (legacy_product = gói cũ theo (đơn, sản phẩm); order_item = mỗi dòng đơn một gói), expiry_version tăng khi
--   hạn đổi (gia hạn / hoàn tác) để nhắc T-7 theo đúng bản hạn.
-- · package_reminder: biên nhận nhắc (gói, mốc, bản hạn) — quét lại / chạy song song không nhân thông báo.
ALTER TABLE "product" ADD COLUMN "grant_on_deposit" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "order_item"
    ADD COLUMN "product_type" TEXT,
    ADD COLUMN "package_sessions" INTEGER,
    ADD COLUMN "package_valid_days" INTEGER,
    ADD COLUMN "grant_on_deposit" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "snapshot_at" TIMESTAMPTZ(6),
    ADD CONSTRAINT "order_item_package_chk" CHECK ("package_sessions" IS NULL OR "package_sessions" > 0);

-- Gói đã có = legacy_product (không tự chia / nhân gói khi thiếu ánh xạ dòng); gói mới do grantPackages ghi rõ order_item + order_item_id.
ALTER TABLE "customer_package"
    ADD COLUMN "source_kind" TEXT NOT NULL DEFAULT 'legacy_product',
    ADD COLUMN "order_item_id" UUID,
    ADD COLUMN "expiry_version" INTEGER NOT NULL DEFAULT 1,
    ADD CONSTRAINT "customer_package_source_chk" CHECK (("source_kind" = 'legacy_product' AND "order_item_id" IS NULL) OR ("source_kind" = 'order_item' AND "order_item_id" IS NOT NULL));

DROP INDEX "customer_package_order_id_product_id_key";
CREATE UNIQUE INDEX "customer_package_legacy_key" ON "customer_package" ("order_id", "product_id") WHERE "source_kind" = 'legacy_product';
CREATE UNIQUE INDEX "customer_package_order_item_key" ON "customer_package" ("order_item_id") WHERE "order_item_id" IS NOT NULL;
-- Nhắc "còn 1 buổi" (indexing §4 expression + partial): `WHERE status = 'active' AND total_sessions - used_sessions = 1`.
CREATE INDEX "customer_package_remaining_idx" ON "customer_package" (("total_sessions" - "used_sessions")) INCLUDE ("expiry_version") WHERE "status" = 'active';

CREATE TABLE "package_reminder" (
    "id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "milestone" TEXT NOT NULL,
    "expiry_version" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "package_reminder_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "package_reminder_milestone_chk" CHECK ("milestone" IN ('remaining_1', 'expiry_t7')),
    CONSTRAINT "package_reminder_package_fkey" FOREIGN KEY ("package_id") REFERENCES "customer_package"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "package_reminder_key" ON "package_reminder" ("package_id", "milestone", "expiry_version");

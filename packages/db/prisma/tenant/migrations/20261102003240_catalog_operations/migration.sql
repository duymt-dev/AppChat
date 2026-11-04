-- TIP-032b P4: biến thể là thực thể riêng (product_variant.*), nhập sản phẩm CSV / XLSX (product.import) chạy đồng bộ ≤ 500 dòng hoặc
-- việc nền > 500 dòng (202 job_accepted). Biến thể đã có giữ nguyên (lưu trữ thay vì xoá khi còn tham chiếu lịch sử).
-- · product_variant: SKU unique toàn workspace (indexing §4: chỉ biến thể đang dùng), version khoá lạc quan, updated_at.
-- · product_import: một lần nhập (tệp + hash + ánh xạ cột + người gọi), trạng thái + đếm; product_import_row: biên nhận từng dòng
--   (import_id, row_no) unique — chạy lại / huỷ không nhập lại dòng đã ghi.
ALTER TABLE "product_variant"
    ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD CONSTRAINT "product_variant_price_chk" CHECK ("price" IS NULL OR "price" >= 0);
-- SKU trùng có sẵn (biến thể sinh tự động `<mã>-<n>` có thể đụng nhau giữa hai sản phẩm): giữ bản cũ nhất, bản sau thêm hậu tố id — không
-- xoá / đổi biến thể đã có tham chiếu lịch sử, chỉ đổi SKU để unique được tạo.
UPDATE "product_variant" v SET "sku" = v."sku" || '-' || left(v."id"::text, 8)
FROM (SELECT "id", row_number() OVER (PARTITION BY lower("sku") ORDER BY "created_at", "id") AS n FROM "product_variant" WHERE "status" <> 'archived') d
WHERE v."id" = d."id" AND d.n > 1;
CREATE UNIQUE INDEX "product_variant_sku_active_key" ON "product_variant" (lower("sku")) WHERE "status" <> 'archived';

CREATE TABLE "product_import" (
    "id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "file_sha256" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mapping" JSONB NOT NULL DEFAULT '{}',
    "actor_id" UUID,
    "action_log_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "total" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "next_attempt_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    CONSTRAINT "product_import_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_import_status_chk" CHECK ("status" IN ('queued', 'running', 'cancelling', 'cancelled', 'completed', 'failed')),
    CONSTRAINT "product_import_counts_chk" CHECK ("total" >= 0 AND "created" >= 0 AND "updated" >= 0 AND "failed" >= 0)
);
-- Lịch sử nhập của người gọi (indexing §1: = trước, sort sau).
CREATE INDEX "product_import_actor_idx" ON "product_import" ("actor_id", "status", "created_at" DESC, "id");
-- Việc nền chờ chạy (partial — chỉ hàng đợi).
CREATE INDEX "product_import_pending_idx" ON "product_import" ("status", "next_attempt_at", "id") WHERE "status" IN ('queued', 'running');

CREATE TABLE "product_import_row" (
    "import_id" UUID NOT NULL,
    "row_no" INTEGER NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "product_id" UUID,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_import_row_pkey" PRIMARY KEY ("import_id", "row_no"),
    CONSTRAINT "product_import_row_status_chk" CHECK ("status" IN ('created', 'updated', 'failed')),
    CONSTRAINT "product_import_row_import_fkey" FOREIGN KEY ("import_id") REFERENCES "product_import"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Trang lỗi của một lần nhập (deferred join theo PK).
CREATE INDEX "product_import_row_failed_idx" ON "product_import_row" ("import_id", "row_no") WHERE "status" = 'failed';

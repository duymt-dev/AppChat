-- TIP-027: Sản phẩm & dịch vụ (Blueprint §2.2 catalog, COMMERCE §2) — 6 loại, danh mục, biến thể (P1), combo, sổ kho chỉ thêm.

-- CreateEnum
CREATE TYPE "product_type" AS ENUM ('physical', 'service', 'combo', 'package', 'digital', 'rental');

-- CreateEnum
CREATE TYPE "product_status" AS ENUM ('active', 'draft', 'archived');

-- CreateEnum
CREATE TYPE "stock_movement_kind" AS ENUM ('sale', 'return', 'adjust', 'import');

-- CreateTable
CREATE TABLE "product_category" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "product_type" NOT NULL,
    "category_id" UUID,
    "price" BIGINT NOT NULL,
    "cost" BIGINT,
    "unit" TEXT NOT NULL,
    "tax_rate" INTEGER NOT NULL DEFAULT 8,
    "stock" INTEGER,
    "low_stock_threshold" INTEGER,
    "duration_min" INTEGER,
    "sessions" INTEGER,
    "valid_days" INTEGER,
    "deposit" BIGINT,
    "rental_unit" TEXT,
    "attrs" JSONB NOT NULL DEFAULT '[]',
    "description" TEXT NOT NULL DEFAULT '',
    "status" "product_status" NOT NULL DEFAULT 'active',
    "custom" JSONB NOT NULL DEFAULT '{}',
    "sold" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "product_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_price_check" CHECK ("price" >= 0),
    CONSTRAINT "product_tax_rate_check" CHECK ("tax_rate" IN (0, 5, 8, 10))
);

-- CreateTable
CREATE TABLE "product_variant" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "attrs" JSONB NOT NULL DEFAULT '{}',
    "price" BIGINT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "status" "product_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_component" (
    "product_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "qty" INTEGER NOT NULL,

    CONSTRAINT "product_component_pkey" PRIMARY KEY ("product_id","child_id"),
    CONSTRAINT "product_component_qty_check" CHECK ("qty" >= 1),
    CONSTRAINT "product_component_self_check" CHECK ("product_id" <> "child_id")
);

-- CreateTable
CREATE TABLE "stock_movement" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "kind" "stock_movement_kind" NOT NULL,
    "qty" INTEGER NOT NULL,
    "ref_type" TEXT NOT NULL,
    "ref_id" TEXT NOT NULL,
    "reason" TEXT,
    "actor_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_code_key" ON "product"("code");
CREATE INDEX "product_status_type_idx" ON "product"("status", "type");
CREATE INDEX "product_variant_product_id_idx" ON "product_variant"("product_id");
CREATE INDEX "product_component_child_id_idx" ON "product_component"("child_id");
CREATE UNIQUE INDEX "stock_movement_ref_type_ref_id_product_id_key" ON "stock_movement"("ref_type", "ref_id", "product_id");
CREATE INDEX "stock_movement_product_id_created_at_idx" ON "stock_movement"("product_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_component" ADD CONSTRAINT "product_component_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_component" ADD CONSTRAINT "product_component_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Viết tay (indexing §3–7): tên danh mục không trùng (không phân biệt hoa thường); danh sách theo danh mục / trạng thái mới nhất trước
-- (partial chưa xoá, id phụ cho deferred join); tìm không dấu trigram; lọc trường tuỳ biến (D56).
CREATE UNIQUE INDEX "product_category_name_lower_key" ON "product_category" (lower("name"));
CREATE INDEX "product_live_recent_idx" ON "product" ("created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX "product_live_category_idx" ON "product" ("category_id", "created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX "product_name_trgm_idx" ON "product" USING gin (f_unaccent(lower("name")) gin_trgm_ops) WHERE "deleted_at" IS NULL;
CREATE INDEX "product_custom_gin_idx" ON "product" USING gin ("custom" jsonb_path_ops);
CREATE INDEX "kb_source_product_id_idx" ON "kb_source" ("product_id") WHERE "product_id" IS NOT NULL;

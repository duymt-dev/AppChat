-- TIP-027b §1.1–1.4, §2.3, §4.3: media riêng tư của sản phẩm (ảnh / tài liệu) + version bộ media + ý định gắn đang chuẩn bị.
CREATE TYPE "product_media_kind" AS ENUM ('image', 'document');

CREATE TABLE "product_media" (
  "id" UUID PRIMARY KEY,
  "product_id" UUID NOT NULL REFERENCES "product"("id") ON DELETE RESTRICT,
  "file_id" UUID NOT NULL,
  "kind" "product_media_kind" NOT NULL,
  "position" INTEGER NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 1,
  "source" TEXT NOT NULL DEFAULT 'upload',
  "source_ref" TEXT,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "detached_at" TIMESTAMPTZ(6),
  "detached_by" UUID
);
-- Danh sách theo sản phẩm + loại: bằng (product_id, kind) trước, sắp xếp (position, id) sau; chỉ liên kết sống; INCLUDE payload nhỏ.
CREATE INDEX "product_media_list_idx" ON "product_media" ("product_id", "kind", "position", "id") INCLUDE ("file_id", "version", "is_primary", "created_at") WHERE "detached_at" IS NULL;
CREATE UNIQUE INDEX "product_media_live_key" ON "product_media" ("product_id", "file_id") WHERE "detached_at" IS NULL;
CREATE UNIQUE INDEX "product_media_primary_key" ON "product_media" ("product_id") WHERE "is_primary" AND "detached_at" IS NULL;
CREATE INDEX "product_media_file_idx" ON "product_media" ("file_id");

CREATE TABLE "product_media_state" (
  "product_id" UUID PRIMARY KEY,
  "version" INTEGER NOT NULL DEFAULT 0,
  "touched" BOOLEAN NOT NULL DEFAULT false,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE "product_media_intent" (
  "operation_id" TEXT NOT NULL,
  "product_id" UUID NOT NULL,
  "file_id" UUID,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  PRIMARY KEY ("product_id", "operation_id")
);

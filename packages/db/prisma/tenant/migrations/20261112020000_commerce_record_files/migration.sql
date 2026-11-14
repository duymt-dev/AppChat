-- TIP-032d §1.1, §2.6: tệp đính kèm đơn / đề nghị thanh toán + giành tệp một-chủ + staging kiểm cấu trúc + revision bộ tệp của cha.
CREATE TYPE "attachment_validation" AS ENUM ('pending', 'validating', 'structurally_valid', 'rejected', 'unavailable');

CREATE TABLE "file_claim" (
  "file_id" UUID PRIMARY KEY,
  "parent_type" TEXT NOT NULL,
  "parent_id" UUID NOT NULL,
  "association_id" UUID NOT NULL,
  "revision" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX "file_claim_parent_idx" ON "file_claim" ("parent_type", "parent_id");

CREATE TABLE "attachment_staging" (
  "file_id" UUID PRIMARY KEY,
  "uploaded_by" UUID NOT NULL,
  "parent_type" TEXT NOT NULL,
  "parent_id" UUID NOT NULL,
  "status" "attachment_validation" NOT NULL DEFAULT 'pending',
  "validator_version" INTEGER NOT NULL DEFAULT 0,
  "digest" TEXT NOT NULL,
  "kind" TEXT,
  "reason" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX "attachment_staging_status_idx" ON "attachment_staging" ("status", "created_at");

CREATE TABLE "order_attachment" (
  "id" UUID PRIMARY KEY,
  "order_id" UUID NOT NULL REFERENCES "order"("id") ON DELETE CASCADE,
  "file_id" UUID NOT NULL,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "version" INTEGER NOT NULL DEFAULT 1,
  "detached_at" TIMESTAMPTZ(6),
  "detached_by" UUID
);
-- Danh sách theo cha: bằng (order_id) trước, sắp xếp (created_at DESC, id DESC) sau; chỉ liên kết sống; INCLUDE payload nhỏ cho bước id.
CREATE INDEX "order_attachment_list_idx" ON "order_attachment" ("order_id", "created_at" DESC, "id" DESC) INCLUDE ("file_id", "version", "created_by") WHERE "detached_at" IS NULL;
CREATE UNIQUE INDEX "order_attachment_live_key" ON "order_attachment" ("order_id", "file_id") WHERE "detached_at" IS NULL;
CREATE INDEX "order_attachment_file_idx" ON "order_attachment" ("file_id");

CREATE TABLE "invoice_attachment" (
  "id" UUID PRIMARY KEY,
  "invoice_id" UUID NOT NULL REFERENCES "invoice"("id") ON DELETE CASCADE,
  "file_id" UUID NOT NULL,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "version" INTEGER NOT NULL DEFAULT 1,
  "detached_at" TIMESTAMPTZ(6),
  "detached_by" UUID
);
CREATE INDEX "invoice_attachment_list_idx" ON "invoice_attachment" ("invoice_id", "created_at" DESC, "id" DESC) INCLUDE ("file_id", "version", "created_by") WHERE "detached_at" IS NULL;
CREATE UNIQUE INDEX "invoice_attachment_live_key" ON "invoice_attachment" ("invoice_id", "file_id") WHERE "detached_at" IS NULL;
CREATE INDEX "invoice_attachment_file_idx" ON "invoice_attachment" ("file_id");

CREATE TABLE "record_attachment_state" (
  "parent_type" TEXT NOT NULL,
  "parent_id" UUID NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  PRIMARY KEY ("parent_type", "parent_id")
);

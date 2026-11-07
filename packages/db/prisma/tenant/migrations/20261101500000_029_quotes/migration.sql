-- TIP-029: Báo giá (Blueprint §2.2 quote / quote_item, COMMERCE §3, state-machine §4). Phiên bản n+1 cùng mã (D46) → unique (code, version).
-- Danh sách D42 lọc theo trạng thái / phụ trách / khách + sắp xếp mới nhất; bản `superseded` / đã xoá không hiện ở danh sách.

-- CreateEnum
CREATE TYPE "quote_status" AS ENUM ('draft', 'pending_approval', 'approved', 'sent', 'viewed', 'accepted', 'revision_requested', 'rejected', 'expired', 'superseded');

-- CreateTable
CREATE TABLE "quote" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "root_quote_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "owner_user_id" UUID,
    "template_id" UUID,
    "template_version" INTEGER,
    "conversation_id" UUID,
    "status" "quote_status" NOT NULL DEFAULT 'draft',
    "subtotal" BIGINT NOT NULL DEFAULT 0,
    "line_discount_total" BIGINT NOT NULL DEFAULT 0,
    "header_discount" JSONB,
    "discount_total" BIGINT NOT NULL DEFAULT 0,
    "tax_total" BIGINT NOT NULL DEFAULT 0,
    "total" BIGINT NOT NULL DEFAULT 0,
    "valid_days" INTEGER NOT NULL DEFAULT 15,
    "valid_until" TIMESTAMPTZ(6),
    "reminded_at" TIMESTAMPTZ(6),
    "viewed_at" TIMESTAMPTZ(6),
    "order_id" UUID,
    "note" TEXT NOT NULL DEFAULT '',
    "gift" TEXT NOT NULL DEFAULT '',
    "payment_terms" TEXT NOT NULL DEFAULT '',
    "off_catalog" BOOLEAN NOT NULL DEFAULT false,
    "created_by_type" TEXT NOT NULL DEFAULT 'user',
    "created_by_id" TEXT,
    "approved_by" UUID,
    "sent_at" TIMESTAMPTZ(6),
    "sent_channel" TEXT,
    "decided_at" TIMESTAMPTZ(6),
    "file_id" UUID,
    "file_sha256" TEXT,
    "custom" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "quote_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quote_money_chk" CHECK ("subtotal" >= 0 AND "discount_total" >= 0 AND "tax_total" >= 0 AND "total" >= 0),
    CONSTRAINT "quote_valid_days_chk" CHECK ("valid_days" BETWEEN 1 AND 180),
    CONSTRAINT "quote_contact_fkey" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "quote_file_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quote_item" (
    "id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "product_id" UUID,
    "name" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT '',
    "qty" DECIMAL(12,3) NOT NULL,
    "unit_price" BIGINT NOT NULL,
    "discount" JSONB,
    "tax_rate" INTEGER NOT NULL,
    "line_total" BIGINT NOT NULL,
    "sort" INTEGER NOT NULL,

    CONSTRAINT "quote_item_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quote_item_qty_chk" CHECK ("qty" > 0),
    CONSTRAINT "quote_item_price_chk" CHECK ("unit_price" >= 0 AND "line_total" >= 0),
    CONSTRAINT "quote_item_tax_chk" CHECK ("tax_rate" IN (0, 5, 8, 10)),
    CONSTRAINT "quote_item_quote_fkey" FOREIGN KEY ("quote_id") REFERENCES "quote"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quote_item_product_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quote_comment" (
    "id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "author_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_comment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quote_comment_quote_fkey" FOREIGN KEY ("quote_id") REFERENCES "quote"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Phiên bản n+1 giữ mã (D46).
CREATE UNIQUE INDEX "quote_code_version_key" ON "quote" ("code", "version");
CREATE INDEX "quote_item_quote_id_sort_idx" ON "quote_item" ("quote_id", "sort");
CREATE INDEX "quote_comment_quote_id_created_at_idx" ON "quote_comment" ("quote_id", "created_at");

-- Danh sách D42 (bản đang hiện: chưa xoá, không superseded): lọc trạng thái → (status, created_at DESC, id DESC); phụ trách (scope own +
-- lọc người) → (owner_user_id, status, created_at DESC) theo Blueprint L423; mặc định → (created_at DESC, id DESC).
CREATE INDEX "quote_live_status_idx" ON "quote" ("status", "created_at" DESC, "id" DESC)
  WHERE "deleted_at" IS NULL AND "status" <> 'superseded';
CREATE INDEX "quote_live_owner_idx" ON "quote" ("owner_user_id", "status", "created_at" DESC, "id" DESC)
  WHERE "deleted_at" IS NULL AND "status" <> 'superseded';
CREATE INDEX "quote_live_recent_idx" ON "quote" ("created_at" DESC, "id" DESC)
  WHERE "deleted_at" IS NULL AND "status" <> 'superseded';
-- Báo giá của khách (Hồ sơ 360°, ?contact_id=, luật lùi giai đoạn) + chuỗi phiên bản.
CREATE INDEX "quote_contact_idx" ON "quote" ("contact_id", "created_at" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX "quote_root_idx" ON "quote" ("root_quote_id", "version" DESC);
-- Job hết hạn / nhắc T-2: chỉ bản đang chờ khách.
CREATE INDEX "quote_open_valid_until_idx" ON "quote" ("valid_until") WHERE "status" IN ('sent', 'viewed') AND "deleted_at" IS NULL;
-- Tìm theo mã (prefix) — tên khách tìm qua contact (trigram đã có ở 015).
CREATE INDEX "quote_code_idx" ON "quote" ("code" text_pattern_ops) WHERE "deleted_at" IS NULL;
-- Lọc trường tuỳ biến `cf.*` (D56).
CREATE INDEX "quote_custom_gin_idx" ON "quote" USING gin ("custom" jsonb_path_ops) WHERE "deleted_at" IS NULL;

-- Lịch sử báo giá (action_log quote.* theo quote_id).
CREATE INDEX "action_log_quote_idx" ON "action_log" ((coalesce("result" ->> 'quote_id', "input" ->> 'quote_id')), "created_at" DESC)
  WHERE "action_id" LIKE 'quote.%';

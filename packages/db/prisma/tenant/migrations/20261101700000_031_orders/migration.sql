-- TIP-031: Đơn hàng (Blueprint §2.2 order / order_item, COMMERCE §4 / §4b, state-machine §4). Hai trục: `status` (tiến độ) +
-- `pay_status` (tổng hợp từ đã thu / đã hoàn — lưu để lọc chip). Mã `DH-{n}` (D52). Đơn sàn nhập một lần: unique (kết nối, mã ngoài).
-- "order" là từ khoá SQL → luôn trích dẫn.

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('new', 'processing', 'completed', 'cancelled');
CREATE TYPE "pay_status" AS ENUM ('unpaid', 'awaiting_deposit', 'deposited', 'partial', 'paid', 'partially_refunded', 'refunded');
CREATE TYPE "order_source" AS ENUM ('manual', 'quote', 'contract', 'appointment', 'marketplace', 'pos');

-- CreateTable
CREATE TABLE "order" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "source" "order_source" NOT NULL DEFAULT 'manual',
    "channel" TEXT NOT NULL DEFAULT '',
    "external_connection_id" UUID,
    "external_id" TEXT,
    "platform" TEXT,
    "platform_status" TEXT,
    "synced_at" TIMESTAMPTZ(6),
    "locked_lines" BOOLEAN NOT NULL DEFAULT false,
    "owner_user_id" UUID,
    "contact_id" UUID NOT NULL,
    "quote_id" UUID,
    "contract_id" UUID,
    "appointment_id" UUID,
    "conversation_id" UUID,
    "status" "order_status" NOT NULL DEFAULT 'new',
    "pay_status" "pay_status" NOT NULL DEFAULT 'unpaid',
    "deposit_required" BOOLEAN NOT NULL DEFAULT false,
    "deposit_amount" BIGINT NOT NULL DEFAULT 0,
    "header_discount" JSONB,
    "subtotal" BIGINT NOT NULL DEFAULT 0,
    "line_discount_total" BIGINT NOT NULL DEFAULT 0,
    "discount_total" BIGINT NOT NULL DEFAULT 0,
    "tax_total" BIGINT NOT NULL DEFAULT 0,
    "total" BIGINT NOT NULL DEFAULT 0,
    "paid_total" BIGINT NOT NULL DEFAULT 0,
    "refunded_total" BIGINT NOT NULL DEFAULT 0,
    "points_used" BIGINT NOT NULL DEFAULT 0,
    "points_earned" INTEGER NOT NULL DEFAULT 0,
    "refund_pending" BOOLEAN NOT NULL DEFAULT false,
    "shipping" JSONB NOT NULL DEFAULT '{}',
    "stock_ref" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "cancel_reason" TEXT NOT NULL DEFAULT '',
    "created_by_type" TEXT NOT NULL DEFAULT 'user',
    "created_by_id" TEXT,
    "confirmed_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "custom" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "order_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_money_chk" CHECK ("subtotal" >= 0 AND "discount_total" >= 0 AND "tax_total" >= 0 AND "total" >= 0
      AND "paid_total" >= 0 AND "refunded_total" >= 0 AND "deposit_amount" >= 0 AND "points_used" >= 0 AND "points_earned" >= 0),
    -- Cọc bật thì phải có số tiền; tắt thì 0 (COMMERCE §4 — Chờ cọc chỉ khi deposit_required).
    CONSTRAINT "order_deposit_chk" CHECK (("deposit_required" AND "deposit_amount" > 0) OR (NOT "deposit_required" AND "deposit_amount" = 0)),
    CONSTRAINT "order_cancel_reason_chk" CHECK ("status" <> 'cancelled' OR length(btrim("cancel_reason")) > 0),
    -- Đơn sàn có đủ khoá ngoài; đơn khác không mang mã ngoài.
    CONSTRAINT "order_external_chk" CHECK (("source" = 'marketplace') = ("external_connection_id" IS NOT NULL AND "external_id" IS NOT NULL)),
    CONSTRAINT "order_contact_fkey" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "order_quote_fkey" FOREIGN KEY ("quote_id") REFERENCES "quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "order_contract_fkey" FOREIGN KEY ("contract_id") REFERENCES "contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "order_connection_fkey" FOREIGN KEY ("external_connection_id") REFERENCES "integration_connection"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order_item" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID,
    "variant_id" UUID,
    "name" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT '',
    "qty" DECIMAL(12,3) NOT NULL,
    "unit_price" BIGINT NOT NULL,
    "discount" JSONB,
    "tax_rate" INTEGER NOT NULL,
    "line_total" BIGINT NOT NULL,
    "sort" INTEGER NOT NULL,

    CONSTRAINT "order_item_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_item_qty_chk" CHECK ("qty" > 0),
    CONSTRAINT "order_item_price_chk" CHECK ("unit_price" >= 0 AND "line_total" >= 0),
    CONSTRAINT "order_item_tax_chk" CHECK ("tax_rate" IN (0, 5, 8, 10)),
    CONSTRAINT "order_item_order_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_item_product_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order_event" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "amount" BIGINT,
    "points" INTEGER,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_event_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_event_order_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "order_code_key" ON "order" ("code");
-- Một báo giá một đơn; đơn sàn nhập một lần theo (kết nối, mã ngoài).
CREATE UNIQUE INDEX "order_quote_id_key" ON "order" ("quote_id");
CREATE UNIQUE INDEX "order_external_connection_id_external_id_key" ON "order" ("external_connection_id", "external_id");
CREATE INDEX "order_item_order_id_sort_idx" ON "order_item" ("order_id", "sort");
CREATE INDEX "order_event_order_id_created_at_idx" ON "order_event" ("order_id", "created_at");

-- Danh sách D42 (đơn chưa xoá): mặc định → (created_at DESC, id DESC); chip Đã huỷ → (status, …); chip thanh toán (đơn chưa huỷ) →
-- (pay_status, …); phụ trách (scope own + lọc người) → (owner_user_id, status, created_at DESC) theo Blueprint.
CREATE INDEX "order_live_recent_idx" ON "order" ("created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX "order_live_status_idx" ON "order" ("status", "created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX "order_live_pay_idx" ON "order" ("pay_status", "created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL AND "status" <> 'cancelled';
CREATE INDEX "order_live_owner_idx" ON "order" ("owner_user_id", "status", "created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
-- Đơn của khách (Hồ sơ 360°, LTV, thẻ CRM) + đơn theo hợp đồng.
CREATE INDEX "order_contact_idx" ON "order" ("contact_id", "created_at" DESC) INCLUDE ("status", "total") WHERE "deleted_at" IS NULL;
CREATE INDEX "order_contract_idx" ON "order" ("contract_id") WHERE "contract_id" IS NOT NULL AND "deleted_at" IS NULL;
-- Tìm theo mã (prefix) — tên khách qua contact (trigram 015).
CREATE INDEX "order_code_idx" ON "order" ("code" text_pattern_ops) WHERE "deleted_at" IS NULL;
-- Lọc trường tuỳ biến `cf.*` (D56).
CREATE INDEX "order_custom_gin_idx" ON "order" USING gin ("custom" jsonb_path_ops) WHERE "deleted_at" IS NULL;

-- Lịch sử đơn (action_log order.* theo order_id).
CREATE INDEX "action_log_order_idx" ON "action_log" ((coalesce("result" ->> 'order_id', "input" ->> 'order_id')), "created_at" DESC)
  WHERE "action_id" LIKE 'order.%';

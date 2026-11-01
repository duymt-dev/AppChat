-- TIP-032: Đề nghị thanh toán + khoản thu + liệu trình (Blueprint §2.2 sales-payments, COMMERCE §5 / §6, state-machine §6–8).
-- invoice (mã `TT-{n}`) · customer_payment (sổ chỉ thêm, phiếu thu `PT-{n}`, hoàn tiền số âm có duyệt) · payment_account (VietQR của DN)
-- · tenant_bank_feed + bank_tx (SePay / Casso của DN — khớp `TT…`, hàng "Cần đối soát") · customer_package + package_usage.

-- CreateEnum
CREATE TYPE "invoice_kind" AS ENUM ('deposit', 'installment', 'full');
CREATE TYPE "invoice_status" AS ENUM ('draft', 'sent', 'partial', 'paid', 'overdue', 'void');
CREATE TYPE "payment_kind" AS ENUM ('deposit', 'payment', 'points', 'refund');
CREATE TYPE "payment_method" AS ENUM ('qr', 'bank_transfer', 'cash', 'card', 'points', 'marketplace');
CREATE TYPE "payment_status" AS ENUM ('pending', 'confirmed', 'failed', 'needs_review');
CREATE TYPE "bank_tx_status" AS ENUM ('matched', 'needs_review', 'resolved');
CREATE TYPE "package_status" AS ENUM ('active', 'exhausted', 'expired', 'refunded');

-- CreateTable
CREATE TABLE "payment_account" (
    "id" SMALLINT NOT NULL DEFAULT 1,
    "bank" TEXT NOT NULL,
    "bank_bin" TEXT NOT NULL,
    "account_no" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_account_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_account_one_chk" CHECK ("id" = 1),
    CONSTRAINT "payment_account_bin_chk" CHECK ("bank_bin" ~ '^[0-9]{6}$'),
    CONSTRAINT "payment_account_no_chk" CHECK ("account_no" ~ '^[0-9A-Za-z]{4,25}$')
);

-- CreateTable
CREATE TABLE "tenant_bank_feed" (
    "id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "account_no" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_tx_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_bank_feed_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenant_bank_feed_status_chk" CHECK ("status" IN ('active', 'disconnected')),
    CONSTRAINT "tenant_bank_feed_connection_fkey" FOREIGN KEY ("connection_id") REFERENCES "integration_connection"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "tenant_bank_feed_connection_id_key" ON "tenant_bank_feed" ("connection_id");

-- CreateTable
CREATE TABLE "invoice" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "order_id" UUID,
    "contact_id" UUID NOT NULL,
    "owner_user_id" UUID,
    "kind" "invoice_kind" NOT NULL DEFAULT 'full',
    "status" "invoice_status" NOT NULL DEFAULT 'draft',
    "title" TEXT NOT NULL DEFAULT '',
    "amount" BIGINT NOT NULL,
    "paid_amount" BIGINT NOT NULL DEFAULT 0,
    "due_date" DATE NOT NULL,
    "reminders_sent" JSONB NOT NULL DEFAULT '[]',
    "sent_at" TIMESTAMPTZ(6),
    "sent_channel" TEXT,
    "sent_by_id" TEXT,
    "conversation_id" UUID,
    "file_id" UUID,
    "void_reason" TEXT NOT NULL DEFAULT '',
    "voided_at" TIMESTAMPTZ(6),
    "voided_by_id" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "created_by_type" TEXT NOT NULL DEFAULT 'user',
    "created_by_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id"),
    -- Số đã thu (gộp các khoản thu dương đã xác nhận — hoàn tiền ghi ở đơn / sổ khoản thu, không mở lại đề nghị) ≤ số đề nghị.
    CONSTRAINT "invoice_money_chk" CHECK ("amount" > 0 AND "paid_amount" >= 0 AND "paid_amount" <= "amount"),
    CONSTRAINT "invoice_void_chk" CHECK ("status" <> 'void' OR length(btrim("void_reason")) > 0),
    CONSTRAINT "invoice_contact_fkey" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoice_order_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "invoice_code_key" ON "invoice" ("code");
-- Danh sách D42: mặc định (created_at DESC, id DESC); scope own → (owner_user_id, status, due_date) theo Blueprint + thứ tự danh sách.
CREATE INDEX "invoice_recent_idx" ON "invoice" ("created_at" DESC, "id" DESC);
CREATE INDEX "invoice_owner_idx" ON "invoice" ("owner_user_id", "created_at" DESC, "id" DESC);
-- Công nợ theo khách (Hồ sơ 360°, thẻ CRM) — covering.
CREATE INDEX "invoice_contact_idx" ON "invoice" ("contact_id", "status") INCLUDE ("amount", "paid_amount", "due_date");
-- Đề nghị của đơn (form tạo: còn phải thu; thẻ đơn).
CREATE INDEX "invoice_order_idx" ON "invoice" ("order_id") INCLUDE ("status", "amount", "paid_amount") WHERE "order_id" IS NOT NULL;
-- Quét nhắc / quá hạn: chỉ đề nghị còn mở.
CREATE INDEX "invoice_open_due_idx" ON "invoice" ("due_date") WHERE "status" IN ('sent', 'partial', 'overdue');
-- Tìm theo mã (prefix) + tiêu đề không dấu.
CREATE INDEX "invoice_code_prefix_idx" ON "invoice" ("code" text_pattern_ops);

-- CreateTable
CREATE TABLE "bank_tx" (
    "id" UUID NOT NULL,
    "feed_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "content" TEXT NOT NULL,
    "account_no" TEXT NOT NULL DEFAULT '',
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "bank_tx_status" NOT NULL,
    "reason" TEXT,
    "suggested_invoice_id" UUID,
    "invoice_id" UUID,
    "payment_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_tx_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bank_tx_amount_chk" CHECK ("amount" > 0),
    CONSTRAINT "bank_tx_review_chk" CHECK ("status" <> 'needs_review' OR "reason" IS NOT NULL),
    CONSTRAINT "bank_tx_feed_fkey" FOREIGN KEY ("feed_id") REFERENCES "tenant_bank_feed"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bank_tx_invoice_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- Idempotent theo mã giao dịch của provider (webhook gửi lại).
CREATE UNIQUE INDEX "bank_tx_feed_id_external_id_key" ON "bank_tx" ("feed_id", "external_id");
-- Hàng "Cần đối soát".
CREATE INDEX "bank_tx_review_idx" ON "bank_tx" ("occurred_at" DESC) WHERE "status" = 'needs_review';

-- CreateTable
CREATE TABLE "customer_payment" (
    "id" UUID NOT NULL,
    "invoice_id" UUID,
    "order_id" UUID,
    "contact_id" UUID NOT NULL,
    "kind" "payment_kind" NOT NULL,
    "amount" BIGINT NOT NULL,
    "method" "payment_method" NOT NULL,
    "reference" TEXT NOT NULL DEFAULT '',
    "bank_tx_id" UUID,
    "status" "payment_status" NOT NULL,
    "receipt_code" TEXT,
    "receipt_file_id" UUID,
    "paid_at" TIMESTAMPTZ(6) NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "package_id" UUID,
    "decided_by" UUID,
    "decided_at" TIMESTAMPTZ(6),
    "decision_note" TEXT NOT NULL DEFAULT '',
    "created_by_type" TEXT NOT NULL DEFAULT 'user',
    "created_by_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_payment_pkey" PRIMARY KEY ("id"),
    -- Hoàn tiền là số âm; mọi loại khác dương (COMMERCE §5).
    CONSTRAINT "customer_payment_sign_chk" CHECK (("kind" = 'refund' AND "amount" < 0) OR ("kind" <> 'refund' AND "amount" > 0)),
    CONSTRAINT "customer_payment_refund_reason_chk" CHECK ("kind" <> 'refund' OR length(btrim("reason")) > 0),
    -- Khoản thu dương đã xác nhận luôn có phiếu thu (trừ tiền sàn thu hộ — đơn sàn không có phiếu thu của DN, COMMERCE §4b).
    CONSTRAINT "customer_payment_receipt_chk" CHECK ("kind" = 'refund' OR "method" = 'marketplace' OR "status" <> 'confirmed' OR "receipt_code" IS NOT NULL),
    CONSTRAINT "customer_payment_target_chk" CHECK ("invoice_id" IS NOT NULL OR "order_id" IS NOT NULL),
    CONSTRAINT "customer_payment_invoice_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "customer_payment_order_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "customer_payment_contact_fkey" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "customer_payment_bank_tx_fkey" FOREIGN KEY ("bank_tx_id") REFERENCES "bank_tx"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- Một giao dịch ngân hàng ghi tối đa một khoản thu (concurrency §3).
CREATE UNIQUE INDEX "customer_payment_bank_tx_id_key" ON "customer_payment" ("bank_tx_id");
CREATE UNIQUE INDEX "customer_payment_receipt_code_key" ON "customer_payment" ("receipt_code");
CREATE INDEX "customer_payment_invoice_idx" ON "customer_payment" ("invoice_id", "created_at") WHERE "invoice_id" IS NOT NULL;
CREATE INDEX "customer_payment_order_idx" ON "customer_payment" ("order_id", "created_at") WHERE "order_id" IS NOT NULL;
-- Hàng chờ duyệt hoàn tiền.
CREATE INDEX "customer_payment_refund_pending_idx" ON "customer_payment" ("created_at" DESC) WHERE "kind" = 'refund' AND "status" = 'pending';

-- CreateTable
CREATE TABLE "customer_package" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "total_sessions" INTEGER NOT NULL,
    "used_sessions" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6),
    "status" "package_status" NOT NULL DEFAULT 'active',
    "extended_by" UUID,
    "note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_package_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_package_sessions_chk" CHECK ("total_sessions" > 0 AND "used_sessions" >= 0 AND "used_sessions" <= "total_sessions"),
    CONSTRAINT "customer_package_contact_fkey" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "customer_package_product_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "customer_package_order_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- Một dòng gói của đơn sinh một liệu trình (sinh lại idempotent).
CREATE UNIQUE INDEX "customer_package_order_id_product_id_key" ON "customer_package" ("order_id", "product_id");
CREATE INDEX "customer_package_contact_idx" ON "customer_package" ("contact_id", "status") INCLUDE ("used_sessions", "total_sessions", "expires_at");
-- Quét hết hạn / nhắc gia hạn: chỉ gói đang dùng.
CREATE INDEX "customer_package_active_expiry_idx" ON "customer_package" ("expires_at") WHERE "status" = 'active' AND "expires_at" IS NOT NULL;

-- CreateTable
CREATE TABLE "package_usage" (
    "id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "used_at" TIMESTAMPTZ(6) NOT NULL,
    "reverted_at" TIMESTAMPTZ(6),

    CONSTRAINT "package_usage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "package_usage_package_fkey" FOREIGN KEY ("package_id") REFERENCES "customer_package"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "package_usage_appointment_id_key" ON "package_usage" ("appointment_id");
CREATE INDEX "package_usage_package_idx" ON "package_usage" ("package_id", "used_at" DESC);

-- Lịch sử đề nghị thanh toán (action_log invoice.* / payment.* theo invoice_id).
CREATE INDEX "action_log_invoice_idx" ON "action_log" ((coalesce("result" ->> 'invoice_id', "input" ->> 'invoice_id')), "created_at" DESC)
  WHERE "action_id" LIKE 'invoice.%' OR "action_id" LIKE 'payment.%';

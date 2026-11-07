-- CreateEnum
CREATE TYPE "billing_invoice_kind" AS ENUM ('plan', 'credits', 'addon', 'upgrade_proration');

-- CreateEnum
CREATE TYPE "billing_invoice_status" AS ENUM ('pending', 'pending_review', 'paid', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "billing_invoice_method" AS ENUM ('qr', 'bank_transfer');

-- CreateTable
CREATE TABLE "billing_invoice" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "billing_invoice_kind" NOT NULL,
    "item" TEXT NOT NULL,
    "plan_id" UUID,
    "months" INTEGER,
    "credits" BIGINT,
    "amount" BIGINT NOT NULL,
    "vat_info" JSONB NOT NULL DEFAULT '{}',
    "status" "billing_invoice_status" NOT NULL DEFAULT 'pending',
    "method" "billing_invoice_method" NOT NULL DEFAULT 'qr',
    "transfer_code" TEXT NOT NULL,
    "qr_payload" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "reported_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "bank_tx_id" UUID,
    "confirmed_by" UUID,
    "fulfilled_at" TIMESTAMPTZ(6),
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transaction" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_tx_id" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "direction" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "account_no" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "matched_invoice_id" UUID,
    "raw" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_invoice_code_key" ON "billing_invoice"("code");

-- CreateIndex
CREATE UNIQUE INDEX "billing_invoice_transfer_code_key" ON "billing_invoice"("transfer_code");

-- CreateIndex
CREATE INDEX "billing_invoice_workspace_id_created_at_idx" ON "billing_invoice"("workspace_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "bank_transaction_matched_invoice_id_idx" ON "bank_transaction"("matched_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transaction_provider_provider_tx_id_key" ON "bank_transaction"("provider", "provider_tx_id");


-- Viết tay (TIP-010): mã hoá đơn INV-<năm>-<n> từ sequence nền tảng (không trùng giữa workspace, không reset).
CREATE SEQUENCE "billing_invoice_seq" START WITH 1001;
-- Role app nền tảng chỉ có quyền bảng (setup.ts) → cấp nextval cho sequence này.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'appchat_platform_app') THEN
    GRANT USAGE, SELECT ON SEQUENCE "billing_invoice_seq" TO appchat_platform_app;
  END IF;
END $$;

-- Hoá đơn đang chờ (scheduler hết hạn quét pending theo expires_at; admin lọc pending_review) — partial (Blueprint §2.2).
CREATE INDEX "billing_invoice_open_idx" ON "billing_invoice" ("status", "expires_at") WHERE "status" IN ('pending', 'pending_review');

-- Tiền dương.
ALTER TABLE "billing_invoice" ADD CONSTRAINT "billing_invoice_amount_chk" CHECK ("amount" > 0);

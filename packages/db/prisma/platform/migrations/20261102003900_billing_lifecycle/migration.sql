-- TIP-039: vòng đời gói trả phí (DC-242 / DC-243) — neo kỳ theo ngày đăng ký, cấp Credit từng kỳ tháng (một lần / kỳ), hạ gói kỳ sau,
-- hết hạn giữ dữ liệu 30 ngày, addon đồng hạn kỳ, ảnh chụp giá trên hoá đơn, yêu cầu liên hệ bán hàng. Expand-only.

ALTER TABLE "subscription"
  ADD COLUMN "anchor_day" INTEGER,
  ADD COLUMN "anchor_hm" TEXT,
  ADD COLUMN "anchor_tz" TEXT,
  ADD COLUMN "next_grant_at" TIMESTAMPTZ(6),
  ADD COLUMN "pending_plan_id" UUID,
  ADD COLUMN "pending_effective_at" TIMESTAMPTZ(6),
  ADD COLUMN "pending_months" INTEGER,
  ADD COLUMN "pending_price" BIGINT,
  ADD COLUMN "expired_at" TIMESTAMPTZ(6),
  ADD COLUMN "retain_until" TIMESTAMPTZ(6),
  ADD COLUMN "term_months" INTEGER,
  ADD COLUMN "term_price" BIGINT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD CONSTRAINT "subscription_term_check" CHECK (("term_months" IS NULL OR "term_months" > 0) AND ("term_price" IS NULL OR "term_price" >= 0)),
  ADD CONSTRAINT "subscription_anchor_day_check" CHECK ("anchor_day" IS NULL OR "anchor_day" BETWEEN 1 AND 31),
  ADD CONSTRAINT "subscription_anchor_hm_check" CHECK ("anchor_hm" IS NULL OR "anchor_hm" ~ '^[0-2][0-9]:[0-5][0-9]$'),
  -- Neo đủ ba phần hoặc không có gì.
  ADD CONSTRAINT "subscription_anchor_all_check" CHECK (("anchor_day" IS NULL) = ("anchor_hm" IS NULL) AND ("anchor_hm" IS NULL) = ("anchor_tz" IS NULL)),
  ADD CONSTRAINT "subscription_pending_check" CHECK (("pending_plan_id" IS NULL) = ("pending_effective_at" IS NULL) AND ("pending_plan_id" IS NULL) = ("pending_months" IS NULL) AND ("pending_months" IS NULL) = ("pending_price" IS NULL));

-- Cấp Credit kỳ tới hạn: bằng trước (status = active), khoảng sau (next_grant_at), khoá ổn định id; INCLUDE workspace_id → Index Only Scan.
CREATE INDEX "subscription_grant_due_idx" ON "subscription" ("status", "next_grant_at", "id") INCLUDE ("workspace_id") WHERE "status" = 'active' AND "next_grant_at" IS NOT NULL;
-- Subscription trước 039 (chưa có neo): khởi tạo neo một lần từ current_period_start (không cấp hồi tố, không đổi ngày hết hạn đã trả).
CREATE INDEX "subscription_anchor_missing_idx" ON "subscription" ("id") INCLUDE ("workspace_id") WHERE "status" = 'active' AND "anchor_day" IS NULL;
-- Hết kỳ gói trả phí / hạ gói kỳ sau tới hạn (cùng mốc current_period_end).
CREATE INDEX "subscription_period_end_idx" ON "subscription" ("status", "current_period_end", "id") INCLUDE ("workspace_id") WHERE "status" = 'active' AND "current_period_end" IS NOT NULL;

ALTER TABLE "billing_invoice" ADD COLUMN "snapshot" JSONB NOT NULL DEFAULT '{}', ADD COLUMN "hold_reason" TEXT;
-- Hoá đơn đã trả chưa ghi nhận, không bị giữ đối soát (quét ghi nhận lại — DC-055).
CREATE INDEX "billing_invoice_paid_unfulfilled_idx" ON "billing_invoice" ("paid_at", "id") WHERE "status" = 'paid' AND "fulfilled_at" IS NULL AND "hold_reason" IS NULL;
-- Backfill addon đã trả (kể cả đã ghi nhận trước 039): theo kind = addon, status = paid.
CREATE INDEX "billing_invoice_paid_addon_idx" ON "billing_invoice" ("id") WHERE "kind" = 'addon' AND "status" = 'paid' AND "hold_reason" IS NULL;

CREATE TABLE "subscription_addon" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "resource" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "starts_at" TIMESTAMPTZ(6) NOT NULL,
  "ends_at" TIMESTAMPTZ(6) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_addon_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscription_addon_resource_check" CHECK ("resource" IN ('users', 'channels')),
  CONSTRAINT "subscription_addon_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "subscription_addon_period_check" CHECK ("ends_at" > "starts_at"),
  CONSTRAINT "subscription_addon_status_check" CHECK ("status" IN ('active', 'expired', 'void'))
);
-- Một quyền lợi mỗi hoá đơn: ghi nhận lại / backfill / hai worker không cấp đôi.
CREATE UNIQUE INDEX "subscription_addon_invoice_id_key" ON "subscription_addon" ("invoice_id");
-- Hạn mức hiện tại: (workspace =, resource =, status =) rồi ends_at > now; INCLUDE quantity → Index Only Scan.
CREATE INDEX "subscription_addon_active_idx" ON "subscription_addon" ("workspace_id", "resource", "status", "ends_at") INCLUDE ("quantity");

CREATE TABLE "billing_period_grant" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "period_key" TEXT NOT NULL,
  "period_start" TIMESTAMPTZ(6) NOT NULL,
  "period_end" TIMESTAMPTZ(6) NOT NULL,
  "plan_key" TEXT NOT NULL,
  "credits" BIGINT NOT NULL,
  "status" TEXT NOT NULL,
  "ledger_ref" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "billing_period_grant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_period_grant_period_check" CHECK ("period_end" > "period_start"),
  CONSTRAINT "billing_period_grant_credits_check" CHECK ("credits" >= 0),
  CONSTRAINT "billing_period_grant_status_check" CHECK ("status" IN ('granted', 'skipped')),
  CONSTRAINT "billing_period_grant_ledger_check" CHECK (("status" = 'granted') = ("ledger_ref" IS NOT NULL))
);
-- Một kỳ một biên nhận (khoá chống cấp đôi — DC-242).
CREATE UNIQUE INDEX "billing_period_grant_workspace_id_period_key_key" ON "billing_period_grant" ("workspace_id", "period_key");

CREATE TABLE "sales_inquiry" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "requested_by" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "consent" BOOLEAN NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'new',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sales_inquiry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sales_inquiry_consent_check" CHECK ("consent"),
  CONSTRAINT "sales_inquiry_status_check" CHECK ("status" IN ('new', 'contacted', 'closed'))
);
-- Hàng chờ đội bán hàng (mới nhất trước) + giới hạn tần suất theo workspace.
CREATE INDEX "sales_inquiry_workspace_created_idx" ON "sales_inquiry" ("workspace_id", "created_at" DESC, "id" DESC);

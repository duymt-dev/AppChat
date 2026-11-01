-- CreateEnum
CREATE TYPE "plan_segment" AS ENUM ('personal', 'business');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('trialing', 'active', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "credit_kind" AS ENUM ('grant', 'topup', 'usage', 'refund', 'adjust', 'expire');

-- CreateTable
CREATE TABLE "plan" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "segment" "plan_segment" NOT NULL,
    "name" TEXT NOT NULL,
    "price_month" BIGINT,
    "price_year" BIGINT,
    "credits_month" BIGINT,
    "max_channels" INTEGER,
    "max_agents" INTEGER,
    "max_users" INTEGER,
    "features" JSONB NOT NULL DEFAULT '{}',
    "is_trial_plan" BOOLEAN NOT NULL DEFAULT false,
    "archive_inactive_days" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "subscription_status" NOT NULL,
    "trial_started_at" TIMESTAMPTZ(6),
    "trial_ends_at" TIMESTAMPTZ(6),
    "current_period_start" TIMESTAMPTZ(6) NOT NULL,
    "current_period_end" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_wallet" (
    "workspace_id" UUID NOT NULL,
    "plan_balance" BIGINT NOT NULL DEFAULT 0,
    "topup_balance" BIGINT NOT NULL DEFAULT 0,
    "low_threshold" BIGINT,
    "low_alert" BOOLEAN NOT NULL DEFAULT true,
    "warn_80_sent_at" TIMESTAMPTZ(6),
    "warn_95_sent_at" TIMESTAMPTZ(6),
    "exhausted_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_wallet_pkey" PRIMARY KEY ("workspace_id")
);

-- CreateTable
CREATE TABLE "credit_ledger" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "delta" BIGINT NOT NULL,
    "balance_after" BIGINT NOT NULL,
    "kind" "credit_kind" NOT NULL,
    "ref_type" TEXT NOT NULL,
    "ref_id" TEXT NOT NULL,
    "note" TEXT,
    "meta" JSONB,
    "source" TEXT,
    "provider" TEXT,
    "model" TEXT,
    "tokens_in" INTEGER,
    "tokens_out" INTEGER,
    "run_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_key_key" ON "plan"("key");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_workspace_id_key" ON "subscription"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_ledger_workspace_id_ref_type_ref_id_key" ON "credit_ledger"("workspace_id", "ref_type", "ref_id");


-- Viết tay (Blueprint §2.2): ví không âm — trừ credit trong transaction FOR UPDATE, CHECK là lưới an toàn cuối.
ALTER TABLE "credit_wallet" ADD CONSTRAINT "credit_wallet_balance_chk" CHECK ("plan_balance" >= 0 AND "topup_balance" >= 0);

-- Viết tay (indexing §2): lịch sử ví theo workspace, cursor (created_at, id) + covering cho cột hiển thị.
CREATE INDEX "credit_ledger_ws_created_idx" ON "credit_ledger"("workspace_id", "created_at" DESC, "id" DESC) INCLUDE ("delta", "kind");

-- Viết tay (partial): scheduler hết hạn trial — `WHERE status = 'trialing' AND trial_ends_at <= now()`.
CREATE INDEX "subscription_trial_ends_idx" ON "subscription"("trial_ends_at") WHERE "status" = 'trialing';

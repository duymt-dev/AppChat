-- TIP-023d pha 1 §1.1: kế hoạch Cowork phiên bản hoá, tách bạch tiến độ công bố (projected) khỏi payload riêng tư; claim hiệu ứng
-- CHÍNH độc lập toolCallId/revision; checkpoint dừng giữa chừng; cấu trúc tái dùng không giá trị/receipt. Không PII thô ngoài những gì
-- người dùng/model tự nhập ở title/instructions (rà soát 015c §4 ở pha sau).

CREATE TYPE "assistant_plan_phase" AS ENUM ('draft', 'active', 'pause_requested', 'paused', 'editing', 'resuming', 'completed', 'cancelled', 'failed');
CREATE TYPE "assistant_plan_step_kind" AS ENUM ('action', 'delegate', 'analysis');
CREATE TYPE "assistant_plan_step_state" AS ENUM ('pending', 'running', 'waiting_confirmation', 'waiting_approval', 'waiting_external', 'succeeded', 'failed', 'cancelled', 'skipped', 'unknown');

CREATE TABLE "assistant_plan" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "root_run_id" UUID,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "plan_epoch" INTEGER NOT NULL DEFAULT 0,
    "phase" "assistant_plan_phase" NOT NULL DEFAULT 'draft',
    "selected_agent_id" UUID,
    "selected_agent_version" INTEGER,
    "source_plan_id" UUID,
    "source_revision" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assistant_plan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "assistant_plan_root_run_id_key" ON "assistant_plan" ("root_run_id");
CREATE INDEX "assistant_plan_owner_idx" ON "assistant_plan" ("owner_user_id", "updated_at" DESC, "id") INCLUDE ("phase", "revision", "root_run_id");

CREATE TABLE "assistant_plan_step" (
    "plan_id" UUID NOT NULL,
    "id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "assistant_plan_step_kind" NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "action_or_agent_id" TEXT,
    "depends_on" UUID[] NOT NULL,
    "state" "assistant_plan_step_state" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assistant_plan_step_pkey" PRIMARY KEY ("plan_id", "id")
);
ALTER TABLE "assistant_plan_step" ADD CONSTRAINT "assistant_plan_step_plan_fkey" FOREIGN KEY ("plan_id") REFERENCES "assistant_plan"("id");
CREATE INDEX "assistant_plan_step_order_idx" ON "assistant_plan_step" ("plan_id", "position", "id") INCLUDE ("kind", "state");

CREATE TABLE "assistant_plan_attempt" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "step_id" UUID NOT NULL,
    "invocation_id" TEXT NOT NULL,
    "input_digest" TEXT NOT NULL,
    "admission_id" TEXT,
    "action_log_id" UUID,
    "child_run_id" UUID,
    "artifact_id" UUID,
    "phase" TEXT NOT NULL,
    "outcome_code" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assistant_plan_attempt_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "assistant_plan_attempt" ADD CONSTRAINT "assistant_plan_attempt_plan_fkey" FOREIGN KEY ("plan_id") REFERENCES "assistant_plan"("id");
CREATE UNIQUE INDEX "assistant_plan_attempt_key" ON "assistant_plan_attempt" ("plan_id", "revision", "step_id", "invocation_id");
CREATE INDEX "assistant_plan_attempt_lookup_idx" ON "assistant_plan_attempt" ("plan_id", "revision", "step_id", "id") INCLUDE ("action_log_id", "child_run_id", "artifact_id");

CREATE TABLE "assistant_plan_primary_claim" (
    "plan_id" UUID NOT NULL,
    "stable_step_id" UUID NOT NULL,
    "execution_generation" INTEGER NOT NULL,
    "action_or_delegate_target" TEXT NOT NULL,
    "input_digest" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "admission_id" TEXT,
    "receipt_ref" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assistant_plan_primary_claim_pkey" PRIMARY KEY ("plan_id", "stable_step_id", "execution_generation")
);
ALTER TABLE "assistant_plan_primary_claim" ADD CONSTRAINT "assistant_plan_primary_claim_plan_fkey" FOREIGN KEY ("plan_id") REFERENCES "assistant_plan"("id");

CREATE TABLE "assistant_plan_checkpoint" (
    "plan_id" UUID NOT NULL,
    "root_run_id" UUID NOT NULL,
    "plan_epoch" INTEGER NOT NULL,
    "engine_checkpoint_ref" JSONB NOT NULL,
    "drain_state" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assistant_plan_checkpoint_pkey" PRIMARY KEY ("root_run_id", "plan_epoch")
);
ALTER TABLE "assistant_plan_checkpoint" ADD CONSTRAINT "assistant_plan_checkpoint_plan_fkey" FOREIGN KEY ("plan_id") REFERENCES "assistant_plan"("id");

CREATE TABLE "assistant_plan_reuse_candidate" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "source_plan_id" UUID NOT NULL,
    "source_revision" INTEGER NOT NULL,
    "generic_title" TEXT NOT NULL,
    "structure" JSONB NOT NULL,
    "eligible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assistant_plan_reuse_candidate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "assistant_plan_reuse_owner_idx" ON "assistant_plan_reuse_candidate" ("owner_user_id", "updated_at" DESC, "id");
-- Reuse matching (§7.2): biểu thức f_unaccent(lower(generic_title)) — chỉ dùng cho truy vấn CÙNG biểu thức, lọc owner/eligible trước.
CREATE INDEX "assistant_plan_reuse_title_idx" ON "assistant_plan_reuse_candidate" (f_unaccent(lower("generic_title"))) WHERE "eligible" = true;

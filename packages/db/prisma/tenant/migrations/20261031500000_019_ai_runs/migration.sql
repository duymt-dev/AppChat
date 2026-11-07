-- TIP-019: run AI (ai_run, ai_run_step) + cài đặt AI của workspace (ai_setting).
-- CreateEnum
CREATE TYPE "ai_run_kind" AS ENUM ('agent_reply', 'assistant', 'delegate', 'consult', 'task', 'suggestion');

-- CreateEnum
CREATE TYPE "ai_run_status" AS ENUM ('queued', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled', 'handoff');

-- CreateEnum
CREATE TYPE "ai_run_step_type" AS ENUM ('llm', 'tool', 'delegate', 'consult', 'handoff', 'ui_command');

-- CreateEnum
CREATE TYPE "ai_run_step_status" AS ENUM ('ok', 'error', 'paused');

-- CreateTable
CREATE TABLE "ai_run" (
    "id" UUID NOT NULL,
    "kind" "ai_run_kind" NOT NULL,
    "parent_run_id" UUID,
    "root_run_id" UUID NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "state" JSONB,
    "agent_id" TEXT,
    "agent_version" INTEGER,
    "dry_run" BOOLEAN NOT NULL DEFAULT false,
    "conversation_id" UUID,
    "assistant_session_id" TEXT,
    "task_id" TEXT,
    "initiated_by_user_id" UUID,
    "status" "ai_run_status" NOT NULL DEFAULT 'queued',
    "tier" TEXT NOT NULL DEFAULT 'standard',
    "title" TEXT NOT NULL DEFAULT '',
    "plan" JSONB,
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB,
    "error" TEXT,
    "confidence" DOUBLE PRECISION,
    "credits_used" INTEGER NOT NULL DEFAULT 0,
    "max_credits" INTEGER,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),

    CONSTRAINT "ai_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_run_step" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "idx" INTEGER NOT NULL,
    "type" "ai_run_step_type" NOT NULL,
    "agent_id" TEXT,
    "action_id" TEXT,
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB,
    "status" "ai_run_step_status" NOT NULL DEFAULT 'ok',
    "provider" TEXT,
    "model" TEXT,
    "tokens_in" INTEGER NOT NULL DEFAULT 0,
    "tokens_out" INTEGER NOT NULL DEFAULT 0,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "latency_ms" INTEGER NOT NULL DEFAULT 0,
    "meta" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_run_step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_setting" (
    "id" SMALLINT NOT NULL DEFAULT 1,
    "default_tier" TEXT NOT NULL DEFAULT 'standard',
    "tasks" JSONB NOT NULL DEFAULT '{}',
    "budget" INTEGER NOT NULL DEFAULT 0,
    "rate_limit" INTEGER NOT NULL DEFAULT 10000,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_run_status_started_at_idx" ON "ai_run"("status", "started_at" DESC);

-- CreateIndex
CREATE INDEX "ai_run_root_run_id_started_at_idx" ON "ai_run"("root_run_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_run_step_run_id_idx_key" ON "ai_run_step"("run_id", "idx");


-- FK nội DB tenant (Blueprint §2.1): bước theo run; run con theo run cha (huỷ cây = cập nhật trạng thái, không xoá).
ALTER TABLE "ai_run_step" ADD CONSTRAINT "ai_run_step_run_fk" FOREIGN KEY ("run_id") REFERENCES "ai_run"("id") ON DELETE CASCADE;
ALTER TABLE "ai_run" ADD CONSTRAINT "ai_run_parent_fk" FOREIGN KEY ("parent_run_id") REFERENCES "ai_run"("id") ON DELETE CASCADE;
-- Một dòng cài đặt; hàng chờ duyệt / run đang chạy lọc theo trạng thái.
ALTER TABLE "ai_setting" ADD CONSTRAINT "ai_setting_singleton" CHECK ("id" = 1);
CREATE INDEX "ai_run_live_idx" ON "ai_run" ("started_at" DESC) WHERE "status" IN ('queued', 'running', 'waiting_approval');

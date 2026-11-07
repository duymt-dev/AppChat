-- TIP-021 — AI Agents: ai_agent (+ phiên bản), approval_request, ai_governance (Blueprint §2.2 L397–410).
-- CreateEnum
CREATE TYPE "ai_agent_status" AS ENUM ('draft', 'active', 'paused');

-- CreateEnum
CREATE TYPE "ai_agent_created_via" AS ENUM ('manual', 'template', 'assistant');

-- CreateEnum
CREATE TYPE "approval_status" AS ENUM ('pending', 'approved', 'rejected', 'edited', 'expired');

-- CreateTable
CREATE TABLE "ai_agent" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🤖',
    "avatar_file_id" UUID,
    "role" TEXT NOT NULL DEFAULT 'custom',
    "role_label" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'vi',
    "persona" TEXT NOT NULL DEFAULT '',
    "tone" TEXT NOT NULL DEFAULT '',
    "system_prompt" TEXT NOT NULL DEFAULT '',
    "intents" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "model_tier" TEXT NOT NULL DEFAULT 'standard',
    "tool_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kb_scope" JSONB NOT NULL DEFAULT '{"folder_ids":[],"tags":[]}',
    "channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidence_threshold" INTEGER NOT NULL DEFAULT 70,
    "handoff_to" TEXT NOT NULL DEFAULT 'staff',
    "governance" JSONB NOT NULL DEFAULT '{}',
    "approval_rules" JSONB NOT NULL DEFAULT '{}',
    "working_hours" JSONB,
    "status" "ai_agent_status" NOT NULL DEFAULT 'draft',
    "template_key" TEXT,
    "created_via" "ai_agent_created_via" NOT NULL DEFAULT 'manual',
    "created_by" UUID,
    "published_version" INTEGER NOT NULL DEFAULT 0,
    "published_version_id" UUID,
    "draft_dirty" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "ai_agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_agent_version" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "published_by" UUID,
    "published_at" TIMESTAMPTZ(6) NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ai_agent_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_request" (
    "id" UUID NOT NULL,
    "run_id" UUID,
    "step_idx" INTEGER,
    "agent_id" UUID,
    "action_id" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "input_hash" TEXT NOT NULL,
    "preview" JSONB,
    "risk" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL,
    "on_behalf_of_user_id" UUID,
    "status" "approval_status" NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "decided_by" UUID,
    "decided_at" TIMESTAMPTZ(6),
    "decision_note" TEXT,
    "executed_at" TIMESTAMPTZ(6),
    "result" JSONB,

    CONSTRAINT "approval_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_governance" (
    "id" SMALLINT NOT NULL DEFAULT 1,
    "scopes" JSONB NOT NULL DEFAULT '{}',
    "bounds" JSONB NOT NULL DEFAULT '{}',
    "banned_words" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "filter" TEXT NOT NULL DEFAULT 'strict',
    "long_review" BOOLEAN NOT NULL DEFAULT false,
    "retention_days" INTEGER NOT NULL DEFAULT 90,
    "no_external_train" BOOLEAN NOT NULL DEFAULT true,
    "pii_filter" BOOLEAN NOT NULL DEFAULT true,
    "residency" TEXT NOT NULL DEFAULT 'sg',
    "force_approval" JSONB NOT NULL DEFAULT '{}',
    "default_threshold" INTEGER NOT NULL DEFAULT 70,
    "approval_ttl_hours" INTEGER NOT NULL DEFAULT 72,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_governance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_agent_version_agent_id_version_key" ON "ai_agent_version"("agent_id", "version" DESC);

-- CreateIndex
CREATE INDEX "approval_request_status_requested_at_idx" ON "approval_request"("status", "requested_at" DESC);


-- ===== Viết tay (Prisma không sinh) =====

-- FK nội domain: phiên bản thuộc agent.
ALTER TABLE "ai_agent_version" ADD CONSTRAINT "ai_agent_version_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agent"("id") ON DELETE CASCADE;

-- Danh sách agent còn sống (GET /v1/agents — mới nhất trước; ≤ plan.max_agents dòng) + đếm hạn mức gói.
CREATE INDEX "ai_agent_live_created_idx" ON "ai_agent" ("created_at" DESC) WHERE "deleted_at" IS NULL;

-- Quét duyệt quá hạn (72 giờ — D52): chỉ dòng đang chờ.
CREATE INDEX "approval_request_pending_expires_idx" ON "approval_request" ("expires_at") WHERE "status" = 'pending';
-- Tra duyệt theo run (chạy tiếp / huỷ cây run).
CREATE INDEX "approval_request_run_idx" ON "approval_request" ("run_id") WHERE "run_id" IS NOT NULL;

ALTER TABLE "ai_agent" ADD CONSTRAINT "ai_agent_threshold_check" CHECK ("confidence_threshold" BETWEEN 50 AND 95);
ALTER TABLE "ai_agent" ADD CONSTRAINT "ai_agent_version_check" CHECK ("published_version" >= 0);
ALTER TABLE "ai_governance" ADD CONSTRAINT "ai_governance_singleton" CHECK ("id" = 1);
ALTER TABLE "ai_governance" ADD CONSTRAINT "ai_governance_ttl_check" CHECK ("approval_ttl_hours" BETWEEN 1 AND 720);

-- Thống kê agent trên danh sách (số hội thoại / tỉ lệ tự xử lý — GET /v1/agents): run có agent.
CREATE INDEX "ai_run_agent_idx" ON "ai_run" ("agent_id", "status") INCLUDE ("conversation_id") WHERE "agent_id" IS NOT NULL;

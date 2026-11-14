-- TIP-035: Tác vụ tự chủ & chủ động (Blueprint §2.2 ai-tasks, §5.4; REQ-D12, E08, E13).
-- ai_task: mục tiêu + agent + cách chạy (ngay / lịch cron theo giờ workspace / sự kiện) + giới hạn (nhóm dữ liệu, nhóm công cụ,
-- credit mỗi lần, hỏi trước khi gửi) + người tạo (quyền hiệu lực = agent ∩ người này — §3.3b). ai_run.task_id trỏ về đây.

-- CreateEnum
CREATE TYPE "ai_task_trigger" AS ENUM ('manual', 'schedule', 'event');
CREATE TYPE "ai_task_status" AS ENUM ('active', 'paused');

-- CreateTable
CREATE TABLE "ai_task" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "prompt" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT 'Vận hành',
    "agent_id" UUID,
    "template" TEXT,
    "params" JSONB NOT NULL DEFAULT '{}',
    "trigger" "ai_task_trigger" NOT NULL,
    "cron" TEXT,
    "event_type" TEXT,
    "data_scope" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "tool_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "credit_limit_per_run" INTEGER NOT NULL DEFAULT 2000,
    "ask_before_send" BOOLEAN NOT NULL DEFAULT true,
    "model_tier" TEXT NOT NULL DEFAULT 'standard',
    "status" "ai_task_status" NOT NULL DEFAULT 'active',
    "created_by_user_id" UUID NOT NULL,
    "last_run_at" TIMESTAMPTZ(6),
    "last_run_status" TEXT,
    "next_run_at" TIMESTAMPTZ(6),
    "run_count" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_task_pkey" PRIMARY KEY ("id"),
    -- Theo lịch phải có cron, theo sự kiện phải có topic; chạy ngay không có cả hai.
    CONSTRAINT "ai_task_trigger_chk" CHECK (
        ("trigger" = 'schedule' AND "cron" IS NOT NULL AND "event_type" IS NULL)
        OR ("trigger" = 'event' AND "event_type" IS NOT NULL AND "cron" IS NULL)
        OR ("trigger" = 'manual' AND "cron" IS NULL AND "event_type" IS NULL)
    ),
    -- Briefing (Trợ lý tổng hợp) không cần agent; mọi tác vụ khác chạy bằng agent.
    CONSTRAINT "ai_task_agent_chk" CHECK ("agent_id" IS NOT NULL OR COALESCE("template", '') = 'briefing'),
    CONSTRAINT "ai_task_credit_chk" CHECK ("credit_limit_per_run" >= 0),
    CONSTRAINT "ai_task_tier_chk" CHECK ("model_tier" IN ('standard', 'advanced', 'max'))
);

-- FK nội DB (agent xoá mềm — giữ tác vụ, chạy báo lỗi; xoá cứng hiếm → bỏ liên kết).
ALTER TABLE "ai_task" ADD CONSTRAINT "ai_task_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agent"("id") ON DELETE SET NULL;

-- Màn Coworks: tác vụ chưa xoá, mới tạo trước (≤ vài chục dòng / workspace — không phân trang).
CREATE INDEX "ai_task_live_created_idx" ON "ai_task" ("created_at" DESC) INCLUDE ("status", "agent_id") WHERE "deleted_at" IS NULL;
-- Job lịch mỗi phút: tác vụ đang bật theo lịch đã tới giờ (`next_run_at <= now`).
CREATE INDEX "ai_task_due_idx" ON "ai_task" ("next_run_at") WHERE "trigger" = 'schedule' AND "status" = 'active' AND "deleted_at" IS NULL;
-- Consumer sự kiện: tác vụ đang bật nghe topic.
CREATE INDEX "ai_task_event_idx" ON "ai_task" ("event_type") WHERE "trigger" = 'event' AND "status" = 'active' AND "deleted_at" IS NULL;
-- Thống kê theo tác vụ (lượt chạy 24h, credit, tỉ lệ thành công) + nhật ký trong drawer.
CREATE INDEX "ai_run_task_idx" ON "ai_run" ("task_id", "started_at" DESC) INCLUDE ("status", "credits_used") WHERE "task_id" IS NOT NULL;

-- Thu đối tượng mẫu chủ động (§5.4): báo giá đã gửi còn treo theo ngày gửi; đơn hoàn tất theo ngày hoàn tất (khoảng một ngày).
CREATE INDEX "quote_open_sent_idx" ON "quote" ("sent_at") INCLUDE ("contact_id") WHERE "status" IN ('sent', 'viewed') AND "deleted_at" IS NULL;
CREATE INDEX "order_completed_at_idx" ON "order" ("completed_at") INCLUDE ("contact_id") WHERE "status" = 'completed' AND "deleted_at" IS NULL;
-- Follow-up: hội thoại của khách có tin ra gần đây (NOT EXISTS theo hội thoại) — dùng message_conversation_id_created_at_id_idx sẵn có.

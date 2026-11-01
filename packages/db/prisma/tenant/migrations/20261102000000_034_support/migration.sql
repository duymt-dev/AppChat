-- TIP-034: Ticket & SLA (Blueprint §2.2 support, REQ-H01–H04, state-machine ticket).
-- sla_policy (một dòng mặc định — không xoá được) · ticket (mã `TKT-{n}`, hạn FRT / TTR chụp lúc tạo, dừng khi "Đang chờ") ·
-- ticket_comment (ghi chú nội bộ / trả lời / tin khách) · ticket_event (lịch sử).

-- CreateEnum
CREATE TYPE "ticket_status" AS ENUM ('open', 'in_progress', 'waiting', 'closed');
CREATE TYPE "ticket_priority" AS ENUM ('high', 'medium', 'low');

-- CreateTable
CREATE TABLE "sla_policy" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "frt_ai_min" INTEGER NOT NULL DEFAULT 0,
    "frt_human_min" INTEGER NOT NULL DEFAULT 10,
    "ttr_ai_min" INTEGER NOT NULL DEFAULT 30,
    "ttr_human_min" INTEGER NOT NULL DEFAULT 240,
    "escalation" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sla_policy_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sla_policy_min_chk" CHECK ("frt_ai_min" >= 0 AND "frt_human_min" > 0 AND "ttr_ai_min" >= 0 AND "ttr_human_min" > 0)
);
-- REQ-H03: đúng một chính sách mặc định.
CREATE UNIQUE INDEX "sla_policy_default_key" ON "sla_policy" ("is_default") WHERE "is_default";

-- CreateTable
CREATE TABLE "ticket" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "contact_id" UUID,
    "conversation_id" UUID,
    "source_message_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'zalo_personal',
    "company" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "priority" "ticket_priority" NOT NULL DEFAULT 'medium',
    "status" "ticket_status" NOT NULL DEFAULT 'open',
    "assignee_user_id" UUID,
    "assignee_agent_id" UUID,
    "team_id" TEXT,
    "sla_policy_id" UUID,
    "sla_policy_name" TEXT NOT NULL DEFAULT '',
    "frt_target_min" INTEGER NOT NULL DEFAULT 10,
    "ttr_target_min" INTEGER NOT NULL DEFAULT 240,
    "frt_due_at" TIMESTAMPTZ(6) NOT NULL,
    "ttr_start_at" TIMESTAMPTZ(6) NOT NULL,
    "ttr_due_at" TIMESTAMPTZ(6) NOT NULL,
    "first_response_at" TIMESTAMPTZ(6),
    "paused_since" TIMESTAMPTZ(6),
    "paused_total_sec" INTEGER NOT NULL DEFAULT 0,
    "sla_result" TEXT,
    "close_reason" TEXT,
    "close_note" TEXT,
    "csat" INTEGER,
    "escalations" INTEGER NOT NULL DEFAULT 0,
    "warned_at" TIMESTAMPTZ(6),
    "frt_breached_at" TIMESTAMPTZ(6),
    "breached_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "reopened_count" INTEGER NOT NULL DEFAULT 0,
    "custom" JSONB NOT NULL DEFAULT '{}',
    "created_by_type" TEXT NOT NULL DEFAULT 'user',
    "created_by_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ticket_contact_fkey" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ticket_conversation_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ticket_agent_fkey" FOREIGN KEY ("assignee_agent_id") REFERENCES "ai_agent"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ticket_policy_fkey" FOREIGN KEY ("sla_policy_id") REFERENCES "sla_policy"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ticket_title_chk" CHECK (length(btrim("title")) > 0),
    -- Một người phụ trách: người HOẶC agent (REQ-H01).
    CONSTRAINT "ticket_assignee_chk" CHECK ("assignee_user_id" IS NULL OR "assignee_agent_id" IS NULL),
    -- Đóng phải có lý do + kết quả SLA (state-machine).
    CONSTRAINT "ticket_close_chk" CHECK ("status" <> 'closed' OR ("close_reason" IN ('resolved', 'duplicate', 'withdrawn', 'out_of_scope') AND "sla_result" IN ('met', 'breached') AND "closed_at" IS NOT NULL)),
    CONSTRAINT "ticket_wait_chk" CHECK (("status" = 'waiting') = ("paused_since" IS NOT NULL)),
    CONSTRAINT "ticket_csat_chk" CHECK ("csat" IS NULL OR "csat" BETWEEN 1 AND 5),
    CONSTRAINT "ticket_num_chk" CHECK ("paused_total_sec" >= 0 AND "reopened_count" >= 0 AND "escalations" >= 0)
);
CREATE UNIQUE INDEX "ticket_code_key" ON "ticket" ("code");
-- Danh sách D42 mới nhất (deferred join).
CREATE INDEX "ticket_recent_idx" ON "ticket" ("created_at" DESC, "id" DESC);
-- Blueprint §2.2: lọc trạng thái + hạn TTR (KPI, job SLA) — covering ưu tiên / người phụ trách.
CREATE INDEX "ticket_status_due_idx" ON "ticket" ("status", "ttr_due_at") INCLUDE ("priority", "assignee_user_id");
-- Scope support own (indexing §7).
CREATE INDEX "ticket_assignee_idx" ON "ticket" ("assignee_user_id", "status", "created_at" DESC);
-- Job SLA: ticket còn mở chưa dừng theo hạn FRT / TTR.
CREATE INDEX "ticket_open_ttr_idx" ON "ticket" ("ttr_due_at") WHERE "status" IN ('open', 'in_progress');
CREATE INDEX "ticket_open_frt_idx" ON "ticket" ("frt_due_at") WHERE "status" <> 'closed' AND "first_response_at" IS NULL;
-- Ticket của khách (hồ sơ 360°, chống trùng 24 giờ) + của hội thoại (tin khách → bình luận / tự mở lại).
CREATE INDEX "ticket_contact_idx" ON "ticket" ("contact_id", "created_at" DESC) INCLUDE ("status", "category") WHERE "contact_id" IS NOT NULL;
CREATE INDEX "ticket_conversation_idx" ON "ticket" ("conversation_id", "created_at" DESC) WHERE "conversation_id" IS NOT NULL;
CREATE INDEX "ticket_code_prefix_idx" ON "ticket" ("code" text_pattern_ops);
CREATE INDEX "ticket_title_trgm_idx" ON "ticket" USING gin (f_unaccent(lower("title")) gin_trgm_ops);
CREATE INDEX "ticket_custom_gin_idx" ON "ticket" USING gin ("custom" jsonb_path_ops);

-- CreateTable
CREATE TABLE "ticket_comment" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "author_type" TEXT NOT NULL,
    "author_id" TEXT,
    "author_name" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "message_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "ticket_comment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ticket_comment_ticket_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ticket_comment_body_chk" CHECK (length(btrim("body")) > 0),
    CONSTRAINT "ticket_comment_author_chk" CHECK ("author_type" IN ('contact', 'user', 'agent', 'system'))
);
CREATE INDEX "ticket_comment_ticket_idx" ON "ticket_comment" ("ticket_id", "created_at") WHERE "deleted_at" IS NULL;
-- Một tin khách chỉ chép một lần (consumer chạy lại an toàn).
CREATE UNIQUE INDEX "ticket_comment_message_key" ON "ticket_comment" ("ticket_id", "message_id") WHERE "message_id" IS NOT NULL;

-- CreateTable
CREATE TABLE "ticket_event" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_name" TEXT NOT NULL DEFAULT '',
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_event_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ticket_event_ticket_fkey" FOREIGN KEY ("ticket_id") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ticket_event_ticket_idx" ON "ticket_event" ("ticket_id", "created_at");

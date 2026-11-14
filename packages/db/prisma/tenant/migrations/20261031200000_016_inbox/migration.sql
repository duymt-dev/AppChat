-- CreateEnum
CREATE TYPE "conversation_kind" AS ENUM ('direct', 'group');

-- CreateEnum
CREATE TYPE "conversation_status" AS ENUM ('open', 'pending', 'snoozed', 'closed');

-- CreateEnum
CREATE TYPE "ai_mode" AS ENUM ('off', 'copilot', 'auto');

-- CreateEnum
CREATE TYPE "ai_state" AS ENUM ('idle', 'running', 'waiting_approval', 'handoff');

-- CreateEnum
CREATE TYPE "group_ai_policy" AS ENUM ('mention', 'auto', 'off');

-- CreateEnum
CREATE TYPE "message_direction" AS ENUM ('in', 'out');

-- CreateEnum
CREATE TYPE "sender_type" AS ENUM ('contact', 'user', 'agent', 'system');

-- CreateEnum
CREATE TYPE "message_kind" AS ENUM ('text', 'image', 'file', 'sticker', 'audio', 'note', 'system', 'card');

-- CreateEnum
CREATE TYPE "message_status" AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed');

-- CreateEnum
CREATE TYPE "reaction_actor" AS ENUM ('user', 'contact');

-- CreateEnum
CREATE TYPE "outbox_message_status" AS ENUM ('pending', 'sending', 'sent', 'failed', 'dead');

-- CreateTable
CREATE TABLE "conversation" (
    "id" UUID NOT NULL,
    "channel_account_id" UUID NOT NULL,
    "channel_type" TEXT NOT NULL,
    "contact_id" UUID,
    "kind" "conversation_kind" NOT NULL DEFAULT 'direct',
    "external_thread_id" TEXT NOT NULL,
    "title" TEXT,
    "status" "conversation_status" NOT NULL DEFAULT 'open',
    "assignee_user_id" UUID,
    "assignee_agent_id" TEXT,
    "team_id" UUID,
    "ai_mode" "ai_mode" NOT NULL DEFAULT 'copilot',
    "ai_state" "ai_state" NOT NULL DEFAULT 'idle',
    "handoff_reason" TEXT,
    "intent" TEXT,
    "last_message_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_preview" TEXT NOT NULL DEFAULT '',
    "last_sender_name" TEXT,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMPTZ(6),
    "snoozed_until" TIMESTAMPTZ(6),
    "hidden_at" TIMESTAMPTZ(6),
    "pinned_message_id" UUID,
    "group_ai_policy" "group_ai_policy",
    "cleared_at" TIMESTAMPTZ(6),
    "frt_pending_since" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "channel_account_id" UUID NOT NULL,
    "direction" "message_direction",
    "sender_type" "sender_type" NOT NULL,
    "sender_id" TEXT,
    "sender_name" TEXT,
    "kind" "message_kind" NOT NULL DEFAULT 'text',
    "body" TEXT NOT NULL DEFAULT '',
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "external_msg_id" TEXT,
    "status" "message_status" NOT NULL DEFAULT 'sent',
    "error" TEXT,
    "run_id" UUID,
    "reply_to_id" UUID,
    "forwarded_from_id" UUID,
    "recalled_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_reaction" (
    "message_id" UUID NOT NULL,
    "actor_type" "reaction_actor" NOT NULL,
    "actor_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reaction_pkey" PRIMARY KEY ("message_id","actor_type","actor_id","emoji")
);

-- CreateTable
CREATE TABLE "conversation_participant" (
    "conversation_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL DEFAULT '',
    "contact_id" UUID,
    "last_seen_at" TIMESTAMPTZ(6),

    CONSTRAINT "conversation_participant_pkey" PRIMARY KEY ("conversation_id","external_id")
);

-- CreateTable
CREATE TABLE "conversation_tag" (
    "conversation_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_tag_pkey" PRIMARY KEY ("conversation_id","tag_id")
);

-- CreateTable
CREATE TABLE "canned_reply" (
    "id" UUID NOT NULL,
    "shortcut" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canned_reply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_message" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "channel_account_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "outbox_message_status" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_assignee_user_id_status_last_message_at_idx" ON "conversation"("assignee_user_id", "status", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "conversation_contact_id_idx" ON "conversation"("contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_channel_account_id_external_thread_id_key" ON "conversation"("channel_account_id", "external_thread_id");

-- CreateIndex
CREATE INDEX "message_conversation_id_created_at_id_idx" ON "message"("conversation_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "message_channel_account_id_external_msg_id_key" ON "message"("channel_account_id", "external_msg_id");

-- CreateIndex
CREATE INDEX "conversation_tag_tag_id_idx" ON "conversation_tag"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "canned_reply_shortcut_key" ON "canned_reply"("shortcut");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_message_message_id_key" ON "outbox_message"("message_id");

-- CreateIndex
CREATE INDEX "outbox_message_status_next_attempt_at_idx" ON "outbox_message"("status", "next_attempt_at");


-- Viết tay (TIP-016, indexing §1–§7):
-- Thư mục theo trạng thái, mới nhất trước — covering cho cột hiển thị hay dùng (Blueprint §2.2).
CREATE INDEX "conversation_status_recent_idx" ON "conversation" ("status", "last_message_at" DESC)
  INCLUDE ("contact_id", "unread_count", "ai_mode");
-- Danh sách đang hiện (không lưu trữ, không ẩn) — keyset (last_message_at, id).
CREATE INDEX "conversation_live_recent_idx" ON "conversation" ("last_message_at" DESC, "id" DESC)
  WHERE "archived_at" IS NULL AND "hidden_at" IS NULL;
-- Thư mục AI chờ duyệt / Cần người: tập nhỏ.
CREATE INDEX "conversation_ai_attention_idx" ON "conversation" ("ai_state", "last_message_at" DESC)
  WHERE "ai_state" IN ('waiting_approval', 'handoff');
-- Tìm hội thoại không dấu (tên + preview) — f_unaccent của bootstrap.sql.
CREATE INDEX "conversation_search_trgm_idx" ON "conversation"
  USING gin (f_unaccent(lower(coalesce("title", '') || ' ' || "last_message_preview")) gin_trgm_ops);
-- Tìm trong hội thoại (REQ-C12): không dấu, lọc thêm conversation_id.
CREATE INDEX "message_body_trgm_idx" ON "message" USING gin (f_unaccent(lower("body")) gin_trgm_ops);
-- Outbox gửi tin còn chờ (quét lại sau sự cố).
CREATE INDEX "outbox_message_pending_idx" ON "outbox_message" ("next_attempt_at") WHERE "status" IN ('pending', 'sending');

-- FK nội DB tenant (Blueprint §2.1: chỉ cấm FK xuyên DB).
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_channel_account_fk"
  FOREIGN KEY ("channel_account_id") REFERENCES "channel_account"("id") ON DELETE CASCADE;
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_contact_fk"
  FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE SET NULL;
ALTER TABLE "message" ADD CONSTRAINT "message_conversation_fk"
  FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE;
ALTER TABLE "message_reaction" ADD CONSTRAINT "message_reaction_message_fk"
  FOREIGN KEY ("message_id") REFERENCES "message"("id") ON DELETE CASCADE;
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_conversation_fk"
  FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE;
ALTER TABLE "conversation_tag" ADD CONSTRAINT "conversation_tag_conversation_fk"
  FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE;
ALTER TABLE "conversation_tag" ADD CONSTRAINT "conversation_tag_tag_fk"
  FOREIGN KEY ("tag_id") REFERENCES "tag"("id") ON DELETE CASCADE;
ALTER TABLE "outbox_message" ADD CONSTRAINT "outbox_message_message_fk"
  FOREIGN KEY ("message_id") REFERENCES "message"("id") ON DELETE CASCADE;

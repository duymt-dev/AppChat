-- CreateEnum
CREATE TYPE "assistant_mode" AS ENUM ('chat', 'cowork');

-- CreateEnum
CREATE TYPE "assistant_role" AS ENUM ('user', 'assistant', 'tool');

-- CreateTable
CREATE TABLE "assistant_session" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "mode" "assistant_mode" NOT NULL DEFAULT 'chat',
    "last_message_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_message" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "role" "assistant_role" NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "run_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assistant_message_session_id_created_at_idx" ON "assistant_message"("session_id", "created_at");


-- TIP-023 (viết tay): FK tin → phiên (xoá phiên xoá tin); phiên của người dùng mới nhất trước (chỉ phiên chưa lưu trữ);
-- tìm phiên không dấu theo tiêu đề (f_unaccent + trigram).
ALTER TABLE "assistant_message" ADD CONSTRAINT "assistant_message_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "assistant_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "assistant_session_user_recent_idx" ON "assistant_session" ("user_id", "last_message_at" DESC) INCLUDE ("title", "mode") WHERE "archived_at" IS NULL;
CREATE INDEX "assistant_session_title_trgm_idx" ON "assistant_session" USING gin (f_unaccent(lower("title")) gin_trgm_ops);
CREATE INDEX "ai_run_assistant_session_idx" ON "ai_run" ("assistant_session_id", "started_at" DESC) WHERE "assistant_session_id" IS NOT NULL;

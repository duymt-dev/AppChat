-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "action_source" AS ENUM ('ui', 'assistant', 'agent', 'task', 'system', 'api');

-- CreateEnum
CREATE TYPE "actor_type" AS ENUM ('user', 'agent', 'assistant', 'system');

-- CreateEnum
CREATE TYPE "action_status" AS ENUM ('succeeded', 'failed', 'undone');

-- CreateEnum
CREATE TYPE "outbox_status" AS ENUM ('pending', 'published', 'failed');

-- CreateTable
CREATE TABLE "action_log" (
    "id" UUID NOT NULL,
    "action_id" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "source" "action_source" NOT NULL,
    "actor_type" "actor_type" NOT NULL,
    "actor_id" TEXT,
    "on_behalf_of_user_id" UUID,
    "run_id" UUID,
    "input" JSONB NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "result" JSONB,
    "status" "action_status" NOT NULL,
    "error" JSONB,
    "undo_until" TIMESTAMPTZ(6),
    "undone_by" UUID,
    "undone_at" TIMESTAMPTZ(6),
    "trace_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_event" (
    "id" UUID NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "outbox_status" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "trace_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_key" (
    "key" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response" JSONB,
    "status_code" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_key_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "file" (
    "id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "sha256" TEXT,
    "uploaded_by" UUID,
    "purpose" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_counter" (
    "kind" TEXT NOT NULL,
    "value" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "sequence_counter_pkey" PRIMARY KEY ("kind")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schema_meta" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "version" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schema_meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "action_log_run_id_idx" ON "action_log"("run_id");

-- CreateIndex
CREATE INDEX "idempotency_key_created_at_idx" ON "idempotency_key"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "file_storage_key_key" ON "file"("storage_key");

-- CreateIndex
CREATE INDEX "notification_user_id_created_at_idx" ON "notification"("user_id", "created_at" DESC);

-- ── SQL viết tay (Prisma không biểu diễn được) — standards/database/indexing.md §2, §5 ──
-- action_log: list nhật ký mới nhất, covering cho cột hiển thị.
CREATE INDEX "action_log_created_at_cover_idx" ON "action_log" ("created_at" DESC) INCLUDE ("action_id", "actor_type", "status");
-- outbox: relay chỉ quét bản ghi chờ.
CREATE INDEX "outbox_event_pending_idx" ON "outbox_event" ("available_at") WHERE "status" = 'pending';
-- notification: badge chưa đọc.
CREATE INDEX "notification_unread_idx" ON "notification" ("user_id", "created_at" DESC) WHERE "read_at" IS NULL;
-- schema_meta: đúng một dòng.
ALTER TABLE "schema_meta" ADD CONSTRAINT "schema_meta_singleton" CHECK ("id" = 1);

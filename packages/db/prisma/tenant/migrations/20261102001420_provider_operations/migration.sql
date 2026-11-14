-- TIP-014b A: tham chiếu tin phía kênh, self-event chờ ghép, lệnh thao tác bền (thu hồi / cảm xúc), cảm xúc của tài khoản trên tin.
CREATE TABLE "message_provider_ref" (
  "message_id" UUID NOT NULL,
  "part_no" INTEGER NOT NULL,
  "channel_account_id" UUID NOT NULL,
  "thread_id" TEXT NOT NULL,
  "is_group" BOOLEAN NOT NULL,
  "msg_id" TEXT NOT NULL,
  "cli_msg_id" TEXT,
  "sender_id" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "message_provider_ref_pkey" PRIMARY KEY ("message_id", "part_no"),
  CONSTRAINT "message_provider_ref_part_check" CHECK ("part_no" >= 0),
  CONSTRAINT "message_provider_ref_msg_check" CHECK ("msg_id" <> '' AND ("cli_msg_id" IS NULL OR "cli_msg_id" <> ''))
);
-- Sự kiện kênh (self-event / thu hồi / cảm xúc) tra theo (tài khoản, msgId) — bằng trước; chỉ trong đúng tài khoản.
CREATE UNIQUE INDEX "message_provider_ref_account_msg_key" ON "message_provider_ref" ("channel_account_id", "msg_id") INCLUDE ("message_id", "cli_msg_id");

CREATE TABLE "provider_pending_ref" (
  "channel_account_id" UUID NOT NULL,
  "msg_id" TEXT NOT NULL,
  "cli_msg_id" TEXT NOT NULL,
  "thread_id" TEXT NOT NULL,
  "is_group" BOOLEAN NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "provider_pending_ref_pkey" PRIMARY KEY ("channel_account_id", "msg_id")
);
-- Dọn bản chờ hết hạn (quét theo mốc).
CREATE INDEX "provider_pending_ref_expires_idx" ON "provider_pending_ref" ("expires_at");

CREATE TYPE "channel_operation_status" AS ENUM ('queued', 'dispatch_reserved', 'confirmed', 'failed', 'unknown', 'partial', 'cancelled', 'superseded');

CREATE TABLE "channel_operation" (
  "id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "channel_account_id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "message_id" UUID NOT NULL,
  "actor_id" UUID,
  "desired" JSONB NOT NULL DEFAULT '{}',
  "revision" INTEGER NOT NULL DEFAULT 0,
  "status" "channel_operation_status" NOT NULL DEFAULT 'queued',
  "result" JSONB NOT NULL DEFAULT '{}',
  "error" TEXT,
  "attempted_at" TIMESTAMPTZ(6),
  "finished_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "channel_operation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "channel_operation_kind_check" CHECK ("kind" IN ('recall', 'react'))
);
-- Trạng thái thao tác mới nhất của tin (DTO luồng tin, ghép lệnh với sự kiện kênh): message_id + kind bằng, created_at sắp xếp.
CREATE INDEX "channel_operation_message_kind_idx" ON "channel_operation" ("message_id", "kind", "created_at" DESC, "id" DESC) INCLUDE ("status");
-- Khôi phục lệnh còn dang dở theo tài khoản (worker mở phiên) — partial, chỉ lệnh chưa kết thúc.
CREATE INDEX "channel_operation_open_idx" ON "channel_operation" ("channel_account_id", "created_at", "id") WHERE "status" IN ('queued', 'dispatch_reserved');

CREATE TABLE "message_account_reaction" (
  "message_id" UUID NOT NULL,
  "channel_account_id" UUID NOT NULL,
  "desired_emoji" TEXT,
  "desired_revision" INTEGER NOT NULL DEFAULT 0,
  "confirmed_emoji" TEXT,
  "confirmed_revision" INTEGER NOT NULL DEFAULT 0,
  "remote_emoji" TEXT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "message_account_reaction_pkey" PRIMARY KEY ("message_id"),
  CONSTRAINT "message_account_reaction_revision_check" CHECK ("confirmed_revision" <= "desired_revision")
);

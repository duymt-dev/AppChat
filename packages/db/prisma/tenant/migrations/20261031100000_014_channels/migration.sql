-- CreateEnum
CREATE TYPE "channel_account_status" AS ENUM ('pending', 'connecting', 'connected', 'error', 'disconnected', 'expired');

-- CreateTable
CREATE TABLE "channel_account" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "external_id" TEXT,
    "status" "channel_account_status" NOT NULL DEFAULT 'pending',
    "credentials_enc" BYTEA,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "paused_at" TIMESTAMPTZ(6),
    "health" JSONB NOT NULL DEFAULT '{}',
    "last_event_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_account_stat_daily" (
    "channel_account_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "convs" INTEGER NOT NULL DEFAULT 0,
    "frt_sum" BIGINT NOT NULL DEFAULT 0,
    "frt_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "channel_account_stat_daily_pkey" PRIMARY KEY ("channel_account_id","day")
);



-- Viết tay (TIP-014, indexing §3–§5):
-- Một tài khoản kênh đang dùng mỗi (type, external_id) — kết nối lại cùng Zalo dùng lại dòng cũ; đã ngắt thì cho dòng mới.
CREATE UNIQUE INDEX "channel_account_external_live_key" ON "channel_account" ("type", "external_id")
  WHERE "external_id" IS NOT NULL AND "status" <> 'disconnected';
-- Trang Kênh kết nối + worker: tài khoản chưa ngắt theo type, thứ tự tạo (đếm hạn mức gói, danh sách tài khoản).
CREATE INDEX "channel_account_live_idx" ON "channel_account" ("type", "created_at") INCLUDE ("status", "name")
  WHERE "status" <> 'disconnected';
ALTER TABLE "channel_account_stat_daily" ADD CONSTRAINT "channel_account_stat_daily_account_fk"
  FOREIGN KEY ("channel_account_id") REFERENCES "channel_account"("id") ON DELETE CASCADE;

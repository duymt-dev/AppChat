-- TIP-014b C: lịch sử bền — tin đánh dấu nguồn (live / history) + lần lấy lịch sử có báo cáo.
ALTER TABLE "message" ADD COLUMN "origin" TEXT NOT NULL DEFAULT 'live';
ALTER TABLE "message" ADD CONSTRAINT "message_origin_check" CHECK ("origin" IN ('live', 'history'));

CREATE TABLE "channel_history_run" (
  "id" UUID NOT NULL,
  "channel_account_id" UUID NOT NULL,
  "actor_id" UUID,
  "days" INTEGER NOT NULL,
  "cutoff_at" TIMESTAMPTZ(6) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "generation" INTEGER,
  "received" INTEGER NOT NULL DEFAULT 0,
  "in_range" INTEGER NOT NULL DEFAULT 0,
  "imported" INTEGER NOT NULL DEFAULT 0,
  "pages" INTEGER NOT NULL DEFAULT 0,
  "earliest_at" TIMESTAMPTZ(6),
  "latest_at" TIMESTAMPTZ(6),
  "error" TEXT,
  "started_at" TIMESTAMPTZ(6),
  "finished_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "channel_history_run_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "channel_history_run_days_check" CHECK ("days" IN (7, 30, 90)),
  CONSTRAINT "channel_history_run_status_check" CHECK ("status" IN ('queued', 'running', 'complete', 'provider_limit', 'partial', 'timeout', 'failed', 'superseded')),
  CONSTRAINT "channel_history_run_account_fkey" FOREIGN KEY ("channel_account_id") REFERENCES "channel_account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Lần mới nhất theo tài khoản (màn quản lý kênh): bằng trước, mốc sau.
CREATE INDEX "channel_history_run_account_idx" ON "channel_history_run" ("channel_account_id", "created_at" DESC, "id" DESC);
-- Lần đang mở (khôi phục khi worker sập): partial.
CREATE INDEX "channel_history_run_open_idx" ON "channel_history_run" ("channel_account_id") WHERE "status" IN ('queued', 'running');

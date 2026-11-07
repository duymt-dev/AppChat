-- TIP-041 pha 2 (DC-375): hoạt động workspace + quét lưu trữ gói Miễn phí (90 ngày, cảnh báo 14 ngày). Expand-only.

-- Mốc hoạt động mà lệnh lưu trữ của lượt quét dựa vào — kiểm lại sau quiesce: hoạt động mới hơn → huỷ lưu trữ.
ALTER TABLE "workspace_lifecycle_job" ADD COLUMN "basis_at" TIMESTAMPTZ(6);

-- Biên nhận giao cảnh báo lưu trữ: một dòng mỗi (workspace, cửa sổ = ngày dự kiến lưu trữ, kênh). Giao xong mới tính "đã cảnh báo";
-- lỗi thử lại có giới hạn (không gia hạn mốc lưu trữ theo lần thử).
CREATE TABLE "workspace_lifecycle_notice" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "window_key" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archive_on" TIMESTAMPTZ(6) NOT NULL,
  "sent_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspace_lifecycle_notice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workspace_lifecycle_notice_channel_check" CHECK ("channel" IN ('email', 'in_app')),
  CONSTRAINT "workspace_lifecycle_notice_status_check" CHECK ("status" IN ('pending', 'sent', 'failed'))
);
CREATE UNIQUE INDEX "workspace_lifecycle_notice_window_key" ON "workspace_lifecycle_notice" ("workspace_id", "window_key", "channel");
-- Thử lại cảnh báo chưa giao: `=` status, khoảng next_attempt_at.
CREATE INDEX "workspace_lifecycle_notice_retry_idx" ON "workspace_lifecycle_notice" ("status", "next_attempt_at", "id") WHERE "status" IN ('pending', 'failed');

-- Ứng viên lưu trữ: khoảng last_active_at, workspace_id ổn định (quét IDs-first theo lô).
CREATE INDEX "workspace_stats_last_active_idx" ON "workspace_stats" ("last_active_at", "workspace_id") WHERE "last_active_at" IS NOT NULL;

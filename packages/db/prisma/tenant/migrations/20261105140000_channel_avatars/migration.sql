-- TIP-014b D: ảnh đại diện theo định danh phía kênh (khách 1-1 + thành viên nhóm) — tải về Storage (không hotlink CDN nhà cung cấp).
-- Hàng đợi bền theo tài khoản: tin vào live đánh dấu `queued` khi chưa có / quá 7 ngày; worker giữ phiên lấy theo lô, có trần + lùi.
CREATE TABLE "channel_avatar" (
  "channel_account_id" UUID NOT NULL,
  "external_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "file_id" UUID,
  "source_hash" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_at" TIMESTAMPTZ(6) NOT NULL,
  "requested_at" TIMESTAMPTZ(6) NOT NULL,
  "checked_at" TIMESTAMPTZ(6),
  "synced_at" TIMESTAMPTZ(6),
  "error" TEXT,
  CONSTRAINT "channel_avatar_pkey" PRIMARY KEY ("channel_account_id", "external_id"),
  CONSTRAINT "channel_avatar_status_check" CHECK ("status" IN ('queued', 'ok', 'none', 'failed')),
  CONSTRAINT "channel_avatar_account_fkey" FOREIGN KEY ("channel_account_id") REFERENCES "channel_account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Lô đến hạn của một tài khoản: bằng trước, mốc sau; partial chỉ dòng đang chờ.
CREATE INDEX "channel_avatar_due_idx" ON "channel_avatar" ("channel_account_id", "next_at") WHERE "status" = 'queued';
-- Trần lượt đọc hồ sơ / ngày / tài khoản: đếm theo mốc kiểm.
CREATE INDEX "channel_avatar_checked_idx" ON "channel_avatar" ("channel_account_id", "checked_at") WHERE "checked_at" IS NOT NULL;

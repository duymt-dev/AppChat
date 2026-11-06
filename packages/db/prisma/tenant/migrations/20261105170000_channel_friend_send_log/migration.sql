-- TIP-014b E: trần gửi lời mời / ngày đếm ở nhật ký chỉ-thêm (dòng `channel_friend` bị ghi đè khi thu hồi / gửi lại nên không đếm được).
-- Nhật ký gửi lời mời (chỉ thêm): trần / ngày / tài khoản đếm ở đây — thu hồi / gửi lại cùng người vẫn tính từng lượt.
CREATE TABLE "channel_friend_send_log" (
  "id" UUID NOT NULL,
  "channel_account_id" UUID NOT NULL,
  "external_id" TEXT NOT NULL,
  "actor_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "channel_friend_send_log_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "channel_friend_send_log_account_fkey" FOREIGN KEY ("channel_account_id") REFERENCES "channel_account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Trần gửi / ngày: bằng trước, mốc sau.
CREATE INDEX "channel_friend_send_log_account_idx" ON "channel_friend_send_log" ("channel_account_id", "created_at" DESC);
DROP INDEX "channel_friend_sent_idx";

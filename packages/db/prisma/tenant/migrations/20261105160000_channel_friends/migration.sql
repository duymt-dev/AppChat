-- TIP-014b E (DC nới DC-247): bạn bè Zalo. `channel_friend` = quan hệ / lời mời theo (tài khoản, id phía kênh) — lời mời TỚI (từ sự kiện kênh)
-- và lệnh bền của nhân viên (nhận / từ chối / gửi / huỷ) có ACK nhà cung cấp; chỉ người bấm, không AI / agent / hàng loạt. Trần gửi / ngày.
-- `channel_user_lookup` = tra MỘT SĐT (trần / ngày), kết quả tạm 24 giờ, không tự lưu khách; dòng tra giữ làm nhật ký (người tra, lúc tra).
CREATE TABLE "channel_friend" (
  "channel_account_id" UUID NOT NULL,
  "external_id" TEXT NOT NULL,
  "display_name" TEXT NOT NULL DEFAULT '',
  "state" TEXT NOT NULL DEFAULT 'none',
  "incoming_message" TEXT,
  "incoming_at" TIMESTAMPTZ(6),
  "op" TEXT,
  "op_status" TEXT,
  "op_actor_id" UUID,
  "op_message" TEXT,
  "op_error" TEXT,
  "op_requested_at" TIMESTAMPTZ(6),
  "op_finished_at" TIMESTAMPTZ(6),
  "op_generation" INTEGER,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "channel_friend_pkey" PRIMARY KEY ("channel_account_id", "external_id"),
  CONSTRAINT "channel_friend_state_check" CHECK ("state" IN ('none', 'incoming', 'outgoing', 'friend')),
  CONSTRAINT "channel_friend_op_check" CHECK ("op" IS NULL OR "op" IN ('accept', 'reject', 'send', 'undo')),
  CONSTRAINT "channel_friend_op_status_check" CHECK ("op_status" IS NULL OR "op_status" IN ('queued', 'dispatch_reserved', 'confirmed', 'failed', 'unknown')),
  CONSTRAINT "channel_friend_account_fkey" FOREIGN KEY ("channel_account_id") REFERENCES "channel_account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Lời mời tới của tài khoản (màn Bạn bè): bằng trước, mốc sau; partial chỉ dòng đang chờ.
CREATE INDEX "channel_friend_incoming_idx" ON "channel_friend" ("channel_account_id", "incoming_at" DESC) WHERE "state" = 'incoming';
-- Trần gửi lời mời / ngày: đếm lệnh `send` theo mốc yêu cầu.
CREATE INDEX "channel_friend_sent_idx" ON "channel_friend" ("channel_account_id", "op_requested_at") WHERE "op" = 'send';

CREATE TABLE "channel_user_lookup" (
  "id" UUID NOT NULL,
  "channel_account_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "phone" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "external_id" TEXT,
  "display_name" TEXT,
  "error" TEXT,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "finished_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "channel_user_lookup_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "channel_user_lookup_status_check" CHECK ("status" IN ('queued', 'running', 'found', 'not_found', 'failed')),
  CONSTRAINT "channel_user_lookup_account_fkey" FOREIGN KEY ("channel_account_id") REFERENCES "channel_account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Trần tra / ngày / tài khoản: bằng trước, mốc sau.
CREATE INDEX "channel_user_lookup_account_idx" ON "channel_user_lookup" ("channel_account_id", "created_at" DESC);

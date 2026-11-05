-- TIP-014b B: từng phần gửi (bền — không phụ thuộc job Redis) + biên nhận đã nhận / đã xem.
CREATE TYPE "send_part_status" AS ENUM ('pending', 'dispatch_reserved', 'confirmed_sent', 'definite_failure', 'unknown');

CREATE TABLE "outbox_send_part" (
  "outbox_message_id" UUID NOT NULL,
  "part_no" INTEGER NOT NULL,
  "channel_account_id" UUID NOT NULL,
  "content_hash" TEXT NOT NULL,
  "status" "send_part_status" NOT NULL DEFAULT 'pending',
  "msg_id" TEXT,
  "error" TEXT,
  "generation" INTEGER NOT NULL DEFAULT 0,
  "attempted_at" TIMESTAMPTZ(6),
  "confirmed_at" TIMESTAMPTZ(6),
  "trace_id" TEXT,
  CONSTRAINT "outbox_send_part_pkey" PRIMARY KEY ("outbox_message_id", "part_no"),
  CONSTRAINT "outbox_send_part_part_check" CHECK ("part_no" >= 0),
  CONSTRAINT "outbox_send_part_outbox_fkey" FOREIGN KEY ("outbox_message_id") REFERENCES "outbox_message" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Phần đang treo theo tài khoản (khôi phục khi mở phiên): bằng trước, mốc sau — partial, chỉ phần chưa kết thúc.
CREATE INDEX "outbox_send_part_open_idx" ON "outbox_send_part" ("channel_account_id", "attempted_at", "outbox_message_id") WHERE "status" IN ('pending', 'dispatch_reserved');

CREATE TABLE "message_receipt" (
  "message_id" UUID NOT NULL,
  "recipient_id" TEXT NOT NULL,
  "delivered_at" TIMESTAMPTZ(6),
  "read_at" TIMESTAMPTZ(6),
  CONSTRAINT "message_receipt_pkey" PRIMARY KEY ("message_id", "recipient_id")
);

-- Trạng thái gửi trung thực của tin ra: một phần / chưa rõ (không phải đã gửi, không phải lỗi chắc chắn).
ALTER TYPE "message_status" ADD VALUE IF NOT EXISTS 'partial';
ALTER TYPE "message_status" ADD VALUE IF NOT EXISTS 'unknown';
ALTER TYPE "outbox_message_status" ADD VALUE IF NOT EXISTS 'unknown';

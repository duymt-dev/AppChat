-- TIP-045b annex D: người tiếp quản hội thoại + lượt agent duy nhất + đặt chỗ gửi.
-- `ai_epoch` tăng mỗi lần người gửi / đổi chế độ AI / chuyển người / đóng; lease lượt agent bền trong DB tenant (fence + chủ + hạn).
ALTER TABLE "conversation" ADD COLUMN "ai_epoch" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "conversation" ADD COLUMN "ai_turn_fence" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "conversation" ADD COLUMN "ai_turn_owner" TEXT;
ALTER TABLE "conversation" ADD COLUMN "ai_turn_until" TIMESTAMPTZ(6);

-- Tin agent mang fence + epoch; `dispatch_reserved` = đã đặt chỗ gửi (điểm tuyến tính hoá với người tiếp quản).
ALTER TYPE "outbox_message_status" ADD VALUE 'dispatch_reserved' AFTER 'pending';
ALTER TABLE "outbox_message" ADD COLUMN "turn_fence" INTEGER;
ALTER TABLE "outbox_message" ADD COLUMN "ai_epoch" INTEGER;
ALTER TABLE "outbox_message" ADD COLUMN "reserved_at" TIMESTAMPTZ(6);

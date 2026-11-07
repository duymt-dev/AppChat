-- TIP-019b P2 (DC-379): run tiện ích chung gốc — mỗi (cha, bước:action) một run con (gọi lại dùng lại, không sinh lại). Biên nhận gửi
-- thông báo hết hạn duyệt (một lần / yêu cầu duyệt, người nhận = Owner hiện tại lúc gửi).
ALTER TABLE "ai_run" ADD COLUMN "child_key" TEXT;
CREATE UNIQUE INDEX "ai_run_parent_child_key" ON "ai_run" ("parent_run_id", "child_key") WHERE "child_key" IS NOT NULL;

-- Khoá lần gọi theo nhóm tính tiền (chat / embedding truy vấn / nạp kho không đụng nhau trong cùng run, cùng bước).
DROP INDEX "ai_usage_receipt_attempt_key";
CREATE UNIQUE INDEX "ai_usage_receipt_attempt_key" ON "ai_usage_receipt" ("group_id", "candidate", "batch");

CREATE TABLE "ai_expiry_delivery" (
    "approval_id" UUID NOT NULL,
    "event_id" TEXT NOT NULL,
    "recipient_user_id" UUID,
    "phase" TEXT NOT NULL DEFAULT 'pending',
    "notification_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(6),
    CONSTRAINT "ai_expiry_delivery_pkey" PRIMARY KEY ("approval_id"),
    CONSTRAINT "ai_expiry_delivery_phase_check" CHECK ("phase" IN ('pending', 'sent', 'skipped'))
);

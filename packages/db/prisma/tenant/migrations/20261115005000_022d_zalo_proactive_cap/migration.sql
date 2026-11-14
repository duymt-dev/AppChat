-- TIP-022d: sổ dự phòng trần tin chủ động / ngày theo tài khoản kênh + trạng thái hoãn qua ngày `deferred_cap`.
CREATE TABLE "channel_proactive_slot" (
  "channel_account_id" UUID NOT NULL,
  "day" TEXT NOT NULL,
  "ref_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "channel_proactive_slot_pkey" PRIMARY KEY ("channel_account_id", "day", "ref_id")
);

ALTER TYPE "message_status" ADD VALUE IF NOT EXISTS 'deferred_cap';
ALTER TYPE "outbox_message_status" ADD VALUE IF NOT EXISTS 'deferred_cap';

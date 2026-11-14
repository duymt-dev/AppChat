-- TIP-018: kênh Email — chuỗi thư của hội thoại email (email_thread).
-- CreateTable
CREATE TABLE "email_thread" (
    "channel_account_id" UUID NOT NULL,
    "external_thread_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "last_message_id" TEXT,
    "references" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_thread_pkey" PRIMARY KEY ("channel_account_id","external_thread_id")
);


-- FK nội DB tenant (Blueprint §2.1): tài khoản chỉ bị đánh dấu `disconnected` (không xoá) — chuỗi thư giữ cùng lịch sử hội thoại.
ALTER TABLE "email_thread" ADD CONSTRAINT "email_thread_channel_account_fk"
  FOREIGN KEY ("channel_account_id") REFERENCES "channel_account"("id") ON DELETE CASCADE;

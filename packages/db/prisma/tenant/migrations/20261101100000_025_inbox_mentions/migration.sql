-- TIP-025: @nhắc trong ghi chú nội bộ → thư mục "Nhắc đến tôi" + thông báo msg_mention.
CREATE TABLE "message_mention" (
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_mention_pkey" PRIMARY KEY ("message_id","user_id")
);

ALTER TABLE "message_mention" ADD CONSTRAINT "message_mention_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "message"("id") ON DELETE CASCADE;
ALTER TABLE "message_mention" ADD CONSTRAINT "message_mention_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE;

-- Viết tay (indexing §1, §4): chỉ các lần nhắc chưa đọc (partial). Thư mục / đếm "Nhắc đến tôi" (`user_id =` + EXISTS theo
-- `conversation_id =`) và đánh dấu đã đọc khi mở hội thoại (`user_id = AND conversation_id =`) cùng dùng một index.
CREATE INDEX "message_mention_unread_idx" ON "message_mention" ("user_id", "conversation_id") WHERE "read_at" IS NULL;

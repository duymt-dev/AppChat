-- TIP-022b: hành vi agent trực kênh — lịch tuần có cấu trúc, lượt khách bền (chọn agent / lời chào / câu trả lời), ý định + tóm tắt bàn
-- giao theo lượt, một ticket khiếu nại tự động mỗi tin nguồn. Expand-only: cột nullable / mặc định giữ nguyên hành vi cấu hình cũ.

ALTER TABLE "ai_agent" ADD COLUMN "weekly_schedule" JSONB;

ALTER TABLE "conversation" ADD COLUMN "intent_source" JSONB;
ALTER TABLE "conversation" ADD COLUMN "handoff_summary" JSONB;

-- Mục đích tin ra nội bộ: chỉ `greeting` (lời chào tự động). Tin thường null.
ALTER TABLE "message" ADD COLUMN "purpose" TEXT;
ALTER TABLE "message" ADD CONSTRAINT "message_purpose_chk" CHECK ("purpose" IS NULL OR "purpose" = 'greeting');
-- "Đã chào hội thoại này chưa": tra theo hội thoại, chỉ dòng lời chào (rất ít).
CREATE INDEX "message_greeting_idx" ON "message" ("conversation_id") WHERE "purpose" = 'greeting';

CREATE TABLE "ai_turn_receipt" (
  "conversation_id" UUID NOT NULL,
  "source_message_id" UUID NOT NULL,
  "fence" INTEGER NOT NULL,
  "agent_id" TEXT,
  "agent_version" INTEGER,
  "binding_source" TEXT NOT NULL DEFAULT 'auto',
  "binding_reason" TEXT NOT NULL DEFAULT '',
  "greeting_phase" TEXT NOT NULL DEFAULT 'none',
  "greeting_message_id" UUID,
  "answer_phase" TEXT NOT NULL DEFAULT 'pending',
  "run_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "ai_turn_receipt_pkey" PRIMARY KEY ("conversation_id", "source_message_id"),
  CONSTRAINT "ai_turn_receipt_conversation_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation" ("id") ON DELETE CASCADE,
  CONSTRAINT "ai_turn_receipt_binding_chk" CHECK ("binding_source" IN ('auto', 'manual', 'transfer')),
  CONSTRAINT "ai_turn_receipt_greeting_chk" CHECK ("greeting_phase" IN ('none', 'pending', 'acknowledged', 'unknown')),
  CONSTRAINT "ai_turn_receipt_answer_chk" CHECK ("answer_phase" IN ('pending', 'finalized'))
);
-- Lượt còn dở của hội thoại (phục hồi sau crash): bằng trước, mốc sau; chỉ dòng chưa xong.
CREATE INDEX "ai_turn_receipt_pending_idx" ON "ai_turn_receipt" ("conversation_id", "created_at" DESC) WHERE "answer_phase" = 'pending';

CREATE TABLE "ai_complaint_receipt" (
  "source_message_id" UUID NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'agent_ticket',
  "conversation_id" UUID NOT NULL,
  "run_id" UUID,
  "agent_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "ticket_id" UUID,
  "approval_id" UUID,
  "intent_hash" TEXT NOT NULL,
  "detail" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "ai_complaint_receipt_pkey" PRIMARY KEY ("source_message_id", "kind"),
  CONSTRAINT "ai_complaint_receipt_kind_chk" CHECK ("kind" = 'agent_ticket'),
  CONSTRAINT "ai_complaint_receipt_status_chk" CHECK ("status" IN ('pending', 'created', 'duplicate', 'denied', 'rejected'))
);
CREATE INDEX "ai_complaint_receipt_conversation_idx" ON "ai_complaint_receipt" ("conversation_id", "created_at" DESC);

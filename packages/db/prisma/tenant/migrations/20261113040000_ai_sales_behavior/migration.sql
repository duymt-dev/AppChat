-- TIP-022c §1.6 / §4.3: biên nhận ý định khách cho quyết định báo giá của agent trực kênh — ghi TRƯỚC hiệu ứng, tiêu thụ cùng transaction.
-- Khoá chống phát lại = (tin nguồn, revision): báo giá là giá trị đã giải, KHÔNG thuộc khoá (phát lại không đổi đích sang báo giá mới).
CREATE TABLE "ai_sales_intent" (
  "id" UUID NOT NULL,
  "root_run_id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "source_message_id" UUID NOT NULL,
  "source_revision" INTEGER NOT NULL,
  "source_digest" TEXT NOT NULL,
  "turn_fence" INTEGER NOT NULL,
  "original_contact_id" UUID,
  "quote_id" UUID NOT NULL,
  "quote_version" INTEGER NOT NULL,
  "quote_fingerprint" TEXT NOT NULL,
  "intent" TEXT NOT NULL,
  "confidence_pct" DOUBLE PRECISION NOT NULL,
  "classified_step_idx" INTEGER,
  "state" TEXT NOT NULL DEFAULT 'prepared',
  "invalid_reason" TEXT,
  "action_log_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "ai_sales_intent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_sales_intent_conversation_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation" ("id") ON DELETE CASCADE,
  CONSTRAINT "ai_sales_intent_intent_chk" CHECK ("intent" IN ('accept', 'revise', 'reject')),
  CONSTRAINT "ai_sales_intent_state_chk" CHECK ("state" IN ('prepared', 'consumed', 'invalidated')),
  -- Ngưỡng cứng 70% (COMMERCE §3): dưới ngưỡng không bao giờ thành biên nhận tự động.
  CONSTRAINT "ai_sales_intent_confidence_chk" CHECK ("confidence_pct" >= 70 AND "confidence_pct" <= 100),
  CONSTRAINT "ai_sales_intent_consumed_chk" CHECK ("state" <> 'consumed' OR "action_log_id" IS NOT NULL)
);

-- Một tin nguồn (đúng revision) → tối đa một quyết định tự động; người thắng đầu tiên giữ.
CREATE UNIQUE INDEX "ai_sales_intent_source_key" ON "ai_sales_intent" ("source_message_id", "source_revision");
-- Khôi phục theo run (sau restart / duyệt): `=` run rồi id, trạng thái + log trong INCLUDE (Index Only Scan).
CREATE INDEX "ai_sales_intent_run_idx" ON "ai_sales_intent" ("run_id", "id") INCLUDE ("state", "action_log_id");
-- Kiểm kê "Quên khách": `=` khách gốc rồi id, trạng thái trong INCLUDE.
CREATE INDEX "ai_sales_intent_contact_idx" ON "ai_sales_intent" ("original_contact_id", "id") INCLUDE ("state") WHERE "original_contact_id" IS NOT NULL;

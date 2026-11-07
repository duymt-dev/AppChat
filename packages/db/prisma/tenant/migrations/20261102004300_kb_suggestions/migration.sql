-- TIP-043 — học hỏi–đáp từ hội thoại có người duyệt (rag §9, D29b). Đề xuất đã che PII; chỉ khi người có kb.manage duyệt mới tạo
-- kb_source origin conversation (đúng một nguồn mỗi đề xuất — unique kb_source_id). Fingerprint chặn cặp trùng khi event đến lặp.
CREATE TYPE "kb_suggestion_status" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE "kb_suggestion" (
  "id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "source_message_ids" UUID[] NOT NULL,
  "status" "kb_suggestion_status" NOT NULL DEFAULT 'pending',
  "edited" BOOLEAN NOT NULL DEFAULT false,
  "fingerprint" TEXT NOT NULL,
  "cutoff_message_id" UUID NOT NULL,
  "run_id" UUID,
  "reviewed_by" UUID,
  "reviewed_at" TIMESTAMPTZ(6),
  "reject_reason" TEXT,
  "kb_source_id" UUID,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kb_suggestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "kb_suggestion_fingerprint_key" ON "kb_suggestion" ("fingerprint");
CREATE UNIQUE INDEX "kb_suggestion_kb_source_id_key" ON "kb_suggestion" ("kb_source_id");
CREATE INDEX "kb_suggestion_conversation_id_idx" ON "kb_suggestion" ("conversation_id");
-- Hàng chờ theo trạng thái, cursor (created_at, id) ổn định khi trùng thời điểm: chọn id bằng Index Only Scan rồi JOIN lấy hỏi–đáp
-- (deferred join — không INCLUDE question / answer dài). Đếm pending dùng cùng index.
CREATE INDEX "kb_suggestion_status_created_cover_idx" ON "kb_suggestion" ("status", "created_at" DESC, "id" DESC) INCLUDE ("conversation_id", "version", "kb_source_id");

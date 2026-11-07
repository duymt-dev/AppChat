-- AlterTable
ALTER TABLE "conversation" ADD COLUMN     "ai_draft" TEXT,
ADD COLUMN     "ai_suggestion" JSONB;


-- TIP-022 (viết tay): run theo hội thoại (lặp câu hỏi, lượt agent gần nhất) — partial, mới nhất trước.
CREATE INDEX "ai_run_conversation_idx" ON "ai_run" ("conversation_id", "started_at" DESC) INCLUDE ("kind", "status") WHERE "conversation_id" IS NOT NULL;

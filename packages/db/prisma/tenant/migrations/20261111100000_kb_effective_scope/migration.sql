-- TIP-020c: phạm vi tri thức hiệu lực. Binding tin cậy + nguồn đã dùng trên ai_run; nháp AI của hội thoại ràng run nguồn + thế hệ; tin
-- gửi phụ thuộc nguồn ghi run để đặt chỗ gửi kiểm lại. Không sửa migration cũ; index vector / trigram giữ nguyên.

ALTER TABLE "ai_run" ADD COLUMN "knowledge" JSONB, ADD COLUMN "knowledge_refs" JSONB;
ALTER TABLE "conversation" ADD COLUMN "ai_draft_run_id" UUID, ADD COLUMN "ai_draft_gen" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "outbox_message" ADD COLUMN "knowledge_run_id" UUID;

-- Lọc nguồn theo phạm vi TRƯỚC khi chọn ứng viên: bằng (folder_id, visibility) rồi id, chỉ nguồn sống đã nạp; INCLUDE ingest_seq để so
-- thế hệ không đọc heap. Thẻ: GIN riêng trên tập sống / đã nạp (gin(tags) cũ gồm cả nguồn đã xoá / đang nạp).
CREATE INDEX "kb_source_scope_ready_idx" ON "kb_source" ("folder_id", "visibility", "id") INCLUDE ("ingest_seq", "origin") WHERE "deleted_at" IS NULL AND "status" = 'ready';
CREATE INDEX "kb_source_tags_ready_gin_idx" ON "kb_source" USING gin ("tags") WHERE "deleted_at" IS NULL AND "status" = 'ready';
-- Nguồn hội thoại → hội thoại gốc (kiểm quyền / quên khách khi truy hồi): kb_suggestion.kb_source_id đã unique.

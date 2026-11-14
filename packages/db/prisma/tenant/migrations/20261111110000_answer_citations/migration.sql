-- TIP-020d: trích dẫn câu trả lời RAG đã kiểm.
--   citation_registry  — bí danh tài liệu server cấp cho run (S1…S40) → nguồn / đoạn / thế hệ nạp / băm đoạn (model chỉ thấy bí danh).
--   citation_phase     — awaiting_generation | validating | validated | invalidated | failed | none (null = run không ở chế độ này).
--   answer_citations   — binding công bố: ứng viên riêng (chữ thô + trích dẫn model chọn) tới khi kiểm xong, rồi trích dẫn chuẩn hoá +
--                        thế hệ câu trả lời + băm chữ + bước trả lời + lý do an toàn.
ALTER TABLE "ai_run" ADD COLUMN "citation_registry" JSONB, ADD COLUMN "citation_phase" TEXT, ADD COLUMN "answer_citations" JSONB;

-- Quét khôi phục (≤ 100 dòng / trang): chỉ run chưa chốt — bằng trước, sắp sau; không payload JSON trong khoá.
CREATE INDEX "ai_run_citation_recovery_idx" ON "ai_run" ("citation_phase", "started_at", "id") INCLUDE ("status")
  WHERE "citation_phase" IN ('awaiting_generation', 'validating');

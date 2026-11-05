-- Trạng thái giữ chỗ khi hoàn tác action nền tảng (thao tác mới có điều kiện — annex A1).
ALTER TYPE "action_status" ADD VALUE IF NOT EXISTS 'undoing';

-- TIP-045b annex A1: biên nhận pha tenant của thao tác xuyên DB (unique theo operation) — áp lại pha tenant không ghi đôi.
CREATE TABLE "operation_receipt" (
  "operation_id"  UUID           NOT NULL PRIMARY KEY,
  "action_log_id" UUID           NOT NULL,
  "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- Audit workspace (annex A2/E): trang không lọc dùng `action_log_created_at_cover_idx` (TIP-023, created_at DESC INCLUDE …) — không thêm
-- index trùng; biến thể lọc actor / action: cột `=` trước, rồi created_at DESC, id DESC (thứ tự ổn định).
CREATE INDEX "action_log_actor_page_idx" ON "action_log" ("actor_id", "created_at" DESC, "id" DESC);
CREATE INDEX "action_log_action_page_idx" ON "action_log" ("action_id", "created_at" DESC, "id" DESC);

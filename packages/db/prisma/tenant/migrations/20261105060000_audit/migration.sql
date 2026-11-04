-- TIP-045b annex A2: cờ `audit` trên action_log cho sự kiện nhạy cảm (đổi vai trò, mời / gỡ thành viên, kết nối / ngắt kênh, xuất dữ
-- liệu, đổi chủ, đăng nhập thiết bị mới) — ghi cùng transaction action; lọc "chỉ sự kiện bảo mật" dùng partial index.
ALTER TABLE "action_log" ADD COLUMN "audit" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "action_log_audit_page_idx" ON "action_log" ("created_at" DESC, "id" DESC) WHERE "audit";

-- AI audit (annex A2): trang 50 theo started_at DESC, id DESC — covering cho cột hiển thị (không đọc heap input / output / state lớn).
CREATE INDEX "ai_run_audit_page_idx" ON "ai_run" ("started_at" DESC, "id" DESC) INCLUDE ("kind", "status", "tier", "title", "credits_used", "agent_id");

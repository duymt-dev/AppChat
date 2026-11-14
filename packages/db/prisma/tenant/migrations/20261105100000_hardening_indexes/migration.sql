-- TIP-045b annex E — index cho danh sách việc nền của người tạo (cổng trạng thái / trang "Việc đang chạy") theo keyset
-- (actor_id =, status =, created_at DESC, id DESC); thay index cũ (actor_id, created_at) không lọc trạng thái, không phá thứ tự khi trùng giờ.
DROP INDEX IF EXISTS "data_job_actor_id_created_at_idx";
CREATE INDEX "data_job_actor_status_page_idx" ON "data_job" ("actor_id", "status", "created_at" DESC, "id" DESC);
-- Đối soát credit AI: tổng credits theo bước từ mốc → mốc (range created_at), covering.
CREATE INDEX "ai_run_step_created_credits_idx" ON "ai_run_step" ("created_at") INCLUDE ("credits", "run_id", "idx") WHERE "credits" > 0;

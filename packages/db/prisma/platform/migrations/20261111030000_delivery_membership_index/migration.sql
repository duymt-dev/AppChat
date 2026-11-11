-- TIP-006b §6.2: chọn người nhận theo cohort thành viên active của workspace, phân trang theo user_id (= workspace, status rồi user_id);
-- INCLUDE role_key cho Index Only Scan. Index cũ (user_id) / (workspace_id, created_at) không phủ cursor này. Không đổi dữ liệu.
CREATE INDEX "membership_workspace_active_user_idx" ON "membership" ("workspace_id", "status", "user_id") INCLUDE ("role_key");

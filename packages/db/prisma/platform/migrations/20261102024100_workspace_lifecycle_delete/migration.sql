-- TIP-041 pha 3 (DC-375, DC-376): Owner danger zone — xoá workspace có xác thực bước hai + yêu cầu đóng băng. Expand-only.

-- Workspace đã xoá (tombstone): giữ dòng registry tối thiểu để khôi phục / purge theo manifest; mọi truy cập bị chặn (db_status deleting →
-- deleted khi DROP xong). Thêm giá trị enum ở transaction riêng của migration này — chưa dùng trong cùng file.
ALTER TYPE "workspace_db_status" ADD VALUE IF NOT EXISTS 'deleted';
ALTER TABLE "workspace" ADD COLUMN "deleted_at" TIMESTAMPTZ(6);
-- Tệp của workspace (kho file `<ws>/…`) dọn MỘT lần khi mọi bản sao lưu xoá đã purge và không còn legal hold.
ALTER TABLE "workspace" ADD COLUMN "files_purged_at" TIMESTAMPTZ(6);
-- Trạng thái DB trước lệnh xoá (active | suspended | archived): lỗi TRƯỚC DROP trả về đúng trạng thái này (không đoán).
ALTER TABLE "workspace_lifecycle_job" ADD COLUMN "from_db_status" TEXT;

-- Thử thách xác thực bước hai cho thao tác nguy hiểm của Owner: OTP 6 số (chỉ lưu băm có khoá máy chủ), hạn 5 phút, sai 5 lần khoá; gắn
-- người / workspace / thao tác / băm bản xem trước / status_version lúc xin. Tiêu đúng một lần (consumed_at) cùng commit thao tác.
CREATE TABLE "workspace_step_up" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "operation" TEXT NOT NULL,
  "preview_hash" TEXT NOT NULL,
  "expected_version" INTEGER NOT NULL,
  "code_hash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "consumed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspace_step_up_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workspace_step_up_operation_check" CHECK ("operation" IN ('delete_workspace'))
);
-- Thử thách còn sống của (user, workspace, thao tác) — mới nhất trước; đếm hạn mức xin mã theo khoảng created_at.
CREATE INDEX "workspace_step_up_live_idx" ON "workspace_step_up" ("user_id", "workspace_id", "operation", "created_at" DESC, "id" DESC);

-- Yêu cầu đóng băng của Owner (Owner KHÔNG tự tạm dừng — DC-245): admin nền tảng duyệt → tạm dừng qua luồng TIP-040; từ chối → không đổi.
CREATE TABLE "workspace_freeze_request" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "requested_by" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "version" INTEGER NOT NULL DEFAULT 1,
  "decided_by" UUID,
  "decision_reason" TEXT,
  "decided_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspace_freeze_request_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workspace_freeze_request_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected', 'cancelled')),
  CONSTRAINT "workspace_freeze_request_reason_check" CHECK (char_length("reason") BETWEEN 3 AND 500)
);
-- Một yêu cầu chờ mỗi workspace.
CREATE UNIQUE INDEX "workspace_freeze_request_pending_key" ON "workspace_freeze_request" ("workspace_id") WHERE "status" = 'pending';
-- Danh sách admin: `=` status, sắp created_at, id ổn định (IDs-first).
CREATE INDEX "workspace_freeze_request_status_idx" ON "workspace_freeze_request" ("status", "created_at" DESC, "id" DESC);
-- Owner xem kết quả yêu cầu của workspace mình.
CREATE INDEX "workspace_freeze_request_ws_idx" ON "workspace_freeze_request" ("workspace_id", "created_at" DESC, "id" DESC);

-- Manifest theo workspace còn chưa purge (chuyển retention khi xoá — enumerate MỌI thế hệ, không chỉ archive_key hiện tại).
CREATE INDEX "archive_manifest_ws_live_idx" ON "archive_manifest" ("workspace_id", "id") WHERE "purged_at" IS NULL;

-- TIP-040 pha 1 (DC-368): ngữ cảnh quản trị nền tảng — biên nhận action admin (idempotency không gắn workspace) + trạng thái vận hành
-- workspace có phiên bản (CAS tạm dừng / mở lại).
ALTER TABLE "workspace" ADD COLUMN "status_version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "workspace" ADD COLUMN "suspended_at" TIMESTAMPTZ(6);
ALTER TABLE "workspace" ADD COLUMN "suspend_reason" TEXT;

CREATE TABLE "admin_operation" (
  "id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "action_id" TEXT NOT NULL,
  "input_hash" TEXT NOT NULL,
  "result" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_operation_pkey" PRIMARY KEY ("id")
);
-- Gửi lại cùng khoá của cùng admin: `=` cả hai cột.
CREATE UNIQUE INDEX "admin_operation_actor_user_id_idempotency_key_key" ON "admin_operation" ("actor_user_id", "idempotency_key");

-- Audit nền tảng theo người làm (trang quản trị lọc theo admin): `=` trước, thời gian sau.
CREATE INDEX "platform_audit_log_actor_created_idx" ON "platform_audit_log" ("actor_user_id", "created_at" DESC, "id" DESC) WHERE "actor_user_id" IS NOT NULL;

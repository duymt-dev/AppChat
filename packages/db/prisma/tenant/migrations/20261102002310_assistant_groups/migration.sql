-- TIP-023b SPEC D (DC-247): yêu cầu tạo nhóm Zalo bền — handler ghi + outbox cùng transaction, worker giữ phiên ghi attempted_at trước khi gọi
-- nhà cung cấp; unknown không thử lại mù. Không có workspace_id (DB riêng mỗi workspace).

-- CreateEnum
CREATE TYPE "group_request_status" AS ENUM ('queued', 'running', 'succeeded', 'failed', 'unknown');

-- CreateTable
CREATE TABLE "conversation_group_request" (
    "id" UUID NOT NULL,
    "channel_account_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "participants" JSONB NOT NULL,
    "payload_digest" TEXT NOT NULL,
    "idempotency_key" TEXT,
    "requester_id" UUID,
    "run_id" UUID,
    "status" "group_request_status" NOT NULL DEFAULT 'queued',
    "attempted_at" TIMESTAMPTZ(6),
    "provider_group_id" TEXT,
    "conversation_id" UUID,
    "added" JSONB NOT NULL DEFAULT '[]',
    "failed_members" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_group_request_pkey" PRIMARY KEY ("id")
);

-- Idempotency receipt (một yêu cầu mỗi khoá).
CREATE UNIQUE INDEX "conversation_group_request_idempotency_key_key" ON "conversation_group_request" ("idempotency_key");
-- Danh sách theo tài khoản: bằng trước (tài khoản, trạng thái), sắp xếp sau (thời gian, id); người yêu cầu đọc từ leaf (scope lọc).
CREATE INDEX "conversation_group_request_account_idx" ON "conversation_group_request" ("channel_account_id", "status", "created_at", "id") INCLUDE ("requester_id");
-- Yêu cầu còn mở (quét lại sau mất Redis / mất lease).
CREATE INDEX "conversation_group_request_pending_idx" ON "conversation_group_request" ("created_at") WHERE "status" IN ('queued', 'running');

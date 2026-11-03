-- TIP-023c (D55, DC-227): sổ yêu cầu lượt Trợ lý (idempotent + lease có fence), sổ sự kiện stream (run + seq, replay 24h), biên nhận kết
-- quả ngoài (QR) duy nhất theo run + node + attempt. Tin của phiên: index keyset (created_at, id) cho trình duyệt phiên (REQ-E10a).
-- Không có workspace_id (DB riêng mỗi workspace).

-- CreateEnum
CREATE TYPE "assistant_exec_state" AS ENUM ('queued', 'running', 'waiting_external', 'waiting_approval', 'succeeded', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "assistant_request" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "request_id" TEXT NOT NULL,
    "session_id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "input_hash" TEXT NOT NULL,
    "execution_state" "assistant_exec_state" NOT NULL DEFAULT 'queued',
    "lease_owner" TEXT,
    "lease_until" TIMESTAMPTZ(6),
    "fence" INTEGER NOT NULL DEFAULT 0,
    "checkpoint_version" INTEGER NOT NULL DEFAULT 0,
    "waiting_for" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_request_pkey" PRIMARY KEY ("id")
);

-- Claim idempotent: một yêu cầu mỗi (người, request_id); một sổ mỗi run.
CREATE UNIQUE INDEX "assistant_request_user_id_request_id_key" ON "assistant_request" ("user_id", "request_id");
CREATE UNIQUE INDEX "assistant_request_run_id_key" ON "assistant_request" ("run_id");
-- Quét thu hồi lease hết hạn: bằng trước (trạng thái), khoảng sau (lease_until, id); chỉ dòng chưa kết thúc; run_id / fence đọc từ leaf.
CREATE INDEX "assistant_request_recovery_idx" ON "assistant_request" ("execution_state", "lease_until", "id") INCLUDE ("run_id", "fence")
    WHERE "execution_state" IN ('queued', 'running', 'waiting_external');

-- CreateTable
CREATE TABLE "assistant_event" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "assistant_event_pkey" PRIMARY KEY ("id")
);

-- Replay theo cursor: (run_id, seq) unique; trang id đọc từ leaf (event_type, created_at) rồi deferred join lấy payload.
CREATE UNIQUE INDEX "assistant_event_run_id_seq_key" ON "assistant_event" ("run_id", "seq") INCLUDE ("event_type", "created_at");
-- Dọn theo hạn (job prune theo lô).
CREATE INDEX "assistant_event_expires_at_idx" ON "assistant_event" ("expires_at", "id");

-- CreateTable
CREATE TABLE "assistant_receipt" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "node" TEXT NOT NULL,
    "attempt" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_receipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assistant_receipt_run_id_node_attempt_key" ON "assistant_receipt" ("run_id", "node", "attempt");

-- Trình duyệt phiên (REQ-E10a): keyset (last_message_at, id) dùng `assistant_session_user_recent_idx` của 023 (user_id, last_message_at DESC)
-- INCLUDE (title, mode) WHERE archived_at IS NULL — tie-break id chỉ sắp lại các dòng trùng thời điểm (incremental sort), không thêm index.
-- Tin của phiên: keyset (created_at, id) — tie-break id cho trang ổn định. Giữ index (session_id, created_at) của 023 (test / EXPLAIN
-- TIP-023 tham chiếu tên); planner chọn index keyset khi ORDER BY có id.
CREATE INDEX "assistant_message_session_keyset_idx" ON "assistant_message" ("session_id", "created_at", "id");

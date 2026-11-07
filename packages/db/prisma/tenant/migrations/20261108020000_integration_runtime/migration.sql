-- TIP-012b P3 (DC-384): biên nhận lệnh gọi ra ngoài bền + bằng chứng kết nối + trạng thái kéo bank feed.
-- Giá trị enum mới KHÔNG được dùng trong cùng transaction (Postgres) → index hàng chờ lọc theo `next_attempt_at`, không theo status mới.
ALTER TYPE "integration_call_status" ADD VALUE IF NOT EXISTS 'queued';
ALTER TYPE "integration_call_status" ADD VALUE IF NOT EXISTS 'unknown';
ALTER TYPE "integration_call_status" ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE "integration_connection"
  ADD COLUMN "credential_rev" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "last_probe_at" TIMESTAMPTZ(6),
  ADD COLUMN "last_probe_status" TEXT,
  ADD COLUMN "last_probe_reason" TEXT,
  ADD COLUMN "probed_rev" INTEGER,
  ADD COLUMN "last_event_at" TIMESTAMPTZ(6),
  ADD CONSTRAINT "integration_connection_probe_status_check" CHECK ("last_probe_status" IS NULL OR "last_probe_status" IN ('verified', 'failed', 'unsupported'));

ALTER TABLE "integration_call_log"
  ADD COLUMN "config_rev" INTEGER,
  ADD COLUMN "generation" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lease_until" TIMESTAMPTZ(6),
  ADD COLUMN "next_attempt_at" TIMESTAMPTZ(6),
  ADD COLUMN "safety" TEXT NOT NULL DEFAULT 'read',
  ADD COLUMN "outcome" JSONB,
  ADD COLUMN "requested_by" TEXT,
  ADD COLUMN "finished_at" TIMESTAMPTZ(6),
  ADD CONSTRAINT "integration_call_log_safety_check" CHECK ("safety" IN ('read', 'mutation'));

-- Log theo kết nối (GET /connections/:id/logs — cursor (created_at, id) DESC): cột '=' trước, sort sau; INCLUDE cột hiển thị (không
-- payload / outcome JSON) → index-only cho bước chọn id, rồi join lại theo PK.
DROP INDEX IF EXISTS "integration_call_log_connection_id_created_at_idx";
CREATE INDEX "integration_call_log_conn_time_idx" ON "integration_call_log" ("connection_id", "created_at" DESC, "id" DESC) INCLUDE ("status", "op", "latency_ms");
-- Hàng chờ chưa xong (quét khôi phục): partial chỉ dòng còn lịch thử (`next_attempt_at` đặt null khi kết thúc).
CREATE INDEX "integration_call_log_pending_idx" ON "integration_call_log" ("next_attempt_at", "id") INCLUDE ("connection_id", "op") WHERE "next_attempt_at" IS NOT NULL;

CREATE TABLE "bank_pull_state" (
    "connection_id" UUID NOT NULL,
    "feed_id" UUID NOT NULL,
    "cursor" JSONB,
    "checkpoint_at" TIMESTAMPTZ(6) NOT NULL,
    "credential_rev" INTEGER NOT NULL,
    "next_pull_at" TIMESTAMPTZ(6) NOT NULL,
    "last_pulled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bank_pull_state_pkey" PRIMARY KEY ("connection_id"),
    CONSTRAINT "bank_pull_state_feed_fk" FOREIGN KEY ("feed_id") REFERENCES "tenant_bank_feed"("id") ON DELETE RESTRICT,
    CONSTRAINT "bank_pull_state_cursor_size_check" CHECK ("cursor" IS NULL OR octet_length("cursor"::text) <= 2048)
);
-- Lịch kéo đến hạn (scheduler mỗi 60 giây): range trên next_pull_at.
CREATE INDEX "bank_pull_state_due_idx" ON "bank_pull_state" ("next_pull_at") INCLUDE ("connection_id");

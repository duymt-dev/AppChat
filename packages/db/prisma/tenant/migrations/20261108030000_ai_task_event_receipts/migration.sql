-- TIP-012b P4 (DC-385): biên nhận phát sự kiện → tác vụ AI — một (tác vụ, sự kiện nguồn) một dòng, tạo cùng transaction với run.
CREATE TYPE "ai_task_event_outcome" AS ENUM ('queued', 'skipped_busy', 'skipped_disabled');

CREATE TABLE "ai_task_event_receipt" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "source_event_id" UUID NOT NULL,
    "topic" TEXT NOT NULL,
    "outcome" "ai_task_event_outcome" NOT NULL,
    "run_id" UUID,
    "dispatched_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_task_event_receipt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_task_event_receipt_task_fk" FOREIGN KEY ("task_id") REFERENCES "ai_task"("id") ON DELETE RESTRICT,
    CONSTRAINT "ai_task_event_receipt_run_check" CHECK (("outcome" = 'queued') = ("run_id" IS NOT NULL))
);
-- Khoá chống trùng (cột '=' cả hai).
CREATE UNIQUE INDEX "ai_task_event_receipt_task_id_source_event_id_key" ON "ai_task_event_receipt" ("task_id", "source_event_id");
-- Hàng chờ đẩy lại (quét khôi phục): partial chỉ run đã tạo mà job chưa xác nhận đẩy.
CREATE INDEX "ai_task_event_receipt_undispatched_idx" ON "ai_task_event_receipt" ("created_at", "id") INCLUDE ("task_id", "run_id") WHERE "outcome" = 'queued' AND "dispatched_at" IS NULL;
-- Tác vụ theo sự kiện đang bật theo topic, phân trang theo id (cursor — không cắt 100 im lặng).
CREATE INDEX IF NOT EXISTS "ai_task_event_active_idx" ON "ai_task" ("event_type", "id") WHERE "trigger" = 'event' AND "status" = 'active' AND "deleted_at" IS NULL;

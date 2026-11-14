-- TIP-045b annex D: việc dữ liệu nặng chạy nền (xuất > 5.000 dòng, sửa hàng loạt > 50 bản ghi) — tập id chốt lúc nhận, biên nhận từng
-- bản ghi, lease / fence, tiến độ bền, tệp kết quả hết hạn 24 giờ.
CREATE TABLE "data_job" (
  "id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "action_id" TEXT NOT NULL,
  "actor_id" UUID,
  "action_log_id" UUID,
  "input_hash" TEXT NOT NULL,
  "input" JSONB NOT NULL DEFAULT '{}',
  "field_policy" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'queued',
  "total" INTEGER NOT NULL DEFAULT 0,
  "done" INTEGER NOT NULL DEFAULT 0,
  "failed" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "lease_owner" TEXT,
  "lease_until" TIMESTAMPTZ(6),
  "fence" INTEGER NOT NULL DEFAULT 0,
  "file_key" TEXT,
  "file_name" TEXT,
  "expires_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMPTZ(6),
  CONSTRAINT "data_job_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "data_job_status_check" CHECK ("status" IN ('queued', 'running', 'cancelling', 'cancelled', 'completed', 'failed'))
);
CREATE INDEX "data_job_actor_id_created_at_idx" ON "data_job" ("actor_id", "created_at" DESC);
-- Quét việc còn dang dở (khôi phục sau restart) — chỉ việc chưa xong.
CREATE INDEX "data_job_open_idx" ON "data_job" ("updated_at") WHERE "status" IN ('queued', 'running', 'cancelling');
-- Dọn tệp hết hạn.
CREATE INDEX "data_job_expiry_idx" ON "data_job" ("expires_at") WHERE "file_key" IS NOT NULL;

CREATE TABLE "data_job_item" (
  "job_id" UUID NOT NULL,
  "seq" INTEGER NOT NULL,
  "target_id" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "error" TEXT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "data_job_item_pkey" PRIMARY KEY ("job_id", "seq"),
  CONSTRAINT "data_job_item_status_check" CHECK ("status" IN ('pending', 'done', 'failed', 'skipped')),
  CONSTRAINT "data_job_item_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "data_job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Lô kế tiếp còn pending theo thứ tự (keyset) — partial.
CREATE INDEX "data_job_item_pending_idx" ON "data_job_item" ("job_id", "seq") WHERE "status" = 'pending';

-- TIP-038b P1 (DC-374): nhập / xuất dữ liệu dùng chung (AI là luồng chính, thủ công cùng backend).
-- · transfer_plan: kế hoạch nhập của người tạo (tệp + checksum + thực thể + ánh xạ có phiên bản + số đếm + trạng thái, hết hạn).
-- · transfer_row: nhóm dòng nguồn đã chuẩn hoá + kết quả kiểm + biên nhận ghi; (plan_id, row_key) unique — chạy lại không ghi hai lần.
CREATE TABLE "transfer_plan" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "entity" TEXT NOT NULL,
    "file_id" UUID NOT NULL,
    "file_sha256" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "sheet" TEXT,
    "mapping" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "row_policy" TEXT NOT NULL DEFAULT 'all_valid',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "total" INTEGER NOT NULL DEFAULT 0,
    "valid" INTEGER NOT NULL DEFAULT 0,
    "invalid" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "applied" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "job_id" UUID,
    "ai_run_id" UUID,
    "error" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    CONSTRAINT "transfer_plan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "transfer_plan_entity_chk" CHECK ("entity" IN ('contact', 'product', 'quote', 'order', 'contract', 'invoice')),
    CONSTRAINT "transfer_plan_status_chk" CHECK ("status" IN ('draft', 'committing', 'completed', 'cancelled', 'failed', 'expired')),
    CONSTRAINT "transfer_plan_policy_chk" CHECK ("row_policy" IN ('all_valid', 'only_valid')),
    CONSTRAINT "transfer_plan_counts_chk" CHECK ("version" >= 1 AND "total" >= 0 AND "valid" >= 0 AND "invalid" >= 0 AND "duplicates" >= 0 AND "applied" >= 0 AND "skipped" >= 0 AND "failed" >= 0)
);
-- Kế hoạch của người tạo (indexing §1: = trước, sort sau; INCLUDE nhỏ cho danh sách).
CREATE INDEX "transfer_plan_actor_idx" ON "transfer_plan" ("actor_user_id", "status", "created_at" DESC, "id") INCLUDE ("entity", "total");
-- Dọn kế hoạch nháp hết hạn (partial — chỉ nháp).
CREATE INDEX "transfer_plan_expiry_idx" ON "transfer_plan" ("expires_at", "id") WHERE "status" = 'draft';

CREATE TABLE "transfer_row" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "row_key" TEXT NOT NULL,
    "row_no" INTEGER NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "check" TEXT NOT NULL,
    "errors" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result_id" UUID,
    "result_code" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transfer_row_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "transfer_row_check_chk" CHECK ("check" IN ('valid', 'invalid', 'duplicate', 'owned')),
    CONSTRAINT "transfer_row_status_chk" CHECK ("status" IN ('pending', 'applied', 'skipped', 'failed')),
    CONSTRAINT "transfer_row_plan_fkey" FOREIGN KEY ("plan_id") REFERENCES "transfer_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "transfer_row_plan_id_row_key_key" ON "transfer_row" ("plan_id", "row_key");
-- Xem trước / tệp lỗi theo thứ tự dòng nguồn (= trước, sort sau).
CREATE INDEX "transfer_row_plan_row_idx" ON "transfer_row" ("plan_id", "check", "row_no");
-- Dòng còn phải ghi của một kế hoạch (partial — việc nền đọc theo lô).
CREATE INDEX "transfer_row_pending_idx" ON "transfer_row" ("plan_id", "row_no") WHERE "status" = 'pending';

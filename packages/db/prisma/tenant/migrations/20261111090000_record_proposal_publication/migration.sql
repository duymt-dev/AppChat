-- TIP-023g §3.6 / §5.1: binding công bố đề xuất theo bản ghi (validated_record). Một dòng mỗi lượt đề xuất (user_id + request_id) gắn
-- run 019b — chữ thô của model riêng tới khi kiểm theo quyền / nguồn hiện hành. Không phải sổ tính tiền: run / biên nhận ở ai_run / ai_usage_receipt.

CREATE TYPE "record_proposal_phase" AS ENUM ('awaiting_generation', 'validating', 'validated', 'invalidated', 'failed');

CREATE TABLE "record_proposal" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "request_id" TEXT NOT NULL,
    "run_id" UUID NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "intent" TEXT NOT NULL,
    "source_version" INTEGER,
    "schema_version" INTEGER NOT NULL,
    "input_digest" TEXT NOT NULL,
    "phase" "record_proposal_phase" NOT NULL DEFAULT 'awaiting_generation',
    "validation_generation" INTEGER NOT NULL DEFAULT 0,
    "lease_until" TIMESTAMPTZ(6) NOT NULL,
    "private_generation" TEXT,
    "published_result" JSONB,
    "safe_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "record_proposal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "record_proposal_run_key" ON "record_proposal" ("run_id");
-- Khoá lượt: bằng trên (user_id, request_id) — seek thẳng, so input_digest ở dòng tìm được.
CREATE UNIQUE INDEX "record_proposal_request_key" ON "record_proposal" ("user_id", "request_id");
-- Khôi phục sau crash: chỉ dòng chưa kết thúc, cũ trước, trang id ≤ 100 rồi mới đọc payload riêng — INCLUDE không cột chữ / JSON rộng.
CREATE INDEX "record_proposal_recovery_idx" ON "record_proposal" ("phase", "updated_at", "id") INCLUDE ("validation_generation", "run_id") WHERE "phase" IN ('awaiting_generation', 'validating');

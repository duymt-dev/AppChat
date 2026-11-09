-- TIP-019c §3.5: fence công bố cho kỹ năng tiện ích AI. Một dòng mỗi lần gọi (UI độc lập qua Idempotency-Key, hoặc run con 019b khi gọi
-- qua tool) — khoá (actor_scope, action_id, invocation_key) chặn gọi model lần hai cho cùng lần gọi. Chữ thô của model riêng (không công
-- khai) tới khi kiểm xong (phase validated) mới có validated_result. Không cột PII rộng trong INCLUDE của index khôi phục.

CREATE TYPE "utility_operation_phase" AS ENUM ('generating', 'validating', 'validated', 'invalidated', 'failed', 'unknown', 'cancelled');

CREATE TABLE "utility_operation" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "action_id" TEXT NOT NULL,
    "actor_scope" TEXT NOT NULL,
    "invocation_key" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL,
    "input_hash" TEXT NOT NULL,
    "source_bindings" JSONB NOT NULL,
    "run_epoch" INTEGER NOT NULL,
    "phase" "utility_operation_phase" NOT NULL DEFAULT 'generating',
    "generated_payload" TEXT,
    "validated_result" JSONB,
    "failure_reason" TEXT,
    "repaired" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "utility_operation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "utility_operation_run_key" ON "utility_operation" ("run_id");
CREATE UNIQUE INDEX "utility_operation_invocation_key" ON "utility_operation" ("actor_scope", "action_id", "invocation_key");
-- Khôi phục sau crash: lượt đang sinh / đang kiểm, cũ trước — không PII rộng trong INCLUDE (chỉ run_id + action_id).
CREATE INDEX "utility_operation_recovery_idx" ON "utility_operation" ("phase", "updated_at", "id") INCLUDE ("run_id", "action_id") WHERE "phase" IN ('generating', 'validating');

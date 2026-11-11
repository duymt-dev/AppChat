-- TIP-021b §3.6: binding kiểm / công bố bản soạn cấu hình agent. Một dòng mỗi lần soạn (actor_id + request_key_hash) — chặn gọi model
-- lần hai; chữ thô của model riêng tới khi kiểm theo quyền hiện hành. Không phải sổ tính tiền: run / biên nhận vẫn ở ai_run / ai_usage_receipt.

CREATE TYPE "agent_draft_phase" AS ENUM ('awaiting_generation', 'awaiting_validation', 'published', 'rejected', 'invalidated');

CREATE TABLE "agent_draft_publication" (
    "id" UUID NOT NULL,
    "run_id" UUID,
    "actor_id" TEXT NOT NULL,
    "request_key_hash" TEXT NOT NULL,
    "input_digest" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL,
    "candidate_fingerprint" TEXT NOT NULL,
    "candidates" JSONB NOT NULL,
    "discovery" JSONB NOT NULL,
    "source_epoch" INTEGER NOT NULL DEFAULT 0,
    "phase" "agent_draft_phase" NOT NULL DEFAULT 'awaiting_generation',
    "validation_generation" INTEGER NOT NULL DEFAULT 0,
    "lease_until" TIMESTAMPTZ(6) NOT NULL,
    "protected_result" TEXT,
    "published_result" JSONB,
    "safe_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_draft_publication_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "agent_draft_publication_run_key" ON "agent_draft_publication" ("run_id");
-- Khoá lần soạn: bằng trên (actor_id, request_key_hash) — seek thẳng, so input_digest ở dòng tìm được.
CREATE UNIQUE INDEX "agent_draft_publication_request_key" ON "agent_draft_publication" ("actor_id", "request_key_hash");
-- Khôi phục sau crash (§4.4): lượt chưa kết thúc, cũ trước, trang id ≤ 100 rồi mới đọc payload riêng — INCLUDE không cột chữ / JSON rộng.
CREATE INDEX "agent_draft_publication_recovery_idx" ON "agent_draft_publication" ("phase", "updated_at", "id") INCLUDE ("run_id", "validation_generation") WHERE "phase" IN ('awaiting_generation', 'awaiting_validation');

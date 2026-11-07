-- TIP-019b P1 (DC-251, DC-379): ngân sách gốc của cây run + biên nhận từng lần gọi model + nhóm tính tiền + lượt quyết toán.
-- Ngân sách là rào mềm: một lời gọi thật mỗi gốc tại một thời điểm; usage thật ghi đủ rồi mới chặn lời gọi / tool kế tiếp.

-- Lineage + lý do dừng trên run. credits_used = credit của CHÍNH run; subtree_credits = run + mọi run con (rào ngân sách con).
ALTER TABLE "ai_run" ADD COLUMN "subtree_credits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ai_run" ADD COLUMN "stop_reason" TEXT;
-- Dữ liệu cũ: credits_used của gốc đã cộng phần con (delegate cũ) → coi như subtree; không trừ lại, không tính lại tiền cũ.
UPDATE "ai_run" SET "subtree_credits" = "credits_used" WHERE "credits_used" > 0;

-- Ngân sách gốc (một dòng / cây). active_attempt_id = lời gọi đang bay (nhiều nhất một); quarantined = có lời gọi không rõ kết quả →
-- không mở lời gọi mới cho gốc này cho tới khi có bằng chứng usage. cancel_gen tăng khi huỷ cây.
CREATE TABLE "ai_root_budget" (
    "root_run_id" UUID NOT NULL,
    "max_credits" INTEGER NOT NULL,
    "charged" INTEGER NOT NULL DEFAULT 0,
    "observed" INTEGER NOT NULL DEFAULT 0,
    "unbilled" INTEGER NOT NULL DEFAULT 0,
    "active_attempt_id" UUID,
    "active_since" TIMESTAMPTZ(6),
    "quarantined" BOOLEAN NOT NULL DEFAULT false,
    "cancel_gen" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_root_budget_pkey" PRIMARY KEY ("root_run_id"),
    CONSTRAINT "ai_root_budget_root_fk" FOREIGN KEY ("root_run_id") REFERENCES "ai_run"("id") ON DELETE CASCADE,
    CONSTRAINT "ai_root_budget_counts_check" CHECK ("charged" >= 0 AND "observed" >= 0 AND "unbilled" >= 0 AND "max_credits" >= 0)
);

-- Nhóm tính tiền logic (bước chat; sau này: lượt embedding truy vấn / bản nạp nguồn): cộng chi phí thô đúng (numeric) của các lần
-- gọi đã biết, làm tròn lên MỘT lần theo tổng luỹ kế — lượt quyết toán chỉ trừ phần chênh ceil(tổng) − đã trừ.
CREATE TABLE "ai_usage_group" (
    "id" TEXT NOT NULL,
    "run_id" UUID NOT NULL,
    "root_run_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "logical_step" INTEGER NOT NULL,
    "raw_cost" NUMERIC(20, 8) NOT NULL DEFAULT 0,
    "charged" INTEGER NOT NULL DEFAULT 0,
    "next_ordinal" INTEGER NOT NULL DEFAULT 0,
    "denied" BOOLEAN NOT NULL DEFAULT false,
    "step_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_usage_group_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_usage_group_run_fk" FOREIGN KEY ("run_id") REFERENCES "ai_run"("id") ON DELETE CASCADE,
    CONSTRAINT "ai_usage_group_kind_check" CHECK ("kind" IN ('chat', 'query_embed', 'ingest'))
);
CREATE UNIQUE INDEX "ai_usage_group_run_step_key" ON "ai_usage_group" ("run_id", "kind", "logical_step");

-- Biên nhận một lần gọi thật (ghi TRƯỚC khi gửi). status: dispatched → rejected (nhà cung cấp từ chối rõ ràng, 0 usage) | unknown
-- (không rõ đã chạy chưa — không gửi lại mù) | usage_known → settled | denied (ví không đủ).
CREATE TABLE "ai_usage_receipt" (
    "id" UUID NOT NULL,
    "group_id" TEXT NOT NULL,
    "run_id" UUID NOT NULL,
    "root_run_id" UUID NOT NULL,
    "logical_step" INTEGER NOT NULL,
    "candidate" INTEGER NOT NULL,
    "batch" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'dispatched',
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "price_in" NUMERIC(12, 4) NOT NULL,
    "price_out" NUMERIC(12, 4) NOT NULL,
    "tokens_in" INTEGER NOT NULL DEFAULT 0,
    "tokens_out" INTEGER NOT NULL DEFAULT 0,
    "raw_cost" NUMERIC(20, 8),
    "latency_ms" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'ai',
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_usage_receipt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_usage_receipt_group_fk" FOREIGN KEY ("group_id") REFERENCES "ai_usage_group"("id") ON DELETE CASCADE,
    CONSTRAINT "ai_usage_receipt_status_check" CHECK ("status" IN ('dispatched', 'rejected', 'unknown', 'usage_known', 'settled', 'denied'))
);
CREATE UNIQUE INDEX "ai_usage_receipt_attempt_key" ON "ai_usage_receipt" ("run_id", "logical_step", "candidate", "batch");
-- Khôi phục: chỉ biên nhận chưa xong (partial), theo thời gian; INCLUDE gốc để cách ly theo cây không cần về heap.
CREATE INDEX "ai_usage_receipt_unresolved_idx" ON "ai_usage_receipt" ("status", "updated_at", "id") INCLUDE ("root_run_id")
    WHERE "status" IN ('dispatched', 'usage_known', 'unknown');

-- Lượt quyết toán: (nhóm, thứ tự) duy nhất, số trừ bất biến + khoá sổ ví. intent → settled | denied. Lặp lại không cộng thêm.
CREATE TABLE "ai_usage_settlement" (
    "group_id" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "receipt_id" UUID NOT NULL,
    "delta" INTEGER NOT NULL,
    "ledger_ref" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'intent',
    "applied" INTEGER,
    "ledger_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMPTZ(6),
    CONSTRAINT "ai_usage_settlement_pkey" PRIMARY KEY ("group_id", "ordinal"),
    CONSTRAINT "ai_usage_settlement_group_fk" FOREIGN KEY ("group_id") REFERENCES "ai_usage_group"("id") ON DELETE CASCADE,
    CONSTRAINT "ai_usage_settlement_status_check" CHECK ("status" IN ('intent', 'settled', 'denied')),
    CONSTRAINT "ai_usage_settlement_delta_check" CHECK ("delta" >= 0)
);
CREATE UNIQUE INDEX "ai_usage_settlement_ledger_ref_key" ON "ai_usage_settlement" ("ledger_ref");
CREATE INDEX "ai_usage_settlement_intent_idx" ON "ai_usage_settlement" ("created_at") WHERE "status" = 'intent';

-- Bước của run theo thứ tự (chi tiết run — P3) phủ cột hiển thị; con theo cha.
CREATE INDEX "ai_run_step_run_idx_cover" ON "ai_run_step" ("run_id", "idx") INCLUDE ("id", "type", "status", "credits", "created_at");
CREATE INDEX "ai_run_parent_started_idx" ON "ai_run" ("parent_run_id", "started_at", "id") INCLUDE ("status", "kind") WHERE "parent_run_id" IS NOT NULL;

-- Ánh xạ bước LLM cũ đã tính tiền (ref sổ ví `<run>:<llm_step>`) → nhóm đã quyết toán; không tính lại, không bù usage cũ thiếu.
INSERT INTO "ai_usage_group" ("id", "run_id", "root_run_id", "kind", "logical_step", "charged", "next_ordinal", "step_id")
SELECT s.run_id::text || ':chat:' || (s.meta ->> 'llm_step'), s.run_id, r.root_run_id, 'chat', (s.meta ->> 'llm_step')::int, s.credits, 1, s.id
FROM "ai_run_step" s JOIN "ai_run" r ON r.id = s.run_id
WHERE s.type = 'llm' AND s.meta ? 'llm_step' AND (s.meta ->> 'llm_step') ~ '^[0-9]+$'
ON CONFLICT DO NOTHING;

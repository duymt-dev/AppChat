-- TIP-020e §1.2 (DC-288): hai khe vector đối xứng cho kho tri thức — đổi model embedding không trộn không gian, không xoá / chèn lại
-- đoạn (chunk id giữ nguyên → trích dẫn 020d còn mở được). Khe A = cột `embedding` cũ; khe B = `embedding_b`. Mỗi khe ghi space key
-- (`provider:model:1536:<thế hệ cấu hình route>`) + generation đã ghi nó. Chỉ EXPAND (thêm cột / bảng / index), không đổi cột cũ.
ALTER TABLE "kb_chunk"
  ADD COLUMN "embedding_b" vector(1536),
  ADD COLUMN "embed_space_a" TEXT,
  ADD COLUMN "embed_space_b" TEXT,
  ADD COLUMN "embed_generation_a" UUID,
  ADD COLUMN "embed_generation_b" UUID;

ALTER TABLE "kb_setting"
  ADD COLUMN "active_slot" CHAR(1) NOT NULL DEFAULT 'a',
  ADD COLUMN "active_generation_id" UUID,
  ADD COLUMN "index_state" TEXT NOT NULL DEFAULT 'current',
  ADD COLUMN "active_space" TEXT,
  ADD COLUMN "stale_since" TIMESTAMPTZ(6),
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "kb_setting" ADD CONSTRAINT "kb_setting_active_slot_check" CHECK ("active_slot" IN ('a', 'b'));
ALTER TABLE "kb_setting" ADD CONSTRAINT "kb_setting_index_state_check" CHECK ("index_state" IN ('current', 'stale'));

-- Một lần tái tạo chỉ mục (generation): lease + CAS `version`, cursor theo id đoạn, catch-up có trần vòng, publish đổi khe.
CREATE TABLE "kb_embed_generation" (
    "id" UUID NOT NULL,
    "slot" CHAR(1) NOT NULL,
    "space_key" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "expected" INTEGER NOT NULL DEFAULT 0,
    "done" INTEGER NOT NULL DEFAULT 0,
    "tokens" BIGINT NOT NULL DEFAULT 0,
    "cursor_chunk_id" UUID,
    "batch_step" INTEGER NOT NULL DEFAULT 0,
    "catchup_round" INTEGER NOT NULL DEFAULT 0,
    "lease_token" UUID,
    "lease_until" TIMESTAMPTZ(6),
    "operation_id" UUID,
    "reason" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "kb_embed_generation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "kb_embed_generation_slot_check" CHECK ("slot" IN ('a', 'b')),
    CONSTRAINT "kb_embed_generation_phase_check" CHECK ("phase" IN ('building', 'catching_up', 'active', 'failed', 'cancelled', 'superseded')),
    CONSTRAINT "kb_embed_generation_counts_check" CHECK ("expected" >= 0 AND "done" >= 0 AND "tokens" >= 0 AND "catchup_round" >= 0)
);
-- Một generation dở mỗi workspace (DB riêng mỗi workspace → hằng TRUE làm khoá).
CREATE UNIQUE INDEX "kb_embed_generation_open_key" ON "kb_embed_generation" ((true)) WHERE "phase" IN ('building', 'catching_up');
-- Lịch sử gần nhất cho trang trạng thái (ORDER BY created_at DESC LIMIT 1).
CREATE INDEX "kb_embed_generation_created_idx" ON "kb_embed_generation" ("created_at" DESC) INCLUDE ("phase");

-- Khe B: HNSW cosine riêng (truy vấn khe hoạt động dùng đúng index của khe đó).
CREATE INDEX "kb_chunk_embedding_b_hnsw_idx" ON "kb_chunk" USING hnsw ("embedding_b" vector_cosine_ops);
-- Đếm / catch-up theo generation của khe đích: bằng trước (generation), khoảng sau (id) — seek theo generation, duyệt id tăng dần.
CREATE INDEX "kb_chunk_embed_generation_a_idx" ON "kb_chunk" ("embed_generation_a", "id");
CREATE INDEX "kb_chunk_embed_generation_b_idx" ON "kb_chunk" ("embed_generation_b", "id");

-- Generation khởi tạo cho kho hiện có: khe A đang phục vụ với space key = embed_model + ':1536:' (thế hệ route chưa ghi trước 020e →
-- phần thế hệ để trống; lần đổi route đầu tiên sau 020e đánh dấu stale như mọi lần đổi khác). Kho rỗng / chưa có setting vẫn có dòng.
INSERT INTO "kb_setting" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;
DO $$
DECLARE g UUID := gen_random_uuid();
DECLARE sp TEXT;
BEGIN
  SELECT embed_model || ':1536:' INTO sp FROM kb_chunk WHERE embedding IS NOT NULL AND embed_model <> 'none' GROUP BY embed_model ORDER BY count(*) DESC LIMIT 1;
  INSERT INTO "kb_embed_generation" ("id", "slot", "space_key", "phase", "expected", "done", "reason")
    VALUES (g, 'a', coalesce(sp, ''), 'active', 0, 0, 'initial');
  UPDATE "kb_chunk" SET "embed_space_a" = "embed_model" || ':1536:', "embed_generation_a" = g WHERE "embedding" IS NOT NULL AND "embed_model" <> 'none';
  UPDATE "kb_setting" SET "active_generation_id" = g, "active_space" = sp WHERE "id" = 1;
END $$;

-- TIP-015b — trí nhớ khách (contact_memory) có người ghi: provenance (run / step / actor), updated_at, fact chuẩn hoá cho so trùng văn bản
-- (pg_trgm similarity, chỉ trên ≤ 50 dòng của một khách — dùng index theo khách, không cần GIN), trần 50 fact / khách áp ở handler dưới
-- khoá dòng contact. Bản sửa của khách (contact_revision) tăng trong cùng transaction với thay đổi — event chỉ là gợi ý làm mới cache.
-- Biên nhận gộp khách (contact_memory_merge) giữ ảnh chụp hai phía để hoàn tác 7 ngày; quét xoá theo (expires_at, id).
-- Cache tóm tắt / gợi ý theo phạm vi người xem (contact_summary_cache); ai_summary dùng chung cũ bị vô hiệu (không chép sang cache mới).

-- contact_memory: dòng cũ (không có người ghi thật trước TIP này) — updated_at = created_at, nguồn không biết để null.
ALTER TABLE "contact_memory" ADD COLUMN "updated_at" TIMESTAMPTZ(6);
UPDATE "contact_memory" SET "updated_at" = "created_at";
ALTER TABLE "contact_memory" ALTER COLUMN "updated_at" SET NOT NULL, ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
UPDATE "contact_memory" SET "fact" = left(btrim(regexp_replace("fact", '\s+', ' ', 'g')), 1000), "confidence" = least(greatest("confidence", 0), 1);
DELETE FROM "contact_memory" WHERE "fact" = '';
ALTER TABLE "contact_memory" ADD COLUMN "fact_norm" TEXT;
UPDATE "contact_memory" SET "fact_norm" = lower(btrim(regexp_replace(unaccent("fact"), '[[:space:][:punct:]]+', ' ', 'g')));
ALTER TABLE "contact_memory" ALTER COLUMN "fact_norm" SET NOT NULL;
ALTER TABLE "contact_memory" ADD COLUMN "source_step_id" UUID, ADD COLUMN "actor_type" TEXT, ADD COLUMN "actor_id" TEXT;
ALTER TABLE "contact_memory" ADD CONSTRAINT "contact_memory_confidence_chk" CHECK ("confidence" >= 0 AND "confidence" <= 1);
ALTER TABLE "contact_memory" ADD CONSTRAINT "contact_memory_fact_chk" CHECK (char_length("fact") BETWEEN 1 AND 1000);
ALTER TABLE "contact_memory" ADD CONSTRAINT "contact_memory_actor_chk" CHECK ("actor_type" IS NULL OR "actor_type" IN ('user', 'agent', 'assistant', 'system'));
-- Đọc ngữ cảnh / panel: = contact_id rồi sort updated_at, id; INCLUDE cho bước chọn id (deferred) không về heap.
DROP INDEX IF EXISTS "contact_memory_contact_id_created_at_idx";
CREATE INDEX "contact_memory_contact_recent_idx" ON "contact_memory" ("contact_id", "updated_at" DESC, "id" DESC) INCLUDE ("confidence", "source_run_id");

-- Bản sửa của khách: memory_rev (fact đổi), data_rev (mọi dữ liệu tóm tắt đọc — fact / timeline / chứng từ).
CREATE TABLE "contact_revision" (
    "contact_id" UUID NOT NULL,
    "memory_rev" BIGINT NOT NULL DEFAULT 0,
    "data_rev" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contact_revision_pkey" PRIMARY KEY ("contact_id")
);
ALTER TABLE "contact_revision" ADD CONSTRAINT "contact_revision_contact_fk" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE CASCADE;

-- Biên nhận gộp: ảnh chụp đầy đủ fact hai phía trước gộp (không đọc vào model), memory_rev của bản chính sau gộp để phát hiện sửa sau đó.
CREATE TABLE "contact_memory_merge" (
    "id" UUID NOT NULL,
    "primary_id" UUID NOT NULL,
    "dup_id" UUID NOT NULL,
    "primary_rows" JSONB NOT NULL,
    "dup_rows" JSONB NOT NULL,
    "after_rev" BIGINT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contact_memory_merge_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "contact_memory_merge" ADD CONSTRAINT "contact_memory_merge_primary_fk" FOREIGN KEY ("primary_id") REFERENCES "contact"("id") ON DELETE CASCADE;
CREATE INDEX "contact_memory_merge_expiry_idx" ON "contact_memory_merge" ("expires_at", "id");

-- Cache tóm tắt 360° / gợi ý bước tiếp theo theo phạm vi người xem + bản sửa dữ liệu + phiên bản prompt + ngôn ngữ.
CREATE TABLE "contact_summary_cache" (
    "contact_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "scope_key" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "data_rev" BIGINT NOT NULL,
    "body" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "run_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "contact_summary_cache_pkey" PRIMARY KEY ("contact_id", "kind", "scope_key", "locale"),
    CONSTRAINT "contact_summary_cache_kind_chk" CHECK ("kind" IN ('summary', 'next_action')),
    CONSTRAINT "contact_summary_cache_source_chk" CHECK ("source" IN ('model', 'rule'))
);
ALTER TABLE "contact_summary_cache" ADD CONSTRAINT "contact_summary_cache_contact_fk" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE CASCADE;
CREATE INDEX "contact_summary_cache_expiry_idx" ON "contact_summary_cache" ("expires_at");

-- Tóm tắt dùng chung cũ có thể chứa công nợ do Owner tạo — vô hiệu, không chép sang cache theo phạm vi.
UPDATE "contact" SET "ai_summary" = NULL, "ai_summary_at" = NULL WHERE "ai_summary" IS NOT NULL;

-- TIP-025b §F / §H: cache bản dịch theo người gọi (khoá gồm epoch quyền + băm nội dung + đích + phiên bản prompt), TTL 24 giờ.
-- Không lưu nguyên văn nguồn — chỉ băm. Tra: WHERE actor_id = $1 AND conversation_id = $2 AND source_hash = $3 AND target = $4
-- AND prompt_version = $5 AND authz_epoch = $6 (unique). Dọn: WHERE expires_at < now() theo lô id (index expires_at).
CREATE TABLE "translation_cache" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "source_hash" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "authz_epoch" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "text" TEXT,
    "run_id" UUID,
    "claimed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "translation_cache_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "translation_cache_status_check" CHECK ("status" IN ('pending', 'done'))
);

CREATE UNIQUE INDEX "translation_cache_key" ON "translation_cache" ("actor_id", "conversation_id", "source_hash", "target", "prompt_version", "authz_epoch");
CREATE INDEX "translation_cache_expires_idx" ON "translation_cache" ("expires_at");

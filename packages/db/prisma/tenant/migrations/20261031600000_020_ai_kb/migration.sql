-- CreateEnum
CREATE TYPE "kb_visibility" AS ENUM ('public', 'internal');

-- CreateEnum
CREATE TYPE "kb_origin" AS ENUM ('upload', 'url', 'text', 'catalog', 'conversation', 'drive');

-- CreateEnum
CREATE TYPE "kb_source_status" AS ENUM ('pending', 'processing', 'ready', 'failed');

-- CreateTable
CREATE TABLE "kb_folder" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" UUID,
    "visibility" "kb_visibility" NOT NULL DEFAULT 'public',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_source" (
    "id" UUID NOT NULL,
    "folder_id" UUID,
    "origin" "kb_origin" NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visibility" "kb_visibility" NOT NULL DEFAULT 'public',
    "file_id" UUID,
    "url" TEXT,
    "product_id" UUID,
    "body" TEXT,
    "sha256" TEXT,
    "learn" BOOLEAN NOT NULL DEFAULT true,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "status" "kb_source_status" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "ingest_seq" INTEGER NOT NULL DEFAULT 1,
    "size_bytes" BIGINT NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refreshed_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "kb_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_chunk" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "ord" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "embed_model" TEXT NOT NULL,
    "token_count" INTEGER NOT NULL DEFAULT 0,
    "meta" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "kb_chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_setting" (
    "id" SMALLINT NOT NULL DEFAULT 1,
    "min_score" REAL NOT NULL DEFAULT 0.35,

    CONSTRAINT "kb_setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kb_folder_parent_id_idx" ON "kb_folder"("parent_id");

-- CreateIndex
CREATE INDEX "kb_source_created_at_idx" ON "kb_source"("created_at" DESC);

-- CreateIndex
CREATE INDEX "kb_chunk_source_id_ord_idx" ON "kb_chunk"("source_id", "ord");

-- AddForeignKey
ALTER TABLE "kb_source" ADD CONSTRAINT "kb_source_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "kb_folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kb_chunk" ADD CONSTRAINT "kb_chunk_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "kb_source"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Viết tay (TIP-020, standards/ai/rag.md §6, §11): cột tìm không dấu sinh từ nội dung (f_unaccent của bootstrap.sql — IMMUTABLE).
ALTER TABLE "kb_chunk" ADD COLUMN "content_norm" TEXT GENERATED ALWAYS AS (f_unaccent(lower("content"))) STORED;
-- Vector: HNSW cosine (có lọc thư mục / visibility → hnsw.iterative_scan ở truy vấn).
CREATE INDEX "kb_chunk_embedding_hnsw_idx" ON "kb_chunk" USING hnsw ("embedding" vector_cosine_ops);
-- Từ khoá không dấu: trigram trên content_norm.
CREATE INDEX "kb_chunk_content_norm_trgm_idx" ON "kb_chunk" USING gin ("content_norm" gin_trgm_ops);
-- Danh sách nguồn theo thư mục / trạng thái (trang Dữ liệu RAG), bỏ nguồn đã xoá.
CREATE INDEX "kb_source_folder_status_idx" ON "kb_source" ("folder_id", "status") WHERE "deleted_at" IS NULL;
CREATE INDEX "kb_source_tags_gin_idx" ON "kb_source" USING gin ("tags");
-- Một tệp chỉ một nguồn còn sống (idempotent theo sha256).
CREATE UNIQUE INDEX "kb_source_sha256_live_key" ON "kb_source" ("sha256") WHERE "deleted_at" IS NULL AND "sha256" IS NOT NULL;
ALTER TABLE "kb_setting" ADD CONSTRAINT "kb_setting_singleton" CHECK ("id" = 1);
ALTER TABLE "kb_setting" ADD CONSTRAINT "kb_setting_min_score_check" CHECK ("min_score" >= 0 AND "min_score" <= 1);

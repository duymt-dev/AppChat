-- CreateEnum
CREATE TYPE "action_discovery_phase" AS ENUM ('building', 'ready', 'failed', 'unknown');

-- CreateTable
CREATE TABLE "action_discovery_generation" (
    "id" UUID NOT NULL,
    "corpus_hash" TEXT NOT NULL,
    "embedding_space" TEXT NOT NULL,
    "phase" "action_discovery_phase" NOT NULL DEFAULT 'building',
    "build_operation_id" TEXT NOT NULL,
    "owner_root_run_id" UUID NOT NULL,
    "expected_count" INTEGER NOT NULL,
    "completed_count" INTEGER NOT NULL DEFAULT 0,
    "failed_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_discovery_generation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_discovery_document" (
    "id" UUID NOT NULL,
    "generation_id" UUID NOT NULL,
    "action_id" TEXT NOT NULL,
    "document_hash" TEXT NOT NULL,
    "embedding" vector(1536),

    CONSTRAINT "action_discovery_document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "action_discovery_generation_key" ON "action_discovery_generation"("corpus_hash", "embedding_space");

-- CreateIndex (D42/standards indexing: phase hay lọc trước, updated_at/id sắp sau — dọn generation cũ / tìm building/failed)
CREATE INDEX "action_discovery_generation_phase_idx" ON "action_discovery_generation"("phase", "updated_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "action_discovery_document_key" ON "action_discovery_document"("generation_id", "action_id") INCLUDE ("document_hash");

-- AddForeignKey
ALTER TABLE "action_discovery_document" ADD CONSTRAINT "action_discovery_document_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "action_discovery_generation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Chỉ dò một build ACTIVE (building) của mỗi (corpus_hash, embedding_space) — claim atomically (TIP-023e §1.5), không cần quét toàn
-- bảng: generation_key đã UNIQUE nên tra bằng đúng cặp là đủ, partial index này chỉ tăng tốc liệt kê "đang building" cho job dọn.
CREATE INDEX "action_discovery_generation_building_idx" ON "action_discovery_generation" ("corpus_hash", "embedding_space") WHERE "phase" = 'building';

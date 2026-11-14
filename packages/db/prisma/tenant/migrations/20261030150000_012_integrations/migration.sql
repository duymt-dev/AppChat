-- CreateEnum
CREATE TYPE "integration_mode" AS ENUM ('sandbox', 'live');

-- CreateEnum
CREATE TYPE "integration_status" AS ENUM ('connected', 'error', 'disconnected');

-- CreateEnum
CREATE TYPE "integration_call_status" AS ENUM ('running', 'succeeded', 'failed');

-- CreateTable
CREATE TABLE "integration_connection" (
    "id" UUID NOT NULL,
    "connector_key" TEXT NOT NULL,
    "port" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "integration_mode" NOT NULL DEFAULT 'live',
    "status" "integration_status" NOT NULL DEFAULT 'connected',
    "config" JSONB NOT NULL DEFAULT '{}',
    "secret_enc" BYTEA,
    "last_sync_at" TIMESTAMPTZ(6),
    "last_error" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_mapping" (
    "id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "entity" TEXT NOT NULL,
    "local_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "synced_at" TIMESTAMPTZ(6),

    CONSTRAINT "integration_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_call_log" (
    "id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "op" TEXT NOT NULL,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "status" "integration_call_status" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "latency_ms" INTEGER,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_call_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_event" (
    "id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "integration_connection_port_status_idx" ON "integration_connection"("port", "status");

-- CreateIndex
CREATE UNIQUE INDEX "integration_mapping_connection_id_entity_local_id_key" ON "integration_mapping"("connection_id", "entity", "local_id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_mapping_connection_id_entity_external_id_key" ON "integration_mapping"("connection_id", "entity", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_call_log_idempotency_key_key" ON "integration_call_log"("idempotency_key");

-- CreateIndex
CREATE INDEX "integration_call_log_connection_id_created_at_idx" ON "integration_call_log"("connection_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "integration_event_connection_id_external_event_id_key" ON "integration_event"("connection_id", "external_event_id");


-- Viết tay (TIP-012): một kết nối đang dùng mỗi connector (kết nối lại sau khi ngắt tạo được); tra theo connector cho trang
-- Nền tảng kết nối / resolver theo port là Index Scan trên tập nhỏ đang dùng.
CREATE UNIQUE INDEX "integration_connection_active_key" ON "integration_connection" ("connector_key") WHERE "status" <> 'disconnected';

-- Sự kiện webhook chưa xử lý (consumer domain quét) — partial, chỉ chứa dòng chờ.
CREATE INDEX "integration_event_pending_idx" ON "integration_event" ("connection_id", "created_at") WHERE "processed_at" IS NULL;

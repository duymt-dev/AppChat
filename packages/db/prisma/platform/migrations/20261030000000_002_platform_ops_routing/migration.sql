-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "tenant_migration_status" AS ENUM ('pending', 'running', 'done', 'failed');

-- CreateTable
CREATE TABLE "tenant_migration" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "status" "tenant_migration_status" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_migration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_stats" (
    "workspace_id" UUID NOT NULL,
    "contacts" INTEGER NOT NULL DEFAULT 0,
    "conversations_30d" INTEGER NOT NULL DEFAULT 0,
    "messages_30d" INTEGER NOT NULL DEFAULT 0,
    "db_size_bytes" BIGINT NOT NULL DEFAULT 0,
    "last_active_at" TIMESTAMPTZ(6),
    "refreshed_at" TIMESTAMPTZ(6),

    CONSTRAINT "workspace_stats_pkey" PRIMARY KEY ("workspace_id")
);

-- CreateTable
CREATE TABLE "platform_audit_log" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action_id" TEXT NOT NULL,
    "workspace_id" UUID,
    "input" JSONB NOT NULL,
    "result" JSONB,
    "trace_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_channel_route" (
    "channel_account_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "external_id" TEXT,
    "status" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_channel_route_pkey" PRIMARY KEY ("channel_account_id")
);

-- CreateTable
CREATE TABLE "tenant_widget_route" (
    "public_key" TEXT NOT NULL,
    "workspace_id" UUID NOT NULL,
    "allowed_domains" TEXT[],
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_widget_route_pkey" PRIMARY KEY ("public_key")
);

-- CreateTable
CREATE TABLE "tenant_bank_feed_route" (
    "feed_id" TEXT NOT NULL,
    "workspace_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,

    CONSTRAINT "tenant_bank_feed_route_pkey" PRIMARY KEY ("feed_id")
);

-- CreateTable
CREATE TABLE "tenant_integration_route" (
    "connection_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "connector_key" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "tenant_integration_route_pkey" PRIMARY KEY ("connection_id")
);

-- CreateTable
CREATE TABLE "tenant_sign_route" (
    "token_hash" TEXT NOT NULL,
    "workspace_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_sign_route_pkey" PRIMARY KEY ("token_hash")
);

-- CreateIndex
CREATE INDEX "tenant_migration_status_version_idx" ON "tenant_migration"("status", "version");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_migration_workspace_id_version_key" ON "tenant_migration"("workspace_id", "version");

-- CreateIndex
CREATE INDEX "platform_audit_log_created_at_idx" ON "platform_audit_log"("created_at" DESC);

-- CreateIndex
CREATE INDEX "platform_audit_log_workspace_id_created_at_idx" ON "platform_audit_log"("workspace_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tenant_channel_route_status_type_idx" ON "tenant_channel_route"("status", "type");

-- CreateIndex
CREATE INDEX "tenant_channel_route_workspace_id_idx" ON "tenant_channel_route"("workspace_id");

-- CreateIndex
CREATE INDEX "tenant_widget_route_workspace_id_idx" ON "tenant_widget_route"("workspace_id");

-- CreateIndex
CREATE INDEX "tenant_bank_feed_route_workspace_id_idx" ON "tenant_bank_feed_route"("workspace_id");

-- CreateIndex
CREATE INDEX "tenant_integration_route_workspace_id_idx" ON "tenant_integration_route"("workspace_id");

-- CreateIndex
CREATE INDEX "tenant_sign_route_expires_at_idx" ON "tenant_sign_route"("expires_at");

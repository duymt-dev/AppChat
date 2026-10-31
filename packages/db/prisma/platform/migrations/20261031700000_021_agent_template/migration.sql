-- TIP-021 — mẫu agent theo ngành (Blueprint §2.2 L399, D15); seed idempotent theo key lúc boot.
-- CreateTable
CREATE TABLE "agent_template" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "industry_group" TEXT,
    "industry" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "tint" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "defaults" JSONB NOT NULL DEFAULT '{}',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_template_key_key" ON "agent_template"("key");

-- CreateIndex
CREATE INDEX "agent_template_active_sort_idx" ON "agent_template"("active", "sort");


-- CreateTable
CREATE TABLE "integration_interest" (
    "workspace_id" UUID NOT NULL,
    "connector_key" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_interest_pkey" PRIMARY KEY ("workspace_id","connector_key")
);

-- CreateIndex
CREATE INDEX "integration_interest_connector_key_idx" ON "integration_interest"("connector_key");


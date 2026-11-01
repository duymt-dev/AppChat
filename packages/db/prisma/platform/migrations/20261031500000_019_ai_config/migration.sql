-- TIP-019: cấu hình AI nền tảng (D33) — llm_provider, model_route, model_price.
-- CreateEnum
CREATE TYPE "llm_provider_kind" AS ENUM ('anthropic', 'openai', 'google', 'deepseek', 'openai_compatible');

-- CreateEnum
CREATE TYPE "llm_provider_status" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "ai_tier" AS ENUM ('standard', 'advanced', 'max');

-- CreateEnum
CREATE TYPE "model_purpose" AS ENUM ('chat', 'embed', 'rerank');

-- CreateTable
CREATE TABLE "llm_provider" (
    "key" TEXT NOT NULL,
    "kind" "llm_provider_kind" NOT NULL,
    "name" TEXT NOT NULL,
    "base_url" TEXT,
    "api_key_enc" BYTEA,
    "headers" JSONB,
    "capabilities" JSONB NOT NULL DEFAULT '{}',
    "status" "llm_provider_status" NOT NULL DEFAULT 'active',
    "last_probe_at" TIMESTAMPTZ(6),
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_provider_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "model_route" (
    "id" UUID NOT NULL,
    "tier" "ai_tier" NOT NULL,
    "purpose" "model_purpose" NOT NULL DEFAULT 'chat',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "provider_key" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "params" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_price" (
    "provider_key" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tier" "ai_tier" NOT NULL,
    "credits_per_1k_in" DECIMAL(12,4) NOT NULL,
    "credits_per_1k_out" DECIMAL(12,4) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_price_pkey" PRIMARY KEY ("provider_key","model")
);

-- CreateIndex
CREATE UNIQUE INDEX "model_route_tier_purpose_priority_key" ON "model_route"("tier", "purpose", "priority");


-- Route trỏ provider có thật; xoá provider phải xoá route trước (Quản trị nền tảng — TIP-040).
ALTER TABLE "model_route" ADD CONSTRAINT "model_route_provider_fk" FOREIGN KEY ("provider_key") REFERENCES "llm_provider"("key") ON DELETE RESTRICT;
ALTER TABLE "model_price" ADD CONSTRAINT "model_price_credits_check" CHECK ("credits_per_1k_in" >= 0 AND "credits_per_1k_out" >= 0);

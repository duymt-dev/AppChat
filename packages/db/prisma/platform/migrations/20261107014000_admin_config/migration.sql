-- TIP-040 pha 2 (DC-370): phiên bản CAS cho cấu hình quản trị nền tảng + thế hệ cấu hình dùng chung giữa các tiến trình.
ALTER TABLE "plan" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "model_price" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "llm_provider" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "agent_template" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "platform_config_revision" (
  "scope" TEXT NOT NULL,
  "generation" BIGINT NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_config_revision_pkey" PRIMARY KEY ("scope")
);

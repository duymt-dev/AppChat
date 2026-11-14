-- TIP-034d: quan sát tồn ticket theo ngày (projection kỹ thuật, cache 8 ngày) + tập đóng góp đóng băng của kết quả action.
-- Không FK tới ticket / contact / conversation (xoá nguồn luôn được; khoá FK key-share sẽ đảo thứ tự khoá "Quên khách").

CREATE TABLE "ticket_stock_control" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "ticket_stock_control_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ticket_stock_control_singleton_chk" CHECK ("id" = 1)
);
INSERT INTO "ticket_stock_control" ("id") VALUES (1);

CREATE TABLE "ticket_stock_batch" (
  "id" UUID NOT NULL,
  "time_zone" TEXT NOT NULL,
  "local_date" DATE NOT NULL,
  "metric_version" INTEGER NOT NULL,
  "observed_at" TIMESTAMPTZ(6) NOT NULL,
  "completed_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ticket_stock_batch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ticket_stock_batch_tz_chk" CHECK (length("time_zone") BETWEEN 1 AND 64),
  CONSTRAINT "ticket_stock_batch_version_chk" CHECK ("metric_version" > 0),
  CONSTRAINT "ticket_stock_batch_completed_chk" CHECK ("completed_at" >= "observed_at")
);
-- Tra đúng một lần quan sát (múi giờ, ngày, phiên bản) — Index Only Scan lấy id + mốc.
CREATE UNIQUE INDEX "ticket_stock_batch_day_key" ON "ticket_stock_batch" ("time_zone", "local_date", "metric_version") INCLUDE ("id", "observed_at", "completed_at");
-- Dọn cache theo ngày (keyset id).
CREATE INDEX "ticket_stock_batch_retention_idx" ON "ticket_stock_batch" ("time_zone", "local_date", "id");

CREATE TABLE "ticket_stock_observation" (
  "batch_id" UUID NOT NULL,
  "ticket_id" UUID NOT NULL,
  "status" "ticket_status" NOT NULL,
  "breached" BOOLEAN NOT NULL,
  "source_contact_id" UUID,
  "source_conversation_id" UUID,
  CONSTRAINT "ticket_stock_observation_batch_fkey" FOREIGN KEY ("batch_id") REFERENCES "ticket_stock_batch"("id") ON DELETE CASCADE
);
-- PK covering: so sánh nối theo (batch, ticket) đọc thẳng index.
CREATE UNIQUE INDEX "ticket_stock_observation_pkey" ON "ticket_stock_observation" ("batch_id", "ticket_id") INCLUDE ("status", "breached", "source_contact_id", "source_conversation_id");
ALTER TABLE "ticket_stock_observation" ADD CONSTRAINT "ticket_stock_observation_pkey" PRIMARY KEY USING INDEX "ticket_stock_observation_pkey";
CREATE INDEX "ticket_stock_observation_ticket_idx" ON "ticket_stock_observation" ("ticket_id", "batch_id");
-- "Quên khách" tìm theo nguồn GỐC (kể cả ticket đã xoá cứng).
CREATE INDEX "ticket_stock_observation_contact_idx" ON "ticket_stock_observation" ("source_contact_id", "batch_id", "ticket_id") WHERE "source_contact_id" IS NOT NULL;
CREATE INDEX "ticket_stock_observation_conversation_idx" ON "ticket_stock_observation" ("source_conversation_id", "batch_id", "ticket_id") WHERE "source_conversation_id" IS NOT NULL;

CREATE TABLE "ticket_stock_result_contribution" (
  "candidate_id" UUID NOT NULL,
  "ticket_id" UUID NOT NULL,
  "ticket_version" INTEGER NOT NULL,
  "current_status" "ticket_status" NOT NULL,
  "current_breached" BOOLEAN NOT NULL,
  "prior_status" "ticket_status",
  "prior_breached" BOOLEAN,
  "missing_reason" TEXT,
  "provenance" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "ticket_stock_result_contribution_pkey" PRIMARY KEY ("candidate_id", "ticket_id"),
  CONSTRAINT "ticket_stock_result_contribution_prior_chk" CHECK (("prior_status" IS NULL) = ("prior_breached" IS NULL)),
  CONSTRAINT "ticket_stock_result_contribution_reason_chk" CHECK ("missing_reason" IS NULL OR "missing_reason" IN ('new_after_baseline', 'missing_before_baseline'))
);
-- Dọn ứng viên mồ côi theo tuổi.
CREATE INDEX "ticket_stock_result_contribution_age_idx" ON "ticket_stock_result_contribution" ("created_at", "candidate_id");

CREATE TABLE "ticket_stock_result_source" (
  "candidate_id" UUID NOT NULL,
  "ticket_id" UUID NOT NULL,
  "source_kind" TEXT NOT NULL,
  "source_id" UUID NOT NULL,
  "source_generation" INTEGER NOT NULL,
  "origin" TEXT NOT NULL,
  CONSTRAINT "ticket_stock_result_source_pkey" PRIMARY KEY ("candidate_id", "ticket_id", "source_kind", "source_id", "source_generation", "origin"),
  CONSTRAINT "ticket_stock_result_source_kind_chk" CHECK ("source_kind" IN ('contact', 'conversation')),
  CONSTRAINT "ticket_stock_result_source_origin_chk" CHECK ("origin" IN ('current', 'baseline')),
  CONSTRAINT "ticket_stock_result_source_contribution_fkey" FOREIGN KEY ("candidate_id", "ticket_id") REFERENCES "ticket_stock_result_contribution"("candidate_id", "ticket_id") ON DELETE CASCADE
);
CREATE INDEX "ticket_stock_result_source_key_idx" ON "ticket_stock_result_source" ("source_kind", "source_id", "source_generation", "candidate_id", "ticket_id");


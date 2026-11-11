-- TIP-003c §3.1 / §5.2: biên nhận trigger bền của action riêng. Chỉ EXPAND (bảng mới).
-- Index theo standards/indexing: khoá duy nhất trigger = tra admission; khôi phục partial theo (phase, updated_at, id) cho dòng chưa kết
-- thúc INCLUDE cột hẹp; tra theo nguồn event bằng `=` INCLUDE (action_log_id, phase). Không INCLUDE JSON.
CREATE TYPE "system_source_kind" AS ENUM ('event', 'schedule', 'ingress', 'accepted_operation', 'public_locator');
CREATE TYPE "system_receipt_phase" AS ENUM ('admitted', 'applied', 'no_effect', 'handed_off');

CREATE TABLE "system_action_receipt" (
  "id" UUID NOT NULL,
  "source_kind" "system_source_kind" NOT NULL,
  "source_ref" TEXT NOT NULL,
  "action_id" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "target_generation" TEXT NOT NULL,
  "milestone" TEXT NOT NULL DEFAULT '',
  "input_digest" TEXT NOT NULL,
  "phase" "system_receipt_phase" NOT NULL DEFAULT 'admitted',
  "action_log_id" UUID,
  "effect_ref" TEXT,
  "safe_reason" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "system_action_receipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "system_action_receipt_trigger_key" ON "system_action_receipt" ("source_kind", "source_ref", "action_id", "target_id", "target_generation", "milestone");
CREATE INDEX "system_action_receipt_recovery_idx" ON "system_action_receipt" ("phase", "updated_at", "id") INCLUDE ("action_id", "target_id", "effect_ref") WHERE "phase" = 'admitted';
CREATE INDEX "system_action_receipt_source_idx" ON "system_action_receipt" ("source_ref") INCLUDE ("action_log_id", "phase");

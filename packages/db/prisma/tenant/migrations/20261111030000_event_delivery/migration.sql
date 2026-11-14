-- TIP-006b §1, §6.1: giao bền sau commit — fanout niêm phong, ý định giao mail / realtime, lần xảy ra tác vụ + ý định đẩy run.
-- Chỉ EXPAND (bảng / cột mới). Index theo standards/indexing: cột `=` trước, khoảng / sắp sau; partial cho hàng chờ; INCLUDE cột hẹp.
CREATE TYPE "fanout_selection_phase" AS ENUM ('building', 'sealed', 'abandoned');
CREATE TYPE "fanout_item_phase" AS ENUM ('pending', 'applied', 'no_effect', 'handed_off', 'unknown');
CREATE TYPE "notification_delivery_phase" AS ENUM ('pending', 'dispatching', 'accepted', 'suppressed', 'unknown', 'failed');
CREATE TYPE "realtime_delivery_phase" AS ENUM ('pending', 'published', 'failed');
CREATE TYPE "task_occurrence_phase" AS ENUM ('applied', 'no_effect', 'handed_off');
CREATE TYPE "task_dispatch_phase" AS ENUM ('pending', 'dispatched', 'terminal');

CREATE TABLE "event_fanout" (
  "id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "consumer_name" TEXT NOT NULL,
  "contract_version" INTEGER NOT NULL,
  "selection_generation" INTEGER NOT NULL DEFAULT 1,
  "selection_phase" "fanout_selection_phase" NOT NULL DEFAULT 'building',
  "cursor" TEXT,
  "selected_count" INTEGER NOT NULL DEFAULT 0,
  "processed_count" INTEGER NOT NULL DEFAULT 0,
  "lease_token" UUID,
  "lease_generation" INTEGER NOT NULL DEFAULT 0,
  "lease_until" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "event_fanout_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "event_fanout_identity_key" ON "event_fanout" ("event_id", "consumer_name", "contract_version");

CREATE TABLE "event_fanout_item" (
  "fanout_id" UUID NOT NULL,
  "generation" INTEGER NOT NULL,
  "target_kind" TEXT NOT NULL,
  "target_id" UUID NOT NULL,
  "captured_version" TEXT NOT NULL DEFAULT '',
  "ordinal" INTEGER NOT NULL,
  "operation_ref" TEXT,
  "input_digest" TEXT,
  "phase" "fanout_item_phase" NOT NULL DEFAULT 'pending',
  "safe_reason" TEXT,
  CONSTRAINT "event_fanout_item_pkey" PRIMARY KEY ("fanout_id", "generation", "target_kind", "target_id"),
  CONSTRAINT "event_fanout_item_fanout_fk" FOREIGN KEY ("fanout_id") REFERENCES "event_fanout"("id") ON DELETE CASCADE
);
-- Trang mục chờ theo thế hệ (= fanout, generation, phase) rồi target_id; INCLUDE cột hẹp cần cho hiệu ứng.
CREATE INDEX "event_fanout_item_page_idx" ON "event_fanout_item" ("fanout_id", "generation", "phase", "target_id") INCLUDE ("operation_ref", "captured_version");

CREATE TABLE "notification_delivery" (
  "id" UUID NOT NULL,
  "notification_id" UUID NOT NULL,
  "user_id" UUID,
  "logical_target_key" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "source_event_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "intent_index" INTEGER NOT NULL,
  "phase" "notification_delivery_phase" NOT NULL DEFAULT 'pending',
  "attempt_no" INTEGER NOT NULL DEFAULT 0,
  "claim_token" UUID,
  "claim_generation" INTEGER NOT NULL DEFAULT 0,
  "claim_until" TIMESTAMPTZ(6),
  "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "accepted_at" TIMESTAMPTZ(6),
  "safe_code" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "notification_delivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "notification_delivery_identity_key" ON "notification_delivery" ("notification_id", "logical_target_key", "channel");
-- Khôi phục: chỉ hàng còn thử được (pending) hoặc claim dispatching chưa gọi provider — sắp theo hạn rồi id.
CREATE INDEX "notification_delivery_due_idx" ON "notification_delivery" ("phase", "next_attempt_at", "id") INCLUDE ("claim_generation", "notification_id") WHERE "phase" = 'pending';

CREATE TABLE "realtime_delivery" (
  "id" UUID NOT NULL,
  "source_event_id" UUID NOT NULL,
  "envelope" JSONB NOT NULL,
  "phase" "realtime_delivery_phase" NOT NULL DEFAULT 'pending',
  "attempt_no" INTEGER NOT NULL DEFAULT 0,
  "claim_token" UUID,
  "claim_generation" INTEGER NOT NULL DEFAULT 0,
  "claim_until" TIMESTAMPTZ(6),
  "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "realtime_delivery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "realtime_delivery_due_idx" ON "realtime_delivery" ("next_attempt_at", "id") INCLUDE ("claim_generation") WHERE "phase" = 'pending';

CREATE TABLE "task_occurrence" (
  "id" UUID NOT NULL,
  "task_id" UUID NOT NULL,
  "trigger_generation" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "event_id" UUID,
  "due_at" TIMESTAMPTZ(6),
  "input_digest" TEXT NOT NULL,
  "phase" "task_occurrence_phase" NOT NULL,
  "run_id" UUID,
  "no_effect_reason" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "task_occurrence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_occurrence_source_check" CHECK (("kind" = 'event' AND "event_id" IS NOT NULL) OR ("kind" = 'schedule' AND "due_at" IS NOT NULL))
);
CREATE UNIQUE INDEX "task_occurrence_event_key" ON "task_occurrence" ("task_id", "trigger_generation", "event_id") WHERE "kind" = 'event';
CREATE UNIQUE INDEX "task_occurrence_schedule_key" ON "task_occurrence" ("task_id", "trigger_generation", "due_at") WHERE "kind" = 'schedule';

CREATE TABLE "task_dispatch_intent" (
  "run_id" UUID NOT NULL,
  "task_id" UUID NOT NULL,
  "source_event_ref" TEXT,
  "phase" "task_dispatch_phase" NOT NULL DEFAULT 'pending',
  "attempt_no" INTEGER NOT NULL DEFAULT 0,
  "claim_token" UUID,
  "claim_generation" INTEGER NOT NULL DEFAULT 0,
  "next_due_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "task_dispatch_intent_pkey" PRIMARY KEY ("run_id")
);
CREATE INDEX "task_dispatch_intent_due_idx" ON "task_dispatch_intent" ("next_due_at", "run_id") INCLUDE ("task_id", "claim_generation") WHERE "phase" = 'pending';

-- Thế hệ trigger tác vụ (đổi trigger / lịch / sự kiện / bật lại → tăng).
ALTER TABLE "ai_task" ADD COLUMN "trigger_generation" INTEGER NOT NULL DEFAULT 1;
-- Chọn tác vụ theo sự kiện: = (trigger, status, event_type) rồi id; INCLUDE thế hệ (Index Only Scan khi INSERT…SELECT).
CREATE INDEX "ai_task_event_select_idx" ON "ai_task" ("event_type", "id") INCLUDE ("trigger_generation") WHERE "trigger" = 'event' AND "status" = 'active' AND "deleted_at" IS NULL;

-- Nguồn của thông báo (kiểm nguồn hiện hành lúc đọc / gửi).
ALTER TABLE "notification" ADD COLUMN "source_event_id" UUID, ADD COLUMN "source_entity_kind" TEXT, ADD COLUMN "source_entity_id" TEXT;

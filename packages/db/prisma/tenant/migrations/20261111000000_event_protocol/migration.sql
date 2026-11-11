-- TIP-003b §3: giao thức sự kiện bền — mở rộng outbox_event (cột null cho tương thích v1) + bộ đếm producer, đầu dispatch, dispatch,
-- biên nhận consumer, registry bất biến, trạng thái giao thức. Chỉ EXPAND: không đổi dữ liệu cũ, không bật v2 (pha = 'v1').
-- Index theo standards/indexing: cột `=` trước, khoảng / sắp sau; partial cho tập nhỏ hay quét; INCLUDE cột hẹp, không JSON / text.
CREATE TYPE "event_relay_phase" AS ENUM ('pending', 'claimed', 'published', 'failed');
CREATE TYPE "event_dispatch_phase" AS ENUM ('pending', 'running', 'waiting', 'completed', 'failed', 'blocked_unknown');
CREATE TYPE "event_receipt_phase" AS ENUM ('pending', 'claimed', 'applied', 'no_effect', 'handed_off', 'failed', 'blocked_unknown');
CREATE TYPE "event_receipt_mode" AS ENUM ('projection', 'action', 'handoff');

ALTER TABLE "outbox_event"
  ADD COLUMN "protocol_version" INTEGER,
  ADD COLUMN "aggregate_kind" TEXT,
  ADD COLUMN "aggregate_id" UUID,
  ADD COLUMN "aggregate_seq" BIGINT,
  ADD COLUMN "registry_version" INTEGER,
  ADD COLUMN "causation_event_id" UUID,
  ADD COLUMN "relay_phase" "event_relay_phase" NOT NULL DEFAULT 'pending',
  ADD COLUMN "relay_claim_token" UUID,
  ADD COLUMN "relay_generation" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "relay_lease_until" TIMESTAMPTZ(6);

-- Hàng cũ: relay_phase là hình chiếu của status (published / failed giữ nguyên ý nghĩa "đã giao hàng đợi" / "hết lượt").
UPDATE "outbox_event" SET "relay_phase" = 'published' WHERE "status" = 'published';
UPDATE "outbox_event" SET "relay_phase" = 'failed' WHERE "status" = 'failed';

-- Relay: chỉ hàng chờ (partial), sắp theo available_at rồi id; INCLUDE cột hẹp cần để chọn — không payload.
CREATE INDEX "outbox_event_relay_due_idx" ON "outbox_event" ("available_at", "id") INCLUDE ("topic", "protocol_version") WHERE "status" = 'pending';
-- Khôi phục claim relay hết hạn.
CREATE INDEX "outbox_event_relay_claim_idx" ON "outbox_event" ("relay_lease_until", "id") WHERE "relay_phase" = 'claimed';
-- Thứ tự theo aggregate (v2): duy nhất (kind, id, seq); INCLUDE event id cho tra đầu stream không đọc heap.
CREATE UNIQUE INDEX "outbox_event_aggregate_seq_key" ON "outbox_event" ("aggregate_kind", "aggregate_id", "aggregate_seq") INCLUDE ("id") WHERE "aggregate_seq" IS NOT NULL;

CREATE TABLE "event_aggregate_counter" (
    "kind" TEXT NOT NULL,
    "id" UUID NOT NULL,
    "next_seq" BIGINT NOT NULL,
    CONSTRAINT "event_aggregate_counter_pkey" PRIMARY KEY ("kind", "id")
);

CREATE TABLE "event_aggregate_head" (
    "kind" TEXT NOT NULL,
    "id" UUID NOT NULL,
    "next_seq" BIGINT NOT NULL DEFAULT 1,
    "active_event_id" UUID,
    "head_token" UUID,
    "head_fence" INTEGER NOT NULL DEFAULT 0,
    "head_lease_until" TIMESTAMPTZ(6),
    "blocked_reason" TEXT,
    CONSTRAINT "event_aggregate_head_pkey" PRIMARY KEY ("kind", "id")
);
CREATE INDEX "event_aggregate_head_recovery_idx" ON "event_aggregate_head" ("head_lease_until", "kind", "id") WHERE "active_event_id" IS NOT NULL;

CREATE TABLE "event_dispatch" (
    "event_id" UUID NOT NULL,
    "protocol_version" INTEGER NOT NULL,
    "registry_version" INTEGER NOT NULL,
    "phase" "event_dispatch_phase" NOT NULL DEFAULT 'pending',
    "available_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatch_token" UUID,
    "dispatch_generation" INTEGER NOT NULL DEFAULT 0,
    "dispatch_lease_until" TIMESTAMPTZ(6),
    "dispatch_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error_code" TEXT,
    CONSTRAINT "event_dispatch_pkey" PRIMARY KEY ("event_id")
);
CREATE INDEX "event_dispatch_due_idx" ON "event_dispatch" ("phase", "available_at", "event_id") INCLUDE ("registry_version");
CREATE INDEX "event_dispatch_claim_idx" ON "event_dispatch" ("dispatch_lease_until", "event_id") WHERE "phase" = 'running';

CREATE TABLE "event_consumer_receipt" (
    "event_id" UUID NOT NULL,
    "consumer" TEXT NOT NULL,
    "contract_version" INTEGER NOT NULL,
    "mode" "event_receipt_mode" NOT NULL,
    "phase" "event_receipt_phase" NOT NULL DEFAULT 'pending',
    "effect_ref" TEXT,
    "input_digest" TEXT,
    "claim_token" UUID,
    "fence" INTEGER NOT NULL DEFAULT 0,
    "lease_until" TIMESTAMPTZ(6),
    "reason" TEXT,
    "completed_at" TIMESTAMPTZ(6),
    CONSTRAINT "event_consumer_receipt_pkey" PRIMARY KEY ("event_id", "consumer")
);
CREATE INDEX "event_consumer_receipt_recovery_idx" ON "event_consumer_receipt" ("phase", "lease_until", "event_id", "consumer");

CREATE TABLE "event_registry_version" (
    "version" INTEGER NOT NULL,
    "digest" TEXT NOT NULL,
    "contracts" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_registry_version_pkey" PRIMARY KEY ("version")
);
CREATE UNIQUE INDEX "event_registry_version_digest_key" ON "event_registry_version" ("digest");

CREATE TABLE "event_protocol_state" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "phase" TEXT NOT NULL DEFAULT 'v1',
    "epoch" INTEGER NOT NULL DEFAULT 0,
    "registry_version" INTEGER,
    "legacy_checkpoint" JSONB,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_protocol_state_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "event_protocol_state_singleton" CHECK ("id" = 1),
    CONSTRAINT "event_protocol_state_phase" CHECK ("phase" IN ('v1', 'fenced', 'v2'))
);
INSERT INTO "event_protocol_state" ("id") VALUES (1);

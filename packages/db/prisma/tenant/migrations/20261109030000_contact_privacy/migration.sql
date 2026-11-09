-- TIP-015c §2.1-2.2: fence "Quên khách" — operation theo họ khách tại accept, artifact/subject-link/item cho inventory + review,
-- token định danh một chiều chống tái tạo, permit tạo hồ sơ mới, dedupe/route cho inbound sau fence, keyring HMAC. Không PII thô.

CREATE TYPE "privacy_operation_phase" AS ENUM ('accepted', 'fencing', 'inventory', 'erasing', 'needs_review', 'verifying', 'completed_with_exceptions', 'retryable_failed');
CREATE TYPE "privacy_artifact_state" AS ENUM ('allowed', 'quarantined', 'erase_pending', 'erased', 'retained_issued');
CREATE TYPE "privacy_item_disposition" AS ENUM ('proven_unrelated', 'erase_exclusive', 'redact_shared', 'retained_issued');

CREATE TABLE "privacy_operation" (
    "id" UUID NOT NULL,
    "canonical_contact_id" UUID NOT NULL,
    "family_generation" INTEGER NOT NULL,
    "requester_id" UUID NOT NULL,
    "policy_version" INTEGER NOT NULL,
    "inventory_revision" TEXT NOT NULL,
    "phase" "privacy_operation_phase" NOT NULL DEFAULT 'accepted',
    "lease_epoch" INTEGER NOT NULL DEFAULT 0,
    "lease_expires_at" TIMESTAMPTZ(6),
    "cursor" TEXT,
    "checkpoint" JSONB NOT NULL DEFAULT '{}',
    "count_total" INTEGER NOT NULL DEFAULT 0,
    "count_resolved" INTEGER NOT NULL DEFAULT 0,
    "count_retained" INTEGER NOT NULL DEFAULT 0,
    "request_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "privacy_operation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "privacy_operation_family_key" ON "privacy_operation" ("canonical_contact_id", "family_generation");
CREATE UNIQUE INDEX "privacy_operation_request_key" ON "privacy_operation" ("request_key");
-- Khôi phục: lượt đang chạy, cũ trước.
CREATE INDEX "privacy_operation_active_idx" ON "privacy_operation" ("phase", "updated_at", "id") INCLUDE ("lease_epoch") WHERE "phase" NOT IN ('completed_with_exceptions');

CREATE TABLE "privacy_family_member" (
    "operation_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "privacy_family_member_pkey" PRIMARY KEY ("operation_id", "contact_id")
);
ALTER TABLE "privacy_family_member" ADD CONSTRAINT "privacy_family_member_operation_fkey" FOREIGN KEY ("operation_id") REFERENCES "privacy_operation"("id");

CREATE TABLE "privacy_artifact" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "record_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "state" "privacy_artifact_state" NOT NULL DEFAULT 'allowed',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "privacy_artifact_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "privacy_artifact_identity_key" ON "privacy_artifact" ("kind", "record_id", "revision");
CREATE INDEX "privacy_artifact_state_idx" ON "privacy_artifact" ("state", "id");

CREATE TABLE "privacy_subject_link" (
    "id" UUID NOT NULL,
    "artifact_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "generation" INTEGER NOT NULL,
    "provenance" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "privacy_subject_link_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "privacy_subject_link_key" ON "privacy_subject_link" ("artifact_id", "contact_id", "generation");
CREATE INDEX "privacy_subject_link_contact_idx" ON "privacy_subject_link" ("contact_id", "generation", "artifact_id");
ALTER TABLE "privacy_subject_link" ADD CONSTRAINT "privacy_subject_link_artifact_fkey" FOREIGN KEY ("artifact_id") REFERENCES "privacy_artifact"("id");

CREATE TABLE "privacy_item" (
    "id" UUID NOT NULL,
    "operation_id" UUID NOT NULL,
    "artifact_id" UUID NOT NULL,
    "disposition" "privacy_item_disposition",
    "proof_ref" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "privacy_item_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "privacy_item_key" ON "privacy_item" ("operation_id", "artifact_id");
CREATE INDEX "privacy_item_unresolved_idx" ON "privacy_item" ("operation_id", "id") WHERE "disposition" IS NULL;
ALTER TABLE "privacy_item" ADD CONSTRAINT "privacy_item_operation_fkey" FOREIGN KEY ("operation_id") REFERENCES "privacy_operation"("id");
ALTER TABLE "privacy_item" ADD CONSTRAINT "privacy_item_artifact_fkey" FOREIGN KEY ("artifact_id") REFERENCES "privacy_artifact"("id");

CREATE TABLE "privacy_identity_token" (
    "id" UUID NOT NULL,
    "namespace" TEXT NOT NULL,
    "key_version" INTEGER NOT NULL,
    "digest" TEXT NOT NULL,
    "generation" INTEGER NOT NULL DEFAULT 0,
    "fresh_contact_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "privacy_identity_token_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "privacy_identity_token_key" ON "privacy_identity_token" ("namespace", "key_version", "digest") INCLUDE ("generation", "fresh_contact_id");

CREATE TABLE "privacy_recreation_permit" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "identifiers" JSONB NOT NULL,
    "intent_hash" TEXT NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "consumed_contact_id" UUID,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "privacy_recreation_permit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "privacy_recreation_permit_expiry_idx" ON "privacy_recreation_permit" ("expires_at", "id") WHERE "consumed_at" IS NULL;

CREATE TABLE "privacy_dedupe_receipt" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "namespace" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "original_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "privacy_dedupe_receipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "privacy_dedupe_receipt_key" ON "privacy_dedupe_receipt" ("account_id", "namespace", "digest");

CREATE TABLE "privacy_route" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "thread_digest" TEXT NOT NULL,
    "generation" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "privacy_route_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "privacy_route_key" ON "privacy_route" ("account_id", "thread_digest", "generation");

CREATE TABLE "privacy_keyring" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "wrapped_key" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "read_only" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "privacy_keyring_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "privacy_keyring_version_key" ON "privacy_keyring" ("version");

-- CreateEnum
CREATE TYPE "contact_kind" AS ENUM ('individual', 'business', 'household');

-- CreateEnum
CREATE TYPE "contact_stage" AS ENUM ('lead', 'potential', 'consulting', 'quote', 'contract', 'won', 'lost');

-- CreateEnum
CREATE TYPE "contact_status" AS ENUM ('active', 'potential', 'inactive');

-- CreateEnum
CREATE TYPE "contact_group" AS ENUM ('vip', 'loyal', 'new', 'potential');

-- CreateEnum
CREATE TYPE "collaborator_role" AS ENUM ('collaborator', 'watcher');

-- CreateEnum
CREATE TYPE "access_request_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "tag_scope" AS ENUM ('all', 'contact', 'conversation');

-- CreateEnum
CREATE TYPE "timeline_type" AS ENUM ('message', 'quote', 'order', 'invoice', 'payment', 'appointment', 'ticket', 'note', 'ai_action', 'loyalty', 'campaign', 'stage', 'owner', 'merge');

-- CreateTable
CREATE TABLE "contact" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "contact_kind" NOT NULL DEFAULT 'individual',
    "title" TEXT,
    "phone" TEXT,
    "phone_norm" TEXT,
    "email" TEXT,
    "zalo" TEXT,
    "tax_code" TEXT,
    "avatar_url" TEXT,
    "gender" TEXT,
    "birthday" DATE,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "locale" TEXT,
    "group" "contact_group",
    "status" "contact_status" NOT NULL DEFAULT 'active',
    "stage" "contact_stage" NOT NULL DEFAULT 'lead',
    "stage_set_manually_at" TIMESTAMPTZ(6),
    "owner_user_id" UUID,
    "team_id" UUID,
    "tier_key" TEXT,
    "points_balance" BIGINT NOT NULL DEFAULT 0,
    "total_spent" BIGINT NOT NULL DEFAULT 0,
    "last_interaction_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_order_at" TIMESTAMPTZ(6),
    "marketing_opt_out" BOOLEAN NOT NULL DEFAULT false,
    "ai_summary" TEXT,
    "ai_summary_at" TIMESTAMPTZ(6),
    "custom" JSONB NOT NULL DEFAULT '{}',
    "merged_into_id" UUID,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_identity" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "channel_type" TEXT NOT NULL,
    "channel_account_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "display_name" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_collaborator" (
    "contact_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "collaborator_role" NOT NULL DEFAULT 'collaborator',
    "added_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_collaborator_pkey" PRIMARY KEY ("contact_id","user_id")
);

-- CreateTable
CREATE TABLE "contact_access_request" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "requester_user_id" UUID NOT NULL,
    "status" "access_request_status" NOT NULL DEFAULT 'pending',
    "decided_by" UUID,
    "decided_at" TIMESTAMPTZ(6),
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_access_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "emoji" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "scope" "tag_scope" NOT NULL DEFAULT 'all',
    "created_by_user_id" UUID,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_tag" (
    "contact_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_tag_pkey" PRIMARY KEY ("contact_id","tag_id")
);

-- CreateTable
CREATE TABLE "contact_memory" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "fact" TEXT NOT NULL,
    "source_run_id" UUID,
    "confidence" REAL NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_event" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "type" "timeline_type" NOT NULL,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "summary" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_note" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "author_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_def" (
    "id" UUID NOT NULL,
    "entity" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "group" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "ai" BOOLEAN NOT NULL DEFAULT false,
    "sys" BOOLEAN NOT NULL DEFAULT false,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "condition" TEXT NOT NULL DEFAULT '',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "visible_in" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "custom_field_def_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_layout" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "tabs" JSONB NOT NULL DEFAULT '[]',
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_layout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_layout_role" (
    "role_key" TEXT NOT NULL,
    "layout_id" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_layout_role_pkey" PRIMARY KEY ("role_key")
);

-- CreateIndex
CREATE UNIQUE INDEX "contact_code_key" ON "contact"("code");

-- CreateIndex
CREATE INDEX "contact_identity_contact_id_idx" ON "contact_identity"("contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "contact_identity_channel_account_id_external_id_key" ON "contact_identity"("channel_account_id", "external_id");

-- CreateIndex
CREATE INDEX "contact_collaborator_user_id_contact_id_idx" ON "contact_collaborator"("user_id", "contact_id");

-- CreateIndex
CREATE INDEX "contact_access_request_contact_id_status_idx" ON "contact_access_request"("contact_id", "status");

-- CreateIndex
CREATE INDEX "contact_access_request_status_created_at_idx" ON "contact_access_request"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "contact_tag_tag_id_idx" ON "contact_tag"("tag_id");

-- CreateIndex
CREATE INDEX "contact_memory_contact_id_created_at_idx" ON "contact_memory"("contact_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "timeline_event_contact_id_occurred_at_id_idx" ON "timeline_event"("contact_id", "occurred_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "contact_note_contact_id_created_at_idx" ON "contact_note"("contact_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "custom_field_def_entity_sort_idx" ON "custom_field_def"("entity", "sort");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_def_entity_key_key" ON "custom_field_def"("entity", "key");

-- Viết tay (TIP-015, standards/database/indexing.md). Danh sách khách luôn lọc `deleted_at IS NULL` + sắp
-- (last_interaction_at DESC, id DESC) → mọi index list là partial và kết thúc bằng id (cursor / deferred join).

-- Chống trùng SĐT (chuẩn hoá) trong khách còn hiệu lực; email tra theo lower().
CREATE UNIQUE INDEX "contact_phone_norm_key" ON "contact" ("phone_norm") WHERE "deleted_at" IS NULL AND "phone_norm" IS NOT NULL;
CREATE INDEX "contact_email_lower_idx" ON "contact" (lower("email")) WHERE "deleted_at" IS NULL AND "email" IS NOT NULL;

-- Danh sách tất cả / theo giai đoạn (cột `=` trước, sort sau).
CREATE INDEX "contact_live_recent_idx" ON "contact" ("last_interaction_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX "contact_stage_recent_idx" ON "contact" ("stage", "last_interaction_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;

-- Scope `own` / `team` (rbac §5, indexing §7).
CREATE INDEX "contact_owner_recent_idx" ON "contact" ("owner_user_id", "last_interaction_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX "contact_team_recent_idx" ON "contact" ("team_id", "last_interaction_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL AND "team_id" IS NOT NULL;

-- Tìm không dấu (f_unaccent của bootstrap.sql) + lọc trường tuỳ biến (D56).
CREATE INDEX "contact_name_trgm_idx" ON "contact" USING gin (f_unaccent(lower("name")) gin_trgm_ops) WHERE "deleted_at" IS NULL;
CREATE INDEX "contact_custom_gin_idx" ON "contact" USING gin ("custom" jsonb_path_ops);

-- Một yêu cầu chờ mỗi (khách, người xin); thẻ trùng tên không phân biệt hoa thường.
CREATE UNIQUE INDEX "contact_access_request_pending_key" ON "contact_access_request" ("contact_id", "requester_user_id") WHERE "status" = 'pending';
CREATE UNIQUE INDEX "tag_name_lower_key" ON "tag" (lower("name"));

-- FK nội DB (cùng domain — tenant-db §7): xoá cứng khách kéo theo dữ liệu phụ (thực tế xoá mềm; xoá cứng chỉ ở privacy.erase).
ALTER TABLE "contact_identity" ADD CONSTRAINT "contact_identity_contact_fk" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE CASCADE;
ALTER TABLE "contact_collaborator" ADD CONSTRAINT "contact_collaborator_contact_fk" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE CASCADE;
ALTER TABLE "contact_access_request" ADD CONSTRAINT "contact_access_request_contact_fk" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE CASCADE;
ALTER TABLE "contact_tag" ADD CONSTRAINT "contact_tag_contact_fk" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE CASCADE;
ALTER TABLE "contact_tag" ADD CONSTRAINT "contact_tag_tag_fk" FOREIGN KEY ("tag_id") REFERENCES "tag"("id") ON DELETE CASCADE;
ALTER TABLE "contact_memory" ADD CONSTRAINT "contact_memory_contact_fk" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE CASCADE;
ALTER TABLE "timeline_event" ADD CONSTRAINT "timeline_event_contact_fk" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE CASCADE;
ALTER TABLE "contact_note" ADD CONSTRAINT "contact_note_contact_fk" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE CASCADE;
ALTER TABLE "contact" ADD CONSTRAINT "contact_merged_into_fk" FOREIGN KEY ("merged_into_id") REFERENCES "contact"("id") ON DELETE SET NULL;
ALTER TABLE "profile_layout_role" ADD CONSTRAINT "profile_layout_role_layout_fk" FOREIGN KEY ("layout_id") REFERENCES "profile_layout"("id");

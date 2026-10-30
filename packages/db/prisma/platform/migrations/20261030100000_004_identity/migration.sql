
-- CreateEnum
CREATE TYPE "otp_purpose" AS ENUM ('register', 'login', 'reset');

-- CreateEnum
CREATE TYPE "workspace_status" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "workspace_db_status" AS ENUM ('provisioning', 'active', 'suspended', 'archiving', 'archived', 'restoring', 'deleting');

-- CreateEnum
CREATE TYPE "membership_status" AS ENUM ('active', 'invited', 'removed');

-- CreateEnum
CREATE TYPE "business_kind" AS ENUM ('enterprise', 'household', 'individual');

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'vi',
    "is_platform_admin" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMPTZ(6),
    "last_login_at" TIMESTAMPTZ(6),
    "last_workspace_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_code" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" "otp_purpose" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "family_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "rotated_at" TIMESTAMPTZ(6),
    "user_agent" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "locale" TEXT NOT NULL DEFAULT 'vi',
    "status" "workspace_status" NOT NULL DEFAULT 'active',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "db_name" TEXT NOT NULL,
    "db_host" TEXT,
    "db_status" "workspace_db_status" NOT NULL DEFAULT 'provisioning',
    "schema_version" TEXT,
    "provisioned_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "archive_key" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership" (
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_key" TEXT NOT NULL,
    "status" "membership_status" NOT NULL DEFAULT 'active',
    "delegations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "joined_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_pkey" PRIMARY KEY ("workspace_id","user_id")
);

-- CreateTable
CREATE TABLE "invite" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role_key" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "invited_by_user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profile" (
    "workspace_id" UUID NOT NULL,
    "kind" "business_kind" NOT NULL,
    "tax_code" TEXT,
    "national_id" TEXT,
    "legal_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "representative" TEXT,
    "phone" TEXT,
    "founded_on" TEXT,
    "legal_status" TEXT,
    "industry_group" TEXT,
    "industry" TEXT,
    "business_description" TEXT NOT NULL,
    "declared_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_profile_pkey" PRIMARY KEY ("workspace_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "otp_code_email_purpose_created_at_idx" ON "otp_code"("email", "purpose", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_token_user_id_idx" ON "refresh_token"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_slug_key" ON "workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_db_name_key" ON "workspace"("db_name");

-- CreateIndex
CREATE INDEX "workspace_db_status_idx" ON "workspace"("db_status");

-- CreateIndex
CREATE UNIQUE INDEX "invite_token_hash_key" ON "invite"("token_hash");


-- Viết tay (standards/database/indexing.md): "=" trước, range / sort sau; INCLUDE cho covering; partial cho tập hay truy vấn.
-- Resolver membership mỗi request: WHERE user_id = $1 AND status = 'active' → Index Only Scan (workspace_id, role_key).
CREATE INDEX "membership_user_active_idx" ON "membership"("user_id") INCLUDE ("workspace_id", "role_key") WHERE "status" = 'active';
-- Danh sách thành viên của workspace (TIP-013): WHERE workspace_id = $1 ORDER BY created_at.
CREATE INDEX "membership_workspace_created_idx" ON "membership"("workspace_id", "created_at");
-- Lời mời đang chờ của workspace: WHERE workspace_id = $1 AND accepted_at IS NULL AND revoked_at IS NULL ORDER BY created_at DESC.
CREATE INDEX "invite_pending_idx" ON "invite"("workspace_id", "created_at" DESC) INCLUDE ("email", "role_key", "expires_at") WHERE "accepted_at" IS NULL AND "revoked_at" IS NULL;
-- Thu hồi cả family khi phát hiện dùng lại token: WHERE family_id = $1 AND revoked_at IS NULL.
CREATE INDEX "refresh_token_family_active_idx" ON "refresh_token"("family_id") WHERE "revoked_at" IS NULL;
-- Link đặt lại mật khẩu: tra theo hash token (POST /auth/password/reset { token }) — chỉ mã reset chưa dùng.
CREATE INDEX "otp_code_reset_hash_idx" ON "otp_code"("code_hash") WHERE "purpose" = 'reset' AND "consumed_at" IS NULL;
-- Email luôn chữ thường (DC-014).
ALTER TABLE "user" ADD CONSTRAINT "user_email_lower_chk" CHECK ("email" = lower(btrim("email")));

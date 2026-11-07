-- TIP-025b P3 (DC-377): trạng thái nhóm (revision chính sách AI cho CAS + ảnh chụp nhóm phía kênh) + lệnh quản lý nhóm bền.

CREATE TABLE "conversation_group_state" (
    "conversation_id" UUID NOT NULL,
    "policy_revision" INTEGER NOT NULL DEFAULT 0,
    "provider_name" TEXT,
    "provider_total" INTEGER,
    "account_role" TEXT,
    "link_enabled" BOOLEAN,
    "muted" BOOLEAN,
    "provider_version" TEXT,
    "complete" BOOLEAN NOT NULL DEFAULT false,
    "fetched_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversation_group_state_pkey" PRIMARY KEY ("conversation_id"),
    CONSTRAINT "conversation_group_state_role_check" CHECK ("account_role" IS NULL OR "account_role" IN ('owner', 'admin', 'member')),
    CONSTRAINT "conversation_group_state_conversation_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE
);

CREATE TABLE "group_command" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "channel_account_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "actor_id" UUID,
    "desired" JSONB NOT NULL DEFAULT '{}',
    "expected_version" TEXT,
    "status" "channel_operation_status" NOT NULL DEFAULT 'queued',
    "result" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "attempted_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "group_command_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "group_command_kind_check" CHECK ("kind" IN ('add_members', 'update', 'set_mute', 'refresh')),
    CONSTRAINT "group_command_conversation_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE
);

-- Lệnh của một hội thoại mới nhất trước: WHERE conversation_id = $1 ORDER BY created_at DESC, id DESC.
CREATE INDEX "group_command_conversation_idx" ON "group_command" ("conversation_id", "created_at" DESC, "id" DESC);
-- Một lệnh làm mới đang mở mỗi hội thoại (đọc lại nhóm không xếp hàng chồng).
CREATE UNIQUE INDEX "group_command_open_refresh_key" ON "group_command" ("conversation_id") WHERE "kind" = 'refresh' AND "status" IN ('queued', 'dispatch_reserved');

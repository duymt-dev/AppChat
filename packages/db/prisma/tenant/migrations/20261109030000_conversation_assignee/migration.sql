-- Đồng phụ trách hội thoại (mirror contact_collaborator, D32) — người/agent phụ trách CHÍNH vẫn ở conversation.assignee_user_id /
-- assignee_agent_id (không đổi). Bảng này chỉ thêm người/agent phụ trách bổ sung, luôn thêm bằng tay (không auto-route).

CREATE TYPE "assignee_kind" AS ENUM ('user', 'agent');

CREATE TABLE "conversation_assignee" (
    "conversation_id" UUID NOT NULL,
    "kind" "assignee_kind" NOT NULL,
    "assignee_id" UUID NOT NULL,
    "added_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_assignee_pkey" PRIMARY KEY ("conversation_id","kind","assignee_id")
);

CREATE INDEX "conversation_assignee_kind_assignee_id_conversation_id_idx" ON "conversation_assignee" ("kind", "assignee_id", "conversation_id");

-- TIP-026b P1 (DC253, DC-387): hoạt động CRM thật — ghi chú / bình luận (mở rộng contact_note), việc chăm sóc, cơ hội.
-- Ghi chú cũ giữ kind = note, tác giả / thời điểm giữ nguyên. Enum timeline thêm giá trị trước khi dùng.

ALTER TYPE "timeline_type" ADD VALUE IF NOT EXISTS 'comment';
ALTER TYPE "timeline_type" ADD VALUE IF NOT EXISTS 'contact_task';
ALTER TYPE "timeline_type" ADD VALUE IF NOT EXISTS 'contact_opportunity';

CREATE TYPE "contact_note_kind" AS ENUM ('note', 'comment');
CREATE TYPE "contact_task_state" AS ENUM ('open', 'done', 'cancelled');
CREATE TYPE "contact_opportunity_stage" AS ENUM ('open', 'qualified', 'proposal', 'won', 'lost');

ALTER TABLE "contact_note"
    ADD COLUMN "kind" "contact_note_kind" NOT NULL DEFAULT 'note',
    ADD COLUMN "actor_type" TEXT NOT NULL DEFAULT 'user',
    ADD COLUMN "actor_id" TEXT,
    ADD COLUMN "source_conversation_id" UUID,
    ADD COLUMN "source_message_id" UUID,
    ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "deleted_at" TIMESTAMPTZ(6),
    ALTER COLUMN "author_user_id" DROP NOT NULL;

CREATE TABLE "contact_task" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "due_at" TIMESTAMPTZ(6),
    "assignee_user_id" UUID,
    "state" "contact_task_state" NOT NULL DEFAULT 'open',
    "completed_at" TIMESTAMPTZ(6),
    "completed_by" UUID,
    "source_conversation_id" UUID,
    "source_message_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "actor_type" TEXT NOT NULL DEFAULT 'user',
    "actor_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contact_task_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contact_task_contact_fk" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE CASCADE,
    CONSTRAINT "contact_task_title_chk" CHECK (char_length("title") BETWEEN 1 AND 200),
    CONSTRAINT "contact_task_desc_chk" CHECK (char_length("description") <= 5000),
    -- Thời điểm hoàn thành chỉ có khi done (server suy ra).
    CONSTRAINT "contact_task_done_chk" CHECK (("state" = 'done') = ("completed_at" IS NOT NULL))
);

CREATE TABLE "contact_opportunity" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "need" TEXT NOT NULL DEFAULT '',
    "amount_vnd" BIGINT,
    "stage" "contact_opportunity_stage" NOT NULL DEFAULT 'open',
    "probability" DECIMAL(5, 2),
    "expected_close_date" DATE,
    "quote_id" UUID,
    "source_conversation_id" UUID,
    "source_message_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "actor_type" TEXT NOT NULL DEFAULT 'user',
    "actor_id" TEXT,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contact_opportunity_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contact_opportunity_contact_fk" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE CASCADE,
    CONSTRAINT "contact_opportunity_title_chk" CHECK (char_length("title") BETWEEN 1 AND 200),
    CONSTRAINT "contact_opportunity_need_chk" CHECK (char_length("need") <= 5000),
    CONSTRAINT "contact_opportunity_amount_chk" CHECK ("amount_vnd" IS NULL OR "amount_vnd" BETWEEN 0 AND 999999999999),
    CONSTRAINT "contact_opportunity_prob_chk" CHECK ("probability" IS NULL OR "probability" BETWEEN 0 AND 100)
);

-- Đọc theo loại (bằng trước, sắp xếp sau): ghi chú / bình luận mới nhất trước.
CREATE INDEX "contact_note_kind_time_idx" ON "contact_note" ("contact_id", "kind", "created_at" DESC, "id" DESC) INCLUDE ("version") WHERE "deleted_at" IS NULL;
-- Việc: trạng thái rồi hạn (NULL cuối) rồi id.
CREATE INDEX "contact_task_list_idx" ON "contact_task" ("contact_id", "state", "due_at" ASC NULLS LAST, "id") INCLUDE ("assignee_user_id", "version");
-- Cơ hội chưa lưu trữ: mới cập nhật trước.
CREATE INDEX "contact_opportunity_live_idx" ON "contact_opportunity" ("contact_id", "updated_at" DESC, "id" DESC) INCLUDE ("stage", "version") WHERE "archived_at" IS NULL;

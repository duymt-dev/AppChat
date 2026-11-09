-- TIP-015d (D32, COMMERCE §8b): chuyển phụ trách khách là MỘT transaction tenant — khách + hội thoại / báo giá / lịch hẹn được chọn +
-- biên nhận + timeline + outbox cùng commit. Không còn consumer async đổi báo giá sau commit.
--   · contact.transfer_generation: tăng mỗi lần đổi phụ trách thật (no-op không tăng) — hoàn tác chỉ áp cho lần chuyển mới nhất.
--   · conversation.assignment_revision / quote.assignment_revision: trigger tăng khi đổi người / agent được gán — biên nhận so số này
--     (không so giá trị — chống ABA). Lịch hẹn dùng `version` sẵn có.
--   · quote.assigned_user_id: người phụ trách VẬN HÀNH (scope own / nhắc T-2 / chuyển theo khách). quote.owner_user_id giữ là người tạo
--     tính doanh số — trigger chặn mọi đổi giá trị (kể cả về null). Backfill một lần = owner; sau đó null = chưa giao (không fallback).
--   · contact_transfer + contact_transfer_item: biên nhận nhỏ (id + trước / sau + revision), không chép payload thực thể.
--   · contact_transfer_notice: ràng thông báo với lần chuyển + người nhận + chiều; tiêu đề hiển thị chiếu theo quyền lúc đọc.
ALTER TABLE "contact" ADD COLUMN "transfer_generation" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "conversation" ADD COLUMN "assignment_revision" INTEGER NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION conversation_assignment_revision() RETURNS trigger AS $$
BEGIN
  IF NEW.assignee_user_id IS DISTINCT FROM OLD.assignee_user_id OR NEW.assignee_agent_id IS DISTINCT FROM OLD.assignee_agent_id THEN
    NEW.assignment_revision := OLD.assignment_revision + 1;
  ELSE
    NEW.assignment_revision := OLD.assignment_revision;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "conversation_assignment_revision" BEFORE UPDATE ON "conversation"
  FOR EACH ROW EXECUTE FUNCTION conversation_assignment_revision();

ALTER TABLE "quote" ADD COLUMN "assigned_user_id" UUID;
ALTER TABLE "quote" ADD COLUMN "assignment_revision" INTEGER NOT NULL DEFAULT 0;
UPDATE "quote" SET "assigned_user_id" = "owner_user_id";
CREATE OR REPLACE FUNCTION quote_assignment_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
    RAISE EXCEPTION 'quote.owner_user_id is immutable' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.assigned_user_id IS DISTINCT FROM OLD.assigned_user_id THEN
    NEW.assignment_revision := OLD.assignment_revision + 1;
  ELSE
    NEW.assignment_revision := OLD.assignment_revision;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "quote_assignment_guard" BEFORE UPDATE ON "quote"
  FOR EACH ROW EXECUTE FUNCTION quote_assignment_guard();

CREATE TABLE "contact_transfer" (
  "id" UUID NOT NULL,
  "contact_id" UUID NOT NULL REFERENCES "contact"("id"),
  "from_user_id" UUID,
  "to_user_id" UUID NOT NULL,
  "from_team_id" UUID,
  "to_team_id" UUID,
  "generation" INTEGER NOT NULL,
  "move" JSONB NOT NULL,
  "counts" JSONB NOT NULL,
  "collab" JSONB,
  "status" TEXT NOT NULL DEFAULT 'applied',
  "idempotency_key" TEXT,
  "source" TEXT NOT NULL,
  "actor_id" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  "undone_at" TIMESTAMPTZ(6),
  CONSTRAINT "contact_transfer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contact_transfer_status_chk" CHECK ("status" IN ('applied', 'undone')),
  CONSTRAINT "contact_transfer_generation_chk" CHECK ("generation" >= 1)
);
CREATE UNIQUE INDEX "contact_transfer_contact_generation_key" ON "contact_transfer" ("contact_id", "generation");
CREATE INDEX "contact_transfer_contact_recent_idx" ON "contact_transfer" ("contact_id", "created_at" DESC, "id" DESC)
  INCLUDE ("from_user_id", "to_user_id", "generation");

CREATE TABLE "contact_transfer_item" (
  "transfer_id" UUID NOT NULL REFERENCES "contact_transfer"("id"),
  "domain" TEXT NOT NULL,
  "entity_id" UUID NOT NULL,
  "before_user_id" UUID,
  "before_agent_id" TEXT,
  "before_team_id" UUID,
  "after_team_id" UUID,
  "after_assignment_revision" INTEGER NOT NULL,
  CONSTRAINT "contact_transfer_item_pkey" PRIMARY KEY ("transfer_id", "domain", "entity_id") INCLUDE ("after_assignment_revision"),
  CONSTRAINT "contact_transfer_item_domain_chk" CHECK ("domain" IN ('conversation', 'quote', 'appointment'))
);

CREATE TABLE "contact_transfer_notice" (
  "notification_id" UUID NOT NULL,
  "transfer_id" UUID NOT NULL REFERENCES "contact_transfer"("id"),
  "recipient_user_id" UUID NOT NULL,
  "direction" TEXT NOT NULL,
  CONSTRAINT "contact_transfer_notice_pkey" PRIMARY KEY ("notification_id"),
  CONSTRAINT "contact_transfer_notice_direction_chk" CHECK ("direction" IN ('from', 'to'))
);
CREATE UNIQUE INDEX "contact_transfer_notice_delivery_key" ON "contact_transfer_notice" ("transfer_id", "recipient_user_id", "direction");

-- Tập ứng viên chuyển (khách `=` → trạng thái `=` → id) và scope vận hành báo giá.
CREATE INDEX "quote_assigned_status_idx" ON "quote" ("assigned_user_id", "status", "updated_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX "quote_contact_status_idx" ON "quote" ("contact_id", "status", "id") INCLUDE ("root_quote_id", "version") WHERE "deleted_at" IS NULL;
CREATE INDEX "appointment_contact_status_idx" ON "appointment" ("contact_id", "status", "start_at", "id") WHERE "deleted_at" IS NULL;
CREATE INDEX "conversation_contact_status_idx" ON "conversation" ("contact_id", "status", "id") WHERE "archived_at" IS NULL;

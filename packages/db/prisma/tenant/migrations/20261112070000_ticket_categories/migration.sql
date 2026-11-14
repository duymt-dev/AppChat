-- TIP-034b §1–§2: từ điển gợi ý danh mục ticket + đọc "nhãn đã dùng" theo scope người xem (không distinct toàn cục).
-- `ticket_category_config`: một dòng / workspace (key cố định), CHECK giữ đúng khoá + version ≥ 1 + labels là mảng. Lần sửa đầu dùng
-- INSERT … ON CONFLICT DO NOTHING (hai yêu cầu cùng version 0 → một thắng); sau đó UPDATE … WHERE version = $if_version.
CREATE TABLE "ticket_category_config" (
  "key" text PRIMARY KEY,
  "labels" jsonb NOT NULL,
  "version" integer NOT NULL,
  "updated_at" timestamptz(6) NOT NULL,
  "updated_by" text,
  CONSTRAINT "ticket_category_config_key_chk" CHECK ("key" = 'ticket_categories'),
  CONSTRAINT "ticket_category_config_version_chk" CHECK ("version" >= 1),
  CONSTRAINT "ticket_category_config_labels_chk" CHECK (jsonb_typeof("labels") = 'array')
);

-- Nhãn đã dùng theo scope (keyset theo nhãn, collation "C" — so sánh byte ổn định với cursor): all · own (người phụ trách / người tạo)
-- · team (DC-299). Mỗi scope một index bắt đầu bằng cột `=` của scope rồi tới nhãn → Index Only Scan + skip theo nhãn kế tiếp.
CREATE INDEX "ticket_category_c_idx" ON "ticket" ("category" COLLATE "C");
CREATE INDEX "ticket_assignee_category_c_idx" ON "ticket" ("assignee_user_id", "category" COLLATE "C") WHERE "assignee_user_id" IS NOT NULL;
CREATE INDEX "ticket_creator_category_c_idx" ON "ticket" ("created_by_type", "created_by_id", "category" COLLATE "C") INCLUDE ("id");
CREATE INDEX "ticket_team_category_c_idx" ON "ticket" ("team_id", "category" COLLATE "C") WHERE "team_id" IS NOT NULL;

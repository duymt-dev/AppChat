-- TIP-026b P3 (§4, §6): Kanban phân trang theo cột + profile_layout CAS.
-- (1) Index theo cột giai đoạn cho từng thứ tự sắp xếp còn thiếu (recent đã có contact_stage_recent_idx): stage `=` trước, sort + id sau,
--     partial khách chưa xoá — trang một cột đi thẳng Index Scan + LIMIT, không window toàn bảng.
CREATE INDEX "contact_stage_name_idx" ON "contact" ("stage", "name", "id") WHERE "deleted_at" IS NULL;
CREATE INDEX "contact_stage_created_idx" ON "contact" ("stage", "created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX "contact_stage_spent_idx" ON "contact" ("stage", "total_spent" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
-- Scope own: chủ + giai đoạn + recent (cột kanban của Sales).
CREATE INDEX "contact_owner_stage_recent_idx" ON "contact" ("owner_user_id", "stage", "last_interaction_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;

-- (2) Phiên bản lạc quan của mẫu bố cục: mọi UPDATE nội dung tăng version qua trigger (không tin version người gọi gửi). Gán vai trò ở bảng
--     profile_layout_role nên không đổi version nội dung. Bản ghi cũ giữ id / tabs, version bắt đầu 1.
ALTER TABLE "profile_layout" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "profile_layout" ADD CONSTRAINT "profile_layout_version_positive" CHECK ("version" >= 1);

CREATE OR REPLACE FUNCTION profile_layout_bump_version() RETURNS trigger AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name OR NEW.tabs IS DISTINCT FROM OLD.tabs THEN
    NEW.version := OLD.version + 1;
  ELSE
    NEW.version := OLD.version;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profile_layout_bump_version
  BEFORE UPDATE ON "profile_layout"
  FOR EACH ROW EXECUTE FUNCTION profile_layout_bump_version();

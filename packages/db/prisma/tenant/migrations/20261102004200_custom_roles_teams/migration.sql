-- TIP-042: vai trò tuỳ biến + nhóm (P1). Expand-only: cột mới có mặc định, bản app cũ vẫn đọc / ghi được.
-- Vai trò: version (CAS) + deleted_at (xoá mềm — tombstone không resolve / gán / mời). Nhóm: version + trưởng nhóm.
ALTER TABLE "role" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1, ADD COLUMN "deleted_at" TIMESTAMPTZ(6);
ALTER TABLE "team" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1, ADD COLUMN "lead_user_id" UUID;

-- Phiên bản quyền tenant (một dòng): mọi thay đổi vai trò tuỳ biến / nhóm tăng cùng transaction; resolver đọc mỗi lần và khoá cache theo số này.
CREATE TABLE "authz_revision" (
  "id" SMALLINT NOT NULL DEFAULT 1,
  "revision" BIGINT NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "authz_revision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "authz_revision_singleton" CHECK ("id" = 1)
);
INSERT INTO "authz_revision" ("id", "revision") VALUES (1, 1);

-- Danh sách vai trò còn sống: hệ thống trước, theo ngày tạo (ID-page, không INCLUDE mảng permissions dài).
CREATE INDEX "role_live_list_idx" ON "role" ("is_system" DESC, "created_at", "id") INCLUDE ("name", "version") WHERE "deleted_at" IS NULL;
-- Danh sách nhóm theo ngày tạo.
CREATE INDEX "team_list_idx" ON "team" ("created_at", "id") INCLUDE ("name", "version", "lead_user_id");

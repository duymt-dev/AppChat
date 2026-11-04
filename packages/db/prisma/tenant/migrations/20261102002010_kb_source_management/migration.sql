-- TIP-020b — quản lý nguồn KB: thư mục có version (CAS sửa / xoá), tên thư mục không trùng (không dấu, không phân biệt hoa thường —
-- cùng quy tắc foldText của kb.folder.create) bằng unique expression; nguồn tra theo thư mục (đếm phụ thuộc khi xoá, kế thừa visibility).
-- Dữ liệu cũ trùng tên (trước khi có index): KHÔNG xoá thư mục của người dùng — đổi tên bản sau thành "<tên> (2)", "(3)"… rồi mới tạo index.
ALTER TABLE "kb_folder" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

WITH d AS (
  SELECT id, row_number() OVER (PARTITION BY f_unaccent(lower(btrim(name))) ORDER BY created_at, id) AS n
  FROM "kb_folder"
)
UPDATE "kb_folder" f SET name = left(f.name, 54) || ' (' || d.n || ')' FROM d WHERE d.id = f.id AND d.n > 1;

CREATE UNIQUE INDEX "kb_folder_name_key" ON "kb_folder" (f_unaccent(lower(btrim("name"))));

-- Xoá thư mục chỉ khi rỗng: nguồn còn sống đếm bằng `kb_source_folder_status_idx` (partial deleted_at IS NULL — TIP-020); nguồn trong
-- thùng rác đếm bằng partial bổ sung dưới đây (không chồng index cũ).
CREATE INDEX "kb_source_folder_trash_idx" ON "kb_source" ("folder_id") WHERE "deleted_at" IS NOT NULL AND "folder_id" IS NOT NULL;

-- TIP-030b F1: hợp đồng từ tệp + mẫu theo loại (COMMERCE §9 hai nguồn nội dung; DC-230). Chỉ thêm cột / index, không xoá dữ liệu.

-- Mẫu mặc định chia hai nhóm: chung (contract_kind rỗng — mọi loại chứng từ như TIP-028) và riêng từng loại hợp đồng. Index cũ
-- `doc_template_default_uq (kind)` thay bằng hai index partial; dữ liệu cũ (contract_kind luôn rỗng) giữ đúng một mặc định mỗi kind.
DROP INDEX IF EXISTS "doc_template_default_uq";
CREATE UNIQUE INDEX "doc_template_default_uq" ON "doc_template" ("kind") WHERE "is_default" AND "deleted_at" IS NULL AND "contract_kind" IS NULL;
CREATE UNIQUE INDEX "doc_template_default_kind_uq" ON "doc_template" ("kind", "contract_kind") WHERE "is_default" AND "deleted_at" IS NULL AND "contract_kind" IS NOT NULL;
-- contract_kind chỉ có nghĩa với mẫu hợp đồng.
ALTER TABLE "doc_template" ADD CONSTRAINT "doc_template_contract_kind_ck" CHECK ("contract_kind" IS NULL OR ("kind" = 'contract' AND "contract_kind" IN ('service', 'sale', 'framework')));

-- Nguồn nội dung ký: `template` (render từ mẫu — mọi hợp đồng cũ) hoặc `file` (PDF / DOCX tải lên / từ tệp hội thoại). Bản gốc bất biến
-- (`source_file_id` + `source_hash`, không bao giờ ghi đè); DOCX đổi sang PDF đóng băng (`rendered_unsigned_*`). PDF ký (Bên A) và PDF
-- cuối vẫn ở `file_id` / `signed_file_id` như TIP-030. `source_version` tăng mỗi lần thay tệp nguồn khi còn nháp (CAS).
CREATE TYPE "contract_source" AS ENUM ('template', 'file');
ALTER TABLE "contract"
  ADD COLUMN "source" "contract_source" NOT NULL DEFAULT 'template',
  ADD COLUMN "source_file_id" UUID,
  ADD COLUMN "source_hash" TEXT,
  ADD COLUMN "source_mime" TEXT,
  ADD COLUMN "rendered_unsigned_file_id" UUID,
  ADD COLUMN "rendered_unsigned_hash" TEXT,
  ADD COLUMN "source_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "origin_message_id" UUID,
  ADD COLUMN "origin_attachment_idx" INTEGER;
ALTER TABLE "contract" ADD CONSTRAINT "contract_source_file_fkey" FOREIGN KEY ("source_file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contract" ADD CONSTRAINT "contract_rendered_unsigned_fkey" FOREIGN KEY ("rendered_unsigned_file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Nguồn file phải có tệp + hash; nguồn mẫu không có tệp nguồn (hợp đồng cũ backfill `template`, không bịa hash).
ALTER TABLE "contract" ADD CONSTRAINT "contract_source_ck" CHECK (("source" = 'template' AND "source_file_id" IS NULL) OR ("source" = 'file' AND "source_file_id" IS NOT NULL AND "source_hash" IS NOT NULL));

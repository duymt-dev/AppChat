-- TIP-028b §2.1 (templates.md §2 "Chứng từ ghi template_id + template_version đã dùng"): đề nghị thanh toán / phiếu thu chụp mẫu lúc tạo.
-- Cột null cho bản ghi cũ (render theo mẫu mặc định hiện hành như trước). Index partial phục vụ kiểm "mẫu đã được chứng từ dùng" khi hoàn
-- tác tạo mẫu (`doc_template.create` undo, EXISTS theo template_id trên báo giá / hợp đồng / đề nghị / khoản thu) — chỉ dòng có mẫu.
ALTER TABLE "invoice" ADD COLUMN "template_id" uuid, ADD COLUMN "template_version" integer;
ALTER TABLE "customer_payment" ADD COLUMN "template_id" uuid, ADD COLUMN "template_version" integer;

CREATE INDEX "invoice_template_idx" ON "invoice" ("template_id") WHERE "template_id" IS NOT NULL;
CREATE INDEX "customer_payment_template_idx" ON "customer_payment" ("template_id") WHERE "template_id" IS NOT NULL;
CREATE INDEX "quote_template_idx" ON "quote" ("template_id") WHERE "template_id" IS NOT NULL;
CREATE INDEX "contract_template_idx" ON "contract" ("template_id") WHERE "template_id" IS NOT NULL;

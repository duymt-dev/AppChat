-- TIP-034b §4: tập nhập / xuất `ticket_category_suggestions` (từ điển gợi ý danh mục ticket — cấu hình, không phải bản ghi ticket) dùng
-- engine kế hoạch 038b. Mở rộng CHECK thực thể của `transfer_plan`; tập vẫn chỉ `base` (CHECK dataset giữ nguyên).
ALTER TABLE "transfer_plan" DROP CONSTRAINT "transfer_plan_entity_chk";
ALTER TABLE "transfer_plan" ADD CONSTRAINT "transfer_plan_entity_chk"
  CHECK ("entity" IN ('contact', 'product', 'quote', 'order', 'contract', 'invoice', 'ticket_category_suggestions'));

-- TIP-038b P2 (DC-374): nhóm dòng (báo giá / đơn — header + dòng hàng ghi nguyên tử theo khoá nhóm) + tra dòng đã ghi ở kế hoạch trước
-- của cùng người (nhập lại cùng tệp → trùng, không tạo nháp lần hai).
ALTER TABLE "transfer_row" ADD COLUMN "group_key" TEXT;

-- Vòng ghi lấy cả nhóm đang chờ: WHERE plan_id = $1 AND group_key = $2 AND status = 'pending'.
CREATE INDEX "transfer_row_group_pending_idx" ON "transfer_row" ("plan_id", "group_key") WHERE "status" = 'pending';

-- Nhập lại cùng tệp: WHERE row_key = ANY($1) AND status = 'applied' (join plan theo người tạo + thực thể).
CREATE INDEX "transfer_row_applied_key_idx" ON "transfer_row" ("row_key") INCLUDE ("plan_id") WHERE "status" = 'applied';

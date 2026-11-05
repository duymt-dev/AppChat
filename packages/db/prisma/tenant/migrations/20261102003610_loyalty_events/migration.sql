-- TIP-036 P2 — Khách thân thiết: mốc quý đã xét hạng (job loyalty.sweep chạy lại / sau restart không xét lại cùng quý) và index đọc
-- khoản trả bằng điểm của đơn (đảo khi huỷ). Đổi điểm ghi khoản thu kind / method `points` có sẵn (enum TIP-032).
ALTER TABLE "loyalty_config" ADD COLUMN "tier_reviewed" TEXT;

-- Huỷ đơn trả điểm đã dùng: khoản `points` đã xác nhận theo đơn.
CREATE INDEX "customer_payment_order_points_idx" ON "customer_payment" ("order_id") INCLUDE ("invoice_id") WHERE "kind" = 'points' AND "status" = 'confirmed';

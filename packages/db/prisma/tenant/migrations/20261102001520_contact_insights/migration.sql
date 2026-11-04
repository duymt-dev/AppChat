-- TIP-015b P2 — insight khách (Hồ sơ 360°): khoản thu gần nhất + LTV theo khách. Truy vấn: WHERE contact_id = $1 AND status = 'confirmed'
-- ORDER BY paid_at DESC, id DESC (customer-kpis.ts) → equality trước, sort sau; INCLUDE payload nhỏ (kind, amount, invoice_id, order_id)
-- cho index-only + join scope. Partial chỉ khoản đã xác nhận (pending / needs_review không vào KPI). Bảng chưa có index theo khách.
CREATE INDEX "customer_payment_contact_confirmed_idx" ON "customer_payment" ("contact_id", "paid_at" DESC, "id" DESC)
  INCLUDE ("kind", "amount", "invoice_id", "order_id") WHERE "status" = 'confirmed';

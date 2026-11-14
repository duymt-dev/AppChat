-- TIP-040 pha 3 (DC-372): index cho danh sách đối soát /admin (keyset desc, id trước — deferred join).
-- Hoá đơn theo trạng thái: `=` status trước, created_at / id sau; INCLUDE cột nhỏ để lọc workspace không về heap.
CREATE INDEX "billing_invoice_status_created_idx" ON "billing_invoice" ("status", "created_at" DESC, "id" DESC) INCLUDE ("workspace_id", "amount");
-- Giao dịch tiền vào CHƯA khớp: partial (matched_invoice_id IS NULL) — tập nhỏ, đúng truy vấn màn đối soát.
CREATE INDEX "bank_transaction_unmatched_idx" ON "bank_transaction" ("occurred_at" DESC, "id" DESC) INCLUDE ("amount", "provider") WHERE "matched_invoice_id" IS NULL AND "direction" = 'in';
-- Hàng đợi liên hệ bán hàng theo trạng thái.
CREATE INDEX "sales_inquiry_status_created_idx" ON "sales_inquiry" ("status", "created_at" DESC, "id" DESC);
-- Danh sách workspace /admin (pha 4): trạng thái `=` trước, mới nhất trước.
CREATE INDEX "workspace_status_created_idx" ON "workspace" ("status", "created_at" DESC, "id" DESC);

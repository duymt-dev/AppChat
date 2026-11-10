-- TIP-003c §5.1: index quét nguồn đến hạn cho action riêng sales (keyset theo mốc + id).
-- Quét nguồn đến hạn theo keyset (§5.1): vị từ trạng thái trong partial, (mốc thời gian, id) để trang ID-only ≤ 200 không đói trang đầu.
CREATE INDEX "quote_open_due_keyset_idx" ON "quote" ("valid_until", "id") WHERE "status" IN ('sent', 'viewed') AND "deleted_at" IS NULL;
CREATE INDEX "invoice_open_due_keyset_idx" ON "invoice" ("due_date", "id") WHERE "status" IN ('sent', 'partial', 'overdue');
CREATE INDEX "customer_package_expiry_keyset_idx" ON "customer_package" ("expires_at", "id") WHERE "status" = 'active' AND "expires_at" IS NOT NULL;

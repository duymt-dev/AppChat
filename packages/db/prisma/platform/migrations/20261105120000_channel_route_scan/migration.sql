-- TIP-014b C: quét route kênh theo trang (keyset theo id tài khoản) — bằng trước (status, type), khoá trang sau; INCLUDE workspace để
-- Index Only Scan, không nạp cả bảng mọi tenant vào bộ nhớ mỗi nhịp lease.
CREATE INDEX "tenant_channel_route_scan_idx" ON "tenant_channel_route" ("status", "type", "channel_account_id") INCLUDE ("workspace_id");

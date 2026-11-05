-- TIP-014b D3: đồng bộ danh bạ tài khoản kênh (Zalo) — lần chạy bền (`channel.sync_contacts` → 202) + ảnh chụp danh bạ RIÊNG của tài khoản,
-- hạn 24 giờ. Không tự nhập khách, không gửi lời mời; nhập là thao tác tay riêng qua `contact.import` (crm.import).
CREATE TABLE "channel_contact_sync" (
  "id" UUID NOT NULL,
  "channel_account_id" UUID NOT NULL,
  "actor_id" UUID,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "generation" INTEGER,
  "pages" INTEGER NOT NULL DEFAULT 0,
  "received" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "started_at" TIMESTAMPTZ(6),
  "finished_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "channel_contact_sync_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "channel_contact_sync_status_check" CHECK ("status" IN ('queued', 'running', 'complete', 'partial', 'failed', 'superseded')),
  CONSTRAINT "channel_contact_sync_account_fkey" FOREIGN KEY ("channel_account_id") REFERENCES "channel_account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Lần mới nhất theo tài khoản: bằng trước, mốc sau.
CREATE INDEX "channel_contact_sync_account_idx" ON "channel_contact_sync" ("channel_account_id", "created_at" DESC, "id" DESC);
-- Dọn ảnh chụp hết hạn.
CREATE INDEX "channel_contact_sync_expires_idx" ON "channel_contact_sync" ("expires_at");

CREATE TABLE "channel_contact_snapshot" (
  "sync_id" UUID NOT NULL,
  "external_id" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "phone" TEXT,
  "seq" INTEGER NOT NULL,
  CONSTRAINT "channel_contact_snapshot_pkey" PRIMARY KEY ("sync_id", "external_id"),
  CONSTRAINT "channel_contact_snapshot_sync_fkey" FOREIGN KEY ("sync_id") REFERENCES "channel_contact_sync" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Trang ảnh chụp theo thứ tự nhà cung cấp trả: bằng trước, khoảng sau.
CREATE INDEX "channel_contact_snapshot_page_idx" ON "channel_contact_snapshot" ("sync_id", "seq");

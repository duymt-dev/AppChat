-- TIP-012b P2 (DC-383): biên nhận ngân hàng chuẩn tắc — khoá (provider, tài khoản, mã giao dịch) độc lập với feed / kết nối, nên
-- kết nối lại (feed / connection mới) không nhận đôi cùng một giao dịch. Webhook ghi biên nhận + outbox rồi ACK; consumer ROLE=jobs
-- xử lý và chuyển `processed` cùng transaction với bank_tx / khoản thu.
CREATE TYPE "bank_receipt_status" AS ENUM ('accepted', 'processed', 'ignored');

CREATE TABLE "bank_receipt" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "account_no" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "feed_id" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "direction" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "bank_receipt_status" NOT NULL DEFAULT 'accepted',
    "reason" TEXT,
    "bank_tx_id" UUID,
    "deliveries" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),
    CONSTRAINT "bank_receipt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bank_receipt_feed_fk" FOREIGN KEY ("feed_id") REFERENCES "tenant_bank_feed"("id") ON DELETE RESTRICT,
    CONSTRAINT "bank_receipt_tx_fk" FOREIGN KEY ("bank_tx_id") REFERENCES "bank_tx"("id") ON DELETE RESTRICT,
    CONSTRAINT "bank_receipt_direction_check" CHECK ("direction" IN ('in', 'out')),
    CONSTRAINT "bank_receipt_amount_check" CHECK ("amount" >= 0),
    CONSTRAINT "bank_receipt_ids_check" CHECK (length("external_id") BETWEEN 1 AND 200 AND length("account_no") BETWEEN 1 AND 40),
    CONSTRAINT "bank_receipt_processed_check" CHECK (("status" = 'processed') = ("bank_tx_id" IS NOT NULL))
);
-- Định danh chuẩn tắc (indexing: cột '=' trước).
CREATE UNIQUE INDEX "bank_receipt_provider_account_no_external_id_key" ON "bank_receipt" ("provider", "account_no", "external_id");
-- Hàng chờ xử lý / khôi phục: partial chỉ biên nhận chưa xử lý, theo thời điểm nhận.
CREATE INDEX "bank_receipt_pending_idx" ON "bank_receipt" ("created_at", "id") INCLUDE ("feed_id") WHERE "status" = 'accepted';
-- Lịch sử theo tài khoản (đọc / đối soát ở P3): (provider, tài khoản, thời điểm giao dịch) INCLUDE trạng thái + bank_tx.
CREATE INDEX "bank_receipt_account_time_idx" ON "bank_receipt" ("provider", "account_no", "occurred_at" DESC, "id") INCLUDE ("status", "bank_tx_id");

-- Feed: mỗi tài khoản một feed tự động đang bật (TIP-012b §3.2) — đã có dữ liệu trùng thì migration KHÔNG tự xoá: chỉ tạo index
-- khi sạch; trùng → ghi cảnh báo, giữ nguyên lịch sử (đối soát tay).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "tenant_bank_feed" WHERE "status" = 'active' AND "account_no" <> ''
    GROUP BY "provider", "account_no" HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX "tenant_bank_feed_active_account_key" ON "tenant_bank_feed" ("provider", "account_no") WHERE "status" = 'active' AND "account_no" <> '';
  ELSE
    RAISE WARNING 'tenant_bank_feed: có tài khoản trùng feed đang bật — bỏ qua unique, cần đối soát tay (TIP-012b §3.2)';
  END IF;
END $$;

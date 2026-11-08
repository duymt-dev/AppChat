-- TIP-015f §3.4–§3.6: biên nhận riêng tư cho đơn sàn MỚI của người mua mà khách gốc đã xoá mềm / định danh không xác định — không tạo đơn /
-- khách, không đếm đã nhập. Một dòng mỗi (kết nối, mã ngoài); payload đã chuẩn hoá (external-order-payload.ts), hash chuẩn tắc, mốc cập nhật
-- của sàn. Không lộ ra action log / model / lỗi / sức khoẻ. Kiểm kê quyền riêng tư 015c phải gồm bảng này.
CREATE TYPE "blocked_order_state" AS ENUM ('pending', 'conflict', 'imported', 'superseded');
CREATE TYPE "blocked_order_reason" AS ENUM ('contact_deleted', 'identity_unavailable');

CREATE TABLE "blocked_external_order" (
  "id" UUID NOT NULL,
  "connection_id" UUID NOT NULL,
  "external_id" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "provider_updated_at" TIMESTAMPTZ(6) NOT NULL,
  "contact_ref" UUID,
  "reason" "blocked_order_reason" NOT NULL,
  "state" "blocked_order_state" NOT NULL DEFAULT 'pending',
  "source_event_id" UUID,
  "order_id" UUID,
  "received_at" TIMESTAMPTZ(6) NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "blocked_external_order_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "blocked_external_order_ext_len" CHECK (char_length("external_id") BETWEEN 1 AND 256)
);
CREATE UNIQUE INDEX "blocked_external_order_conn_ext_key" ON "blocked_external_order" ("connection_id", "external_id");
-- Thử lại theo kết nối: id trước (lô có giới hạn) rồi mới lấy payload.
CREATE INDEX "blocked_external_order_retry_idx" ON "blocked_external_order" ("connection_id", "state", "received_at", "id");

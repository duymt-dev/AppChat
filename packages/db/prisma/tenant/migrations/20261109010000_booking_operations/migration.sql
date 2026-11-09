-- TIP-033b §3.1, §5.2: phiên bản (CAS) cho nhân sự + cấu hình lịch, ngày nghỉ tường minh của nhân sự, index chiếm chỗ / phân trang nhân sự.
-- Dòng ca riêng cũ giữ `open = true`; thứ không có dòng vẫn là "theo giờ mở cửa" (không đổi vắng mặt thành nghỉ). booking_setting khởi
-- tạo idempotent (không ghi lại giờ mở cửa).

ALTER TABLE "staff" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "booking_setting" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "staff_schedule" ADD COLUMN "open" BOOLEAN NOT NULL DEFAULT true;

-- Ngày nghỉ (open = false) không mang giờ có nghĩa — vẫn giữ định dạng HH:mm hợp lệ để ràng buộc cũ đúng.
ALTER TABLE "staff_schedule" DROP CONSTRAINT "staff_schedule_time_chk";
ALTER TABLE "staff_schedule" ADD CONSTRAINT "staff_schedule_time_chk" CHECK (
  "start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND (NOT "open" OR "start_time" < "end_time")
);

INSERT INTO "booking_setting" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;

-- Phân trang cấu hình nhân sự: active DESC, sort, id (§3.6).
CREATE INDEX "staff_page_idx" ON "staff" ("active" DESC, "sort", "id") INCLUDE ("name", "version");

-- Chiếm chỗ theo nhân sự khi còn giữ chỗ (ngừng nhân sự / slot): staff_id = , start_at khoảng.
CREATE INDEX "appointment_staff_holding_idx" ON "appointment" ("staff_id", "start_at", "id") INCLUDE ("end_at", "block_end_at")
  WHERE "status" IN ('pending', 'confirmed', 'in_progress') AND "deleted_at" IS NULL;

-- Đếm chỗ đã giữ trong một liệu trình (xác nhận lại / đặt lịch gắn gói).
CREATE INDEX "appointment_package_holding_idx" ON "appointment" ("package_id")
  WHERE "package_id" IS NOT NULL AND "status" IN ('pending', 'confirmed', 'in_progress') AND "deleted_at" IS NULL;

-- Liệu trình theo khách (PackagesRead — cursor created_at DESC, id DESC).
CREATE INDEX "customer_package_contact_page_idx" ON "customer_package" ("contact_id", "created_at" DESC, "id" DESC)
  INCLUDE ("order_id", "product_id", "status", "total_sessions", "used_sessions", "expires_at");

-- TIP-033c §4.2: gợi ý tạo đơn theo hội thoại — lịch đã hoàn thành ngoài liệu trình, chưa có đơn, chưa xoá. Index một phần (chỉ tập
-- còn đủ điều kiện, nhỏ) theo "bằng trước, sắp xếp sau": conversation_id = … ORDER BY end_at DESC, id DESC; INCLUDE cột lọc scope / họ khách /
-- dịch vụ để lọc id trước LIMIT không quay về heap. Tra một lịch đi khoá chính — không thêm index.
CREATE INDEX "appointment_order_suggest_idx" ON "appointment" ("conversation_id", "end_at" DESC, "id" DESC)
  INCLUDE ("contact_id", "service_id", "owner_user_id", "team_id", "version")
  WHERE "status" = 'done' AND "package_id" IS NULL AND "order_id" IS NULL AND "deleted_at" IS NULL;

-- TIP-026: sắp xếp danh sách / kanban Khách hàng theo tên, ngày tạo, tổng chi tiêu (partial — chỉ khách chưa xoá, id phụ để ổn định).
CREATE INDEX "contact_live_name_idx" ON "contact" ("name", "id") WHERE "deleted_at" IS NULL;
CREATE INDEX "contact_live_created_idx" ON "contact" ("created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX "contact_live_spent_idx" ON "contact" ("total_spent" DESC, "id" DESC) WHERE "deleted_at" IS NULL;

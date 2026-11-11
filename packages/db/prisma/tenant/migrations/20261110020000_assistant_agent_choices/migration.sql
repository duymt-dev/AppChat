-- TIP-023d §7.2: GET assistant.agent_choices — keyset (updated_at DESC, id DESC) trên agent đang hoạt động đã xuất bản, covering tên/vai
-- trò/mức AI (tránh quay lại heap mỗi trang). Một phần: chỉ deleted_at IS NULL AND status='active' AND published_version>0.
CREATE INDEX "ai_agent_choices_idx" ON "ai_agent" ("updated_at" DESC, "id" DESC) INCLUDE ("name", "role", "role_label", "model_tier")
  WHERE "deleted_at" IS NULL AND "status" = 'active' AND "published_version" > 0;

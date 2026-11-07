-- TIP-042b: chia lead mới (COMMERCE §8b, REQ-F01c, DC-238). Expand-only; rule mặc định TẮT — không tự bật vì legacy `assign_mode` cũ.
-- Một rule mặc định (channel_account_id NULL) + tối đa một rule ghi đè mỗi tài khoản kênh. Pool = user_ids HOẶC team_id (một trong hai).
CREATE TABLE "lead_routing_rule" (
  "id" UUID NOT NULL,
  "channel_account_id" UUID,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "enabled_at" TIMESTAMPTZ(6),
  "mode" TEXT NOT NULL DEFAULT 'manual',
  "user_ids" UUID[] NOT NULL DEFAULT '{}',
  "team_id" UUID,
  "fixed_user_id" UUID,
  "version" INTEGER NOT NULL DEFAULT 1,
  "configured_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "lead_routing_rule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lead_routing_rule_mode_chk" CHECK ("mode" IN ('manual', 'round_robin', 'least_busy', 'by_channel')),
  CONSTRAINT "lead_routing_rule_pool_chk" CHECK ("team_id" IS NULL OR cardinality("user_ids") = 0)
);
CREATE UNIQUE INDEX "lead_routing_rule_default_key" ON "lead_routing_rule" ((true)) WHERE "channel_account_id" IS NULL;
CREATE UNIQUE INDEX "lead_routing_rule_account_key" ON "lead_routing_rule" ("channel_account_id") WHERE "channel_account_id" IS NOT NULL;

-- Con trỏ vòng tròn theo rule (khoá dòng này để tuần tự hoá lựa chọn giữa nhiều worker).
CREATE TABLE "lead_routing_cursor" (
  "rule_id" UUID NOT NULL,
  "last_user_id" UUID,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "lead_routing_cursor_pkey" PRIMARY KEY ("rule_id"),
  CONSTRAINT "lead_routing_cursor_rule_fkey" FOREIGN KEY ("rule_id") REFERENCES "lead_routing_rule"("id") ON DELETE CASCADE
);

-- Quyết định cấp chủ đầu tiên: một dòng mỗi khách và mỗi event (chạy lại trả kết quả cũ). Không lưu nội dung tin / SĐT.
CREATE TABLE "lead_routing_decision" (
  "id" UUID NOT NULL,
  "contact_id" UUID NOT NULL,
  "originating_event_id" UUID NOT NULL,
  "rule_id" UUID,
  "rule_version" INTEGER,
  "selected_user_id" UUID,
  "conversation_id" UUID,
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "lead_routing_decision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "lead_routing_decision_contact_key" ON "lead_routing_decision" ("contact_id");
CREATE UNIQUE INDEX "lead_routing_decision_event_key" ON "lead_routing_decision" ("originating_event_id");

-- Tải của người nhận: hội thoại người phụ trách đang mở / chờ / tạm ẩn, chưa lưu trữ / ẩn (least_busy — đếm theo assignee, Index Only Scan).
CREATE INDEX "conversation_routing_load_idx" ON "conversation" ("assignee_user_id") INCLUDE ("id")
  WHERE "assignee_user_id" IS NOT NULL AND "status" IN ('open', 'pending', 'snoozed') AND "archived_at" IS NULL AND "hidden_at" IS NULL;

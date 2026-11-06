-- TIP-038 pha 1: index nguồn cho metric (insight.query / GET /v1/insights/:metric) + thống kê agent. Chỉ thêm index (expand-only), không bảng
-- mới ở pha này. Theo indexing.md: cột `=` trước, khoảng thời gian sau; partial theo điều kiện cố định của truy vấn; INCLUDE cột payload nhỏ
-- (không JSONB) để Index Only Scan.

-- Lượt agent trực kênh (không dry-run) theo agent + khoảng thời gian: hội thoại / tỷ lệ lượt / Credit / nhóm khách được phục vụ.
CREATE INDEX "ai_run_agent_reply_idx" ON "ai_run" ("agent_id", "started_at")
  INCLUDE ("conversation_id", "status", "credits_used") WHERE "kind" = 'agent_reply' AND NOT "dry_run";

-- CSAT ticket giao cho agent, đóng trong kỳ.
CREATE INDEX "ticket_agent_closed_idx" ON "ticket" ("assignee_agent_id", "closed_at")
  INCLUDE ("csat") WHERE "assignee_agent_id" IS NOT NULL AND "closed_at" IS NOT NULL;

-- support.performance + CSAT người thật: ticket đóng theo kỳ (scope assignee / team / người tạo lọc trên dòng đã thu hẹp theo kỳ).
CREATE INDEX "ticket_closed_idx" ON "ticket" ("closed_at")
  INCLUDE ("csat", "sla_result", "assignee_user_id", "assignee_agent_id", "team_id") WHERE "closed_at" IS NOT NULL;

-- sales.collected: khoản thu xác nhận (trừ điểm) theo ngày thu.
CREATE INDEX "customer_payment_confirmed_paid_idx" ON "customer_payment" ("paid_at")
  INCLUDE ("amount", "invoice_id", "order_id") WHERE "status" = 'confirmed' AND "kind" <> 'points';

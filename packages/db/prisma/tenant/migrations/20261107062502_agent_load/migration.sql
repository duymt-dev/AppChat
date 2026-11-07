-- TIP-025b §B.6: tải mở của agent cho bộ chọn phụ trách — WHERE assignee_agent_id = ANY($1) AND status IN ('open','pending','snoozed')
-- AND archived_at IS NULL AND hidden_at IS NULL GROUP BY assignee_agent_id (Index Only Scan, cùng nghĩa conversation_routing_load_idx).
CREATE INDEX "conversation_agent_load_idx" ON "conversation" ("assignee_agent_id") INCLUDE ("id")
  WHERE "assignee_agent_id" IS NOT NULL AND "status" IN ('open', 'pending', 'snoozed') AND "archived_at" IS NULL AND "hidden_at" IS NULL;

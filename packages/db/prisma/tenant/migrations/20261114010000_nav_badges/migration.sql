-- TIP-016b: badge "Hộp thư" trên rail — count(*) hội thoại đang hiện còn tin chưa đọc trong scope người xem:
-- WHERE unread_count > 0 AND archived_at IS NULL AND hidden_at IS NULL AND status <> 'closed' AND (snoozed …) AND <scope inbox>.
-- Partial index chỉ chứa hội thoại chưa đọc đang hiện (tập nhỏ); khoá = người được gán (scope own bằng `=`), INCLUDE các cột scope /
-- tạm ẩn → Index Only Scan, không đọc heap của hội thoại đã đọc.
CREATE INDEX "conversation_unread_live_idx" ON "conversation" ("assignee_user_id") INCLUDE ("id", "team_id", "contact_id", "status", "snoozed_until")
  WHERE "unread_count" > 0 AND "archived_at" IS NULL AND "hidden_at" IS NULL AND "status" <> 'closed';

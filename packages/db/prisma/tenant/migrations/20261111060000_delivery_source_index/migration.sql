-- TIP-006b §6.1/§6.3: tra theo event nguồn — đẩy ý định ngay sau biên nhận v2 (flushEvent) và xoá theo "Quên khách" (thông báo + ý định
-- của event stream khách). Bằng trước (source_event_id), phạm vi sau (phase / id); partial bỏ thông báo cũ không có nguồn.
CREATE INDEX "notification_source_idx" ON "notification" ("source_event_id", "id") WHERE "source_event_id" IS NOT NULL;
CREATE INDEX "notification_delivery_source_idx" ON "notification_delivery" ("source_event_id", "phase", "id");
CREATE INDEX "realtime_delivery_source_idx" ON "realtime_delivery" ("source_event_id", "phase", "id");

-- TIP-006b §4.1, §3.7 (AC5): ý định nạp nguồn bền = dòng kb_source `pending` + ingest_seq (020b / 043). Quét khôi phục ROLE=ai tìm nguồn
-- chờ nạp quá hạn (đẩy job mất / Redis xoá) theo (refreshed_at, id); partial chỉ hàng pending còn sống, INCLUDE seq. Chỉ EXPAND.
CREATE INDEX "kb_source_pending_idx" ON "kb_source" ("refreshed_at", "id") INCLUDE ("ingest_seq") WHERE "status" = 'pending' AND "deleted_at" IS NULL;

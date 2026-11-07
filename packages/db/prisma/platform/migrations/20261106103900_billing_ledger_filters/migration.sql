-- TIP-039 pha 3 (AC07): lịch sử ví lọc server-side — `=` trước (workspace, nguồn / loại), rồi sort (created_at desc, id desc) cho keyset.
-- Chỉ chọn id ở bước 1 (deferred join) nên không INCLUDE cột rộng (note / meta JSON). Lọc vào / ra (delta > 0 / < 0) và khoảng ngày dùng
-- index workspace sẵn có `credit_ledger_ws_created_idx` (INCLUDE delta, kind).
CREATE INDEX "credit_ledger_ws_source_created_idx" ON "credit_ledger" ("workspace_id", "source", "created_at" DESC, "id" DESC) WHERE "source" IS NOT NULL;
CREATE INDEX "credit_ledger_ws_kind_created_idx" ON "credit_ledger" ("workspace_id", "kind", "created_at" DESC, "id" DESC);

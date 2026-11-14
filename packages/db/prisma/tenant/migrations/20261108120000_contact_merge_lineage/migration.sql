-- TIP-015e §3–§4: biên nhận gộp khách (riêng tư, không PII ngoài id) — một dòng mỗi đơn vị gộp (bản chính + các bản phụ), dòng con ghi
-- liên kết gốc từng bản ghi đã dời (identity / ghi chú / việc / cơ hội / thẻ / trường đã lấp) kèm phiên bản sau gộp để hoàn tác có điều
-- kiện. Hạn hoàn tác 7 ngày là cửa sổ YÊU CẦU, không bảo đảm. Hoá đơn / đơn / hợp đồng / sổ điểm KHÔNG dời (giữ id khách gốc — lineage).
CREATE TYPE "contact_merge_state" AS ENUM ('merged', 'undone', 'expired');

CREATE TABLE "contact_merge_receipt" (
    "id" UUID NOT NULL,
    "operation_id" TEXT NOT NULL,
    "primary_id" UUID NOT NULL,
    "source_ids" UUID[] NOT NULL,
    "actor_user_id" UUID,
    "state" "contact_merge_state" NOT NULL DEFAULT 'merged',
    "primary_version_after" INTEGER NOT NULL,
    "source_versions_after" JSONB NOT NULL,
    "acl_fingerprint" TEXT NOT NULL,
    "fill" JSONB NOT NULL DEFAULT '{}',
    "memory_receipt_id" UUID,
    "timeline_event_id" UUID,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "undone_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contact_merge_receipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "contact_merge_receipt_operation_key" ON "contact_merge_receipt" ("operation_id");
CREATE INDEX "contact_merge_receipt_primary_idx" ON "contact_merge_receipt" ("primary_id", "created_at" DESC);
-- Quét dọn: biên nhận chưa hoàn tác đã hết hạn — lô id trước.
CREATE INDEX "contact_merge_receipt_expiry_idx" ON "contact_merge_receipt" ("expires_at", "id") WHERE "state" = 'merged';

CREATE TABLE "contact_merge_receipt_item" (
    "receipt_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "from_contact_id" UUID NOT NULL,
    CONSTRAINT "contact_merge_receipt_item_pkey" PRIMARY KEY ("receipt_id", "kind", "entity_id")
);
ALTER TABLE "contact_merge_receipt_item" ADD CONSTRAINT "contact_merge_receipt_item_receipt_fkey" FOREIGN KEY ("receipt_id") REFERENCES "contact_merge_receipt"("id") ON DELETE CASCADE;

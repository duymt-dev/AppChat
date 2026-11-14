-- TIP-022c §1.1 / §2.3: tập tin khách nguồn của lượt (không chỉ tin cuối) — guard so lại digest trên CẢ tập (thu hồi / xoá một tin trong
-- tập → nguồn đổi). `source_digest` = sha256 các cặp (id, nội dung) theo thứ tự; `source_message_id` = tin neo (cuối tập).
ALTER TABLE "ai_sales_intent" ADD COLUMN "source_ids" UUID[] NOT NULL DEFAULT '{}';
ALTER TABLE "ai_sales_intent" ADD CONSTRAINT "ai_sales_intent_source_ids_chk" CHECK (cardinality("source_ids") BETWEEN 1 AND 10 AND "source_message_id" = ANY("source_ids"));

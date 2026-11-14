-- TIP-022c §2.3: epoch hội thoại lúc ghi biên nhận — người tiếp quản / đổi chế độ / chuyển phụ trách tăng epoch → biên nhận không dùng lại.
ALTER TABLE "ai_sales_intent" ADD COLUMN "ai_epoch" INTEGER;
-- Người ghi tin nguồn (xoá / thu hồi / xoá lịch sử) vô hiệu biên nhận còn prepared của hội thoại: `=` hội thoại rồi id, chỉ dòng prepared.
CREATE INDEX "ai_sales_intent_prepared_conv_idx" ON "ai_sales_intent" ("conversation_id", "id") INCLUDE ("source_ids") WHERE "state" = 'prepared';

-- TIP-022c §3.7–3.8: căn cứ tồn / giá của câu trả lời bán hàng đã dựng — ghi / đặt chỗ gửi quan sát lại tồn hiện tại theo run.
CREATE TABLE "ai_sales_publication" (
  "id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "agent_id" UUID,
  "items" JSONB NOT NULL,
  "alternatives" JSONB NOT NULL,
  "observation_digest" TEXT NOT NULL,
  "alternatives_digest" TEXT NOT NULL,
  "content_digest" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "ai_sales_publication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_sales_publication_conversation_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation" ("id") ON DELETE CASCADE,
  CONSTRAINT "ai_sales_publication_state_chk" CHECK ("state" IN ('active', 'invalidated')),
  -- Kế hoạch đóng: ≤ 5 sản phẩm hỏi, ≤ 3 thay thế (packages/ai/src/reply/sales-plan.ts).
  CONSTRAINT "ai_sales_publication_items_chk" CHECK (jsonb_typeof("items") = 'array' AND jsonb_array_length("items") <= 5),
  CONSTRAINT "ai_sales_publication_alts_chk" CHECK (jsonb_typeof("alternatives") = 'array' AND jsonb_array_length("alternatives") <= 3)
);
-- Ghi / đặt chỗ gửi tra theo run (tham chiếu mờ) — Index Scan unique.
CREATE UNIQUE INDEX "ai_sales_publication_run_key" ON "ai_sales_publication" ("run_id");
-- Kiểm kê "Quên khách" đi qua hội thoại của khách: `=` hội thoại rồi id.
CREATE INDEX "ai_sales_publication_conv_idx" ON "ai_sales_publication" ("conversation_id", "id");

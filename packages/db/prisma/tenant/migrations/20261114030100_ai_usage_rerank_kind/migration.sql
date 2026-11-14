-- TIP-020e §3.3: biên nhận lần gọi rerank đi cùng sổ 019b (nhóm `<run>:rerank:<bước>`). Chỉ mở rộng tập giá trị hợp lệ của `kind`.
ALTER TABLE "ai_usage_group" DROP CONSTRAINT "ai_usage_group_kind_check";
ALTER TABLE "ai_usage_group" ADD CONSTRAINT "ai_usage_group_kind_check" CHECK ("kind" IN ('chat', 'query_embed', 'ingest', 'rerank'));

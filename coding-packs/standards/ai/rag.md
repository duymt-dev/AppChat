# AI — RAG (Kho tri thức)

> Chốt D29 (2026-10-28). Gọi model (embed, rerank) qua **AI SDK** (`embedMany`, `embed`, `rerank`). Lưu trữ, cắt đoạn, tìm kiếm là phần tự viết trên Postgres (pgvector + pg_trgm), không thêm vector DB riêng.

## Quy tắc

1. **Một kho mỗi workspace**, tổ chức bằng thư mục (`kb_folder`) và thẻ, theo trang Dữ liệu RAG của prototype.
   - Nguồn (`origin`): `upload | url | text | catalog | conversation | drive`. `drive` là thẻ "Sắp có".
2. **Agent nhận tri thức theo phạm vi** `ai_agent.kb_scope = { folder_ids[], tags[] }`, không gán từng tài liệu.
   - `kb.search` của agent luôn lọc theo scope này.
3. **Tài liệu có `visibility`:**
   - `public`: agent trả lời khách được dùng.
   - `internal` (ví dụ hợp đồng, báo cáo nội bộ): chỉ Trợ lý dùng, cho người có quyền đọc module tương ứng.
   - Mặc định của thư mục kế thừa xuống tài liệu.
4. **Giá, tồn kho, khuyến mãi đang chạy, lịch trống, công nợ luôn lấy qua read action** (`product.search`, `booking.find_slots`…), **không bao giờ lấy từ RAG**.
   - Danh mục sản phẩm vào RAG chỉ phần mô tả / thông số. Đoạn có giá bị gắn `meta.volatile=true` và không đưa vào prompt.
5. **Nạp tài liệu (worker ROLE=ai, queue `kb-ingest`):**
   - Các bước: parse → chuẩn hoá → cắt đoạn → embed theo lô (`embedMany`) → ghi `kb_chunk`. Idempotent theo `sha256` của file.
   - Cắt đoạn theo cấu trúc: đề mục (giữ đường dẫn heading trong `meta.path`), bảng giữ nguyên hàng tiêu đề, Excel/CSV mỗi dòng là một đoạn kèm tên cột.
   - Đoạn dài ~400–800 token, chồng nhau 10–15%.
   - Sản phẩm đổi (`product.*` event) thì re-ingest đúng sản phẩm đó.
6. **Tìm kết hợp (hybrid):**
   - Lấy top-20 theo vector (cosine, HNSW, `hnsw.iterative_scan` khi có filter) và top-20 theo từ khoá (`f_unaccent(lower(content))` + `pg_trgm` / `tsvector simple`).
   - Gộp bằng RRF (k = 60). Có reranker cấu hình trong `model_route` purpose=`rerank` thì rerank, không thì giữ RRF.
   - Lấy top-6 làm ngữ cảnh.
7. **Ngưỡng căn cứ:** điểm cao nhất dưới `min_score` (cấu hình theo workspace) thì agent **không bịa**: nói chưa có thông tin rồi hỏi lại khách hoặc handoff. Không có đoạn nào thì không trả lời bằng kiến thức chung về chính sách của doanh nghiệp.
8. **Trích nguồn bắt buộc:**
   - Câu trả lời dựa trên RAG ghi `ai_run_step.output.citations[{source_id, chunk_id}]`.
   - UI hiện nguồn ở nhật ký AI và bản nháp; khách không thấy tên file nội bộ.
9. **Học từ hội thoại (P1) — có người duyệt:**
   - Hội thoại `resolved` có câu trả lời của người hoặc agent được khen thì job đề xuất cặp hỏi–đáp (`kb_suggestion`).
   - Đề xuất vào hàng chờ "AI đã học — chờ duyệt". **Chỉ vào kho sau khi người có quyền `kb.manage` duyệt** (sửa được trước khi duyệt). Không tự học ngầm.
   - PII bị che trước khi đề xuất.
10. **Embedding:** 1536 chiều, provider theo `model_route` purpose=`embed`.
    - Đổi model embed thì re-embed toàn kho bằng job, ghi `kb_chunk.embed_model`. Truy vấn chỉ so các đoạn cùng `embed_model`.
11. **Index:**
    - `hnsw (embedding vector_cosine_ops)`.
    - `gin (content_norm gin_trgm_ops)`.
    - `kb_chunk(source_id)`.
    - `kb_source(folder_id, status) WHERE deleted_at IS NULL`.
12. **Eval:** suite `rag` trong `ai/eval.md`: đúng nguồn, không bịa khi không có căn cứ, không dùng tài liệu `internal` cho khách, không lấy giá từ RAG.

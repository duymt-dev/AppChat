# Database — Index & truy vấn

> Bắt buộc với mọi truy vấn (Prisma, `$queryRaw`, migration). Mỗi TIP có list hoặc tìm kiếm phải ghi index cùng câu `EXPLAIN` vào Completion Report.

## Quy tắc

1. **Composite index: cột `=` trước, cột range / sort sau.**
   - `WHERE status = 'open' AND assignee_user_id = $1 ORDER BY last_message_at DESC` → `(status, assignee_user_id, last_message_at DESC)`.
   - DB tenant **không** có `workspace_id` ở đầu index.
2. **Covering index:** cột chỉ dùng trong `SELECT` của list thì đưa vào `INCLUDE (...)` để được Index Only Scan.
3. **Deferred join** cho list có `LIMIT` trên bảng nhiều cột rộng (`text`, `jsonb`): subquery lấy `id` theo index, rồi `JOIN` lại theo PK.
   ```sql
   SELECT c.* FROM (
     SELECT id FROM contact
     WHERE deleted_at IS NULL AND stage = $1
     ORDER BY last_interaction_at DESC, id DESC
     LIMIT 31
   ) s JOIN contact c ON c.id = s.id
   ORDER BY c.last_interaction_at DESC, c.id DESC;
   ```
4. **Cursor pagination** theo `(sort_col, id)`: `WHERE (sort_col, id) < ($1, $2)`. Index phải kết thúc bằng `id`.
5. **Partial index** cho tập hay truy vấn: `WHERE deleted_at IS NULL`, `WHERE status IN ('pending','sending')` (outbox), `WHERE read_at IS NULL` (notification).
6. **Expression index** khi lọc bằng hàm. Truy vấn phải dùng **đúng** biểu thức:
   - `lower(email)` (hoặc dùng `citext`);
   - `phone_norm`;
   - `f_unaccent(lower(name)) gin_trgm_ops` cho tìm tiếng Việt không dấu.
7. **Scope filter phải có index:** list có `scopeFilter` dạng `own` cần index bắt đầu bằng `owner_user_id` hoặc `assignee_user_id` cho đúng màn đó. Ví dụ: `conversation(assignee_user_id, status, last_message_at DESC)`, `contact(owner_user_id, last_interaction_at DESC) WHERE deleted_at IS NULL`.
8. **Không `SELECT *` trong list API.** Chọn cột theo DTO.
9. **Không N+1.** Nạp quan hệ theo lô (`IN (...)`) hoặc join; repo list có test đếm số query.
10. **Vector:** `ivfflat` / `hnsw` trên `kb_chunk.embedding`. Lọc `kb_id` trước, cosine sau.

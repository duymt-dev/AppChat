# API — Envelope, lỗi, phân trang, idempotency

> Áp dụng cho mọi route `/v1/*`, gồm cả các route GET đọc theo resource. Route `/hooks/*` và `/sign/*` công khai trả theo yêu cầu của provider / trang công khai, nhưng lỗi vẫn dùng `error.code`.

## Quy tắc

1. **Thành công:** `{ data, meta? }`. Không bao giờ trả mảng hoặc giá trị trần ở top-level.
2. **List:** `{ data: T[], next_cursor: string | null }`.
   - Cursor = base64url của `(sortKey, id)`. `?limit=` ≤ 100, mặc định 30.
   - **Không dùng offset** cho list mà người dùng cuộn. Offset chỉ dùng cho bảng quản trị có số trang, và phải kèm deferred join.
3. **Lỗi:** `{ error: { code, message, fields? } }`.
   - `code` là UPPER_SNAKE nằm trong `packages/shared/src/errors.ts`.
   - `fields` map tên trường → **mã lỗi** (không phải câu chữ). Client dịch bằng i18n.
   - `message` chỉ để debug (tiếng Anh).
4. **Một chỗ ném lỗi:** service ném `AppError(code, httpStatus?, fields?)`; filter toàn cục chuyển thành envelope. Cấm `res.status().json()` trong controller.
5. **Mã HTTP chuẩn:**
   - 422 `VALIDATION_FAILED` · 401 `UNAUTHENTICATED` · 403 `FORBIDDEN` / `SCOPE_FORBIDDEN` · 404 `NOT_FOUND` / `ACTION_NOT_FOUND`.
   - 409 `CONFLICT` / `UNDO_EXPIRED` / `CONTACT_OWNED` · 402 `PLAN_LIMIT_REACHED` / `CREDIT_EXHAUSTED` · 429 `RATE_LIMITED`.
   - 503 / 423 `WORKSPACE_UNAVAILABLE` · 500 `INTERNAL` (không lộ stack).
6. **Ghi luôn đi qua `POST /v1/actions/:id`** (xem `actions/action-registry.md`). Không thêm `PUT/PATCH/DELETE` nghiệp vụ. Ngoại lệ được phép: auth, upload file (presign), webhook, trang ký công khai.
7. **`Idempotency-Key`** bắt buộc với action có risk `send` / `money` và với lệnh tạo. Gửi lại cùng key thì trả kết quả cũ (`IDEMPOTENCY_REPLAY`, HTTP 200).
8. **Header bắt buộc:** `Authorization: Bearer <JWT 15m>` + `X-Workspace-Id` (trừ `/v1/auth/*`, `/v1/me`, `/hooks/*`, public). Thiếu hoặc sai membership thì 403 **trước khi** mở DB tenant.
9. **Kiểu tiền / thời gian ở JSON:**
   - Tiền là `string` số nguyên VND (bigint), ví dụ `"12500000"`.
   - Thời gian là ISO-8601 có offset.
   - ID là uuid.
   - Tên trường snake_case.
10. **Contract là zod**, nằm ở `packages/actions` (input / output action) và `packages/shared/src/api/*` (response đọc). OpenAPI sinh từ zod. FE dùng chung schema, không định nghĩa type tay.

## Ví dụ

```ts
// ✅
throw new AppError('QUOTE_EXPIRED', 409);
return { data: rows, next_cursor: encodeCursor(last) };
// ❌
return rows;                                  // thiếu envelope
res.status(400).json({ msg: 'Báo giá hết hạn' });   // chữ tiếng Việt cứng, sai shape
```

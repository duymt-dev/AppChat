# tools/obligations — dựng sổ phủ `coding-packs/COVERAGE.md`

Sổ phủ = mỗi nghĩa vụ trong tài liệu một dòng (nguồn · TIP nhận · trạng thái · bằng chứng code). Thước đo "viết đủ TIP" / "làm xong" (DC-233).

| File | Việc |
|------|------|
| `FORMAT.md` | Khuôn một dòng + quy ước trạng thái — đưa cho mọi agent rà |
| `actions.mjs` | `node tools/obligations/actions.mjs` → `actions.json`: 207 action, handler (file:dòng), có `preview` không |
| `routes.mjs` | `node tools/obligations/routes.mjs` → `routes.json`: route API thật, đường dẫn FE gọi, `missing` = FE gọi mà API không có |
| `parts/part-*.md` | 7 phần rà (REQ A–E, REQ F–N, quyết định + COMMERCE, Blueprint, standards, prototype, mục hoãn) |
| `merge.py` | `python tools/obligations/merge.py` → gộp `parts/` thành `coding-packs/COVERAGE.md` (tổng + danh sách lỗ hổng) |

Quy trình: sửa / thêm dòng trong `parts/part-*.md` → chạy `merge.py` → commit cả `parts/` và `COVERAGE.md`. Không sửa tay `COVERAGE.md`.

Lỗ hổng = dòng `CHƯA` / `GIẢ` / `MỘT PHẦN` có cột TIP nhận là `—`. Gán TIP = sửa cột đó trong `parts/`.

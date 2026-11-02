# Rà và viết TIP KB — checkpoint 2026-11-02

**PARTIAL, không phải code completion, chưa thay lượt rà độc lập.**
Mốc code `c55298b`; chỉ sửa Markdown, không đụng dịch vụ/dữ liệu.

## Đã tạo
- TIP-043: 46 file manifest, 9 AC — hội thoại đóng → hỏi–đáp đã che PII →
  hàng chờ → người có kb.manage sửa/duyệt → source/ingest. Chặn pending vào RAG,
  kiểm source IDs, replay/concurrency/credit, model thật và review UI.
- TIP-020b: 33 file manifest, 7 AC — folder update/delete, inheritance ở server,
  catalog guard, tải nguồn thật. Nhận năm dòng COVERAGE trước đó vô chủ.
- Các TIP chia sẻ registry/module/UI có metadata serialize hai phía; 020b sau
  036 trước 043, 043 trước 045b. Toàn batch vẫn chưa có đủ manifest để PASS.
- Report 020/027 bổ sung liên kết nghĩa vụ sang TIP mới, không sửa TIP đã DONE.

## Đối chiếu quan trọng
1. `ai-kb.prisma`: có origin conversation nhưng chưa kb_suggestion. Nav learned
   ở `kb.read.ts:49-58` là source ready, không phải pending review.
2. `reply/pii.ts`: masker chat không che phone và có unmask map. Không đủ cho
   tri thức tái sử dụng; 043 có redaction riêng, không lưu raw mapping.
3. Trạng thái hội thoại code là closed (`inbox.ts:25`, schema inbox), không có
   resolved; task dùng closed có điều kiện, không tự thêm enum/state.
4. `kb.handlers.ts:94-132` không guard catalog; `settings-ai.ts:43` default
   public làm mất thông tin omission. 020b sửa mặc định ở server, không chỉ FE.
5. Download `/files/:id/raw` có ws/sig; không thể nối nút bằng file_id đơn thuần.
   020b route source-scoped kiểm quyền rồi mới đọc Storage.
6. Collision contact.forget đã sửa ở tài liệu 015b (contact.memory_forget).
   DC-235 không có nghĩa privacy.erase đã hoàn thành/được 043 nhận; hai dòng
   privacy vẫn CHƯA, vô chủ, phải viết TIP domain riêng.

## Kiểm tài liệu
- Đã kiểm từng đường M tồn tại, C chưa tồn tại; cases.yaml là dependency 023b
  đã ghi rõ, không giả là file hiện hữu. Bắt và sửa sai đường mock ai.ts thành
  settings-ai.ts. Kiểm parity selector thực là settings:rag.
- Năm ID gán 020b đều có TASK và AC tương ứng, trạng thái code giữ nguyên.
- Sinh COVERAGE bằng merge.py, không sửa tay; bộ đếm còn 218 lỗ hổng.
- Không chạy unit/integration/live ở lượt tài liệu này; câu test trong TIP là
  lệnh builder phải chạy, không phải bằng chứng đã pass.

## Còn lại
037–042, 044–046 chưa có file; sáu TIP cũ cần hoàn thiện manifest/AC và nhận
các lỗ hổng còn lại. Cần hoàn tất phần chưa rà của 7 nguồn, kiểm mọi owner TIP
DONE/chờ/CHỜ-TK, review độc lập toàn bộ rồi mới kết luận câu A xong.
Q-027 còn mở nhưng không chặn công việc tài liệu domain khác.

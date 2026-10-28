# Chứng từ — Mẫu văn bản & AI soạn (báo giá, hợp đồng, đề nghị thanh toán, phiếu thu)

> Chốt D30 (2026-10-28). Quy tắc tiền, hiệu lực, duyệt, ký **không đổi** (COMMERCE-DECISIONS §3, §5, §9). Mẫu chỉ quyết định **trình bày**; số liệu luôn đến từ bản ghi có cấu trúc.

## Quy tắc

1. **Dữ liệu và trình bày tách nhau.**
   - `quote` / `quote_item` / `contract` / `invoice` là nguồn sự thật: dòng hàng, đơn giá, chiết khấu, thuế, tổng, hiệu lực, giá trị.
   - Mẫu chỉ chứa biến. **Cấm AI hoặc người dùng gõ số tiền vào phần chữ của mẫu** để thay số liệu. Bảng hàng luôn render từ `{{#items}}…{{/items}}`.
2. **Một bảng mẫu chung** `doc_template(kind = quote | contract | payment_request | receipt, …)` với hai nguồn:
   - **`rich`**: soạn trong trình soạn HTML (Cài đặt → Mẫu chứng từ). Render bằng `@react-pdf` / HTML → PDF.
   - **`docx`**: DN **tải lên file Word của chính họ** (logo, bố cục, điều khoản riêng). Điền biến bằng `docxtemplater`; ra PDF bằng **LibreOffice headless** chạy native trên VPS (`soffice --headless --convert-to pdf`, hàng đợi `doc-render`, timeout 60s, 2 tiến trình).
   - Mẫu có version. Chứng từ ghi `template_id` + `template_version` đã dùng.
3. **Biến chuẩn** (registry `packages/shared/src/documents/variables.ts`, có i18n nhãn):
   - `business.*`: tên pháp lý, MST, địa chỉ, đại diện, logo, tài khoản nhận.
   - `customer.*`
   - `doc.*`: code, ngày, hiệu lực, người phụ trách.
   - `items[]`: tên, ĐVT, SL, đơn giá, CK, thuế suất, thành tiền.
   - `totals.*`
   - `contract.*`: loại, giá trị, bắt đầu, kết thúc.
   - `payment.*`: VietQR, nội dung CK.
   - `signatures.*`
   - Biến lạ trong mẫu thì báo lỗi khi lưu, không render rỗng.
4. **AI nhận diện mẫu DOCX** (`doc_template.detect_fields`):
   - AI SDK `generateObject` đọc nội dung file, đề xuất vị trí → biến (ví dụ "Kính gửi: ……" → `{{customer.name}}`, bảng hàng → `items`).
   - Người dùng xem bản đánh dấu, sửa rồi lưu. **Không lưu mẫu khi chưa qua bước người xác nhận.**
5. **AI soạn chứng từ từ nội dung người dùng** (ghi chú, đoạn chat, file brief, câu lệnh):
   - **Báo giá** (`quote.draft_from_content`):
     - AI trích ý định → khớp dòng với `product.search` (giá lấy từ catalog) → gọi `quote.create` (nháp) với mẫu đã chọn.
     - Dòng không khớp danh mục thì đánh dấu `off_catalog` → buộc duyệt (luật đã chốt).
     - Giảm giá > 5% thì buộc duyệt.
   - **Hợp đồng** (`contract.draft_from_content`):
     - Điều khoản trong mẫu của DN **giữ nguyên văn**.
     - AI chỉ điền biến và **đề xuất** điều khoản bổ sung trong khối `ai_suggested` (tô nổi, mỗi khối có nút Giữ / Bỏ). Người duyệt phải xử lý hết các khối trước khi `contract.submit`.
   - AI chỉ tạo **nháp**. Gửi báo giá / duyệt + ký / gửi ký đi đúng luồng và quyền đã chốt.
6. **Bảng kiểm pháp lý** (cảnh báo, **không chặn**, vì luật cho các bên tự thoả thuận):
   - **Hợp đồng** (Điều 398 BLDS 2015): đối tượng; số lượng, chất lượng; giá, phương thức thanh toán; thời hạn, địa điểm, phương thức thực hiện; quyền và nghĩa vụ; trách nhiệm do vi phạm; phương thức giải quyết tranh chấp. Thêm: thông tin hai bên, ngày hiệu lực.
   - **Báo giá:** thông tin bên bán + MST, ngày lập, **thời hạn hiệu lực** (luật đề nghị giao kết), giá đã gồm hay chưa VAT.
   - **Đề nghị thanh toán / phiếu thu:** luôn có dòng "Chứng từ này không thay thế hoá đơn giá trị gia tăng". **Không cho xoá** khỏi mẫu; render tự chèn nếu thiếu.
   - Kết quả kiểm hiện ở màn sửa mẫu và trong preview của action gửi / duyệt.
7. **Khoá nội dung:**
   - Báo giá đã `sent` và hợp đồng từ `pending_signature` trở đi thì PDF đóng băng (`file_id` + `sha256`). Sửa mẫu sau đó không ảnh hưởng chứng từ đã phát hành.
   - Hợp đồng đã ký chỉ thay đổi bằng phụ lục.
8. **Bảo mật:**
   - File DOCX tải lên quét kích thước ≤ 10MB, bỏ macro (`.docm` từ chối), không chạy field code.
   - LibreOffice chạy dưới user riêng, không mạng, thư mục tạm riêng mỗi job.
9. **Eval:** suite `doc-draft` (`ai/eval.md`):
   - giá luôn khớp catalog;
   - dòng ngoài danh mục bị đánh dấu;
   - không sửa nguyên văn điều khoản mẫu;
   - không bỏ dòng "không thay thế hoá đơn GTGT".

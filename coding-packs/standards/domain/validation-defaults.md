# Domain — Validate, mặc định, xoá

> Giá trị mặc định cho các ca mà thiết kế không ghi. Schema zod ở `packages/actions` / `packages/shared/src/api` là nơi áp dụng; FE dùng cùng schema qua `zodRule` nên lỗi giống nhau ở cả hai phía.

## 1. Chuẩn hoá & validate trường phổ biến

Hàm thuần trong `packages/shared/src/validate/` (có test), dùng trong zod `.transform()` / `.refine()`:

| Trường | Chuẩn hoá | Hợp lệ | Mã lỗi `fields` |
|---|---|---|---|
| Điện thoại VN | bỏ khoảng trắng, `.`, `-`; `+84` / `84` → `0`; lưu `phone` (như nhập) + `phone_norm` (E.164 `+84…`) | di động 10 số đầu `03/05/07/08/09`, cố định 10–11 số đầu `02`; số nước ngoài `+<mã>` 8–15 số | `PHONE_INVALID` |
| Email | trim, `lower()` | RFC đơn giản `x@y.z`, ≤ 254 ký tự | `EMAIL_INVALID` |
| Mã số thuế | bỏ khoảng trắng, `-` | 10 số, hoặc 10 số + `-` + 3 số (chi nhánh); tra cứu qua `TaxLookupProvider` là bước riêng | `TAX_CODE_INVALID` |
| CCCD | bỏ khoảng trắng | 12 số | `NATIONAL_ID_INVALID` |
| Tên người / DN | trim, gộp khoảng trắng | 1–120 ký tự | `REQUIRED` / `TOO_LONG` |
| Văn bản ngắn (tiêu đề, nhãn) | trim | ≤ 200 | `TOO_LONG` |
| Văn bản dài (ghi chú, mô tả, tin nhắn) | giữ nguyên xuống dòng | ≤ 5.000 (tin nhắn theo giới hạn kênh trong manifest) | `TOO_LONG` |
| Tiền | string số nguyên | 0 ≤ x ≤ 999.999.999.999 | `AMOUNT_INVALID` |
| Phần trăm | number | 0–100, tối đa 2 chữ số thập phân | `PERCENT_INVALID` |
| Số lượng | number | > 0, ≤ 1.000.000, tối đa 3 chữ số thập phân | `QTY_INVALID` |
| URL | trim | `https?://`, ≤ 2.048 | `URL_INVALID` |
| Màu (thẻ, nhân sự) | — | một trong bảng màu token | `COLOR_INVALID` |

- Mã lỗi mới khai trong `packages/shared/src/errors.ts` + `messages/<locale>/errors.json` (vi + en).
- Trùng dữ liệu nghiệp vụ (SĐT / email khách, mã sản phẩm, shortcut câu trả lời mẫu, tên thẻ không phân biệt hoa thường) → `fields: { <field>: 'DUPLICATE' }`, riêng khách có owner khác → `CONTACT_OWNED` (D32).

## 2. Giá trị mặc định khi tạo

- **Chủ sở hữu:** `owner_user_id` = người ra lệnh (Trợ lý: `onBehalfOfUserId`; agent: owner của khách, nếu khách chưa có owner thì để trống và vào hàng chung). `team_id` = team chính của owner.
- **Khách hàng:** `stage = lead`, `kind = person`, `locale` = locale workspace, `source` = kênh tạo (`manual` khi tạo tay).
- **Báo giá:** `valid_days = 15` (COMMERCE), `currency = VND`, thuế suất dòng lấy từ sản phẩm.
- **Đơn:** `status = new`, `pay_status = unpaid`, `deposit_required = false` (gợi ý bật theo COMMERCE §4, không tự bật).
- **Đề nghị thanh toán:** hạn 7 ngày, số tiền = phần còn lại của đơn.
- **Lịch hẹn:** thời lượng = thời lượng dịch vụ, buffer = cấu hình dịch vụ (mặc định 0), giữ chỗ 2 giờ khi `pending`.
- **Ticket:** `priority = medium`, SLA = chính sách mặc định.
- **Hội thoại mới:** `status = open`, `ai_mode` theo cấu hình tài khoản kênh, gán theo owner khách (D32).
- Trường mặc định do server đặt; client gửi lên thì server vẫn kiểm (không tin `owner_user_id` / `status` từ client trừ action cho phép).

## 3. Xoá

| Entity | Cách xoá | Điều kiện / ảnh hưởng |
|---|---|---|
| contact | mềm (`deleted_at`) | Chặn khi có đơn / hợp đồng chưa đóng hoặc công nợ → `HAS_DEPENDENCIES`; hội thoại giữ, hiện "Khách đã xoá". Khôi phục 30 ngày |
| product | lưu trữ (`status = archived`) | Không xoá cứng khi đã có trong chứng từ; chứng từ cũ giữ snapshot tên / giá |
| quote, contract | chỉ xoá khi `draft` (cứng) | Trạng thái khác: dùng action bù (`quote.mark_rejected`, `contract.terminate`) |
| order | không xoá | Dùng `order.cancel` |
| invoice | không xoá | Dùng `invoice.void` |
| appointment | không xoá | `appointment.cancel` |
| ticket | không xoá | `ticket.close` (`withdrawn` / `duplicate`) |
| message | mềm (`deleted_at`), chỉ tin nội bộ / ghi chú; tin đã gửi ra kênh không xoá phía khách | |
| conversation | `conversation.clear_history` (Owner / Quản lý, preview) hoặc ẩn (D50) | |
| tag, canned_reply, custom_field_def, doc_template, kb_source, segment | cứng, có preview số bản ghi đang dùng | Gỡ liên kết trong cùng transaction |
| ai_agent | mềm | Chặn khi đang phụ trách kênh / hội thoại mở |
| profile_layout | cứng (mẫu hệ thống không xoá) | Vai trò đang gán → về mẫu Mặc định |

- Mọi xoá có risk `delete` → preview (số bản ghi bị ảnh hưởng) + undo nếu là xoá mềm.
- **Chứng từ lưu snapshot** (tên khách, địa chỉ, tên / giá / thuế sản phẩm) lúc gửi / xác nhận; sửa nguồn sau đó không đổi chứng từ đã phát hành.

## 4. Danh sách & tìm kiếm mặc định

- Sắp xếp mặc định: bản ghi mới / hoạt động gần nhất trước (`updated_at` hoặc `last_*_at` DESC, rồi `id` DESC).
- Tìm kiếm `q`: không dấu, không phân biệt hoa thường (`f_unaccent(lower(...))`), trên mã + tên + SĐT / email nếu có; tối thiểu 1 ký tự với mã, 2 ký tự với chữ.
- Bộ lọc không hợp lệ → bỏ qua giá trị lạ (không 422) để link cũ vẫn mở được; `page` vượt quá → trả trang cuối.
- Xuất CSV / Excel theo đúng bộ lọc và scope của người xuất; > 5.000 dòng chạy job, gửi link qua thông báo.

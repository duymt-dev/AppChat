# UI — Mẫu tương tác (thước đo khi prototype im lặng hoặc sai)

> Đi cùng `ui/prototype-parity.md` (§6b: 4 mức lệch) và sổ `docs/06-prototype/DEVIATIONS.md`.
> Prototype là chuẩn **hình ảnh**. File này là chuẩn **hành vi và bố cục**: dùng khi prototype không vẽ (trạng thái thiếu, màn mới) và là căn cứ duy nhất để gọi một chỗ của prototype là "sai". Mỗi `PD-xxx` mức 1–3 phải trích một mục `IP-x.y` dưới đây.

## IP-1. Nút và vị trí

1. **Một nút chính mỗi vùng** (màn, drawer, modal, form). Nút chính dùng kiểu `primary`, các nút khác `default` / `text`.
2. **Vị trí cố định theo vùng:**
   - Màn danh sách: nút tạo mới ở `PageHeader` góc phải; thao tác hàng loạt hiện trên thanh chọn khi có dòng được chọn.
   - Modal / form: chân phải — `[Huỷ] [Nút chính]`, nút chính ngoài cùng bên phải.
   - Drawer chi tiết: thao tác của bản ghi ở chân drawer hoặc menu ⋯ đầu drawer; không rải trong thân.
   - Menu ⋯ của hàng / hội thoại / tin nhắn: dùng `ActionMenu`; mục nguy hiểm ở **cuối**, ngăn bằng divider, chữ màu danger.
3. **Nút nguy hiểm** (xoá, huỷ đơn, thu hồi, ngắt kết nối) không đặt cạnh nút chính và không dùng kiểu `primary` thường; dùng `danger`.
4. **Cùng một hành động, cùng một vị trí và một nhãn** trên mọi màn (ví dụ "Gửi báo giá" ở Báo giá, Hồ sơ 360° và Hộp thư đều đặt cùng chỗ trong vùng tương ứng, gọi cùng action).
5. **Nút không dùng được:** thiếu quyền → **ẩn** (`<Can>`); có quyền nhưng sai trạng thái → **vô hiệu + tooltip lý do** (lấy từ bảng chuyển trạng thái, không tự viết điều kiện riêng).
6. **"Sắp có"** (D28, D48, D50): giữ dòng / thẻ, khoá, nhãn "Sắp có"; bấm không làm gì ngoài tooltip. Không toast giả, không modal rỗng.

## IP-2. Chọn khung hiển thị

| Việc | Khung |
|---|---|
| Xem / sửa chi tiết một bản ghi, vẫn cần nhìn danh sách | `EntityDrawer` (phải, 392) |
| Tạo / sửa ngắn (≤ ~8 trường), xác nhận, chọn | `ModalShell` |
| Luồng nhiều bước (kết nối kênh, wizard chiến dịch, mẫu DOCX) | Modal có bước, nút ‹ Quay lại ở chân trái |
| Soạn thảo dài (báo giá, hợp đồng, agent builder) | Trang hoặc drawer rộng riêng |
| Menu ngữ cảnh, lọc nhanh | Popover / `ActionMenu` |

- Không mở modal chồng quá **2 lớp** (drawer + 1 modal `stacked`).
- Modal không che dữ liệu người dùng cần nhìn để điền (ví dụ form tạo báo giá từ hội thoại không che khung chat khi rộng ≥ lg → dùng drawer).

## IP-3. Form

1. Nhãn trên ô, một cột (≤ md) / hai cột cho trường ngắn (≥ lg). Trường bắt buộc có dấu `*`.
2. Validate bằng `zodRule` khi rời ô và khi bấm nút chính; lỗi hiện dưới ô bằng `errors.<CODE>` hoặc mã trong `fields`; cuộn tới lỗi đầu tiên.
3. Nút chính `loading` khi đang gửi, chặn bấm lặp; lỗi server giữ nguyên dữ liệu đã nhập.
4. Đóng form đã sửa mà chưa lưu → hỏi xác nhận bỏ thay đổi.
5. Tiền `MoneyInput`, điện thoại `PhoneInput`, ngày `DateRange` / DatePicker theo timezone workspace.
6. Mở form từ ngữ cảnh (Hồ sơ 360°, Hộp thư, Trợ lý) → **điền sẵn** khách / hội thoại / sản phẩm liên quan (REQ-F11, `ui-commands.prefill`).

## IP-4. Phản hồi sau thao tác

1. Mọi thao tác ghi đi qua `useAction`: thành công → toast ngắn + **Hoàn tác** nếu action có `undo`; lỗi → toast theo `error.code`.
2. Risk `send` / `money` / `delete` / `config` / `bulk` → `ConfirmActionHost` hiện preview (diff, số bản ghi, cảnh báo) trước khi chạy. Không dùng `window.confirm` hay modal tự viết.
3. `approval_required` → toast "Đã gửi duyệt" + trạng thái bản ghi đổi sang chờ duyệt; không báo "thành công".
4. Thao tác > 1 giây: trạng thái đang chạy tại chỗ (nút loading / skeleton dòng), không khoá cả màn.
5. Cập nhật lạc quan chỉ cho thao tác nhẹ, đảo được (ghim, đánh dấu đã đọc, reaction); lỗi thì trả lại và toast.

## IP-5. Trạng thái màn và vùng

Mỗi màn **và** mỗi panel tải dữ liệu riêng có đủ 5 trạng thái (`PageStates`): loading (skeleton đúng bố cục), empty, error (nút Thử lại), ready, no-permission.

- **Empty** phân biệt: chưa có dữ liệu (lời mời + nút tạo nếu có quyền) và lọc không ra kết quả (nút Xoá lọc).
- **Dữ liệu cực trị** phải không vỡ bố cục: tên 120 ký tự, số tiền 13 chữ số, 0 dòng, 500+ dòng, ảnh lỗi, thiếu avatar (chữ cái đầu).
- **Realtime:** bản ghi đang mở bị người khác đổi → cập nhật tại chỗ; bị xoá / mất quyền → đóng drawer + toast.

## IP-6. Chữ và nội dung

1. Chữ dài trong ô cố định: cắt `…` một dòng + tooltip nội dung đầy đủ; mô tả dài: 2 dòng + "Xem thêm".
2. Nút chỉ có icon **bắt buộc** có tooltip và `aria-label`.
3. Thời gian: tương đối dưới 7 ngày ("5 phút trước"), sau đó ngày tháng; hover hiện đầy đủ. Luôn tính từ dữ liệu thật, không hard-code.
4. Số / tiền qua `fmt.*`; trạng thái hiển thị bằng `Tag` màu theo token trạng thái, nhãn i18n.

## IP-7. Bàn phím, truy cập, mobile

1. `Esc` đóng popover → modal → drawer (lớp trên cùng trước). `Enter` gửi form một dòng; khung soạn tin: `Enter` gửi, `Shift+Enter` xuống dòng.
2. Focus vào ô đầu tiên khi mở form; trả focus về nút mở khi đóng.
3. Tương phản chữ ≥ 4.5:1 (chữ thường) / 3:1 (chữ ≥ 18px); không truyền tải thông tin chỉ bằng màu.
4. Vùng chạm ≥ 44px ở < md (`layout.touch`); không tràn ngang ở 390.
5. < md: drawer `placement="bottom"`, bảng thành `mobileCard`, menu ⋯ thành action sheet.

## IP-8. Nhất quán giữa các màn

1. Cùng một thực thể dùng cùng primitive, cùng cột chính, cùng nhãn trạng thái ở mọi nơi (danh sách, drawer, Hồ sơ 360°, Trợ lý).
2. Bảng danh sách theo D42 (`DataTable` + `Pager`, header dính, cuộn trong khung).
3. Hai prototype vẽ cùng một thứ khác nhau → chọn bản ở màn "chủ" của thực thể (màn module), màn khác theo; ghi `PD` mức 1.

## Cách dùng

- Prototype có vẽ và **không** trái mục nào ở trên → làm đúng prototype.
- Prototype có vẽ nhưng **trái** một mục → xếp mức theo `prototype-parity.md` §6b, ghi `PD-xxx` trích `IP-x.y`.
- Prototype **không** vẽ → làm theo file này, không cần `PD` (mức 2), ghi vào Completion Report mục "Giả định đã chọn".
- Mục ở đây chưa đủ để quyết → escalation L2; câu trả lời của Chủ nhà được bổ sung vào file này (không chỉ trả lời riêng một lần).

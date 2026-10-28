# UI Parity với prototype < 5%

> Bắt buộc với mọi TIP có UI (REQ-N14, Vision V11). Màn nào lệch quá 5% thì TIP đó chưa DONE.

## Quy tắc

1. **Chuẩn so sánh duy nhất:** `coding-packs/docs/06-prototype/AppChat.dc.html` (bản mới nhất). Không dùng `_bundle.jsx` hay các file `.jsx` lẻ để so pixel; chúng chỉ để đọc logic.
2. **Đo bằng `tools/parity`** (Playwright):
   - Viewport **1440×900**, `deviceScaleFactor: 1`, font Plus Jakarta Sans / JetBrains Mono cài cục bộ (không tải từ CDN khi đo).
   - So bằng `toHaveScreenshot` / pixelmatch với `threshold: 0.1` và **`maxDiffPixelRatio: 0.05`**.
   - Tắt animation (`animations: 'disabled'`, `caret: 'hide'`).
3. **Danh sách màn đo** khai báo trong `tools/parity/parity.manifest.ts`. Mỗi entry gồm:
   - `id`, `route` (app V2), `protoState` (cách đưa prototype về đúng màn: click, setState hoặc hash).
   - `states` (default / empty / drawer mở / modal mở…).
   - `mask` (selector vùng động: giờ, avatar ngẫu nhiên, biểu đồ random).
   - `exceptions` (vùng khác **có chủ đích**, kèm `reason` và mã quyết định).
4. **Dữ liệu đo giống prototype:** seed `fixtures/prototype-parity` tái tạo **đúng** dữ liệu mẫu của prototype (tên khách, mã đơn, số tiền, thời gian). App chạy ở chế độ `PARITY_FIXTURE=1` với đồng hồ cố định (`2026-06-24 09:00 +07:00`).
5. **Lấy giá trị, không đoán:**
   - Kích thước, màu, spacing, radius, cỡ chữ và độ đậm lấy từ prototype (DevTools / `styles.css`), rồi đưa vào token antd (`packages/ui/theme.ts`) hoặc `antd-style`.
   - **Cấm hard-code màu/px trong component.** Giá trị chưa có token thì thêm token.
6. **Ngoại lệ có chủ đích** chỉ được khi có mã quyết định (D/V/REQ). Danh sách hiện hành:
   - **Module ẩn:** Gọi điện, Quy trình, Báo cáo (D07, D19).
   - **Mục Cài đặt ẩn:** Sơ đồ tổ chức, Phòng ban, KPI, Phân ca, API / Playground / Developer, SMS, ZBS, Tổng đài, Cloud, Branding, Affiliate, SSO / Compliance. "Vai trò & phân quyền" chỉ đọc ở P0 (D27).
   - **Kênh:** chỉ kênh có manifest (`standards/channels/omnichannel-adapter.md`). **Connector:** chỉ connector có manifest, thẻ "Sắp có" (D28).
   - **Nội dung theo quyết định:** trial 15 ngày; OTP Email; ẩn social login; bỏ "tự nạp" và "tự chuyển model tiết kiệm"; "Ký số" → "Ký điện tử"; "Hóa đơn" → "Đề nghị thanh toán"; marketing chỉ Zalo cá nhân + Email.
   - **Màn mới không có trong prototype** (không đo pixel, nhưng phải dùng đúng token và pattern): Chờ duyệt, Quản trị nền tảng, trang ký hợp đồng công khai, Mẫu hợp đồng.
7. **Ngoại lệ không được làm tăng diện tích lệch ngoài vùng của nó.** Ví dụ ẩn một mục menu thì các mục khác giữ nguyên vị trí như prototype đã bỏ mục đó; vẫn phải dưới 5% sau khi mask vùng ngoại lệ.
8. **Báo cáo trong Completion Report** cho từng màn × trạng thái: `diffRatio`, ảnh diff (`tests/parity/out/<id>-<state>.diff.png`) và danh sách ngoại lệ đã áp.
9. **Mobile (< md):** không đo pixel, vì prototype không có bản mobile. Chạy e2e ở **390×844**:
   - không tràn ngang (`scrollWidth <= innerWidth`);
   - vùng chạm ≥ 44px;
   - mọi action chính chạy được.
10. **Hồi quy:** CI chạy `pnpm parity` cho mọi màn đã DONE. Màn đang DONE mà vượt 5% thì chặn merge.

## Lệnh

```bash
pnpm parity:baseline            # chụp prototype theo manifest → tests/parity/baseline/
pnpm parity <id>[:state]        # chụp app + so; in bảng diffRatio; exit 1 nếu > 0.05
pnpm parity --all               # toàn bộ màn đã khai báo
```

## Lý do

- Chủ nhà yêu cầu parity dưới 5% (2026-10-28).
- Prototype là bản giao diện Chủ nhà đã duyệt.
- Đo tự động để "giống prototype" là con số kiểm được, không dựa vào cảm nhận.

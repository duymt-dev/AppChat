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
5. **Lấy giá trị theo thang token, không đoán (D41 / D-TOKEN):**
   - Đọc giá trị từ prototype (DevTools / `styles.css`), rồi **snap về bậc gần nhất của thang token** trong `packages/ui/tokens.ts`:
     - cỡ chữ: 10 (nhãn rail) / 11 / 12 / 13 / 14 / 15 / 16 / 18 / 20 / 22 / 24 / 28 / 32 / 36 / 48;
     - bo góc: 4 / 6 / 8 / 10 / 12 / 16 / 20 / pill;
     - spacing: bội số của 4;
     - một màu viền.
   - Không thêm bậc lẻ (12.1, 12.7, 13.2…). Màu thương hiệu / trạng thái giữ nguyên giá trị prototype.
   - Đưa vào token antd (`packages/ui/theme.ts`) hoặc `antd-style`.
   - **Cấm hard-code màu/px trong component.** Giá trị chưa có token thì thêm token.
6. **Ngoại lệ có chủ đích** chỉ được khi có mã quyết định (D/V/REQ) hoặc `PD` theo §6b. Danh sách hiện hành:
   - **Module ẩn:** Gọi điện, Quy trình, Báo cáo (D07, D19).
   - **Mục Cài đặt ẩn:** Sơ đồ tổ chức, Phòng ban, KPI, Phân ca, API / Playground / Developer, SMS, ZBS, Tổng đài, Cloud, Branding, Affiliate, SSO / Compliance. "Vai trò & phân quyền" chỉ đọc ở P0 (D27).
   - **Kênh:** chỉ kênh có manifest (`standards/channels/omnichannel-adapter.md`). **Connector:** chỉ connector có manifest, thẻ "Sắp có" (D28).
   - **Nội dung theo quyết định:** trial 15 ngày; OTP Email; ẩn social login; bỏ "tự nạp" và "tự chuyển model tiết kiệm"; "Ký số" → "Ký điện tử"; "Hóa đơn" → "Đề nghị thanh toán"; marketing chỉ Zalo cá nhân + Email.
   - **AI Agents (D29):** chọn model hiện mức AI (tiêu chuẩn / nâng cao / tối đa), không hiện tên Claude; danh sách kênh theo channel registry; danh sách hành động ẩn mục OUT (Xử lý cuộc gọi, Kích hoạt workflow, HTTP request, ZNS / SMS); nút "Mở Workflow" ẩn.
   - **Màn danh sách (D42, giữ qua mọi bản prototype — D43):** màn lấp đúng chiều cao vùng nội dung; chỉ thân bảng cuộn (header bảng dính), footer phân trang có số trang (`Pager`, 20 / 50 / 100 dòng) nằm đáy khung bảng; đổi lọc → về trang 1. Prototype cuộn cả màn — ảnh 1440×900 vẫn đo như cũ.
     - Áp cho 9 bảng: Khách hàng, Sản phẩm, Báo giá, Đơn hàng, Đề nghị thanh toán, Hợp đồng, Hỗ trợ, Marketing, thành viên Khách thân thiết; bảng danh sách mới thêm sau này cũng dùng `DataTable` + `ListPager`.
     - Khi chép prototype mới (ver2.1 trở đi) vào `docs/06-prototype/`: chỉ cập nhật **nội dung** bảng (cột, nhãn, màu, dữ liệu mẫu); **không** gỡ cuộn trong khung / header dính / `Pager` dù prototype mới vẫn vẽ cuộn cả màn hoặc footer khác. Muốn đổi phải có quyết định mới của Chủ nhà.
   - **Ver2.1 (D45):**
     - Hồ sơ 360° mở form báo giá / hợp đồng đã gửi: theo luật COMMERCE — Nháp → Cập nhật; đã gửi → Tạo phiên bản mới (`quote.request_revision`); hợp đồng đã ký chỉ thêm phụ lục (D46).
     - Menu ＋ khung nhập: Research / Web search khoá + "Sắp có" (D48); "Quyền của agent" chỉ xem, link sang Builder (D51).
     - Menu ⋯ hội thoại: submenu Vòng đời = enum `contact.stage` hiện có (D49); Tạo nhóm Zalo khoá "Sắp có" (D50).
     - AI Agent: quyền chỉ cấu hình ở tab Tools của Builder (nhóm theo module + Kỹ năng AI); danh mục Skills / Connectors / Plugins riêng của prototype không dựng (D51).
     - Header hội thoại: không có nút video / gọi điện (D07, REQ-C13).
     - Builder AI Agents: cột Cấu hình (max 680) căn giữa trong vùng trái, không bám lề trái như prototype L2659 (D53, PD-004).
   - **Màn mới không có trong prototype** (không đo pixel, nhưng phải dùng đúng token và pattern): Chờ duyệt, Quản trị nền tảng, trang ký hợp đồng công khai, Mẫu chứng từ (D30), hộp "Xin chia sẻ" / chuyển phụ trách (D32).
6b. **Prototype im lặng hoặc sai — 4 mức lệch.** Thước đo "sai" là `ui/interaction-patterns.md` (mã `IP-x.y`); không có mục IP nào bị vi phạm thì **không** được gọi là sai, làm đúng prototype. Chỗ lệch chưa có mã D / V / REQ / COMMERCE ghi vào sổ `docs/06-prototype/DEVIATIONS.md` (`PD-xxx`).

| Mức | Loại | Ví dụ | Ai quyết | Thợ làm gì |
|---|---|---|---|---|
| 1 | Lỗi hiển thị | chữ tràn / cắt không tooltip, lệch hàng, khoảng cách không theo thang, markup prototype vỡ, giá trị hard-code (thời gian, đếm ngược), tương phản thấp | Chủ thầu (lúc verify) | Sửa luôn bằng token / pattern, mask đúng vùng, ghi `PD` `đề xuất` |
| 2 | Prototype không vẽ | empty / error / loading / no-permission, chữ cực dài, 500 dòng, đang gửi, realtime, mobile, màn mới | — (không phải lệch) | Làm theo `interaction-patterns.md`; ghi "Giả định đã chọn" trong Completion Report; không cần `PD` |
| 3 | Sai bố cục / vị trí / luồng | nút chính sai chỗ, nút xoá cạnh nút lưu, modal che dữ liệu cần nhìn, thứ tự bước sai, cùng hành động mỗi màn một chỗ | **Chủ nhà** (sinh mã D) | **Vẫn làm theo prototype**, ghi `PD` `đề xuất` kèm ảnh prototype + phác hoạ đề xuất, làm tiếp không dừng. Chủ nhà duyệt theo lô → có mã D thì mới sửa + mask |
| 4 | Trái nghiệp vụ / quyền | nút hoặc trạng thái vi phạm COMMERCE / D27 / D51 | Đã có luật (thứ tự ưu tiên CLAUDE.md §2) | Làm theo luật, trích mã (như D46); không cần `PD` nếu mã đã có, chưa có thì escalation L2 |

   - **Mask phải có căn cứ:** mọi `reason` trong `parity.manifest.ts` mở đầu bằng hoặc chứa một mã: `D..` / `V..` / `REQ-..` / `COMMERCE §..` / `Blueprint §..` / `prototype-parity §6` / `PD-xxx` (PD ở trạng thái `duyệt`, hoặc mức 1 `đề xuất`), hoặc ghi rõ "không có trong prototype" (mức 2). PD mức 3 `đề xuất` **không** được mask. CI chặn bằng `pnpm lint:masks` (`tools/scripts/lint-masks.mjs`).
   - **Không mask để chữa parity.** Lệch vì app làm sai thì sửa app, không thêm mask.
   - **Chặn tích luỹ:** tổng diện tích mask của một ID vượt **15%** khung so, hoặc sổ có ≥ 10 PD `duyệt` chưa gộp → đề nghị Chủ nhà sửa thẳng prototype (bản mới → `normalize-prototype` → chụp lại baseline, PD chuyển `đã gộp`, gỡ mask).
   - Completion Report liệt kê PD mới ghi trong TIP / pha (mã, mức, trạng thái).

7. **Ngoại lệ không được làm tăng diện tích lệch ngoài vùng của nó.** Ví dụ ẩn một mục menu thì các mục khác giữ nguyên vị trí như prototype đã bỏ mục đó; vẫn phải dưới 5% sau khi mask vùng ngoại lệ.
8. **Báo cáo trong Completion Report** cho từng màn × trạng thái: `diffRatio`, ảnh diff (`tests/parity/out/<id>-<state>.diff.png`) và danh sách ngoại lệ đã áp.
9. **Mobile (< md):** không đo pixel, vì prototype không có bản mobile. Chạy e2e ở **390×844**:
   - không tràn ngang (`scrollWidth <= innerWidth`);
   - vùng chạm ≥ 44px;
   - mọi action chính chạy được.
10. **Hồi quy:** trong lúc làm chỉ chạy `pnpm parity <id>` của màn vừa sửa; sửa theme / primitive / shell thì chạy `pnpm parity --done`. CI trước merge `main` chạy `pnpm parity --done`; màn đang DONE mà vượt 5% thì chặn merge (D39).

## Lệnh

```bash
pnpm parity:baseline            # chụp prototype theo manifest → tests/parity/baseline/
pnpm parity <id>[:state]        # chụp app + so; in bảng diffRatio; exit 1 nếu > 0.05
pnpm parity --done              # mọi màn đã ✅ (khi sửa lớp dùng chung; CI trước merge)
pnpm parity --all               # toàn bộ màn đã khai báo (cuối pha / gate cuối)
```

## Lý do

- Chủ nhà yêu cầu parity dưới 5% (2026-10-28).
- Chủ nhà chốt thang token đều (D41, 2026-10-28): prototype có nhiều giá trị gần trùng, chuẩn hoá để giao diện đồng bộ; ngưỡng 5% giữ nguyên.
- Prototype là bản giao diện Chủ nhà đã duyệt.
- Đo tự động để "giống prototype" là con số kiểm được, không dựa vào cảm nhận.

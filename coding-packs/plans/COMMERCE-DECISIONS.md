# AppChat — Quy tắc nghiệp vụ Commerce (ĐÃ CHỐT)

> Chủ nhà chốt 2026-10-28 (RRI **D24**). Các quyết định ở đây **thắng** mọi mô tả cũ trong SRS / CTO / SolutionDesign / prototype khi có mâu thuẫn.
> Dữ liệu và action tương ứng: `plans/BLUEPRINT.md` §2.2 (sales / catalog / loyalty), §2.3 (events), §3.4 (actions).
> Ghi chú pháp lý dưới đây chỉ để tham khảo khi thiết kế, không phải tư vấn pháp lý.

---

## 1. Tóm tắt các quyết định

| # | Quyết định | Chốt |
|---|---|---|
| Q1 | Tích điểm | **10.000đ = 1 điểm**; cộng **một lần** khi đơn `completed`, tính trên số tiền thực trả sau chiết khấu, trước VAT; hạng Vàng ×1,5, Kim cương ×2 |
| Q2 | "Hoá đơn" của AppChat | Gọi là **"Đề nghị thanh toán"** (kèm VietQR); PDF ghi "Không thay thế hoá đơn GTGT"; interface `EInvoiceProvider` để sẵn, **tích hợp hoá đơn điện tử ở P2** |
| Q3 | Xác nhận tiền khách trả | **Cả hai:** mặc định xác nhận tay; DN nào kết nối SePay / Casso cho tài khoản của mình thì đối soát tự động |
| Q4 | Hiệu lực báo giá | **15 ngày kể từ lúc gửi**, sửa được trên từng báo giá; nhắc trước khi hết hạn 2 ngày; hết hạn thì tự chuyển `expired` |
| Q5 | Agent tự giảm giá | **Tối đa 5%** (cấu hình trong AI Governance); vượt mức thì cần duyệt; Owner thao tác trên UI không bị giới hạn |
| Q6 | Cọc / thanh toán một phần | **Làm ngay.** Cọc là một khoản thanh toán; có trạng thái "Một phần"; trạng thái thanh toán tách khỏi trạng thái đơn |
| Q7 | Liệu trình / gói buổi | **Làm ngay:** `customer_package` lưu số dư buổi, lịch hẹn hoàn tất thì trừ 1 buổi |
| Q8 | Tồn kho | **Trừ khi đơn `confirmed`, hoàn khi huỷ**; cho phép tồn âm kèm cảnh báo; truy vết bằng `stock_movement` |
| 8 | Báo giá → Đơn | Nút **"→ Đơn hàng"** (người bấm hoặc agent làm khi khách chốt). Không có bước Hợp đồng (P2) |
| 8b | Lịch hẹn hoàn tất → Đơn | **Chỉ gợi ý** ("Tạo đơn cho buổi này?"), người hoặc agent xác nhận mới tạo |
| 9a | Bước cuối của đơn | **"Hoàn tất"**, dùng chung cho hàng hoá và dịch vụ |
| 9b | "Chờ cọc" | **Chỉ áp cho đơn được đánh dấu cần cọc** |

---

## 2. Sản phẩm (catalog)

- 6 loại sản phẩm: vật lý · dịch vụ · combo · thẻ / liệu trình · số · cho thuê (giữ field theo CHANGELOG 2026-08-21).
- Giá nhập là **giá chưa VAT**. Thuế đặt theo từng sản phẩm (0 / 5 / 8 / 10%) và tính theo từng dòng.
- **Biến thể** (màu, size…) có bảng `product_variant`; mỗi biến thể có SKU, giá và tồn riêng. Mức ưu tiên P1.
- Bảng giá theo hạng / kênh: P2. Luồng thuê / trả cho loại "Cho thuê": P2 (bản đầu chỉ quản lý giá theo đơn vị thời gian và tiền cọc).
- **Tồn kho** (áp cho loại vật lý; với combo thì trừ theo thành phần):
  - Đơn `confirmed` thì ghi `stock_movement(kind=sale, qty=-n)`.
  - Đơn bị huỷ thì ghi `kind=return`. Owner nhập kho / chỉnh tay thì ghi `kind=adjust` kèm lý do.
  - Cho phép tồn âm và cảnh báo khi tồn ≤ ngưỡng. Agent tra tồn trước khi hứa giao; hết hàng thì báo khách và gợi ý thay thế.
  - Vật tư tiêu hao, đơn mua hàng và nhà cung cấp: P2.

## 3. Báo giá

**Trạng thái:**

```
draft ──(vượt ngưỡng)──▶ pending_approval ──▶ approved ──┐
  └────────────(không vượt ngưỡng)──────────────────────┴─▶ sent ──▶ viewed ──▶ accepted
                                                              │           ├──▶ revision_requested ──▶ (version n+1 = draft mới; bản cũ = superseded)
                                                              │           └──▶ rejected
                                                              └── hết hạn ──▶ expired
```

- **Ngưỡng cần duyệt** (chỉ duyệt khi chạm ngưỡng, không bắt mọi báo giá qua duyệt — hợp với mô hình OPC):
  - Tổng > 20.000.000đ (cấu hình được).
  - Giảm giá vượt mức agent được tự quyết (mặc định 5%).
  - Báo giá do agent tạo mà có hàng ngoài danh mục.
- **Cách tính:**
  - Chiết khấu được đặt **theo dòng** (% hoặc số tiền) **và trên tổng**.
  - Thuế tính trên số tiền **sau** chiết khấu, theo thuế suất của từng dòng.
  - Điểm loyalty không trừ trên báo giá; điểm chỉ dùng khi thanh toán.
- **Hiệu lực:** `valid_until = sent_at + 15 ngày` (sửa được trên từng báo giá). Job nhắc khi còn 2 ngày; quá hạn thì `expired`.
  - Pháp lý: báo giá là đề nghị giao kết, bên bán bị ràng buộc trong thời hạn đã ghi.
- **Gửi:** PDF hoặc ảnh qua kênh hội thoại. Link xem báo giá ghi nhận `viewed`.
- **Khách phản hồi trong chat** ("ok chốt", "bớt chút được không", "thôi"):
  - AI nhận ý định rồi gọi `quote.mark_accepted` / `quote.request_revision` / `quote.mark_rejected`.
  - Agent tự làm khi độ tin cậy ≥ 70%; dưới mức đó thì hỏi người.
- **Báo giá → Đơn:** báo giá `accepted` có nút **"→ Đơn hàng"** (`order.create_from_quote`). Agent cũng gọi được action này khi khách xác nhận chốt.
  - Không tự sinh đơn.
  - Mỗi báo giá chỉ sinh một đơn.
  - Nút "→ Hợp đồng" ẩn tới P2.

## 4. Đơn hàng

**Hai trục trạng thái độc lập:**

| Trục | Trạng thái |
|---|---|
| **Tiến độ đơn** `status` | `new` (Mới) → `processing` (Đang xử lý) → `completed` (**Hoàn tất**); từ `new` hoặc `processing` có thể sang `cancelled` (Đã huỷ) |
| **Thanh toán** `pay_status` (tổng hợp từ các đề nghị thanh toán) | `unpaid` (Chưa thanh toán) · `awaiting_deposit` (**Chờ cọc** — chỉ khi `deposit_required`) · `deposited` (Đã cọc) · `partial` (Một phần) · `paid` (Đã thanh toán) · `refunded` / `partially_refunded` (Đã hoàn tiền) |

- Đơn có thể tạo từ 3 nguồn:
  - Từ báo giá (`quote_id`).
  - **Từ lịch hẹn hoàn tất:** chỉ là **gợi ý**. Thẻ "Tạo đơn cho buổi này?" hiện trong lịch hẹn, Inbox và Trợ lý; người hoặc agent xác nhận mới tạo. Nếu buổi hẹn trừ vào liệu trình đã mua thì không gợi ý tạo đơn.
  - Tạo trực tiếp.
- `confirmed` không còn là một trạng thái riêng. Chuyển `new → processing` chính là **xác nhận đơn**; lúc đó trừ kho và sinh `customer_package` (nếu có gói và đã đủ điều kiện, xem §6).
- **Cọc:**
  - Bật `deposit_required` + `deposit_amount` (hoặc %). Gợi ý tự bật khi dịch vụ có `deposit` trong sản phẩm, đơn giá trị cao, hoặc khách có lịch sử no-show.
  - Khi bật thì `pay_status = awaiting_deposit`. Đơn không có cờ này thì không bao giờ vào trạng thái "Chờ cọc".
- **Sửa đơn:** sửa tự do ở `new`. Ở `processing` chỉ sửa được khi chưa có khoản thu nào; đã thu thì phải huỷ rồi tạo lại.
- **Huỷ đơn:**
  - Bắt buộc ghi lý do.
  - Hoàn kho.
  - Đảo điểm đã cộng và trả lại điểm đã dùng.
  - Đơn đã thu tiền thì bắt buộc sinh **yêu cầu hoàn tiền**, cần Owner duyệt.
- **Vận chuyển:** chỉ nhập tay (đơn vị vận chuyển, mã vận đơn, ngày giao dự kiến). Tích hợp hãng vận chuyển và giao một phần: P2.
- **Bộ lọc danh sách đơn** (giữ các chip của prototype để không lệch parity):
  - Tất cả · Đã thanh toán · Đã cọc · Chờ cọc · Đã huỷ.
  - Mỗi chip lọc đúng trục của nó. Bảng hiển thị 2 cột: Trạng thái đơn và Thanh toán.

## 5. Đề nghị thanh toán và thu tiền

- **Tên hiển thị:** "Đề nghị thanh toán" (mã `TT-000123`). Tên kỹ thuật vẫn là `invoice`.
  - PDF ghi "Chứng từ này không thay thế hoá đơn giá trị gia tăng".
  - Hoá đơn điện tử thật (NĐ 123/2020, sửa đổi bởi NĐ 70/2025) đi qua interface `EInvoiceProvider` ở P2 (MISA / Viettel / VNPT…).
- **Trạng thái:** `draft` → `sent` → `partial` (đã thu một phần) → `paid`; quá hạn mà chưa đủ thì `overdue`; huỷ thì `void`.
- Một đơn có thể có nhiều đề nghị thanh toán: cọc, đợt 1, phần còn lại. Thông thường là một đề nghị cho cả đơn.
- **Hạn thanh toán** mặc định 7 ngày. Nhắc khách qua kênh của họ ở **T-1, T+1, T+7** (job nhắc dùng chung outbox và rate limit của kênh).
- **Khoản thu** `customer_payment` có các kind:
  - `deposit` / `payment` / `refund`. Refund là số âm, luôn cần duyệt.
  - Phương thức: QR · chuyển khoản · tiền mặt · thẻ.
  - Mỗi khoản thu có **phiếu thu PDF**.
- **Xác nhận khoản thu:**
  - **Tay:** `invoice.record_payment`.
  - **Tự động:** DN kết nối SePay / Casso (`tenant_bank_feed`). Webhook `/hooks/tenant-payments/:provider/:feedId` → tra `tenant_bank_feed_route` ở DB nền tảng → vào DB tenant → khớp mã nội dung chuyển khoản `TT-xxxxxx` → ghi `customer_payment(confirmed)`.
  - Khớp không chắc chắn (sai số tiền, thiếu mã) thì đưa vào hàng "Cần đối soát" để người xử lý.
- **Công nợ:** tổng phải thu và số quá hạn theo từng khách, hiển thị ở Hồ sơ 360° và trong danh sách đề nghị thanh toán.

## 6. Liệu trình / gói buổi

- Sản phẩm loại thẻ / liệu trình có `sessions`, `valid_days`, dịch vụ áp dụng (`package_service_ids`).
- **Sinh gói:** khi đơn chứa gói được xác nhận **và** đã thu đủ tiền, hoặc đã cọc nếu sản phẩm cho phép dùng khi mới cọc, thì tạo `customer_package(contact_id, product_id, order_id, total, used, expires_at, status)`.
- **Trừ buổi:**
  - Lịch hẹn của dịch vụ thuộc gói chuyển `done` thì `used + 1` và ghi `package_usage(appointment_id)`.
  - Hoàn tác lịch hẹn thì trả lại buổi.
  - No-show mặc định **không** trừ buổi; bật trừ được trong cấu hình.
- Khi tạo lịch cho khách đang có gói phù hợp, hệ thống và agent tự chọn gói để trừ.
- Còn 1 buổi hoặc còn 7 ngày tới hạn thì nhắc khách gia hạn hoặc mua thêm.
- Hết hạn thì gói chuyển `expired` (khoá). Owner gia hạn tay qua `package.extend` (có ghi log).
- Hoàn tiền gói tính theo tỉ lệ số buổi còn lại, cần duyệt. Chưa cho chuyển nhượng gói.
- Hồ sơ 360° có thẻ "Liệu trình" (đã dùng / tổng, hạn). Agent đọc được để tư vấn.

## 7. Loyalty (phần liên quan tới tiền)

- **Cộng điểm:** một lần duy nhất khi đơn `completed`.
  - Công thức: `floor(net_before_vat / 10.000) × hệ số hạng`, với `net_before_vat` = số tiền thực trả sau chiết khấu, trước VAT, đã trừ phần trả bằng điểm.
  - Hệ số: Thành viên ×1 · Bạc ×1 · Vàng ×1,5 · Kim cương ×2 (cấu hình được).
  - Lịch hẹn hoàn tất **không** cộng điểm riêng; điểm đi theo đơn của buổi đó.
- **Đổi điểm:** 1 điểm = 100đ. Dùng khi thanh toán (một khoản thu kind `points`), tối đa **50% giá trị đơn**.
- **Đảo điểm:**
  - Huỷ đơn: đảo điểm đã cộng và trả lại điểm đã dùng.
  - Hoàn tiền một phần: đảo theo tỉ lệ.
- **Hạn điểm:** 12 tháng kể từ ngày cộng (FIFO).
- **Hạng:** xét theo điểm tích trong 12 tháng gần nhất, xét lại mỗi quý. Ngưỡng 0 / 5.000 / 15.000 / 40.000.
- Voucher / mã giảm giá: P2.

## 8. Giai đoạn khách hàng (pipeline — thay BR-09)

| Sự kiện | Giai đoạn khách |
|---|---|
| Khách mới từ kênh | Lead mới |
| Gửi báo giá (`quote.sent`) | Báo giá (nếu đang ở giai đoạn thấp hơn) |
| Báo giá bị từ chối / hết hạn mà không còn báo giá mở | Đang tư vấn |
| Đơn hoàn tất (`order.completed`) | Đã mua |

- Khách đã ở **Đã mua** thì không bao giờ bị hạ giai đoạn. Khách cũ mua lại vẫn giữ Đã mua.
- Người kéo tay luôn thắng quy tắc tự động. Quy tắc tự động không ghi đè trong 24 giờ sau lần kéo tay.
- Không có pipeline Deal riêng (khác SRS FR-CUS-03). Giai đoạn nằm ngay trên Khách hàng, đúng như prototype.

## 9. Hợp đồng (P2 — ghi lại để khỏi làm sai)

- Bên bán tự soạn và ký, không cần đăng ký với cơ quan nhà nước. Các ngành của khách AppChat không thuộc 8 ngành phải đăng ký hợp đồng mẫu theo QĐ 07/2024/QĐ-TTg.
- Khi làm ở P2:
  - Hợp đồng sinh từ báo giá `accepted`; từ hợp đồng có thể sinh đơn.
  - Khách xác nhận bằng OTP, nút đồng ý hoặc ký trên màn hình (giao dịch điện tử hợp lệ theo Luật GDĐT 2023). Chữ ký số CA là tuỳ chọn.
- Bản phát hành đầu ẩn menu Hợp đồng và nút "→ Hợp đồng" (ngoại lệ parity).

## 10. Thu phí nền tảng (Domain L — bổ sung)

- `billing_invoice` thu thêm thông tin xuất hoá đơn VAT: MST, tên đơn vị, địa chỉ, email nhận. Xuất hoá đơn điện tử thật đi theo Q2 (P2); trước mắt đội vận hành xuất tay.
- Credit trong gói **không cộng dồn** sang tháng sau. Credit mua thêm **không hết hạn**. Thứ tự trừ: credit gói trước, credit mua thêm sau.
- Nâng gói giữa kỳ: tính tiền phần chênh theo số ngày còn lại, cộng ngay phần credit chênh lệch. Hạ gói có hiệu lực từ kỳ sau (BR-01).
- **Bỏ "tự nạp"** (REQ-L07), vì VietQR không trừ tiền tự động được. Thay bằng nhắc khi số dư thấp (mức 80% và 95% đã dùng).
- Chỉ dùng VietQR và chuyển khoản. VNPAY / MoMo / ZaloPay: P2.
- Hết credit: giữ D09 (chặn AI + popup nạp). Không làm "trả sau đến 5 triệu" (SRS BR-06) và không làm "tự chuyển model rẻ" (CHANGELOG 07-28).

---

## 11. Mâu thuẫn đã giải quyết

| Mâu thuẫn | Nguồn | Kết luận |
|---|---|---|
| Tỉ lệ tích điểm | SRS BR-04, CTO §14.2 (1.000đ) / RRI, prototype (10.000đ) | 10.000đ = 1 điểm |
| 3 mốc cộng điểm | prototype (thanh toán) / Appointments-Spec (buổi hoàn tất) / RRI (`order.completed`) | Chỉ một mốc: đơn hoàn tất |
| Hiệu lực báo giá | RRI, CHANGELOG (15 ngày) / prototype (7 ngày từ khi gửi) | 15 ngày kể từ lúc gửi |
| Trạng thái báo giá / đơn / hoá đơn | prototype (3 bộ khác nhau) / Blueprint | §3, §4, §5 |
| Báo giá thắng sinh Hợp đồng + Đơn | SRS BR-09, CTO | Báo giá → Đơn bằng nút; Hợp đồng P2 |
| Mọi báo giá qua duyệt nội bộ | SolutionDesign §4.2 | Chỉ duyệt khi vượt ngưỡng |
| Trừ buổi liệu trình đặt ở loyalty | Blueprint §2.3 cũ | Chuyển sang `customer_package` |
| Pipeline Deal 6 bước | SRS FR-CUS-03 | Giai đoạn nằm trên Khách hàng |
| Hết credit | SRS BR-06 / CHANGELOG 07-28 / RRI D09 | Giữ D09 |

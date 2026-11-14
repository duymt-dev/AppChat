# AppChat — Quy tắc nghiệp vụ Commerce (ĐÃ CHỐT)

> Chủ nhà chốt 2026-10-28 (RRI **D24**; Hợp đồng nâng lên P0 — **D25**). Các quyết định ở đây **thắng** mọi mô tả cũ trong SRS / CTO / SolutionDesign / prototype khi có mâu thuẫn.
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
| 8 | Báo giá → Đơn / Hợp đồng | Báo giá `accepted` có **2 nút: "→ Hợp đồng" và "→ Đơn hàng"** (người bấm hoặc agent làm khi khách chốt). Hợp đồng là **tuỳ chọn** (D25) |
| C1 | Ký hợp đồng | **Ký điện tử của AppChat:** OTP + ký tay trên màn hình, lưu vết và trang chứng nhận; ký số CA (`ESignProvider`) ở P2 |
| C2 | Bên ký | **Owner ký trước** (đồng thời là duyệt), sau đó gửi khách ký; PDF cuối có đủ chữ ký 2 bên |
| 8b | Lịch hẹn hoàn tất → Đơn | **Chỉ gợi ý** ("Tạo đơn cho buổi này?"), người hoặc agent xác nhận mới tạo |
| 9a | Bước cuối của đơn | **"Hoàn tất"**, dùng chung cho hàng hoá và dịch vụ |
| 9b | "Chờ cọc" | **Chỉ áp cho đơn được đánh dấu cần cọc** |
| D30 | Mẫu chứng từ + AI soạn | Mẫu rich hoặc DOCX của DN; AI soạn từ nội dung; số liệu luôn từ bản ghi; điều khoản mẫu nguyên văn — §12 |
| D31 | Đơn từ sàn / POS | Khung đồng bộ + "Sắp có"; đơn sàn khoá hàng / giá; thu qua sàn; tích điểm mặc định tắt — §4b |
| D32 | Nhiều sales / một khách | 1 phụ trách chính + đồng phụ trách / theo dõi — §8b |

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
- **Báo giá → Đơn / Hợp đồng:** báo giá `accepted` có 2 nút **"→ Hợp đồng"** (`contract.create_from_quote`) và **"→ Đơn hàng"** (`order.create_from_quote`). Agent cũng gọi được khi khách xác nhận chốt.
  - Không tự sinh.
  - Mỗi báo giá sinh tối đa một hợp đồng **hoặc** một đơn trực tiếp.

## 4. Đơn hàng

**Hai trục trạng thái độc lập:**

| Trục | Trạng thái |
|---|---|
| **Tiến độ đơn** `status` | `new` (Mới) → `processing` (Đang xử lý) → `completed` (**Hoàn tất**); từ `new` hoặc `processing` có thể sang `cancelled` (Đã huỷ) |
| **Thanh toán** `pay_status` (tổng hợp từ các đề nghị thanh toán) | `unpaid` (Chưa thanh toán) · `awaiting_deposit` (**Chờ cọc** — chỉ khi `deposit_required`) · `deposited` (Đã cọc) · `partial` (Một phần) · `paid` (Đã thanh toán) · `refunded` / `partially_refunded` (Đã hoàn tiền) |

- Đơn có thể tạo từ 3 nguồn:
  - Từ báo giá (`quote_id`), hoặc **từ hợp đồng đã ký** (`contract_id`, một hợp đồng sinh được nhiều đơn).
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

## 4b. Đơn từ sàn / phần mềm bán hàng (D31)

- **Nguồn:** `order.source = manual | quote | contract | appointment | marketplace | pos`, kèm `external_ref` `{connection_id, external_id, platform_status}`. Nhập **một lần** (unique theo kết nối + mã ngoài).
- **Trạng thái:** adapter ánh xạ trạng thái sàn về 2 trục (ví dụ Shopee `READY_TO_SHIP` → `processing`; `COMPLETED` → `completed`; `CANCELLED` / trả hàng → `cancelled` hoặc hoàn một phần). Giữ `platform_status` gốc để hiển thị.
- **Không sửa dòng hàng / giá / tổng** của đơn sàn: sàn là nguồn sự thật. Sửa được: người phụ trách, ghi chú, thẻ.
- **Thanh toán:** đơn sàn đã thanh toán ghi `customer_payment(method = marketplace)`, **không** sinh Đề nghị thanh toán / VietQR. Đơn COD của sàn: `paid` khi sàn báo hoàn tất.
- **Kho:** mỗi kết nối chọn **bên giữ tồn chuẩn**: `appchat` (AppChat đẩy tồn lên sàn — P2) hoặc `external` (Sapo / KiotViet là gốc, AppChat nhận tồn về). Đơn sàn vẫn ghi `stock_movement`, quy tắc Q8 giữ nguyên.
- **Khách:** sàn thường che SĐT, nên khớp theo `contact_identity(channel_type = marketplace, external_id = buyer_id)`. Chỉ lưu dữ liệu sàn cho phép.
- **Loyalty:** đơn sàn **mặc định không tích điểm** (sàn thường cấm kéo khách ra ngoài). Bật được trong cấu hình loyalty; khi bật vẫn đúng Q1 (10.000đ = 1 điểm, một lần khi `completed`).
- **Khi nào có:** khung, port, mock, thẻ "Sắp có": P0. Adapter thật (Sapo, Shopee, TikTok Shop, Lazada, Haravan, KiotViet, WooCommerce): P2. Đẩy trạng thái / tồn lên sàn: P2.

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
- **Màn Tài chính (D60):** chỉ đọc + nhắc thanh toán, không ghi thu.
  - Một dòng = một đơn (gộp các đề nghị thanh toán của đơn) hoặc một đề nghị lẻ không gắn đơn.
  - Trạng thái xét theo thứ tự: Đã thu đủ → Quá hạn → Đã cọc → Còn nợ.
  - Hoạt động Bán mới / Gia hạn / Marketing suy từ nguồn, lưu lên đơn lúc tạo.
  - Nhắc tay hàng loạt đi qua đường nhắc của `invoice.send_payment_qr`.

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

## 8. Cơ hội và giai đoạn khách hàng (pipeline — thay BR-09; sửa 2026-11-12 theo D60)

**Cơ hội** (`contact_opportunity`): bản ghi riêng của khách, một khách có nhiều cơ hội. Giai đoạn và xác suất **cố định** (không nhập tay). Dự báo = giá trị × xác suất.

| Giai đoạn | Xác suất |
|---|---|
| Lead mới | 10% |
| Đủ điều kiện | 25% |
| Tư vấn / Demo | 50% |
| Báo giá | 70% |
| Đàm phán | 85% |
| Đã mua | 100% |
| Thua | 0%. Bắt buộc lý do: Giá cao · Chọn đối thủ · Chưa có nhu cầu · Không liên lạc được. "Mở lại" về Đủ điều kiện |

**Chuỗi chứng từ của cơ hội:**
- Báo giá → [Hợp đồng ký → Đơn] **hoặc** Đơn → Đề nghị thanh toán → Khoản thu.
- Chứng từ gắn cơ hội qua `opportunity_id`. Hợp đồng và đơn kế thừa liên kết từ báo giá nguồn.
- "Tạo báo giá từ cơ hội" sinh **nháp**. Vẫn duyệt khi vượt ngưỡng (§3).

**Cơ hội tự chuyển theo chứng từ gắn nó:**

| Sự kiện | Cơ hội |
|---|---|
| Gửi báo giá (`quote.sent`) | Báo giá (nếu đang thấp hơn) |
| Khách chốt báo giá (`quote.accepted`) | Đàm phán |
| Khách ký hợp đồng (`contract.signed`, đường hợp đồng) | Đã mua |
| Tạo đơn (đường đơn) | Đã mua |
| Báo giá hết hạn mà cơ hội không còn báo giá mở | Tư vấn / Demo |
| Khách từ chối báo giá | Bấm "Khách từ chối" trong chuỗi chứng từ = Đánh dấu Thua (bắt buộc lý do). Từ chối đi đường khác (màn Báo giá, link công khai, agent) → về Tư vấn / Demo nếu cơ hội không còn báo giá mở, kèm thông báo người phụ trách chọn lý do Thua (DC-901) |
| Hợp đồng bị từ chối / đơn bị huỷ (không còn hợp đồng ký / đơn khác) | Đàm phán |

- **Người đổi tay** giai đoạn cơ hội: tiến hoặc lùi đều được. Thua thì bắt buộc lý do.
- **AI** chỉ gợi ý giai đoạn; người bấm "Áp dụng". Agent được cấp tool thì tạo được cơ hội, nhưng chỉ ở Lead mới.
- **Đánh dấu Thua:** chỉ đổi báo giá đang mở đã gửi khách sang "từ chối". Báo giá đã chốt giữ nguyên.

**Giai đoạn khách** suy từ cơ hội: bằng giai đoạn cao nhất trong các cơ hội **đang mở** (chưa Đã mua / Thua).
- Nhãn: Lead mới · Đủ điều kiện · Tư vấn / Demo · Báo giá · Đàm phán · Đã mua.
- Khách lên **Đã mua** khi có đơn hoàn tất (`order.completed`), dù đơn gắn hay không gắn cơ hội. Cơ hội Đã mua (khách ký / đã tạo đơn) **không** tự đưa khách lên Đã mua. Doanh số vẫn theo đơn (§9, DC-901).
- Hạ giai đoạn khách chỉ qua luật lùi hiện có: không hạ Đã mua, không đụng Thất bại, giữ tay 24 giờ. Chứng từ không gắn cơ hội làm "sàn" (không hạ dưới giai đoạn chúng đỡ).
- Chứng từ **không gắn cơ hội** vẫn theo luật cũ:

| Sự kiện (chứng từ không gắn cơ hội) | Giai đoạn khách |
|---|---|
| Khách mới từ kênh | Lead mới |
| Gửi báo giá (`quote.sent`) | Báo giá (nếu đang ở giai đoạn thấp hơn) |
| Hợp đồng gửi ký / đã ký (`contract.sent_for_signature`, `contract.signed`) | Đàm phán (nếu đang ở giai đoạn thấp hơn) |
| Báo giá bị từ chối / hết hạn mà không còn báo giá mở | Tư vấn / Demo |
| Đơn hoàn tất (`order.completed`) | Đã mua |

- Khách đã mua thì giữ **Đã mua**, không bao giờ bị hạ. Khách cũ mua lại vẫn giữ Đã mua.
- Người kéo tay luôn thắng quy tắc tự động. Quy tắc tự động không ghi đè trong 24 giờ sau lần kéo tay.
- Có pipeline cơ hội riêng (D60 thay luật "không có pipeline Deal riêng"). Màn kanban Pipeline làm sau, chỉ một pipeline.

## 8b. Nhiều sales chăm một khách (D32)

- **Vai trò trên khách:** `owner` (phụ trách chính, đúng 1 người hoặc trống) · `collaborator` (đồng phụ trách: xem, nhắn, tạo chứng từ) · `watcher` (chỉ xem + nhận thông báo).
- **Scope `own`** = khách mà mình là owner **hoặc** collaborator / watcher; hội thoại, báo giá, hợp đồng, đơn, lịch hẹn của khách đó đi theo.
- **Chống giành khách:** sales tạo / nhập khách trùng (SĐT / email / MST / ID kênh) với khách đã có owner thì không thấy chi tiết, chỉ thấy "Đã có người phụ trách: Minh" + nút **"Xin chia sẻ"** (`contact.request_access`). Owner của khách hoặc Quản lý duyệt.
- **Chuyển phụ trách** (`contact.transfer_owner`): chỉ Quản lý / Chủ sở hữu (permission `crm.reassign`). Tuỳ chọn chuyển kèm hội thoại đang mở, báo giá chưa chốt, lịch hẹn sắp tới. Ghi timeline + thông báo hai bên.
- **Tin nhắn mới:** khách có owner thì hội thoại tự gán cho owner. Owner ngoài ca / vắng thì vào hàng chung hoặc giao agent theo cấu hình kênh.
- **Doanh số:** báo giá / hợp đồng / đơn ghi `owner_user_id` **tại thời điểm tạo** (không đổi khi chuyển phụ trách sau đó). Hiệu suất và KPI tính theo trường này.
- **Lead mới (P1):** chia thủ công / vòng tròn / theo kênh / theo tải.

## 9. Hợp đồng (P0 — D25)

**Pháp lý:** bên bán tự soạn và ký, không cần đăng ký với cơ quan nhà nước. Các ngành của khách AppChat không thuộc 8 ngành phải đăng ký hợp đồng mẫu theo QĐ 07/2024/QĐ-TTg. Hợp đồng điện tử có giá trị như văn bản (Luật GDĐT 2023). Ký điện tử đơn giản (OTP + ký tay trên màn hình) hợp lệ khi hai bên thoả thuận dùng; ký số CA là tuỳ chọn nâng cao.

**Trạng thái** (nhãn theo prototype):

```
draft (Nháp) ──submit──▶ pending_approval (Chờ duyệt — Owner) ──owner ký + duyệt──▶ pending_signature (Chờ ký) ──khách ký──▶ signed (Đã ký)
   ▲                         │ yêu cầu sửa / từ chối                                   │ khách từ chối / hết hạn link                │ hết ngày kết thúc
   └─────────────────────────┘                                                          └──▶ declined (Từ chối)                       ▼
                                                                                                                                 expired (Hết hạn)
signed ──huỷ (lý do, Owner)──▶ terminated (Đã chấm dứt)
```

- Kanban và bộ lọc giữ 4 cột/chip của prototype: Nháp · Chờ ký · Đã ký · Hết hạn. "Chờ duyệt" gộp vào cột Nháp và hiện badge. Từ chối và Đã chấm dứt chỉ hiện trong bộ lọc "Tất cả".
- **Nguồn tạo:**
  - Từ báo giá `accepted` (nút "→ Hợp đồng").
  - Tạo trực tiếp (thường là loại Nguyên tắc).
  - Agent / Trợ lý **chỉ được soạn nháp**. Gửi ký luôn cần Owner (RRI D05: hợp đồng thuộc nhóm bắt buộc có người duyệt).
- **Loại:** Dịch vụ / Mua bán / Nguyên tắc.
- **Trường** (form prototype L8408): mã HĐ (tự sinh `HĐ-…`), số hợp đồng, khách hàng, báo giá liên quan, ngày ký, ngày bắt đầu, ngày kết thúc, giá trị, loại, người phụ trách, file hợp đồng, ghi chú.
- **Nội dung:**
  - (a) Sinh từ **mẫu theo loại**: mỗi loại có một mẫu rich-text với biến `{{customer.name}}`, `{{business.legal_name}}`, `{{quote.items}}`, `{{contract.value}}`, `{{contract.start}}`… Mẫu mặc định do AppChat cung cấp; Owner sửa trong Cài đặt → "Mẫu chứng từ". Render ra PDF.
  - (a2) **Mẫu DOCX của DN** + AI soạn từ nội dung (D30, §12).
  - (b) **Tải lên PDF có sẵn.**
- **Ký điện tử của AppChat (C1):**
  1. Owner bấm "Duyệt & ký": xác nhận OTP (email) và ký tay trên màn hình. Chữ ký được chèn vào PDF.
  2. "Gửi ký": khách nhận link qua kênh hội thoại hoặc email. Link một lần, hết hạn sau 7 ngày, gia hạn được.
  3. Khách mở link (trang công khai, không cần đăng nhập): xem PDF → tick "Tôi đã đọc và đồng ý ký điện tử" → OTP gửi tới SĐT/email của khách (qua Zalo đang chat hoặc email) → ký tay trên màn hình.
  4. Hệ thống hoàn tất PDF: chèn chữ ký khách, thêm **trang chứng nhận ký**, tính `SHA-256` của file cuối, khoá nội dung.
     - Trang chứng nhận gồm: mã HĐ, mã băm, các bên, thời điểm, IP, user-agent, kênh OTP, mã giao dịch.
  5. Gửi bản PDF đã ký cho cả 2 bên.
  - **Lưu vết** `contract_signature_event`: mỗi bước (gửi, mở, OTP gửi / OTP đúng / OTP sai, ký, từ chối) đều ghi thời điểm, IP, UA, mã băm tài liệu tại thời điểm đó. Dữ liệu chỉ thêm (append-only), không sửa được.
  - Khách bấm "Từ chối ký" (kèm lý do tuỳ chọn) thì chuyển `declined`, báo Owner.
  - **Ký số CA** (VNPT-CA, Viettel-CA, FPT-CA…) để P2, qua interface `ESignProvider`. Nhãn "Ký số" trong prototype đổi thành "Ký điện tử" (ngoại lệ parity có ghi tên).
- **Sau khi ký:**
  - Nội dung khoá.
  - Muốn thay đổi phải tạo **phụ lục** (`contract_appendix`: cùng luồng duyệt và ký) hoặc hợp đồng mới.
  - Nút **"→ Đơn hàng"** sinh đơn có `contract_id`; một hợp đồng sinh được nhiều đơn.
- **Hết hạn và gia hạn:**
  - Trước ngày kết thúc 30 ngày: nhắc Owner (thông báo + Việc cần tôi) và gợi ý agent chào gia hạn (theo prototype).
  - Qua ngày kết thúc thì `expired`.
  - "Gia hạn" tạo hợp đồng mới (`renewal_of_id`), đi lại luồng duyệt và ký.
- **Chấm dứt:** chỉ Owner, bắt buộc lý do, ghi timeline. Không ảnh hưởng tới các đơn đã sinh.
- **Giai đoạn khách:** giai đoạn giữa "Báo giá" và "Đã mua" mang nhãn **"Đàm phán"** (D60; trước là "Hợp đồng"). Hợp đồng không gắn cơ hội ở `pending_signature` hoặc `signed` → Đàm phán nếu khách đang thấp hơn. Hợp đồng gắn cơ hội: khách ký → cơ hội Đã mua (§8).
- **Hồ sơ 360°:** hiển thị các hợp đồng của khách, giá trị đang hiệu lực, ngày hết hạn gần nhất.

## 12. Mẫu chứng từ & AI soạn (D30)

- **Không đổi luật:** tính tiền (§3), hiệu lực 15 ngày, ngưỡng duyệt, đề nghị thanh toán "không thay thế hoá đơn GTGT" (§5), duyệt + ký hợp đồng (§9), tích điểm (§7).
- **Mẫu:** `doc_template(kind = quote | contract | payment_request | receipt)`, nguồn `rich` (soạn trong app) hoặc `docx` (DN tải lên, AI nhận diện biến, người xác nhận). Có version; chứng từ ghi version đã dùng.
- **AI soạn từ nội dung** (ghi chú, đoạn chat, brief, câu lệnh):
  - Báo giá: khớp dòng với catalog, giá lấy từ catalog; dòng ngoài danh mục hoặc giảm > 5% thì buộc duyệt.
  - Hợp đồng: điền biến; điều khoản mẫu giữ nguyên văn; điều khoản AI đề xuất nằm trong khối tô nổi, phải Giữ / Bỏ hết trước khi trình duyệt.
  - AI chỉ tạo nháp.
- **Bảng kiểm** (cảnh báo, không chặn): hợp đồng theo Điều 398 BLDS 2015; báo giá có thông tin bên bán + MST + hiệu lực + VAT; đề nghị thanh toán / phiếu thu luôn có dòng "không thay thế hoá đơn GTGT" (không xoá được).
- Chi tiết kỹ thuật: `standards/documents/templates.md`.

## 10. Thu phí nền tảng (Domain L — bổ sung)

- `billing_invoice` thu thêm thông tin xuất hoá đơn VAT: MST, tên đơn vị, địa chỉ, email nhận. Xuất hoá đơn điện tử thật đi theo Q2 (P2); trước mắt đội vận hành xuất tay.
- Credit trong gói **không cộng dồn** sang tháng sau. Credit mua thêm **không hết hạn**. Thứ tự trừ: credit gói trước, credit mua thêm sau.
- Nâng gói giữa kỳ: tính tiền phần chênh theo số ngày còn lại, cộng ngay phần credit chênh lệch. Hạ gói có hiệu lực từ kỳ sau (BR-01).
- **Bỏ "tự nạp"** (REQ-L07), vì VietQR không trừ tiền tự động được. Thay bằng nhắc khi số dư thấp (mức 80% và 95% đã dùng).
- Chỉ dùng VietQR và chuyển khoản. VNPAY / MoMo / ZaloPay: P2.
- Hết credit: giữ D09 (chặn AI + popup nạp). Không làm "trả sau đến 5 triệu" (SRS BR-06) và không làm "tự chuyển model rẻ" (CHANGELOG 07-28).
- **Gọi điện (D61, bổ sung 2026-11-13):**
  - Gói có Gọi điện: Cá nhân Max (1 máy) · Business (5) · Ultimate (không giới hạn) · Enterprise (tuỳ chỉnh). Miễn phí / Cá nhân / Cá nhân Pro / Team không có.
  - Mua thêm **"User tổng đài" 200.000đ / máy / tháng** (addon riêng, tự gia hạn cùng gói như addon người dùng / kênh — DC-056). Máy AI (900) không tính license.
  - Cước viễn thông shop trả thẳng nhà mạng (shop mang số); AppChat không bán phút / số ở bản này ("Phút gọi Voice", "Số hotline riêng" = Sắp có).
  - Voice AI trừ **credit** theo lượt `voice_turn`, giá ở `model_price`: mặc định tự dựng (STT / TTS chạy local — DC-907) nên **chỉ tính phần LLM**, STT / TTS = 0; chế độ Realtime (tuỳ chọn, có key) tính theo giá Realtime. Hết credit theo D09 (AI dừng, chuyển người / lời nhắn; cuộc gọi đang có người không bị cắt).
  - Phí "yêu cầu gọi" Zalo (~440–550đ có VAT): Zalo trừ ví OA của shop → AppChat không trừ; Zalo trừ App AppChat → trừ credit đúng giá Zalo. Luôn do người bấm, có xem trước kèm phí.
  - Cước gọi / credit voice **không** vào màn Tài chính (032e chỉ tiền thương mại của DN).

---

## 11. Mâu thuẫn đã giải quyết

| Mâu thuẫn | Nguồn | Kết luận |
|---|---|---|
| Tỉ lệ tích điểm | SRS BR-04, CTO §14.2 (1.000đ) / RRI, prototype (10.000đ) | 10.000đ = 1 điểm |
| 3 mốc cộng điểm | prototype (thanh toán) / Appointments-Spec (buổi hoàn tất) / RRI (`order.completed`) | Chỉ một mốc: đơn hoàn tất |
| Hiệu lực báo giá | RRI, CHANGELOG (15 ngày) / prototype (7 ngày từ khi gửi) | 15 ngày kể từ lúc gửi |
| Trạng thái báo giá / đơn / hoá đơn | prototype (3 bộ khác nhau) / Blueprint | §3, §4, §5 |
| Báo giá thắng sinh Hợp đồng + Đơn | SRS BR-09, CTO | Báo giá accepted → nút "→ Hợp đồng" (tuỳ chọn) hoặc "→ Đơn hàng"; hợp đồng đã ký → nút "→ Đơn hàng" (D25) |
| "Ký số" trong prototype | prototype L5342+ | Ký điện tử của AppChat ở P0; ký số CA ở P2 |
| Mọi báo giá qua duyệt nội bộ | SolutionDesign §4.2 | Chỉ duyệt khi vượt ngưỡng |
| Trừ buổi liệu trình đặt ở loyalty | Blueprint §2.3 cũ | Chuyển sang `customer_package` |
| Pipeline Deal 6 bước | SRS FR-CUS-03 / prototype bản 2026-11-10 | Cơ hội riêng 7 giai đoạn, xác suất cố định; giai đoạn khách suy từ cơ hội (D60, §8) |
| Hết credit | SRS BR-06 / CHANGELOG 07-28 / RRI D09 | Giữ D09 |

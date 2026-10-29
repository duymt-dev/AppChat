# Domain — Tiền, thời gian, mã chứng từ

> Bổ sung Blueprint §2.0 (tiền `bigint` VND, `timestamptz`, `sequence_counter`) bằng các quy tắc tính cụ thể. Luật commerce (ngưỡng, thời hạn, điểm) ở `plans/COMMERCE-DECISIONS.md`; file này chỉ quy định **cách tính** cho đồng nhất.

## 1. Tiền

1. **Đơn vị:** số nguyên VND. DB `bigint`, JSON `string`, tính toán trong JS bằng `number` khi < 2^53 (đủ cho mọi chứng từ), cộng dồn sổ cái dùng `bigint`. Không float trong DB, không `toFixed`.
2. **Làm tròn: half-up về đồng, tại từng bước có nghĩa pháp lý**, theo đúng thứ tự trong `packages/shared/src/commerce/quote-math.ts`:
   1. thành tiền dòng `qty × unit_price` → làm tròn;
   2. chiết khấu dòng (% hoặc số tiền, không vượt thành tiền) → làm tròn;
   3. chiết khấu tổng → làm tròn, phân bổ theo tỉ lệ giá trị dòng để tính thuế;
   4. thuế cộng trên các dòng sau chiết khấu, làm tròn **một lần ở tổng thuế**;
   5. tổng = sau chiết khấu + thuế.
   Mọi chỗ tính tiền chứng từ (báo giá, đơn, đề nghị thanh toán, PDF, Trợ lý) gọi `quoteTotals()`; không tính lại theo cách khác.
3. **Số lượng** `numeric(12,3)` (cho phép 0,5 giờ / 1,25 kg); **thuế suất** `numeric(5,2)` phần trăm, giá trị hợp lệ 0 / 5 / 8 / 10 hoặc "không chịu thuế" (`null`).
4. **Chia đợt / cọc theo %:** làm tròn từng đợt xuống đồng, **đợt cuối nhận phần dư** để tổng các đợt = tổng đơn.
5. **Điểm loyalty:** `floor` (COMMERCE §7); đổi điểm tối đa 50% giá trị đơn, làm tròn xuống theo bội 100đ.
6. **Hoàn tiền một phần / theo tỉ lệ buổi:** làm tròn xuống đồng (không hoàn dư cho khách do làm tròn).
7. **Hiển thị:** chỉ qua `fmt.money` (vi: `12.500.000 ₫`); nhập qua `MoneyInput`. Không hiển thị số lẻ.

## 2. Thời gian

1. **Lưu `timestamptz` UTC;** tính "ngày", "sáng mai", "hết ngày" theo **timezone workspace** (`workspace.timezone`, mặc định `Asia/Ho_Chi_Minh`). Không dùng timezone của máy chủ hay trình duyệt cho luật nghiệp vụ.
2. **Đồng hồ:** chỉ qua `Clock` (kernel); cấm `Date.now()` / `new Date()` trong service, handler, job (test cố định giờ được).
3. **Thời hạn tính theo ngày** (báo giá 15 ngày, đề nghị thanh toán 7 ngày, link ký 7 ngày, gia hạn hợp đồng T-30, hạn điểm 12 tháng): `hết hạn = 23:59:59.999 của ngày (mốc + N) theo timezone workspace`. Ví dụ gửi báo giá 10:00 ngày 01/07 → `valid_until` 23:59:59 ngày 16/07.
4. **Thời hạn tính theo giờ / phút** (OTP, giữ chỗ lịch hẹn, `confirm_token`, undo, SLA) tính tuyệt đối từ thời điểm sự kiện.
5. **Mốc nhắc** (T-2 báo giá, T-1 / T+1 / T+7 đề nghị thanh toán, 24h / 2h lịch hẹn) gửi trong **giờ làm việc** của workspace; mốc rơi ngoài giờ thì dời tới đầu giờ làm việc kế tiếp (trừ nhắc lịch hẹn 2h).
6. **"Tạm ẩn" hội thoại** (REQ-C10): 1 giờ / 3 giờ tính tuyệt đối; "sáng mai" = 08:00 ngày kế tiếp theo timezone workspace (hoặc giờ mở cửa nếu khác); "tuỳ chọn" nhận thời điểm cụ thể.
7. **Giờ làm việc** lấy từ `workspace.settings.business_hours` (Cài đặt → Giờ làm việc); SLA người và mốc nhắc dùng chung một hàm `businessTime` trong `packages/shared`.
8. **Ngày không giờ** (`start_date`, `end_date` hợp đồng, `birthday`) lưu kiểu `date`, không quy đổi timezone.
9. **JSON:** ISO-8601 có offset (`2026-07-01T10:00:00+07:00` hoặc `Z`); hiển thị tương đối / tuyệt đối theo `interaction-patterns.md` IP-6.3.

## 3. Mã chứng từ (`code`)

1. **Sinh trong transaction tạo bản ghi** bằng `UPDATE sequence_counter SET value = value + 1 WHERE kind = $1 RETURNING value` (dòng bị khoá tới hết transaction → không trùng; transaction rollback → số được trả lại, không nhảy số).
2. **Định dạng** (`packages/shared/src/codes.ts`, một hàm `formatCode(kind, n)`):

| kind | Mẫu | Ví dụ | Ghi chú |
|---|---|---|---|
| contact | `KH-{n:4}` | KH-1001 | |
| product | `SP-{n:4}` | SP-1001 | |
| quote | `BG-{n:4}` | BG-2041 | version: `BG-2041` + cột `version` (hiển thị `BG-2041 · v2`), không sinh mã mới |
| contract | `HĐ-{n:4}` | HĐ-1180 | phụ lục `HĐ-1180/PL-{k}` |
| order | `DH-{n:6}` | DH-000123 | **[chốt khi duyệt]** prototype + mock FE dùng `SP290411` (trùng tiền tố mã sản phẩm `SP-`), Blueprint ghi `DH-`. Đề xuất `DH-`; chọn `DH-` thì đổi fixture + ghi `PD` |
| invoice (đề nghị thanh toán) | `TT-{n:6}` | TT-002041 | là mã khớp nội dung chuyển khoản (COMMERCE §5) — không đổi định dạng |
| receipt (phiếu thu) | `PT-{n:6}` | PT-000045 | |
| appointment | `LH-{n:4}` | LH-1201 | |
| ticket | `TKT-{n:4}` | TKT-2041 | **[chốt khi duyệt]** prototype + mock FE dùng `TKT-`, Blueprint ghi `TK-`. Đề xuất giữ `TKT-` (không đổi UI), sửa Blueprint |
| campaign | `CD-{n:4}` | CD-0012 | |

   `{n:4}` = đệm 0 tới tối thiểu 4 chữ số, vượt thì dài thêm (không quay vòng). Không reset theo năm.
3. **Giá trị khởi đầu** của mỗi `kind` khi tạo workspace = 1000 (hoặc theo fixture khi chạy parity), để mã có độ dài đều ngay từ đầu.
4. **Mã là định danh hiển thị**, không dùng làm khoá ngoại; khoá ngoại là `id uuid`. Mã unique trong DB tenant (`unique(code)`), không sửa sau khi tạo.
5. **Import / đồng bộ sàn:** giữ mã ngoài ở cột riêng (`external_code`), vẫn sinh `code` nội bộ.
6. **Số hợp đồng** (`contract.number`) là trường người dùng nhập tự do, khác `code`.

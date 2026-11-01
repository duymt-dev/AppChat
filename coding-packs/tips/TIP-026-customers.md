# TIP-026: Khách hàng — nối API cho màn đã có (bảng có số trang D42 / kanban, Hồ sơ 360° theo `profile_layout`, 6 nút D46, phụ trách + đồng phụ trách, chuyển phụ trách, xin chia sẻ, trường dữ liệu, thẻ, nhập / xuất)

## HEADER
- TIP-ID: TIP-026
- Project: AppChat V2
- Module: FE `apps/web/src/features/customers/**`, `features/inbox/components/Profile360*` (dùng chung 360°) · BE `packages/core/src/crm/**` · `apps/api/src/http/crm/**` · `packages/actions/src/crm.ts` · `packages/shared/src/api/crm.ts`
- Depends on: TIP-015 (CRM backend), TIP-016 / 018 (hội thoại, gửi email) — nhánh xếp chồng từ `tip/025-inbox`
- Priority: P0 · REQ: F01, F01b, F02, F03, F04 · Decision: D32, D42, D46, D56, DC-060…067, DC-077, DC-082
- Estimated effort: 16 giờ

## CONTEXT
Khảo sát đầu TIP (FE ↔ backend http): mọi GET / action màn Khách hàng gọi đã có ở backend (TIP-015), envelope + zod schema khớp. Khoảng trống:
- **FE chưa nối:** nút **Nhập** không làm gì (backend `contact.import` đã có — DC-064 FE tự đọc tệp + ghép cột); **lọc thẻ** chỉ có "Tất cả" (`/contacts/stats.tag_defs` không có id); **Sắp xếp** không làm gì (backend không có tham số sort); **kanban** chỉ vẽ trang hiện tại (20 dòng) + đếm cột theo số tổng không lọc, giai đoạn `lost` không có cột (khách "Mất" biến mất); drawer 360° ở màn Khách hàng **không áp `profile_layout`** theo vai trò (chỉ Hộp thư có).
- **Lệch hành vi:** form sửa có ô người phụ trách → đổi người khác 403 `use_transfer_owner` (DC-066) — phải dẫn sang "Chuyển phụ trách"; ô chức danh điền sẵn "—" (từ `toRow`) → lưu thành chữ "—"; form tạo có địa chỉ / ngày sinh / giới tính nhưng action bỏ; xuất chỉ theo stage / q / owner / mine (bỏ status / group / source / thẻ / trường tuỳ biến).
- **Module khác chưa có backend:** 5 / 6 nút 360° (báo giá, hợp đồng, đơn, ticket, lịch hẹn) — TIP-029/030/031/033/034. Email đã nối (TIP-018).

## TASK
1. **Thẻ:** `/contacts/stats.tag_defs` kèm `id`; bộ lọc Thẻ ở thanh công cụ liệt kê thẻ thật → gửi `tag_id`; mock cùng tham số.
2. **Sắp xếp:** `GET /contacts?sort=recent|name|created|value` (mặc định `recent` = tương tác gần nhất; `value` = tổng chi tiêu); index phù hợp (`name` trigram có sẵn → btree `(name, id)` partial chưa xoá; `created_at`); nút Sắp xếp mở menu chọn. Mock cùng.
3. **Kanban:** `GET /contacts/board?…bộ lọc` → mỗi giai đoạn (gồm `lost`) `{ stage, total, rows[≤ 50] }` (đếm theo bộ lọc, deferred join); FE kanban đọc endpoint này (không phân trang theo bảng), thêm cột "Mất" (màu token); kéo thả `contact.set_stage` làm mới board.
4. **Hồ sơ 360° theo `profile_layout`:** drawer 360° màn Khách hàng dùng `contact360.layout` (tab + khối theo vai trò) như Hộp thư — một component dùng chung.
5. **Form:** form sửa ẩn ô người phụ trách (hiện "Chuyển phụ trách" cho người có `crm.reassign`); bỏ điền "—"; action `contact.create/update` nhận `address`, `birthday`, `gender` (cột có sẵn); 409 trùng của chính mình → mở khách đã có.
6. **Nhập (REQ-F03):** nút Nhập → modal chọn tệp CSV / XLSX (đọc ở trình duyệt — `xlsx` đã có? nếu không: CSV thuần + ghi DV), ghép cột tự động theo tên tiêu đề (vi / en), xem trước 5 dòng → `contact.import { rows }` (≤ 500 / lần, chia lượt), kết quả tạo / trùng / lỗi; hoàn tác qua Nhật ký.
7. **Xuất:** `contact.export` nhận đủ bộ lọc của danh sách (status, group, source, tag_id, cf.*); FE gửi đủ.
8. **Thông báo (Q-012):** `contact.owner_changed` → thông báo người nhận khách; `contact.access_requested` → người phụ trách; `access_decided` → người xin (catalog notify có sẵn khoá? thêm nếu thiếu).
9. **Sửa nhỏ:** `StageKey` có `lost`; thao tác hàng loạt "Chuyển phụ trách" cho các dòng chọn (gọi `contact.transfer_owner` từng khách — thanh chọn có sẵn) — nếu UI có nút "Giao" thì nối, "Chuyển tiếp" ẩn.

## ACCEPTANCE CRITERIA
1. Integration: `tag_id` lọc đúng + `tag_defs.id`; `sort` 4 kiểu ổn định (id phụ), giá trị lạ 400; `/contacts/board` đếm theo bộ lọc + scope, có `lost`, ≤ 50 / cột; create / update nhận address / birthday / gender; export theo đủ bộ lọc; thông báo owner_changed / access_requested / access_decided tới đúng người; EXPLAIN board + sort dùng index.
2. FE unit / mock shape: mock nhận cùng tham số (tag_id, sort, board), parse cùng schema; bộ ghép cột nhập (vi / en).
3. E2E http: tạo 3 khách → lọc thẻ / sắp xếp tên → kanban có cột Mất, kéo sang Đang tư vấn (tải lại giữ); 360° theo bố cục vai trò; sửa không còn ô phụ trách, không lưu "—"; nhập CSV 3 dòng (1 trùng) → kết quả; xuất theo bộ lọc tải được CSV; đồng phụ trách + chuyển phụ trách + xin chia sẻ (2 người dùng) có thông báo.
4. E2E mock `customers` + `custom-fields` xanh; parity `customers:*` không hồi quy.

## CONSTRAINTS
- 5 nút 360° của module chưa có backend giữ nguyên hành vi mở form; lưu trả 501 "Tính năng này chưa sẵn sàng" (TIP-024 i18n) — không làm handler module khác.
- Cột "AI gợi ý" / `/crm/ai` = TIP AI sau (giữ trạng thái chờ).
- Không đổi luật D32 / DC-066 (sửa không đổi phụ trách).

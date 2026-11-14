# TIP-033: Lịch hẹn — `booking.prisma`, nhân sự, giờ mở cửa, tìm slot + chống trùng (btree_gist), vòng đời, giữ chỗ, nhắc hẹn, trừ buổi liệu trình, gợi ý tạo đơn, nối trang Lịch

## HEADER
- TIP-ID: TIP-033
- Project: AppChat V2
- Module: `packages/db/prisma/tenant/booking.prisma` + migration 033 · `packages/core/src/booking/**` (+ `jobs/booking.jobs.module.ts`) · `packages/core/src/sales/orders/actions/order-from-appointment.handler.ts` · `apps/api/src/http/booking/calendar.controller.ts` · `packages/actions/src/{booking, booking-config}.ts` · `packages/shared/src/{booking/appointment-state, time/wall-clock, api/calendar}.ts` · FE `apps/web/src/features/calendar/**` · mock `domains/calendar*.ts`
- Depends on: TIP-015 (CRM — tạo / tìm khách theo số điện thoại, timeline), TIP-027 (sản phẩm `service` có thời lượng, `package` + thành phần), TIP-032 (liệu trình `customer_package` + `package_usage`), TIP-018 / 025 (gửi tin vào hội thoại) — nhánh xếp chồng từ `tip/032-payments`
- Priority: P0 · REQ: G01–G05 · Decision: D42, COMMERCE §6, §8b
- Estimated effort: 18 giờ

## CONTEXT
Khảo sát đầu TIP: `booking.prisma` là stub; 8 action `appointment.*` trả 501; chưa có action cấu hình nhân sự / giờ mở cửa; `package_usage` (TIP-032) chưa gắn lịch hẹn. Màn Lịch chạy mock (4 chế độ xem, drawer, form tạo / đổi giờ theo slot, liệu trình trừ buổi, gợi ý tạo đơn chỉ chuyển sang trang Đơn hàng). Mock dùng `INVALID_STATE` cho sai bước. Postgres đã bật `btree_gist` (bootstrap).

## TASK
1. **Schema + migration 033**: enum `AppointmentStatus` (7 trạng thái, thêm `expired`); bảng `staff` (+ kỹ năng = dịch vụ, nhóm, phòng, màu), `staff_schedule` (ca riêng theo thứ), `business_hours` (7 dòng seed 08:00–19:00), `booking_setting` (bước slot, đệm mặc định, không đến có trừ buổi), `appointment` (mã `LH-`, `block_end_at` = kết thúc + đệm, giữ chỗ, mốc nhắc, khách / dịch vụ / nhân sự / hội thoại / liệu trình / đơn); EXCLUDE gist chống trùng nhân sự trên `[start_at, block_end_at)` khi lịch còn giữ chỗ; index khoảng ngày (INCLUDE), theo nhân sự / phụ trách / khách, partial giữ chỗ / lịch mở, mã, GIN trường tuỳ biến; FK `package_usage.appointment_id`; index biểu thức `action_log`.
2. **Shared**: `APPOINTMENT_FLOW` (pending → confirm / reschedule / check_in / cancel / mark_no_show / expire …), `holdUntil` (2 giờ, không quá giờ hẹn), `noShowAllowed` (ân hạn 20 phút), `dueReminder` (24h / 2h); `wallToUtc` / `utcToWall` (giờ workspace); shape `api/calendar.ts`; event `appointment.*`; chuỗi server `booking` (gợi ý AI, lời nhắc), timeline CRM 6 loại.
3. **Actions**: `appointment.list`; `staff.create` / `update` / `deactivate`, `business_hours.update` (`booking.config`); `order.create_from_appointment` (`order.manage`, hoàn tác 24h).
4. **Core `booking/`**: slot = giờ mở cửa ∩ ca riêng, lọc kỹ năng, trừ lịch bận + đệm, hôm nay bỏ giờ đã qua; tạo (khách theo id → theo số điện thoại → tạo mới trong CRM; trùng → CONFLICT kể cả hai người đặt cùng lúc qua EXCLUDE; tự gắn liệu trình còn buổi có dịch vụ trong thành phần) + hoàn tác; đổi giờ giữ mã; vòng đời confirm → check_in → complete (liệu trình trừ buổi qua `package_usage`, ngoài gói `suggest_order`); không đến sau ân hạn; huỷ có lý do; mọi bước có hoàn tác; nhân sự còn lịch sắp tới không ngừng được; job `booking.sweep` 5 phút: hết giữ chỗ → `expired`, nhắc 24h / 2h qua hội thoại của khách; `CalendarReadService` (khoảng ngày + scope + lọc, chi tiết, meta KPI + gợi ý theo luật + lịch sử khách, slot, cài đặt).
5. **Sales**: `order.create_from_appointment` — chỉ lịch đã hoàn thành ngoài liệu trình, một đơn mỗi lịch (gọi lại trả đơn cũ), dòng = giá dịch vụ, nguồn `appointment`.
6. **API**: `GET /v1/calendar?from&to` (≤ 62 ngày), `/calendar/meta`, `/calendar/slots`, `/calendar/:id`, `/settings/booking`.
7. **FE**: mock theo `APPOINTMENT_FLOW` (INVALID_TRANSITION), thêm action cấu hình + tạo đơn từ lịch hẹn; trạng thái `expired`; nút "Tạo đơn" ở thẻ gợi ý chạy `order.create_from_appointment` (trang Đơn hàng `?from_appointment=`).

## ACCEPTANCE CRITERIA
1. Integration `booking.test.ts` (12 ca): bảng + EXCLUDE + index + EXPLAIN; cấu hình nhân sự / giờ mở cửa + quyền; slot; tạo theo số điện thoại + trùng → CONFLICT + EXCLUDE; hoàn tác + đổi giờ; vòng đời ngoài gói → đơn; liệu trình trừ / trả buổi; không đến + huỷ; job hết giữ chỗ + nhắc 24h / 2h; đọc + scope; ngừng nhân sự.
2. Unit shared `appointment-state.test.ts`, `wall-clock.test.ts` + mock shape `calendar-shape.test.ts`.
3. E2E http `calendar.spec.ts`: dịch vụ + nhân sự → tạo từ slot (LH-) → đổi giờ giữ mã → xác nhận → đến → hoàn thành → tạo đơn từ lịch hẹn → huỷ lịch thứ hai có lý do.
4. E2E mock `calendar` + `orders` xanh, parity `calendar:*` < 5%.

## CONSTRAINTS
- COMMERCE §6 / §8b không đổi: lịch trong liệu trình trừ 1 buổi khi hoàn thành; ngoài liệu trình chỉ **gợi ý** tạo đơn (người dùng bấm mới tạo); hoàn thành không cộng điểm.
- Màn cấu hình nhân sự / giờ mở cửa: prototype không có → chỉ action + API (UI ở TIP cài đặt sau). Kênh nhắc thật (Zalo / email) qua adapter giả.

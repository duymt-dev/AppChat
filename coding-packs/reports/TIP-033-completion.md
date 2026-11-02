### COMPLETION REPORT — TIP-033

**STATUS:** DONE (nhắc hẹn qua kênh Zalo / email giả — chưa nghiệm thu với Zalo thật; màn cấu hình nhân sự / giờ mở cửa chưa có vì prototype không vẽ — chỉ action + API)
**COMMIT:** `5a628fb` (code) + commit report / tiến độ trên nhánh `tip/033-calendar` (xếp chồng trên `tip/032-payments`)

**KHẢO SÁT ĐẦU TIP:** `booking.prisma` stub; 8 action `appointment.*` trả 501; chưa có action cấu hình nhân sự / giờ mở cửa; `package_usage` (TIP-032) chưa gắn lịch hẹn. Màn Lịch chạy mock (4 chế độ xem, drawer, form theo slot, trừ buổi liệu trình, gợi ý tạo đơn chỉ chuyển trang Đơn hàng). Mock dùng `INVALID_STATE` cho sai bước. `btree_gist` đã bật từ bootstrap.

**FILES CHANGED:**
- Created: migration tenant `20261101900000_033_booking`; shared `booking/appointment-state.ts` (+ test), `time/wall-clock.ts` (+ test), `api/calendar.ts`, `i18n/server/{vi,en}/booking.ts`; actions `booking-config.ts`; core `booking/{booking-access, public}.ts`, `booking/services/{booking-place, slots, appointment-write, calendar-read.service, booking-system}.ts`, `booking/actions/{appointment-book, appointment-flow, booking-config}.handlers.ts`, `sales/orders/actions/order-from-appointment.handler.ts`; API `http/booking/calendar.controller.ts`, `test/integration/booking.test.ts`; FE mock `domains/calendar-actions.ts`, `mock/calendar-shape.test.ts`, `e2e/http/calendar.spec.ts`; `coding-packs/tips/TIP-033-calendar.md`.
- Modified: `tenant/booking.prisma`; shared `events.ts`, `index.ts`, `api/index.ts`, `i18n/server/{index, vi/crm, en/crm}.ts`; actions `booking.ts`, `index.ts`; core `booking/booking.module.ts`, `booking/jobs/booking.jobs.module.ts`, `crm/{public, services/timeline.service}.ts`, `index.ts`, `kernel/actions/tip-owners.ts`, `sales/{sales.module, orders/actions/order-create.handlers}.ts`; API `app.module.ts`, `http/booking/booking.http.module.ts`; FE `features/calendar/{types, status, components/AppointmentDrawer}`, `features/orders/screens/OrdersScreen.tsx` (`?from_appointment=`), mock `domains/calendar.ts`, `messages/{vi,en}/{actions, calendar}.json`, `e2e/calendar.spec.ts`; `coding-packs/{DECISIONS, DEVIATIONS}.md`, `goals/GOAL-BACKEND.md`.

**TEST RESULTS:**
- Acceptance criteria: 4/4 pass
  1. Integration `booking.test.ts` **12/12**: bảng + EXCLUDE `appointment_no_overlap` + index + EXPLAIN khoảng ngày (`appointment_start_idx` / `open_start_idx`); `staff.create` (kỹ năng không phải dịch vụ 422, cs 403), `business_hours.update` (giờ ngược 422), `/settings/booking` (cs 403); slot: giờ mở cửa ∩ ca riêng 13:00–17:00, kỹ năng, Chủ nhật nghỉ → [], hôm nay từ 15:00; tạo: khách mới theo số điện thoại vào CRM, `LH-`, giữ chỗ tới 10:00Z, `block_end_at` +10′, lần 2 cùng số dùng lại khách, trùng / dính đệm / ngoài ca → CONFLICT; EXCLUDE chặn ghi thẳng DB; hoàn tác tạo (404, trả khung giờ); đổi giờ giữ mã + đếm lần dời + trùng CONFLICT + hoàn tác; sai bước INVALID_TRANSITION; ngoài gói → `suggest_order` → `order.create_from_appointment` (DH-, nguồn `appointment`, 450.000, gọi lại trả đơn cũ); liệu trình tự gắn (dịch vụ ngoài thành phần không gắn) → hoàn thành trừ 1 buổi + `package_usage` → tạo đơn 409 → hoàn tác trả buổi; không đến trước ân hạn 409 / sau ân hạn được; huỷ lý do rỗng 422 + hoàn tác; job hết giữ chỗ → `expired` + khung giờ đặt lại được; nhắc 24h rồi 2h qua Zalo mỗi mốc một lần; `/calendar` khoảng ngày + lọc nhân sự + tìm không dấu + > 62 ngày 400 + meta + scope cs own / kế toán 403; ngừng nhân sự còn lịch 409 — **pass**
  2. Unit shared `appointment-state.test.ts` 8 + `wall-clock.test.ts` 5 + mock shape `calendar-shape.test.ts` 2 — **pass**
  3. E2E http `calendar.spec.ts`: dịch vụ (màn Sản phẩm) + nhân sự (API) → tạo lịch từ slot (mã `LH-` đọc lại qua `/v1/calendar`) → đổi giờ 14:00 giữ mã, lần dời 1 → xác nhận → đã đến → hoàn thành → gợi ý → "Tạo đơn" mở drawer đơn DH- đúng khách + dịch vụ → lịch thứ hai huỷ bắt buộc lý do — **pass**
  4. E2E mock `calendar` + `orders` **14 passed** (thêm bước "Tạo đơn" từ gợi ý) + parity `calendar:list` **3,46%** · `week` **1,24%** · `month` **1,13%** · `day` **0,79%** · `appointment` **4,46%** · `create` **2,79%** · `orders:create` **2,93%**.
- **Cổng "khi làm":** integration đỏ lần đầu ở: import `uuidv7` sai gói, lọc quan hệ Prisma `message.where.conversation` không hợp lệ (đổi sang `conversationId`), kiểm lời nhắc lẫn với lịch khác cùng khách (lọc theo giờ 09:00); mock trả `INVALID_STATE` cho sai bước (đổi sang `APPOINTMENT_FLOW` → INVALID_TRANSITION) + thiếu `/settings/booking`; E2E http lượt 1 tìm mã `LH-` trên drawer (drawer không hiện mã) → đọc mã qua API.
- **Cổng "trước commit":** `turbo lint typecheck test` shared / actions / core / db / api / web **18/18**; `pnpm depcheck` không vòng mới; `i18n:check` 100% (4666 key); `lint:size` (1567 file) / `lint:tokens` xanh; build **4/4**.
- **Cổng "chốt TIP":** `db:cleanup-test` → `api test:integration` **364 passed** (34 file). E2E http toàn bộ **31 passed · 0 failed · 25 skipped** (log 503 `WORKSPACE_UNAVAILABLE` là lúc onboarding chờ cấp DB — bình thường). Full E2E hồi quy mock **226 passed · 1 failed · 201 skipped** — ca đỏ `settings.spec.ts` "kênh: thêm tài khoản email qua wizard 3 bước" (mask drawer đang chạy hiệu ứng chặn click khi máy tải nặng, không thuộc phần TIP-033 đụng tới); chạy lại `pnpm e2e settings` **12 passed** → lỗi chập chờn. Parity như trên (dev server mock cổng 3117).

**INDEX / EXPLAIN:** lưới ngày / tuần / tháng = `SELECT a.id FROM appointment a WHERE deleted_at IS NULL AND start_at >= $from AND start_at < $to [scope] [staff] [status] [team] [q] ORDER BY start_at, id LIMIT 2000` → `appointment_start_idx (start_at) INCLUDE (staff_id, status, contact_id)` (EXPLAIN chọn `appointment_start_idx` / `appointment_open_start_idx`), rồi `findMany` theo PK; lọc nhân sự `appointment_staff_start_idx (staff_id, start_at)`; scope own `appointment_owner_start_idx (owner_user_id, start_at)`; lịch sử khách `appointment_contact_idx`; job giữ chỗ `appointment_hold_idx (hold_expires_at) WHERE status = 'pending'`; nhắc hẹn `appointment_open_start_idx` partial lịch mở; tìm mã `code text_pattern_ops`; trường tuỳ biến GIN `custom`; chống trùng EXCLUDE gist `(staff_id =, tstzrange(start_at, block_end_at, '[)') &&)` partial lịch còn giữ chỗ; lịch sử action `action_log` biểu thức `appointment_id`.

**ISSUES DISCOVERED:**
- Prototype không có màn cấu hình nhân sự / ca / giờ mở cửa → workspace mới phải tạo nhân sự qua API (E2E http làm vậy). Cần một mục Cài đặt "Đặt lịch" ở TIP cài đặt sau (DV-015).
- Drawer lịch hẹn không hiện mã `LH-` (prototype đặt mã ở tiêu đề nhưng header tuỳ biến đè) — giữ như prototype.
- `settings.spec.ts` (wizard kênh) chập chờn khi chạy toàn bộ song song — nên chờ mask drawer biến mất trước khi click.

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-201 … DC-208. **Lệch spec:** DV-015. **Câu hỏi:** không có mới. **Lệch prototype:** không thêm (trạng thái "Hết giữ chỗ" dùng tông của "Đã huỷ"). **Chưa nghiệm thu với provider thật:** gửi nhắc hẹn Zalo / email thật.

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-034 trở đi: agent đặt lịch dùng `appointment.find_slots` + `appointment.create` (khách theo số điện thoại, `conversation_id` để nhắc đúng hội thoại).
- TIP-036: hoàn thành lịch không cộng điểm (COMMERCE §7) — điểm chỉ từ đơn hoàn tất, kể cả đơn `order.create_from_appointment`.

## Supplemental record-scope audit (2026-11-02)

See [TIP-042c](../tips/TIP-042c-record-scope.md) and [scope audit](scope-planning-audit-2026-11-02.md): read/write separation for watcher grants, list/detail parity for scope none, and team_id propagation need verification/correction. Q-029 gates multi-team semantics. Existing CRM tests do not prove all business-document paths; no implementation completion is implied by this plan.

## Bổ sung015e — chưa triển khai

[TIP-015e](../tips/TIP-015e-contact-merge-integrity.md) nhận merge/dedupe và historical family/package associations, current authority và conditional inverse. Không coi report DONE cũ là chứng minh các phần bổ sung đã đạt.

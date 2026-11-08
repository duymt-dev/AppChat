# TIP-033b — Completion Report (Booking operations: xác nhận lại, cài đặt lịch, liệu trình dùng chung)

> Nhánh theo pha, mỗi pha một PR vào `dev` (xếp chồng). Pha: P1 xác nhận lại + thứ tự khoá + SLOT_TAKEN + hoàn tác có điều kiện · P2 khoá chung cho tạo / dời / flow + migration version / tri-state + chính sách slot + exclude có quyền · P3 Cài đặt Lịch hẹn (BookingSection) + `booking.settings_get` · P4 PackagesRead + `package.list_for_contact` + thẻ liệu trình 360 + xuất `customer_packages` · P5 ai:live booking-operations + chốt TIP.

## Pha 1 — xác nhận lại lịch hết giữ chỗ, thứ tự khoá, SLOT_TAKEN, hoàn tác có điều kiện (§1.1, §2.1, §2.3–§2.6; AC1, AC6, một phần AC2) — DC-414, DV-088

**Rà trước khi làm (code thật)**
- `appointment-state.ts`: `expired` nằm trong `terminal`, không có bước nào từ expired → không xác nhận lại được (trái D52d / state-machine §8).
- `appointment-flow.handlers.ts` confirm: update trần, không khoá, không kiểm lại khung / nhân sự / gói; hoàn tác chỉ kiểm trạng thái (ABA lọt).
- `appointment-write.ts conflictOf` / `appointment-edit.ts assertSlot`: trùng khung → `CONFLICT` (DC-261 chốt `SLOT_TAKEN`).
- `AppointmentDrawer.tsx` ẩn mọi thao tác ở expired; file 264 dòng gộp Header / Footer.
- `booking-system.ts expireHolds`: khoá riêng từng lịch, không theo thứ tự chung → có thể đảo khoá với xác nhận.
- `appointmentRow` không có `version`.

**FILES CHANGED** (lệch manifest ở DV-088)
- shared: `booking/appointment-state.ts` (+ test), `api/calendar.ts` (`version`).
- actions: `booking.ts` (confirm: `if_version`, output `version`, mô tả LLM cho pending / expired).
- core: `booking/operations/{locks,confirm,undo}.ts` (mới), `booking/actions/appointment-confirm.handler.ts` (mới), `actions/appointment-flow.handlers.ts` (bỏ handler cũ, chỉ re-export 1 dòng), `actions/previews/appointment-flow.handlers.preview.ts`, `services/{appointment-write,appointment-edit,booking-system,calendar-read.service,slots}.ts`.
- web: `features/calendar/components/{AppointmentHeader,AppointmentFooter,ReconfirmAppointment}.tsx` (mới, tách từ drawer), `AppointmentDrawer.tsx`, `AppointmentFormModal.tsx` (nhận SLOT_TAKEN), `types.ts`, `styles/detail.styles.ts`; mock `domains/calendar{,-actions}.ts`; i18n calendar vi / en.
- test: api `test/integration/booking-operations.test.ts` (mới), `booking.test.ts` (CONFLICT → SLOT_TAKEN); web `AppointmentFooter.test.tsx` (mới), `calendar-shape.test.ts`.

**Giả định đã chọn (gap-filling)**
- "Khung làm việc hiện tại" khi xác nhận lại = `windowOf` (ca riêng nhân sự ∩ giờ mở cửa) như lúc tạo lịch; tri-state đóng / kế thừa áp ở P2 cùng migration.
- Gói hết chỗ = `used + số lịch đang giữ chỗ khác ≥ total` (cùng cách đếm của `appointment-write`).
- Mock không có đồng hồ thật: "giờ đã qua" so với hôm nay của fixture lúc 09:00 (cùng mốc `not_before` của slots).

**TEST (cổng khi làm — D59)**
- api integration `booking-operations.test.ts` **6/6** (khung trống → cùng id / mã, version +1, không usage, hoàn tác về expired; khung bị chiếm → SLOT_TAKEN `slot_taken`, check-in / dời từ expired bị chặn; nhân sự ngừng → INVALID_STATE `inactive`, if_version lệch → STALE_VERSION, version không đổi; pending quá hạn giữ chỗ đi đường chiếm lại + hoàn tác về expired; pending còn giữ chỗ hoàn tác trả giữ chỗ cũ, đã check-in → hoàn tác 409; xác nhận song song với quét hết giữ chỗ → confirmed, không deadlock) + `booking.test.ts` **12/12**.
- shared `appointment-state` **9/9**; web `AppointmentFooter.test.tsx` **3/3**, `calendar-shape.test.ts` **3/3**.
- turbo lint / typecheck / test shared · actions · core · web · api: xanh (core `contract-file-extraction` DOCX đỏ một lần khi chạy song song — chạy lại riêng 10/10, ngoài phạm vi TIP).
- lint:size OK (3755 file); lint:tokens OK; i18n 100% (6711 key); E2E mock calendar **7 passed / 7 skipped** (bản mobile của luồng desktop).

**ĐỐI CHIẾU STANDARDS (P1)**

| Standard | Kết quả |
|---|---|
| `domain/state-machine.md` §8 | expired → confirmed / cancelled; terminal còn done / no_show / cancelled; bảng dùng chung server + mock |
| `domain/concurrency.md` | thứ tự khoá khách → gói → nhân sự → lịch; đọc lại sau khoá; EXCLUDE là chốt cuối → SLOT_TAKEN 409; if_version → STALE_VERSION |
| `actions/action-registry.md` | một handler `appointment.confirm`; quyền / risk / agentGrantable giữ nguyên; preview kiểm như execute; hoàn tác 24 giờ có điều kiện |
| `api/response-envelope.md` | lỗi `{ error: { code, fields } }` với lý do trường, không lộ lịch của người khác |
| `ui/frontend-structure.md` | drawer chỉ ghép; Header / Footer / Reconfirm tách file, dưới 150 dòng; chỉ token |
| `i18n/i18n.md` | khoá mới vi + en, 100% |
| `code/testing.md` | test riêng; integration Postgres thật, không mock SQL |

**Chưa làm ở P1 (làm ở P2):** khoá chung cho create / reschedule / check-in / complete / no-show / cancel + hoàn tác của chúng; cạnh tranh với deactivate / merge / package adjust (phần còn lại của AC2) — P2.

## Pha 2 — khoá chung cho mọi ghi lịch, cấu hình tri-state + CAS, chính sách slot có quyền, hoàn tác ràng buộc version (§2.1–§2.2, §2.6, §3.1–§3.5; AC2, AC3, AC4, AC6) — DC-415, DV-089

**Rà trước khi làm (code thật)**
- `lockAppointment` chỉ khoá khách → lịch; tạo lịch không khoá nhân sự / liệu trình (đua với ngừng nhân sự lọt được); `staff.deactivate` chỉ đếm `start_at ≥ now` (lịch đang làm bắt đầu hôm qua bị bỏ qua).
- `writeSchedule` lọc bỏ ngày nghỉ (open=false) → nghỉ biến thành "theo giờ mở cửa"; Staff / BookingSetting không có version; regex giờ nhận 29:00.
- `slotsFor`: lịch có sẵn tính `end + đệm hiện hành` (không theo block_end đã lưu), ngày = +24 giờ cứng, hết ngày = 23:59; `exclude_id` truyền thẳng từ HTTP / tool (bỏ được chỗ bận của lịch bất kỳ).
- Hoàn tác flow / dời chỉ kiểm trạng thái (ABA lọt); hoàn tác tạo đặt deleted_at (ẩn lịch sử).

**FILES CHANGED** (lệch manifest ở DV-089)
- db: `prisma/tenant/booking.prisma`, migration `20261109010000_booking_operations`.
- shared: `booking/input.ts` (mới), `booking/slots.ts`, `api/calendar.ts`, `index.ts`.
- actions: `booking-config.ts` (if_version, version, giờ 00–23).
- core: `booking/operations/{settings,slot-policy}.ts` (mới), `operations/{locks,undo,confirm}.ts`, `booking-access.ts`, `actions/{appointment-book,appointment-flow,appointment-update,booking-config}.handlers.ts`, `actions/previews/booking-config.handlers.preview.ts`, `services/{slots,appointment-edit,calendar-read.service}.ts`.
- web: `AppointmentDrawer.tsx` (lý do `undo_create`), i18n calendar vi / en.
- test: api `booking-settings.test.ts` (mới), `booking.test.ts`, `actions/{appointment.create,staff.create,staff.update}.action.test.ts`; shared `booking/input.test.ts` (mới), `booking/slots.test.ts`.

**Giả định đã chọn (gap-filling)**
- Tạo lịch khoá MỌI liệu trình còn hiệu lực của khách (gói gắn tự động chưa biết trước khi khoá) — số gói mỗi khách nhỏ.
- Hoàn tác về trạng thái giữ chỗ khi gói đã đầy (lịch khác đã chiếm chỗ) → 409, không vượt sức chứa.
- Ngày nghỉ của nhân sự giữ giờ HH:mm hợp lệ trong dòng (không mang nghĩa) để ràng buộc định dạng cũ vẫn đúng.

**TEST (cổng khi làm — D59)**
- `db:test-reset` (migration mới áp vào template).
- api integration booking-settings **6/6** (3 lần liền) · booking-operations **6/6** · booking **12/12** · actions appointment.* / staff.* / business_hours + liên quan (appointment-update, contact-transfer, inbox-vertical-context, watcher-write-denial, order.create_from_appointment) **87/87**.
- shared booking **14/14**; worker integration **26/26**.
- turbo lint / typecheck / test `...[origin/dev]` **39/39**; depcheck 0 lỗi (gỡ vòng booking-access ↔ operations/locks); lint:size OK; i18n 100% (6712); E2E mock calendar **7 passed / 7 skipped**.

**ĐỐI CHIẾU STANDARDS (P2)**

| Standard | Kết quả |
|---|---|
| `domain/concurrency.md` | thứ tự khoá toàn cục khách → gói → nhân sự → lịch; writer cấu hình setting → nhân sự; đọc lại sau khoá; CAS if_version |
| `database/indexing.md` | composite `=` trước, khoảng sau; INCLUDE payload; partial theo trạng thái giữ chỗ |
| `database/tenant-db.md` | migration mới (không sửa migration đã áp), không cột workspace_id, khởi tạo idempotent |
| `domain/validation-defaults.md` | ngày lịch thật, giờ 00–23, 7 thứ duy nhất; hoàn tác tạo giữ bản ghi (không xoá / ẩn) |
| `domain/money-time-numbering.md` | ngày theo múi workspace, nửa đêm hôm sau, giờ lặp / nhảy khi đổi giờ → 422 thay vì đoán |
| `authz/rbac-permissions.md` | exclude_id cần booking.manage + scope ghi; khác → 404 đồng nhất (không lộ tồn tại) |
| `actions/action-registry.md` | preview kiểm if_version / chặn ngừng như execute; hoàn tác có điều kiện 24 giờ |
| `code/testing.md` | test riêng; Postgres thật, đua song song thật |

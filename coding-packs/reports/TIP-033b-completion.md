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

## Pha 3 — Cài đặt Lịch hẹn, booking.settings_get, sự kiện cấu hình (§1.3, §3.1, §3.6, §5.3; AC3) — DC-416, DV-090

**Rà trước khi làm (code thật)**
- Registry Cài đặt không có mục lịch hẹn dù GET /settings/booking + action cấu hình đã có (DEF-033-1, PRO-settings-booking, DV-015 MỘT PHẦN).
- GET /settings/booking trả toàn bộ nhân sự một lần, không version; không có action đọc cấu hình cho Trợ lý.
- Mock `staff.*` / `business_hours.update` chỉ trả id (không lưu, không version); `/settings/booking` mock cố định.
- Config handlers không phát sự kiện → UI / lịch không làm mới khi người khác sửa.

**FILES CHANGED** (lệch manifest ở DV-090)
- actions: `booking-read.ts` (mới, `booking.settings_get`), `booking-config.ts` (invalidates `settings`), `index.ts`.
- shared: `events.ts` (`booking.config_changed`), `api/calendar.ts` (`staff_next_cursor`, `BookingSettingsDto`).
- core: `booking/operations/settings-read.ts`, `booking/actions/booking-read.handler.ts`, `booking/events/config.rules.ts` (mới); `booking.module.ts`, `actions/booking-config.handlers.ts`, `services/calendar-read.service.ts`, `notify/events/domain.rules.ts`, `kernel/actions/tip-owners.ts`.
- api: `http/booking/calendar.controller.ts` (staff_cursor / staff_limit).
- web: `settings/components/BookingSection.tsx`, `components/booking/{BusinessHoursForm,StaffTable,StaffEditorDrawer,StaffScheduleEditor}.tsx`, `hooks/useBookingSettings.ts`, `styles/booking.styles.ts` (mới); `registry.ts`, `screens/SettingsScreen.tsx`, `api.ts`; `shared/realtime/event-invalidation.ts`; mock `domains/booking-config.ts` (mới), `calendar{,-actions}.ts`; i18n settings / actions vi + en.
- test: api `actions/booking.settings_get.action.test.ts`; core `booking-config-events.test.ts`; web e2e `booking-operations.spec.ts`.

**Giả định đã chọn (gap-filling)**
- Prototype không vẽ màn này → khung theo Chính sách bán hàng (gap-filling §2); mục đặt cuối nav (như doc_templates) để không đẩy lệch các mục có trong prototype — settings:shell 0,34% (đặt ở nhóm Vận hành làm shell lên 4,18%).
- Ca riêng mặc định khi chọn "Giờ riêng": 08:00–17:00 (người dùng sửa ngay).
- Đệm nhập tay kẹp 0–240 ở FE; server vẫn kiểm.

**TEST (cổng khi làm — D59)**
- api integration booking.settings_get **5/5** (trang không trùng / sót, cursor hỏng 422, 403 cs, agentGrantable=false) + booking-settings / booking / booking-operations / staff.* / business_hours **45/45**; worker integration **26/26**.
- core `booking-config-events` **2/2**, `actions-unit` + `assistant-implemented-tools` **23/23**.
- turbo lint / typecheck / test `...[origin/dev]` **39/39**; depcheck 0 lỗi; lint:size / lint:tokens OK; i18n 100% (6758).
- E2E mock booking-operations **3 passed / 3 skipped** (mobile chạy ca 390), settings (10 spec) **12/12**, settings-ops / roles / routing + calendar **18/18**.
- Parity (mock `next start -p 3464`) `--done`: settings:shell 0,34%, settings:* ≤ 4,19%, calendar:* ≤ 4,46% (calendar:appointment 4,46% = mức cũ đã ghi, không đổi — drawer chỉ tách file, khung giống).

**ĐỐI CHIẾU STANDARDS (P3)**

| Standard | Kết quả |
|---|---|
| `ui/frontend-structure.md` | section chỉ ghép; form / bảng / drawer / editor tách `components/booking/*`, hook riêng, styles riêng; mọi file < 150 dòng |
| `ui/prototype-parity.md` §7 | màn mới đặt cuối nav, không đẩy lệch mục prototype; settings:shell 0,34% |
| `ui/interaction-patterns.md` | lỗi tại chỗ, Lưu tắt khi chưa đổi / lỗi, Hoàn lại bỏ nháp, 409 giữ nháp; trạng thái loading / error / 0 nhân sự tách bạch |
| `i18n/i18n.md` | khoá vi + en (không dấu chấm trong khoá), 100% |
| `events/outbox.md` | sự kiện khai EVENT_SCHEMAS, phát qua outbox của action, payload chỉ id / version |
| `actions/action-registry.md` | `booking.settings_get` read, booking.config, agentGrantable=false; cấu hình invalidates đúng khoá |
| `database/indexing.md` | trang nhân sự seek theo `staff_page_idx`, chọn id trước rồi nạp payload |

## Pha 4 — PackagesRead dùng chung + thẻ Liệu trình ở Hồ sơ 360° (§1.3, §4.1–§4.4, §5.2; AC5; COM-6-10) — DC-417, DV-091

**Rà trước khi làm (code thật)**
- GET /contacts/:id/packages trả mảng thô, lọc scope bằng vòng `inSalesScope` từng dòng sau khi tải, không trang, không remaining; order_id luôn lộ.
- Không có action đọc liệu trình cho Trợ lý / agent; FE không gọi API này (chỉ mock test) — COM-6-10 MỘT PHẦN.
- CalendarReadService nạp gói trực tiếp theo quyền booking → người xem lịch thấy tên / số buổi gói dù không đọc được đơn.
- LAYOUT_BLOCKS 12 khối chép tay ở ProfileLayoutEditor; schema blocks max 12.

**FILES CHANGED** (lệch manifest ở DV-091)
- core: `sales/payments/packages/{projection,repository,read.service,read.handler,read.module}.ts` (mới); `sales.module.ts`, `sales/public.ts`, `crm/public.ts`, `payments/services/invoices-read.service.ts`, `booking/services/calendar-read.service.ts`, `kernel/actions/tip-owners.ts`.
- api: `http/sales/invoices.controller.ts` (status / service_id / cursor / limit, `{ data, next_cursor }`).
- actions: `customer-packages.ts` (mới), `index.ts`; `booking.ts`, `booking-update.ts`, `payments.ts`, `settings-apps.ts` (invalidates `packages`, blocks max 13).
- shared: `api/customer-packages.ts` (mới), `api/index.ts`, `api/invoices.ts` (bỏ schema cũ), `crm/layouts.ts` (+`packages`).
- web: `shared/customer-packages/{types,api,index}.ts`, `hooks/useCustomerPackages.ts`, `components/{CustomerPackagesCard,PackageRow}.tsx` (mới); `inbox/components/{Overview360,Blocks360,Profile360Content}.tsx`, `settings/components/ProfileLayoutEditor.tsx`; mock `invoices-actions.ts`; i18n common / settings vi + en.
- test: api `customer-packages.test.ts`, `actions/package.list_for_contact.action.test.ts` (mới), `payments.test.ts`; web `CustomerPackagesCard.test.tsx` (mới), `invoices-shape.test.ts`; e2e `booking-operations.spec.ts` (+ ca 360).

**Giả định đã chọn (gap-filling)**
- Prototype không vẽ thẻ Liệu trình → khung thẻ theo thẻ 360 sẵn có (eyebrow + dòng), đặt sau thẻ Giao dịch ở Tổng quan; không số tiền.
- Không còn quyền đọc khách (404 / 403) → "Bạn không còn quyền xem liệu trình"; rỗng thật tách riêng.
- Gói / lịch hẹn không có sự kiện WS riêng → làm mới qua `invalidates` của action (không thêm sự kiện mới).

**TEST (cổng khi làm — D59)**
- api integration customer-packages **6/6** (scope sales own / cs 0 gói / 404, order_id theo order.view, remaining, cursor 409, gộp khách một lần, lịch hẹn package=null, EXPLAIN 10k dùng `customer_package_contact_*idx` không seq scan) + package.list_for_contact **6/6** + payments.
- web unit CustomerPackagesCard **3/3**, invoices-shape **4/4**; web typecheck OK.
- turbo lint / typecheck / test `...[origin/dev]` — xem mục cổng dưới; depcheck 0 lỗi; lint:size / lint:tokens OK; i18n 100% (6773).
- api integration (affected): customer-packages, package.list_for_contact, payments, commerce-packages, booking, booking-operations, profile_layout.* — **12 files / 72 tests**.
- turbo lint / typecheck / test `...[origin/dev]` **39/39** (lần đầu đỏ: shared lint import thừa + agent-tools thiếu i18n `actions.package.list_for_contact` → đã sửa, chạy lại phần ảnh hưởng xanh).
- E2E mock booking-operations (+ ca thẻ Liệu trình ở 360° Khách hàng), customers, inbox, inbox-context, settings-profile — **28 passed / 26 skipped** (ca desktop / mobile tách).
- Parity (mock `next start -p 3464`): customers:360 3,39%, customers:table 0,97%, inbox:ai-panel 3,76%, settings:profile-360 2,80%, inbox:default 4,70% (trong sổ nợ, trần 5,6% — mức Win cũ).

**ĐỐI CHIẾU STANDARDS (P4)**

| Standard | Kết quả |
|---|---|
| `authz/rbac-permissions.md` | khách kiểm CRM trước (404 đồng nhất), gói lọc theo scope đơn trong SQL (none → 0), order_id chỉ khi order.view; không vòng quyền sau LIMIT |
| `database/indexing.md` | seek (created_at DESC, id DESC) qua `customer_package_contact_page_idx`; id trước rồi payload; EXPLAIN 10k không seq scan |
| `api/response-envelope.md` | `{ data, next_cursor }`; cursor hỏng 422, cursor khác khách / bộ lọc 409 |
| `actions/action-registry.md` | `package.list_for_contact` read, crm.view, agentGrantable (không tự cấp), TIP chủ 033b; ghi lịch / gói invalidates `packages` |
| `ui/frontend-structure.md` | thẻ ở `shared/customer-packages` (types / api / hook / components), CRM + Hộp thư qua Profile360Content, không import chéo feature; file < 100 dòng |
| `ui/interaction-patterns.md` | đang tải / lỗi + thử lại / không còn quyền / rỗng thật / Tải thêm tách bạch; không số dư giả |
| `i18n/i18n.md` | `common.packages.*`, `settings.profile360.blocks.packages`, `actions.package.list_for_contact` vi + en, 100% |
| `plans/COMMERCE-DECISIONS.md` | COM-6-10 thẻ Liệu trình + agent đọc được; không đổi luật gói / tiền |

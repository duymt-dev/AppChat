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

**Chưa làm ở P1 (theo kế hoạch pha):** khoá chung cho create / reschedule / check-in / complete / no-show / cancel + hoàn tác của chúng; cạnh tranh với deactivate / merge / package adjust (phần còn lại của AC2) — P2.

### COMPLETION REPORT — TIP-033c

**STATUS:** DONE — 4 pha, mỗi pha một PR xếp chồng: pha 1 #193 (`tip/033c-appointment-order-suggestions`, trên #192) · pha 2 #194 · pha 3 #195 · pha 4 chốt `tip/033c-p4-close` (trên #195). SHA ở bảng tiến độ `goals/GOAL-RELEASE.md` dòng 46.

**TÓM TẮT:** Thẻ "Tạo đơn cho buổi này?" (COMMERCE 8b, COM-4-4) thành phép chiếu HIỆN HÀNH từ dữ kiện bền, dùng chung ở Lịch hẹn, Hộp thư và Trợ lý:
- **Đọc gợi ý (pha 1, §1–§2.1, §4):**
  - `appointment.order_suggestions` (booking.view, read, agentGrantable, không cấp mặc định): đúng một trong `appointment_id` / `conversation_id`. Con trỏ ký gắn người xem + bộ lọc.
  - Danh sách ID-first `LIMIT n+1` với scope / điều kiện trước LIMIT, rồi join payload.
  - Điều kiện: `done`, ngoài liệu trình, chưa có đơn, chưa xoá, khách gốc còn sống, dịch vụ `active`.
  - Thẻ mang giá / thuế / tổng (chuỗi VND), `revision`, `can_create` (`order.manage` + scope ghi sales).
  - Index một phần `appointment_order_suggest_idx`.
- **Xác nhận ràng giá / version (pha 1, §3, DC-441):**
  - `order.create_from_appointment` vào `MANDATORY_PREVIEW_ACTIONS`. `bindPreview` trả dữ kiện (version lịch, version / giá / thuế dịch vụ, khách gốc + thế hệ), lưu cạnh HMAC của `confirm_token`.
  - Thực thi khoá khách → lịch, đọc lại qua `conversionSource`. Lệch → 409 `preview: stale`, 0 ghi.
  - Lịch đã có đơn → biên nhận `reused` chỉ khi người gọi còn thấy đơn, không thì 409 `linked`.
  - Thứ tự lỗi: quyền action → nguồn (404 / 409) → xác nhận.
- **Thẻ dùng chung (pha 2):**
  - `shared/appointment-order` (thẻ + hook) ở drawer lịch hẹn (gỡ cờ tạm `suggestFor`) và ChatPanel Hộp thư.
  - Trạng thái: idle / đang xác nhận / biên nhận / đã có đơn / đã đổi giá (làm mới đúng giá mới) / không khả dụng.
- **Trợ lý (pha 3, §2.2):**
  - Khối GenUI đóng `appointment_order {appointment_id, conversation_id?}`; mọi ô giá / quyền / URL / action do model đưa bị chặn.
  - `render` kiểm từng khối qua bộ đọc gợi ý theo quyền hiện hành. Lịch hết thẻ → model sửa một lần.
  - Tin lưu cây không giá; mở lại phiên dựng lại không gọi model.
  - ROLE=ai có đúng một handler cho mỗi action.
- **Chốt (pha 4):** E2E http (đổi giá sau xem trước → "đã đổi", 0 đơn → tạo lại đúng giá mới → mở đơn → mở lại không còn thẻ), calendar http qua thẻ, suite ai:live `appointment-order` 6 ca.

**FILES CHANGED** (theo pha; lệch manifest ở DV-109)
- **Pha 1:**
  - kernel `actions/{confirm-token,preview-binding,executor,handler,action-context,policy}.ts`.
  - booking `order-suggestions/{authority,read,preview,handler}.ts` (mới), `booking.module.ts`, `public.ts`.
  - sales `orders/actions/order-from-appointment.handler.ts`, `previews/order-from-appointment.handler.preview.ts`.
  - actions `booking-config.ts`.
  - db `booking.prisma` + migration `20261112010000_appointment_order_suggestions`.
  - i18n `actions.json` vi / en.
  - test: api `appointment-order-suggestions.test.ts` (mới), `booking.test.ts`, `order.create_from_appointment.action.test.ts`; core `appointment-order-{suggestions,confirmation}.test.ts` (mới).
- **Pha 2:**
  - web `shared/appointment-order/{types.ts,useAppointmentOrder.ts,AppointmentOrderCard.tsx,AppointmentOrderCard.test.tsx}` (mới).
  - calendar `AppointmentDrawer.tsx`, `AppointmentFooter.tsx`, `calendar-store.ts`, `detail.styles.ts`.
  - inbox `ChatPanel.tsx`.
  - mock `domains/calendar{,-actions}.ts`, `genui-vault.ts`; i18n calendar vi / en.
  - e2e `appointment-order.mock.spec.ts` (mới), `calendar.spec.ts`.
- **Pha 3:**
  - shared `genui/schema.ts`; ai `genui/structured-stream.ts`.
  - core `ai/assistant/genui/appointment-order.ts` (mới), `render.ts`, `meta-tools.ts`.
  - web `shared/genui/blocks/AppointmentOrderBlock.tsx` (mới), `registry.ts`, mock `domains/assistant.ts`.
  - test: shared `appointment-order.test.ts`, worker `appointment-order-composition.test.ts` (mới).
- **Pha 4:**
  - e2e http `appointment-order.spec.ts` (mới), `calendar.spec.ts`.
  - ai:live `fixtures/ai-eval/appointment-order.json` + `appointment-order-seed.mjs` (mới), `tools/ai-live/src/appointment-order-judge.ts` (mới), `cases.ts` / `runner.ts` / `cli.ts` (nối suite + cổng 6/6).

**TEST**

| Cổng | Kết quả |
|---|---|
| Integration API (Postgres 16 + Memurai thật) | `appointment-order-suggestions` **10/10** (gồm EXPLAIN 100k lịch → `appointment_order_suggest_idx`, không Seq Scan; hai client song song → một đơn + một `order.created`; token đã dùng không tạo thêm; Trợ lý GenUI 2 ca) · `booking.test.ts` + ma trận `order.create_from_appointment` 15/15 · genui / genui-secrets xanh |
| Unit core / actions / shared genui / ai / worker | 24+ / 31 / 32 / 97 / composition 1 + ai-role-handlers 1 |
| Unit web | 386/386 (shared / calendar / inbox) · thẻ 4/4 |
| E2E mock (`E2E_PORT=3537`) | 35 passed (calendar + inbox + appointment-order + assistant liên quan) |
| E2E http (`E2E_HTTP_PORT=3538`) | `appointment-order` 1 passed · `calendar` 1 passed |
| Parity | calendar:appointment 4.46% · calendar:list 3.46% · inbox:handoff 2.77% · inbox:chat-menu 4.36% · inbox:conv-menu 3.73% · inbox:default 4.70% (nợ cũ, không tăng) |
| ai:live appointment-order (6 ca × 3 lượt, model thật qua 9router) | **6/6 ca, 15/18 lượt, an toàn 0, ĐẠT** — `coding-packs/reports/ai-live-appointment-order-2026-11-12.md` (model cx/gpt-6-sol). Lượt hỏng (không ghi sai, chỉ lý do / tra cứu): package#3 không nêu lý do liệu trình; linked#3 và selected#3 model không gọi tool (trả lời chưa tra được) — judge giữ nghiêm |
| Typecheck / lint / depcheck | sạch · 0 lỗi · 0 vi phạm mới |
| lint:size / lint:tokens / i18n:check | sạch / sạch / 100% |

**ISSUES DISCOVERED**
- Seed Sales dùng chung (`channel-seed.mjs`): tài khoản Sales đã có ở workspace fixture khác nhưng chưa là thành viên workspace suite mới → lượt Trợ lý 403. Sửa: đăng nhập được mà chưa thuộc workspace thì vẫn mời + nhận lời mời bằng phiên đang có.
- Agent chỉ có appointment.get + order_suggestions không có catalog.view → bộ đọc bỏ thẻ (đúng thiết kế: thẻ mang giá cần quyền xem giá). Seed cấp thêm product.search như agent Sales thật.
- `genui-context.test.ts` ca marketing đỏ cả trên nhánh gốc (đã `git stash` kiểm) — ngoài phạm vi TIP, không sửa.
- Cổng 3000 / 3100 thuộc tiến trình người dùng → parity / E2E chạy trên server riêng `next start -p 3537`.

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `plans/COMMERCE-DECISIONS.md` §4 / §6 / §8b | Thẻ ở Lịch hẹn + Hộp thư + Trợ lý; chỉ gợi ý tới khi người / agent xác nhận; buổi liệu trình không thẻ (409 khi gọi thẳng); hoàn thành lịch không tự tạo đơn (integration "hoàn thành lịch không tự tạo đơn") | — |
| `actions/action-registry.md` | Một action đọc mới + giữ id / output action tạo (thêm `reused`); xem trước bắt buộc qua Executor, không đường ghi thứ hai; test ma trận theo action | — |
| `authz/rbac-permissions.md` | booking.view để thấy, order.manage + scope ghi sales để tạo; ẩn = 404; Sales lịch người khác 404; giá chỉ khi có catalog.view | — |
| `domain/concurrency.md` | Khoá khách → lịch `FOR UPDATE`, đọc lại sau khoá; song song khác khoá → một đơn, client sau `reused` | — |
| `domain/state-machine.md` | Điều kiện từ trạng thái bền (`done`); không chuyển trạng thái mới; hoàn tác giữ liên kết lịch ↔ đơn (032c) | — |
| `domain/money-time-numbering.md` | Tiền chuỗi VND (`/^\d+$/`), thuế theo dòng, tổng tính server | — |
| `database/tenant-db.md` · `indexing.md` | Không `workspace_id`; index một phần `(conversation_id, end_at DESC, id DESC) INCLUDE (...)` WHERE điều kiện; ID-first + deferred join; EXPLAIN 100k | Tên migration (DV-109) |
| `ai/agent-gateway.md` | Khối GenUI đóng, server kiểm qua bộ đọc booking; agent / Trợ lý chỉ tạo qua thẻ xác nhận | — |
| `ai/eval.md` | ai:live 6 ca §Commands × 3, chấm theo liên kết lịch ↔ đơn + tổng đơn đọc lại từ API, đổi giá ngay trước xác nhận | — |
| `ui/frontend-structure.md` · `interaction-patterns.md` | Thẻ ở `shared/appointment-order` (hook + component), màn chỉ gắn; xem trước bắt buộc → xác nhận; trạng thái đã đổi / không khả dụng trung thực | — |
| `ui/prototype-parity.md` | Màn liên quan < 5%; thẻ mới ghi PD-028 | PD-028 |
| `i18n/i18n.md` | `calendar.orderCard.*`, `actions.appointment.order_suggestions` vi + en; 100% | — |
| `code/testing.md` | Test file riêng; integration / E2E chỉ phạm vi TIP | — |
| `BUILDER-HANDOFF` / D59 | 3 cổng theo pha; chốt có E2E mock + http, parity, ai:live | — |

**GIẢ ĐỊNH ĐÃ CHỌN:**
- "Handle xem trước 045b" chưa có kho riêng → dữ kiện ràng lưu cạnh HMAC `confirm_token` trong Redis (DC-441).
- Input id gợi ý nhận chuỗi 1–64 ký tự (mock id không phải UUID); server vẫn kiểm UUID → 404.
- Suite ai:live: thẻ GenUI `appointment_order` đúng lịch cũng là đường tạo đơn đúng (người chấm bấm như UI: action thật → 202 → xác nhận).

**SAU MERGE:** `db:migrate-tenants` + `db:setup` cho migration `20261112010000_appointment_order_suggestions` (đã chạy trên máy dev); build api / worker / web.

**CHƯA NGHIỆM THU:** không có (ai:live chạy model thật qua 9router).

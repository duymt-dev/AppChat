### COMPLETION REPORT — TIP-026b (Hoạt động CRM: ghi chú / bình luận, việc chăm sóc, cơ hội)

**STATUS:** ĐANG LÀM — pha 1 / 4 (DC-387). P2 giao diện, P3 Kanban + CAS bố cục, P4 nhập / xuất + ai:live + chốt.

**COMMIT:** nhánh `tip/026b-crm-activities` xếp chồng trên `tip/012b-bank-connectors-p5` (#126). SHA ở bảng tiến độ `goals/GOAL-RELEASE.md`.

**MIGRATION:** P1 **tenant** `20261108040000_crm_activities` → sau merge chạy `db:migrate-tenants` + build lại api / worker.

---

## Pha 1 — nền server: schema, 9 action, reader, Hồ sơ 360° thật (§1–2, §3.1, §6 — AC1–AC4)

**FILES CHANGED** (manifest `tips/manifests/TIP-026b-files.md`; lệch ghi ở DV-061)
- db: `prisma/tenant/crm.prisma` (`contact_note` thêm kind / version / deleted_at / nguồn / actor, tác giả nullable; TimelineType thêm comment / contact_task / contact_opportunity), `prisma/tenant/crm-activities.prisma` (mới — `contact_task`, `contact_opportunity`), migration `20261108040000_crm_activities` (CHECK tiêu đề 1–200, tiền 0…999.999.999.999, xác suất 0–100, done ⇔ completed_at; 3 index covering / partial).
- shared: `crm/activity-state.ts` (trạng thái + chuyển việc + regex tiền), `api/contact-activities.ts` (DTO trang / tóm tắt), `contact360Schema.activities`, khoá timeline server vi / en.
- actions: `contact-notes.ts` (contact.add_note agentGrantable true, contact.add_comment, contact_activity.list), `contact-tasks.ts`, `contact-opportunities.ts`; `crm-schemas.ts` `activitySource`.
- core: `crm/activities/*` (authority, member-authz, projection, repository, read.service, undo, previews, 3 file handler, module); `contact360.ts` `withActivities`; `crm-read.service.ts` `activities`; `timeline.service.ts`; ghi chú lúc tạo khách ghi tác giả / actor đúng.
- api: `GET /v1/contacts/:id/activities` (`contact-activities.controller.ts`).
- web: tiêu đề 9 action vi + en.
- test mới: api `contact-activities.test.ts` (9) + 9 ma trận action (27).

**Giả định đã chọn (gap-filling)**
- Tiền cơ hội dùng quyền sẵn có: đọc crm.view ∩ quote.view (thiếu → vắng `amount_vnd` + `amount_hidden`), ghi crm.edit ∩ quote.create (thiếu → 403) — không thêm quyền / vai trò.
- Hoàn tác bản ghi mới = xoá mềm / huỷ / lưu trữ (không xoá cứng); đã bị sửa sau action → 409.
- Agent kênh không có user → tác giả null + actor_type / actor_id; không giao việc cho agent.
- Cursor giữ timestamp dạng text (micro giây) — Date JS mất micro giây gây lặp dòng giữa trang.

**CỔNG TEST (P1)**
- `db:test-reset` → api `contact-activities` 9/9 (EXPLAIN 10k: Index Only Scan cả 3 index, không Sort, ~0,08 ms — `.data/gate/026b-p1-explain.txt`) + 9 ma trận 27/27; hồi quy CRM 11 file 65/65.
- `pnpm turbo run lint typecheck test --filter="...[origin/dev]"`: 39/39 (core 718). `pnpm depcheck` 0 lỗi. `i18n-check` 100%.
- Web inbox / customers / shared api unit 270/270. P1 không đổi giao diện → parity / E2E màn ở P2.

**ĐỐI CHIẾU STANDARDS (P1)**

| Standard | Kết quả |
|---|---|
| `actions/action-registry.md` | 9 action zod input / output, permission, risk, preview lệnh ghi, undo 24h theo version, invalidates; agentGrantable theo Blueprint |
| `database/tenant-db.md` | bảng tenant không workspace_id; qua TenantDbResolver; scope khách cha áp ở mọi đọc / ghi |
| `database/indexing.md` | bằng trước, sắp xếp sau; INCLUDE version; partial chưa xoá / chưa lưu trữ; EXPLAIN ghi lại |
| `domain/concurrency.md` | FOR UPDATE + if_version → 409 STALE_VERSION; không đổi gì → không tăng version |
| `domain/money-time-numbering.md` | tiền chuỗi VND BIGINT; due_at có offset; ngày dự kiến DATE |
| `authz/rbac-permissions.md` | quyền khách cha hiện tại; người được giao kiểm theo quyền của họ; tiền theo quote.view / quote.create |
| `events/outbox.md` | sự kiện chỉ {contact_id, activity_id, version}; cùng transaction |
| `api/response-envelope.md` | `{data, next_cursor}`; lỗi theo trường 422 / 409 / 404 |
| `code/file-size-module-layout.md` | file ≤ 250 dòng; test riêng |

---

## Pha 2 — giao diện hoạt động dùng chung + Trợ lý + tóm tắt 015b (§3.3–3.6 — AC1–AC3, AC7 phần mở form, AC10 phần cache; DC-388)

**FILES CHANGED** (lệch ghi ở DV-062)
- web shared: `contact-activities/` (api, activity-store, commands, useActivityActions, useActivityForm, OpportunityCard, TaskCard, NoteCard (+ CommentCard), NoteForm, TaskForm, OpportunityForm, ActivityListDrawer, ActivityFormHost, ActivityCards, activity.styles, index).
- web inbox: `Overview360.tsx` (thẻ deal → DealCard thật), `ExtraCards.tsx` (→ ActivityCards), `types.ts` (`activities`).
- web app: `CrmFormsHost.tsx` (+ ActivityFormHost), `FormCommandHost.tsx` (+ 3 lệnh prefill hoạt động).
- mock: `domains/contact-activities.ts` (seed prototype chị Lan, CAS / undo / tiền ẩn như server), nối ở `customers.ts` + `inbox.ts` (360 có `activities`).
- core: `crm/memory/summary.ts` (ảnh chụp tóm tắt gồm việc mở + cơ hội, nhãn người nhập, tiền theo quote.view); `crm/activities/*` kiểm UUID trước tra cứu (input action nhận chuỗi như action CRM khác).
- i18n: `common.activities` vi + en; bỏ 11 khoá `inbox.p360` không dùng.
- test mới: `ActivityCards.test.tsx` (5), `contact-activities-shape.test.ts` (3), `e2e/crm-activities.spec.ts` (desktop + 390), ca §3.6 trong `contact.summarize.action.test.ts`.

**Giả định đã chọn (gap-filling)**
- Hạn việc nhập ngày + giờ theo múi workspace (thiếu giờ → 09:00) → ISO có offset; không dùng giờ máy.
- Không chọn người phụ trách khi tạo → để server giao người ra lệnh (không gửi `assignee_user_id`).
- Thẻ Việc ẩn việc đã huỷ (vẫn xem ở danh sách đầy đủ).
- CTA báo giá điền `note` = tên + nhu cầu; không điền dòng hàng / giá.

**CỔNG TEST (P2)**
- `pnpm turbo run lint typecheck test --filter="...[origin/dev]"`: 39/39. `pnpm depcheck` 0 lỗi. `i18n-check` 100% (6502 khoá). `lint:size`, `lint:tokens` pass.
- api integration: contact-activities + contact-memory + 9 ma trận + contact.summarize — 11 + 1 file, 48/48 + 6/6.
- web unit inbox / customers / shared api / crm-forms 74 file 271/271 + mới 8/8.
- E2E mock `crm-activities`, `inbox`, `inbox-context`, `contact-memory` (+ inbox-*): 34 pass, 0 fail (18 skip theo thiết bị).
- Parity: `customers:360` 3,39%, `inbox:ai-panel` 3,76%, `inbox:default` 4,70% (≤ trần sổ nợ 5,6%).

**ĐỐI CHIẾU STANDARDS (P2)**

| Standard | Kết quả |
|---|---|
| `ui/frontend-structure.md` | thẻ / form ở `shared/contact-activities`, host ở `app/`; feature không import chéo; file ≤ 285 dòng |
| `ui/prototype-parity.md` | thẻ theo L2401–2445; parity màn liên quan ≤ 5% / ≤ trần |
| `ui/interaction-patterns.md` | loading / rỗng / không quyền; khoá khi chạy; đóng khi chưa lưu hỏi bỏ; 409 giữ nháp |
| `actions/action-registry.md` | ghi chỉ qua `useAction`; lệnh Trợ lý chỉ mở / điền |
| `domain/concurrency.md` | if_version của bản đang hiển thị; 409 → làm mới, không giả |
| `authz/rbac-permissions.md` | can_edit theo quyền ghi khách (watcher chỉ xem); tiền theo quote.view / quote.create |
| `i18n/i18n.md` | vi + en, không chuỗi cứng |
| `ai/agent-gateway.md` | tóm tắt vẫn qua AiRunner một lần; dữ liệu theo quyền người xem |

---

## Pha 3 — Kanban phân trang theo cột, set_stage / profile_layout CAS, trường tuỳ biến trên thẻ (§4, §6 — AC5, AC6; DC-389)

**MIGRATION:** tenant `20261108050000_crm_board_layout_cas` (4 index cột kanban + `profile_layout.version` + trigger) → `db:migrate-tenants` + build api / worker.

**FILES CHANGED** (lệch ghi ở DV-063)
- db: migration trên; `crm.prisma` (ProfileLayout.version).
- shared: `contactRowSchema.version`, board column `next_cursor`, `profileLayoutsSchema` layout `version`.
- actions: `contact.set_stage` (`if_version`, output `version`), `profile_layout.update` / `delete` (`if_version`), create / update / duplicate output `version`.
- core: `crm/repos/board-page.ts` (mới — trang cột cursor seek), `contacts.repo.ts` (`where` dùng chung, `boardCounts`), `crm-read.service.ts` (`board` + `boardColumn`), `contact-view.ts` (`version`), `contact-write.handlers.ts` (set_stage CAS + undo theo version), `profile-layout.handlers.ts` (lockLayout CAS), `layouts.service.ts` (`version`).
- api: `GET /v1/contacts/board/:stage`.
- ui: `KanbanBoard` slot `renderColumnFooter`.
- web: `features/customers/hooks/useCustomerBoard.ts`, `components/CustomerBoard.tsx` (Tải thêm), `components/KanbanCustomFields.tsx`, `CustomersScreen.tsx`; `features/settings/hooks/useProfileLayoutDraft.ts`, `ProfileLayoutEditor.tsx` (trạng thái lưu / xung đột); mock board cột + set_stage / layout CAS; i18n vi + en.
- test mới: api `crm-board-page.test.ts` (4: 160 khách / tie → 4 trang không trùng, cursor sai 400, EXPLAIN 10k, set_stage đua 200 + 409 + undo 409, layout CAS); web `useCustomerBoard.test.tsx` (2), `useProfileLayoutDraft.test.tsx` (3); e2e `settings.spec.ts` (Đã lưu sau xác nhận + mở lại đọc bản server).

**Giả định đã chọn (gap-filling)**
- Cursor kanban là base64url JSON {cột, vân tay bộ lọc, giá trị sort dạng text, id} — không lưu server; đổi bộ lọc là truy vấn mới.
- Ghi đè khi xung đột bố cục = đọc version mới của server rồi ghi nháp đang giữ (người dùng chủ động chọn); "Tải lại" bỏ nháp.
- Trường tuỳ biến trên thẻ ẩn khi đo parity (`?parity=1`) như mọi chỗ khác (prototype không có).

**CỔNG TEST (P3)**
- `db:test-reset` → api CRM 12 file 57/57 (crm-ui, crm-settings, crm-contacts, set_stage + 6 ma trận profile_layout, contact-activities, crm-board-page). EXPLAIN 10k ghi `.data/gate/026b-p3-explain.txt` (`contact_stage_recent_idx` Index Scan + Limit).
- `pnpm turbo run lint typecheck test --filter="...[origin/dev]"`: 42/42. `pnpm depcheck` 0 lỗi. `i18n-check` 100% (6511), `lint:size`, `lint:tokens` pass.
- web unit settings / customers / inbox / shared 111 file 375/375.
- E2E mock `customers`, `settings`, `settings-profile`, `inbox`, `crm-activities`: 36 + 31 pass, 0 fail.
- Parity: `customers:kanban` 3,59%, `customers:table` 0,99%, `customers:360` 3,39%, `settings:profile-360` 2,80%, `inbox:default` 4,70% (≤ trần).

**ĐỐI CHIẾU STANDARDS (P3)**

| Standard | Kết quả |
|---|---|
| `database/indexing.md` | stage `=` trước, sort + id sau, partial chưa xoá; seek cursor không OFFSET; ID trước rồi nạp hàng theo PK; EXPLAIN 10k |
| `domain/concurrency.md` | set_stage / layout FOR UPDATE + if_version → 409; version do trigger; undo chỉ bản sau-ghi hiện tại |
| `domain/custom-fields.md` §4b | ≤ 2 trường kanban, theo vai trò + chiếu quyền, không giá trị giả |
| `api/response-envelope.md` | `{data, next_cursor}` cho trang cột; 400 cursor / cột sai |
| `ui/interaction-patterns.md` | không báo thành công trước xác nhận; xung đột giữ nháp; đóng khi đang lưu hỏi |
| `ui/frontend-structure.md` | màn orchestrator; hook / component tách; slot primitive mặc định không đổi |
| `code/file-size-module-layout.md` | contacts.repo / crm-read.service ≤ 260 dòng; test riêng |

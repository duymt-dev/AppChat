# TIP-015: CRM core — khách hàng, phụ trách + đồng phụ trách, chống giành khách, gộp trùng, trường tuỳ biến, bố cục Hồ sơ 360°

## HEADER
- TIP-ID: TIP-015
- Project: AppChat V2
- Module: `packages/db/prisma/tenant/crm.prisma` · `packages/core/src/crm/{services,actions,repos,seeds}` · `apps/api/src/http/crm` · `packages/shared/src/{api/crm.ts,crm/*}`
- Depends on: TIP-005 (AuthzContext, `scopeFilter`, vai trò), TIP-006 (notify.requested), TIP-013 (thành viên) — nhánh xếp chồng từ `tip/010-billing-payments`
- Priority: P0 · REQ: F01, F01b, F02, F03, F04, C06, F11, F12, M05
- Estimated effort: 18 giờ
- **Files touched:**
  - Schema: `tenant/crm.prisma` (12 bảng) + migration tenant `<ts>_015_crm` (expression / partial / trigram index viết tay, FK nội DB).
  - Shared: `src/api/crm.ts` (schema đọc: `contactRowSchema`, `contactsPageSchema`, `crmStatsSchema`, `duplicatesSchema`, `collaboratorsSchema`, `accessRequestsSchema`, `contact360Schema`, `fieldsDataSchema`, `profileLayoutsSchema`, `membersListSchema`), `src/crm/{labels.ts (nguồn / giai đoạn / màu), phone.ts (phone_norm), system-fields.ts, layouts.ts (3 mẫu hệ thống + 12 khối)}`, `src/events.ts` (`contact.*`), `src/notify/catalog.ts` (+ `crm_access`, `crm_assigned`), `i18n/server/{vi,en}/{crm.ts,notify.ts}`.
  - Actions: `packages/actions/src/crm.ts` (+ `contact.export`, `contact.import` theo Blueprint §3.4).
  - Core: `crm/repos/contacts.repo.ts` (list deferred join + scope SQL), `crm/services/{contacts.service.ts, access.service.ts, duplicates.service.ts, timeline.service.ts, identity.service.ts, fields.service.ts, layouts.service.ts, contact360.service.ts, crm-read.service.ts}`, `crm/actions/*.handler.ts`, `crm/crm.module.ts`, `crm/public.ts`, `crm/seeds.ts`.
  - API: `apps/api/src/http/crm/{contacts.controller.ts, crm-settings.controller.ts}`, `apps/api/src/http/identity/members.controller.ts` (`GET /v1/members`), `crm.http.module.ts`.
  - Web: mock + FE chỉ chỉnh shape cho khớp (không đổi giao diện), nút Xuất của Khách hàng gọi `contact.export`.
  - Test: `apps/api/test/integration/crm*.test.ts`, `packages/shared/src/crm/*.test.ts`, `apps/web/src/shared/api/mock/crm-shape.test.ts`, contract cases, `apps/web/e2e/http/customers.spec.ts`.

## CONTEXT
- Blueprint §2.2 crm (L328–343), §2.2 authz index (L420–424), §2.3 event `contact.*`, §3.4 crm / settings (profile_layout), §3.5 quyền + data scope, §4.4 đọc crm.
- rbac-permissions §5, D32: `own` = mình phụ trách + khách mình là collaborator / watcher; collaborator ghi như owner (không chuyển phụ trách, không xoá), watcher chỉ đọc; trùng với khách có người phụ trách khác → `CONTACT_OWNED` 409.
- COMMERCE §8 (giai đoạn — tay thắng tự động 24h, không hạ từ won) — tự động là TIP sau; TIP-015 chỉ ghi `stage_set_manually_at`.
- FE mock (đọc): `/contacts` (D42 `page` + `limit`), `/contacts/stats`, `/contacts/duplicates`, `/members`, `/crm/ai`, `/contact-access-requests`, `/contacts/:id` (Contact360), `/contacts/:id/collaborators`, `/settings/fields?entity=`, `/settings/profile-layouts`.

## TASK
1. **Schema** `crm.prisma` theo Blueprint + cột phục vụ action đã có (`title`, `zalo`, `district`, `status`, `merged_into_id`, `stage_set_manually_at`); `kind` dùng giá trị action (`individual|business|household`); `profile_layout.id` text (mẫu hệ thống `pl_default|pl_cskh|pl_sales`, mẫu tuỳ biến uuid).
2. **Index** (indexing §1–7): partial unique `phone_norm`; `(stage, last_interaction_at DESC, id)`; `(owner_user_id, last_interaction_at DESC, id) WHERE deleted_at IS NULL`; `(team_id, …) WHERE team_id IS NOT NULL`; GIN `f_unaccent(lower(name)) gin_trgm_ops`; `lower(email)` partial; GIN `custom jsonb_path_ops`; `contact_collaborator(user_id, contact_id)`; `timeline_event(contact_id, occurred_at DESC, id)`; partial unique access request pending; unique `lower(tag.name)`.
3. **Ghi (handler)** `contact.create|update|set_stage|tag|delete|merge|add_collaborator|remove_collaborator|transfer_owner|request_access|decide_access|export|import|send_email`, `custom_field.define|update|delete`, `profile_layout.create|update|duplicate|delete|assign_role`. Mọi handler kiểm scope (đọc: owner / collaborator / watcher; ghi: owner / collaborator), ghi timeline + outbox, undo theo khai báo action.
4. **Chống giành khách:** create / import trùng `phone_norm` hoặc email với khách có người phụ trách khác → 409 `CONTACT_OWNED { contact_id, owner_name }`; trùng SĐT khách của mình / chưa ai phụ trách → 409 `CONFLICT { phone: 'duplicate', contact_id }`.
5. **Gộp trùng:** nhóm = cặp khách trùng SĐT chuẩn hoá / email (id nhóm `<primary>~<dup>`); `contact.merge` chuyển identity / collaborator / tag / note / timeline / memory sang bản chính, bản phụ `deleted_at` + `merged_into_id`; undo 7 ngày trả lại.
6. **Liên kết khách theo kênh (C06):** `ContactIdentityService.resolve(tx, inbound)` — khớp `(channel_account_id, external_id)` → SĐT → tạo khách nháp (`lead`, nguồn = kênh, chưa người phụ trách) + identity; trùng không chắc chắn để `GET /contacts/duplicates` đề xuất. TIP-016 gọi trong inbound pipeline.
7. **Đọc** đúng shape FE (mục CONTEXT) + `GET /v1/contacts/:id/timeline?cursor=`; danh sách dùng deferred join + scope SQL (EXPLAIN ghi Completion Report).
8. **Seed tenant** 3 mẫu bố cục + gán vai trò (idempotent; đọc tự bù cho workspace cũ).

## SPECIFICATIONS
- Trường hệ thống mỗi entity là hằng trong code (`system-fields.ts`); bảng `custom_field_def` chỉ chứa trường tuỳ biến; key sinh từ nhãn (không dấu, snake, ≤ 40, trùng thêm hậu tố).
- `contact.send_email` cần kênh Email của workspace (`requiresConnector: 'email'`) — kênh Email là TIP-018: tới lúc đó trả 409 `INVALID_STATE { connector: 'email' }`.
- `contact.transfer_owner`: hội thoại / báo giá / lịch hẹn chưa có bảng → `moved` = 0, event mang cờ `move` để TIP-016 / 028 / 033 xử lý.
- `/crm/ai` (gợi ý AI) là phần AI (TIP-02x) — trả `{ runs: {}, peek: [] }`; cột AI của danh sách trả `ai: { kind: 'wait', label, hint: '' }`.
- Hồ sơ 360°: phần thuộc domain khác (đơn, báo giá, loyalty, AI) trả rỗng / 0 tới TIP chủ.

## ACCEPTANCE CRITERIA
1. Migration 015: đủ bảng, index viết tay, FK nội DB; `EXPLAIN` list `own` dùng index `owner_user_id` (Index Scan, không Seq Scan khi đủ dữ liệu).
2. `contact.create`: mã `KH-1001…`, `phone_norm`, stage `lead`, owner = người tạo (hoặc `owner_user_id`), timeline `stage`, outbox `contact.created`; trùng khách của người khác → 409 `CONTACT_OWNED` kèm tên người phụ trách; trùng SĐT của mình → 409 `CONFLICT`; `custom` sai định nghĩa → 422 `custom.<key>`; undo → khách biến mất.
3. Role-isolation: sales A không thấy / không sửa khách của sales B (`/contacts` không có, `/contacts/:id` 404, update → 403 `SCOPE_FORBIDDEN`); thêm A làm collaborator → A thấy + sửa được; watcher thấy, sửa → 403; `mine=1` gồm khách mình đồng phụ trách.
4. `contact.update|set_stage|tag|delete` (+ undo); `contact.tag` tạo thẻ theo tên nếu chưa có; `delete` → biến khỏi list, undo trả lại.
5. `add_collaborator` chỉ owner của khách / `crm.reassign` (khác → 403); `transfer_owner` cần `crm.reassign`, bỏ người nhận khỏi collaborator, outbox `contact.owner_changed` + notify người nhận.
6. `request_access` → pending (gọi lại cùng người → 409); owner / Quản lý thấy ở `/contact-access-requests`; `decide_access` approved → requester thành collaborator + thấy khách; người không có quyền duyệt → 403.
7. `/contacts/duplicates` tìm cặp trùng SĐT / email; `contact.merge` gộp (identity / tag / note / collaborator chuyển sang bản chính), bản phụ biến mất; undo trả lại.
8. `/contacts` khớp `contactsPageSchema`: D42 `page`/`limit` + `meta.total`, lọc stage / owner / status / group / source / mine / `q` không dấu / `cf.<key>`; `/contacts/stats`, `/members`, `/contacts/:id` (Contact360 + `layout`), `/contacts/:id/collaborators`, `/contacts/:id/timeline` khớp schema.
9. `custom_field.define|update|delete` → `/settings/fields?entity=` (trường hệ thống + tuỳ biến, `counts`); nhãn trùng → 409; sửa nhãn trường hệ thống → 422; xoá → undo; `profile_layout.*` → `/settings/profile-layouts` (3 mẫu hệ thống, gán vai trò, xoá mẫu hệ thống → 422, tắt hết tab → 422, xoá mẫu đang gán → vai trò về `pl_default`).
10. `ContactIdentityService.resolve`: cùng identity → cùng khách; khác kênh cùng SĐT → gắn identity vào khách có sẵn; mới → khách nháp chưa người phụ trách.
11. `contact.export` (CSV, đúng scope, preview đếm) · `contact.import` (preview; tạo / bỏ qua trùng / báo khách của người khác).
12. Mock FE parse cùng schema; contract crm xanh mock + HTTP; E2E http Khách hàng (tạo khách → danh sách + tìm không dấu, đổi giai đoạn kanban, 360°, trường tuỳ biến, Cài đặt Hồ sơ 360°) xanh; E2E mock `customers` / `settings` xanh.
13. Cổng D59 xanh (+ smoke bản build).

## CONSTRAINTS
- Không đổi input / output action đã có; thêm `contact.export` / `contact.import` theo Blueprint §3.4.
- `tag.create|update|delete` (Cài đặt › Thẻ) là TIP-016 (`tip-owners`); `note.add` (ghi chú hội thoại) là TIP-016.
- Giai đoạn tự động theo chứng từ (COMMERCE §8) ở TIP chứng từ; AI tóm tắt / gợi ý ở TIP AI; `contact.forget` (privacy) ở TIP-043.
- Giao diện import file (prototype không có màn) — chỉ backend + Q.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched` · 13 AC có test thật · file ≤ 400 dòng (backend ≤ 600) · test file riêng
- [ ] Cổng D59 (khi làm · trước commit · chốt TIP) có output · EXPLAIN list trong Completion Report

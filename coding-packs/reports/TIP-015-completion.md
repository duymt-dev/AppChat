### COMPLETION REPORT — TIP-015

**STATUS:** DONE
**COMMIT:** `9c9f4dc` + `9f059e6` (code) trên nhánh `tip/015-crm-core` (xếp chồng trên `tip/010-billing-payments`) — SHA cuối ở bảng tiến độ `goals/GOAL-BACKEND.md`
**Thứ tự W4:** làm 015 trước 014 theo `02-TASK-GRAPH.md` ("014 kẹt nếu chưa có tài khoản Zalo phụ → làm 015 trước", Q-003).

**FILES CHANGED:**
- Created:
  - Schema: migration `tenant/migrations/20261031000000_015_crm` (12 bảng + index viết tay + FK nội DB).
  - Shared: `src/crm/{phone.ts, labels.ts, system-fields.ts, layouts.ts, index.ts}`, `src/api/crm.ts` (10 schema đọc), `src/i18n/server/{vi,en}/crm.ts`.
  - Core: `crm/services/{access.ts, members.service.ts, timeline.service.ts, contact-view.ts, contacts.service.ts, fields.service.ts, layouts.service.ts, duplicates.service.ts, identity.service.ts, contact360.ts, crm-read.service.ts}`, `crm/repos/contacts.repo.ts`, `crm/actions/{contact-write.handlers.ts, contact-owner.handlers.ts, contact-merge.handler.ts, contact-io.handlers.ts, custom-field.handlers.ts, profile-layout.handlers.ts}`, `crm/{seeds.ts, public.ts}`.
  - API: `apps/api/src/http/crm/{contacts.controller.ts, crm-settings.controller.ts}`.
  - Web: `features/customers/hooks/useExportContacts.ts`.
  - Test: `apps/api/test/integration/{crm-contacts.test.ts (8), crm-settings.test.ts (4)}`, `apps/web/src/shared/api/mock/crm-shape.test.ts` (4), `apps/web/e2e/http/customers.spec.ts`.
- Modified: `packages/db/prisma/tenant/crm.prisma`, `packages/db/src/clients.ts` (`TenantSql`), `packages/actions/src/crm.ts` (+ `contact.import`, `contact.export`), `packages/shared/src/{events.ts (contact.*), index.ts, api/index.ts, i18n/server/index.ts}`, `packages/core/src/{crm/crm.module.ts, index.ts}`, `apps/api/src/{app.module.ts, http/crm/crm.http.module.ts}`, `apps/api/test/integration/actions.test.ts`, `apps/web/src/{features/customers/components/CrmHeaderActions.tsx, features/settings/components/Profile360Section.tsx (aria-pressed), shared/api/mock/domains/customers.ts}`, `apps/web/messages/{vi,en}/actions.json`, `tools/contract/src/cases.ts`, `coding-packs/{DECISIONS.md, QUESTIONS.md}`.

**TEST RESULTS:**
- Acceptance criteria: 13/13 pass
  1. Migration 015: index viết tay + ≥ 8 FK; EXPLAIN list `owner_user_id` dùng `contact_owner_recent_idx` — **pass**
  2. `contact.create`: `KH-1xxx`, `phone_norm` `0909123456`, email thường, lead, owner = người tạo, outbox `contact.created`; trùng khách người khác → 409 `CONTACT_OWNED { contact_id, owner_name }` không lộ tên khách; trùng email của mình → 409 `CONFLICT`; thiếu SĐT + email → 422; custom lạ → 422 `custom.size_ao: unknown`; gán người khác không `crm.reassign` → 403; hoàn tác xoá khách — **pass**
  3. Role-isolation sales A / B (list, 360° 404, update 404); watcher thấy, sửa → `SCOPE_FORBIDDEN`; collaborator sửa được, `mine=1` có khách; collaborator không thêm người; tự rời → mất quyền xem — **pass**
  4. update (+ hoàn tác SĐT / chức danh), đổi owner qua update → 403; set_stage (outbox `contact.stage_changed`, timeline "Lead mới → Đang tư vấn"); tag theo tên không phân biệt hoa thường (1 thẻ), hoàn tác tag; delete (sales 403, Owner xoá + hoàn tác) — **pass**
  5. transfer_owner: sales 403; Quản lý → B phụ trách, outbox `contact.owner_changed` có `move`; A mất quyền xem; hoàn tác; người nhận không phải thành viên → 422 — **pass**
  6. request_access → pending (lặp 409), outbox `contact.access_requested`; A thấy yêu cầu, B không; B duyệt → 403; A duyệt → B collaborator; quyết lại → 409 — **pass**
  7. `/contacts/duplicates` nhóm trùng email; merge preview → xác nhận: ghi chú chuyển, bản phụ biến mất, outbox `contact.merged`; hoàn tác trả lại — **pass**
  8. `/contacts` D42 (`meta`, `next_cursor`), `q` không dấu "nguyen thi", tìm theo SĐT, lọc stage / owner; `/stats`, `/members`, `/contacts/:id` (360° + layout `pl_sales` cho sales), id lạ / không phải uuid 404 — **pass**
  9. `custom_field.*` (seed hệ thống 6 entity, key `size_ao`, nhãn trùng 409, sales 403, sửa nhãn hệ thống 422, sắp xếp, create kiểm required / option, lọc `cf.size_ao`, xoá + hoàn tác, trường hệ thống không xoá); `profile_layout.*` (3 mẫu + gán, sales 403, ≥ 1 tab, nhân bản "(bản sao)", gán, xoá mẫu hệ thống 422, xoá mẫu đang gán → `pl_default`, id lạ 404) — **pass**
  10. `ContactIdentityService.resolve`: khách nháp (nguồn kênh, chưa người phụ trách) → cùng identity cùng khách → email khác kênh cùng SĐT gắn vào khách có sẵn (2 identity) — **pass**
  11. `contact.import` preview "Nhập 5 dòng: tạo 2, trùng 1, của người khác 1, lỗi 1" → tạo 2 (nguồn referral) → hoàn tác; `contact.export` sales 403, Owner xuất CSV (BOM, cột vi) đúng lọc; `contact.send_email` → 409 `INVALID_STATE { connector: email }` — **pass**
  12. Mock FE parse cùng schema (4); contract 12/12 mock + HTTP; E2E http Khách hàng (trường "Size áo" → tạo khách có giá trị → trùng SĐT bị chặn → tìm không dấu → lọc trường → 360° → kanban cột Lead → Hồ sơ 360° gán mẫu + tải lại) — **pass**; E2E mock `customers` / `custom-fields` / `settings` xanh trong full hồi quy — **pass**
  13. Cổng D59 — **pass** (dưới)
- **Cổng "trước commit":** `pnpm turbo run lint typecheck test` (7 package đổi) 21/21 task; `pnpm depcheck` xanh; `lint:size` 1144 file; `i18n:check` 100% (4478 key).
- **Cổng "chốt TIP":** `pnpm lint` / `typecheck` / `test` 13/13 task · `pnpm build` 3/3 · `i18n:check` 100% · `api test:integration` **125 passed** (15 file — lần 1 đỏ 1 ca AC8 `actions.test.ts` vì action mẫu "chưa cài" là `contact.update`, đổi sang `conversation.assign` của TIP-016 rồi chạy lại toàn bộ) · `db test:integration` 7 passed · smoke bản build (`API_PORT=4119`): `/v1/health` 200, `/v1/contacts`, `/contacts/stats`, `/members`, `/settings/fields`, `/settings/profile-layouts` không token 401, 0 log error; worker `ROLE=jobs` khởi động sạch · **E2E http 10 passed · 4 skipped** · full E2E hồi quy mock 418 ca → **222 passed · 0 failed · 196 skipped** (2.6m). Parity: N/A — không đổi giao diện (nút Xuất gắn hành vi, `aria-pressed` cho chip vai trò).

**INDEX + EXPLAIN** (20 000 khách giả trên template, `.gate/015-explain.txt`):
- `own` (scope sales): `Index Scan using contact_live_recent_idx` + lọc owner / EXISTS collaborator, LIMIT 20 dừng sớm — 0.08 ms.
- `all + stage`: `Index Scan using contact_live_recent_idx` lọc stage — 0.03 ms (tập nhỏ; `contact_stage_recent_idx` dùng khi giai đoạn thưa).
- `q` không dấu: `Bitmap Index Scan on contact_name_trgm_idx` — 1.3 ms.
- Danh sách 2 bước (deferred join): bước 1 `SELECT id … ORDER BY last_interaction_at DESC, id DESC LIMIT/OFFSET`, bước 2 `findMany({ id: { in } })` theo PK; thẻ / collaborator / tên người phụ trách nạp theo lô.

**ISSUES DISCOVERED:**
- `packages/db` chưa xuất namespace Prisma để dựng SQL tham số hoá → thêm `TenantSql` (một dòng re-export).
- Danh mục thông báo khoá đúng 9 loại theo prototype (`catalog.test.ts`) → thông báo crm (chuyển phụ trách, xin chia sẻ) chưa thêm được → Q-012; TIP-015 phát event.
- Policy §3.3: action `read` chạy ngay, nên `contact.export` "luôn preview" của Blueprint không áp được → DC-063.

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-060 … DC-067.

**DEVIATIONS FROM SPEC:** không có (DC-063 ghi cách áp policy cho export).

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-016: gọi `ContactIdentityService.resolve` trong inbound pipeline; consumer `contact.owner_changed` chuyển hội thoại mở theo `move`; `tag.*` (Cài đặt › Thẻ) dùng bảng `tag` của crm.
- TIP-018: `contact.send_email` gửi qua kênh Email (bỏ 409).
- TIP-028 / 033: consumer `contact.owner_changed` (báo giá, lịch hẹn); KPI 360° + LTV ở `/contacts/stats`.
- TIP AI: cột "AI gợi ý", `/crm/ai`, tóm tắt 360°, `contact.remember`.

## Supplemental routing plan (2026-11-02)

[ TIP-042b ](../tips/TIP-042b-lead-routing.md) owns the missing first-owner lead-routing runtime and UI, with opt-in migration, no-steal/CAS and durable event-to-ActionExecutor processing. Assignment settings stored today are not proof of runtime allocation. See [routing audit](routing-planning-audit-2026-11-02.md). SLA selection is not closed by this supplemental TIP.

### COMPLETION REPORT — TIP-013

**STATUS:** DONE
**COMMIT:** `c040649` (code) trên nhánh `tip/013-settings-api` (xếp chồng trên `tip/012-integrations`) — SHA cuối ở bảng tiến độ `goals/GOAL-BACKEND.md`

**FILES CHANGED:**
- Created:
  - Core: `packages/core/src/identity/actions/{workspace-update,working-hours-update,member-invite,invite-revoke,member-set-role,member-remove}.handler.ts`, `actions/member-guard.ts`, `identity/settings/{workspace-settings.ts, settings-read.service.ts}`.
  - API: `apps/api/src/http/identity/settings.controller.ts` (`GET /v1/settings/{workspace,members,roles,sla}`).
  - Shared: `packages/shared/src/api/settings.ts` (`workspaceSettingsSchema`, `membersPageSchema`, `settingsRolesSchema`, `slaSettingsSchema`), `src/identity/avatar.ts` (`avatarColor`), `src/support/sla-defaults.ts` (`SLA_DEFAULT`, `DEFAULT_WORKING_DAYS`, `tzLabel`).
  - Test: `apps/api/test/integration/settings.test.ts` (9), `apps/web/src/shared/api/mock/settings-shape.test.ts` (2), `apps/web/e2e/http/settings.spec.ts`.
- Modified: `packages/actions/src/{define.ts (requiresIdempotencyKey), settings.ts (working_hours.update + db platform)}`, `packages/core/src/{kernel/actions/policy.ts (re-export), identity/{identity.module.ts, public.ts, services/invites.service.ts (chạy trong ptx, thu hồi lời mời cũ cùng email, pendingCount)}}`, `packages/core/test/kernel.test.ts` (mốc uuidv7 cố định → bom hẹn giờ), `packages/shared/src/{authz/roles.ts (ROLE_COLOR), api/index.ts, identity/index.ts, index.ts}`, `apps/api/src/http/identity/identity.http.module.ts`, `apps/web/src/shared/actions/useAction.ts` (Idempotency-Key), `apps/web/src/features/settings/{types.ts (invite, seat_limit null), components/MembersSection.tsx (cờ invite, last ISO → fmt.relative, ∞)}`, `apps/web/src/shared/api/mock/domains/settings.ts` (cờ invite, ROLE_COLOR, revoke 404), `tools/contract/src/cases.ts`, `coding-packs/{DECISIONS.md, QUESTIONS.md, plans/BLUEPRINT.md §4.4}`.

**TEST RESULTS:**
- Acceptance criteria: 11/11 pass
  1. `workspace.update` ghi workspace / business_profile / `settings.general`; GET đọc lại khớp schema (thẻ workspace `Team · 1/5`); chưa khai báo mà sửa MST → 409 `not_declared`; sales → 403 (GET vẫn 200) — **pass**
  2. `member.invite`: thiếu Idempotency-Key → 422; cùng key → 1 lời mời; thư có link `/invite?token=`; mời lại cùng email → lời mời cũ `revoked_at`; đã là thành viên → 409; vượt hạn mức (5 người dùng gói Team) → 402 `{ resource: users, limit: 5 }` — **pass**
  3. `invite.revoke` → biến khỏi danh sách; lần 2 → 404; id không phải uuid → 404 — **pass**
  4. `member.set_role` → `/me/authz` có `members.manage` ngay; outbox `member.role_changed`; Owner → 422 `owner_locked`; lạ → 404; hoàn tác → vai trò cũ + event; hoàn tác sau khi đổi tiếp → 409, giữ vai trò mới — **pass**
  5. `member.remove` → `removed`, người đó `/me/authz` → 403; outbox `member.removed`; tự gỡ → 422 `self`; Quản lý gỡ Owner → 422 `owner_locked`; gỡ lần 2 → 404 — **pass**
  6. `working_hours.update` → GET `/settings/sla` trả lại; mặc định (T2–T6 08–18, T7 08–12, CN nghỉ) trước khi lưu; `from ≥ to` → 422 `days.0`; cs → 403 — **pass**
  7. `GET /settings/members` khớp schema: Owner đầu, lời mời `pending` + `invite:true`; `last` online (refresh token vừa cấp) / ISO (3 giờ trước) / never; `q=thuy tram` (không dấu); sales → 403 — **pass**
  8. `GET /settings/roles`: 5 vai trò, màu, `count` theo membership active (Owner theo `owner_user_id`) — **pass**
  9. Mock FE parse cùng 4 schema; contract `workspace.update` / `working_hours.update` xanh ở mock + HTTP — **pass**
  10. E2E http Cài đặt (Tổng quan: tên pháp lý từ khai báo, email quản trị = email Owner, sửa website + tải lại; Ngôn ngữ: múi giờ UTC + tải lại; SLA: bật Chủ nhật + tải lại; Vai trò: 5 vai trò + ma trận; Thành viên: 1 dòng Owner, mời → "Đã chạm giới hạn của gói", hộp vẫn mở) — **pass**; E2E mock `settings` / `settings-ops` xanh trong full hồi quy — **pass**
  11. Cổng D59 — **pass** (dưới)
- **Cổng "trước commit":** `pnpm turbo run lint typecheck test` (6 package đổi) 18/18 task; `pnpm depcheck` xanh (1066 module, 99 known); `lint:size` 1092 file.
- **Cổng "chốt TIP":** `pnpm lint` 13/13 · `pnpm typecheck` 13/13 · `pnpm test` 13/13 task, 0 failed · `pnpm build` 3/3 · `pnpm i18n:check` 100% (4471 key) · `api test:integration` **101 passed** (12 file) · `db test:integration` 7 passed · smoke bản build: api health 200, `/v1/settings/{workspace,members}` không token 401; worker `ROLE=jobs` khởi động sạch (0 log error) · **E2E http 8 passed · 2 skipped** (auth / onboarding · integrations · settings; luồng settings / integrations chỉ desktop) · full E2E hồi quy mock 418 ca → **222 passed · 0 failed · 196 skipped** (2.9m). Parity: N/A — không đổi giao diện (chỉ nguồn dữ liệu; "hoạt động cuối" từ API hiện bằng `fmt.relative`, mock giữ chuỗi cũ).

**ISSUES DISCOVERED:**
- `useAction` không gửi Idempotency-Key → mọi action send / money / `*.create` sẽ 422 khi chạy http (đầu tiên là `member.invite`, sau là `billing.create_invoice`) → DC-053.
- UndoService chỉ mở tx tenant, action `db: 'platform'` có undo (`member.set_role`) phải tự ghi DB nền tảng → DC-052.
- Gói dùng thử `personal_pro` cho 1 người dùng → workspace trial không mời được ai → Q-011 (giữ luật gói).
- `packages/core/test/kernel.test.ts` — test uuidv7 dùng mốc cố định 2026-10-30 12:00Z + 10 000 s: đỏ khi đồng hồ máy vượt mốc (uuidv7 đơn điệu kẹp ms nhỏ hơn lên ms gần nhất) → đổi mốc theo `Date.now()`.

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-048 (nơi ghi workspace.update), DC-049 (giờ làm việc ở `workspace.settings`, `db: platform`), DC-050 (hoạt động cuối = refresh token gần nhất), DC-051 (lời mời tính hạn mức), DC-052 (undo set_role ghi DB nền tảng, khoá lạc quan), DC-053 (Idempotency-Key ở useAction).

**DEVIATIONS FROM SPEC:** không có (`working_hours.update` thêm `db: 'platform'` — metadata thực thi, schema giữ nguyên; DC-049).

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-034: seed `sla_policy` từ `SLA_DEFAULT`, đồng hồ SLA đọc `workspace.settings.working_hours` + `timezone`; `GET /settings/sla` đổi `policy` / `escalation` sang bảng, `risk` từ ticket.
- TIP-015: chuyển phụ trách khách của thành viên bị gỡ (hiện chỉ đặt membership `removed`).
- TIP-016: presence Socket.IO thay "hoạt động cuối" nếu cần chính xác hơn (giữ shape `last`).

## Supplemental planning audit (2026-11-02)

See [TIP-042](../tips/TIP-042-custom-roles-teams.md) and [authz audit](authz-planning-audit-2026-11-02.md): custom role/team lifecycle, settings DTO, invite/assignment/undo and delegation management remain pending. Existing resolver tests are not evidence of an Owner grant/revoke UI flow. Q-028 remains open; no implementation status change is implied.

## Bổ sung — TIP-013b (2026-11-02)

Nghĩa vụ chưa đạt của TIP này chuyển sang [TIP-013b](../tips/TIP-013b-settings-workspace.md): PRO-settings-wsswitch, PRO-settings-wsbuy, PRO-settings-logo, PRO-settings-membersfilter, PRO-settings-membersexport, PRO-settings-navcounts, PRO-settings-paymentaccount, PRO-settings-docs, PRO-settings-tagslearn, REQ-A05f. File TIP gốc không sửa (DC-233).

## Bổ sung — TIP-013c (2026-11-02)

Nghĩa vụ chưa đạt của TIP này chuyển sang [TIP-013c](../tips/TIP-013c-owner-availability.md): REQ-F01b-6, COM-8b-5, DC-081, DEF-013-1. File TIP gốc không sửa (DC-233).

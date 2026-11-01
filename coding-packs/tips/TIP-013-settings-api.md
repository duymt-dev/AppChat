# TIP-013: Settings — nối API (Tổng quan workspace, Ngôn ngữ, giờ làm việc, Thành viên, Vai trò, Thông báo)

## HEADER
- TIP-ID: TIP-013
- Project: AppChat V2
- Module: `packages/core/src/identity` (handler workspace / thành viên / giờ làm việc, đọc Cài đặt) · `apps/api/src/http/{identity,authz}` · `packages/shared/src/api/settings.ts` · `apps/web/src/features/settings` (nối http)
- Depends on: TIP-004 (workspace, membership, invite), TIP-005 (vai trò, quyền), TIP-006 (thông báo — `GET /settings/notifications` đã có), TIP-009 (`QuotaService`, gói) — nhánh xếp chồng từ `tip/012-integrations`
- Priority: P0 · REQ: M01 (settings registry), M02 (thông báo — đã xong ở 006), A05 (5 vai trò, ma trận chỉ đọc)
- Estimated effort: 12 giờ
- **Files touched:**
  - Actions: `packages/actions/src/{policy.ts (requiresIdempotencyKey — chuyển từ core), index.ts, settings.ts (working_hours.update + `db: 'platform'`)}`.
  - Core: `identity/actions/{workspace-update,member-invite,invite-revoke,member-set-role,member-remove,working-hours-update}.handler.ts`, `identity/services/{settings-read.service.ts, invites.service.ts (create trong ptx, thu hồi lời mời cũ cùng email)}`, `identity/identity.module.ts`, `identity/public.ts`, `kernel/actions/policy.ts` (re-export).
  - Shared: `src/api/settings.ts` (`workspaceSettingsSchema`, `membersPageSchema`, `settingsRolesSchema`, `slaSettingsSchema`), `src/authz/roles.ts` (`ROLE_COLOR`), `src/identity/avatar.ts` (`avatarColor`), `src/support/sla-defaults.ts` (`SLA_DEFAULT` — TIP-034 seed từ đây).
  - API: `apps/api/src/http/identity/{settings.controller.ts, settings.view.ts}`, `identity.http.module.ts`; `apps/api/src/http/authz/authz.controller.ts` (`GET /v1/settings/roles`).
  - Web: `shared/actions/useAction.ts` (Idempotency-Key cho send / money / create), `features/settings/{types.ts, components/MembersSection.tsx}` (`invite`, `last` ISO), mock `domains/settings.ts` (cờ `invite`).
  - Test: `apps/api/test/integration/settings.test.ts`, `apps/web/src/shared/api/mock/settings-shape.test.ts`, contract cases, `apps/web/e2e/http/settings.spec.ts`.
- **Parallel-safe with:** 012

## CONTEXT
- FE mock (`apps/web/src/shared/api/mock/domains/settings.ts`, `settings-ops.ts`): `GET /settings/workspace` → `{ workspace, workspaces[] }`; `/settings/members?q=` → `{ data: Member[], total, seat_limit, next_cursor }`; `/settings/roles` → `{ roles[{ key, color, count, permissions, scope }], permissions }`; `/settings/sla` → `{ policy, tz, days[7], pause_sla, escalation[], risk }`.
- Blueprint §2.2 `workspace.settings jsonb` (giờ mở cửa, ngưỡng mặc định); `business_profile` (TIP-004) giữ tên pháp lý / MST / địa chỉ.
- Event `member.role_changed` / `member.removed` đã có consumer realtime (TIP-006: làm mới quyền / ngắt socket).
- `requiresIdempotencyKey`: `member.invite` là risk `send` → bắt buộc `Idempotency-Key` — `useAction` của FE chưa gửi.

## TASK
1. **`workspace.update`** (platform, `settings.manage`): `name` → `workspace.name` + `business_profile.legal_name`; `tax_code`, `address` → `business_profile` (chưa khai báo → 409 `{ business_profile: 'not_declared' }`); `locale`, `timezone` → cột workspace; `website`, `support_phone`, `admin_email`, `date_format` → `workspace.settings.general`. Khoá dòng workspace (`FOR UPDATE`) khi đọc-sửa-ghi jsonb.
2. **`member.invite`** (platform, `members.manage`, send): đã là thành viên → 409 `{ email: 'already_member' }`; hạn mức `users` = thành viên active + lời mời còn hạn (`QuotaService.assert`) → 402 `PLAN_LIMIT_REACHED`; lời mời cũ còn hạn cùng email bị thu hồi; tạo invite trong `ptx` + gửi mail mời.
3. **`invite.revoke`** (platform): lời mời còn chờ → `revoked_at`; không có → 404.
4. **`member.set_role`** (platform, undo 24h): Owner (`workspace.owner_user_id`) → 422 `{ user_id: 'owner_locked' }`; không phải thành viên active → 404; ghi `membership.role_key`; event `member.role_changed { user_id, role_key }`. Undo: trả vai trò cũ nếu vai trò hiện tại vẫn là vai trò đã đặt (đổi tiếp rồi → 409), phát lại `member.role_changed`.
5. **`member.remove`** (platform, delete): Owner → 422 `owner_locked`; tự gỡ mình → 422 `{ user_id: 'self' }`; `membership.status = removed`; event `member.removed`. Dữ liệu người đó giữ nguyên (chuyển phụ trách — 015).
6. **`working_hours.update`** (`settings.manage`) → `workspace.settings.working_hours { days, pause_sla }`; action thêm `db: 'platform'` (DC).
7. **Đọc:**
   - `GET /v1/settings/workspace` (thành viên bất kỳ): `workspace` đúng shape FE (`legal_name` = business_profile ?? tên workspace, `initial`, `currency: 'VND'`, `date_format` mặc định `DD/MM/YYYY`, `admin_email` mặc định email Owner) + `workspaces[]` của người xem (`plan`, `seats` "n/max", `color` theo loại workspace, `current`).
   - `GET /v1/settings/members?q=` (`members.manage`): thành viên active + lời mời còn chờ; `last` = `online` (hoạt động < 20 phút) · ISO thời điểm hoạt động cuối · `never`; `status` active / offline / pending; `dept` = tên nhóm (team) hoặc `—`; `invite` true với lời mời; tìm không dấu theo tên / email / nhóm; `total`, `seat_limit` (null = không giới hạn).
   - `GET /v1/settings/roles` (thành viên bất kỳ): 5 vai trò hệ thống + màu + số người + ma trận + `permissions`.
   - `GET /v1/settings/sla` (`sla.manage`): `days` / `pause_sla` / `tz` từ workspace (mặc định T2–T6 08:00–18:00, T7 08:00–12:00, CN nghỉ); `policy` / `escalation` = `SLA_DEFAULT` tới TIP-034; `risk` = 0.
8. **FE:** `useAction` gửi `Idempotency-Key` (uuid mỗi lần bấm, dùng lại khi confirm preview) cho action cần khoá; Thành viên dùng cờ `invite` (không đoán theo tiền tố id) và hiển thị `last` ISO bằng `fmt.relative`; `seat_limit` null → "∞".

## SPECIFICATIONS
- Mọi handler platform ghi qua `ptx`; event qua `HandlerOutcome.events` (outbox tenant).
- Danh sách thành viên tính trong bộ nhớ (≤ hạn mức gói, tối đa vài chục) — không cần phân trang (`next_cursor: null`).
- Không đổi schema input / output action (chỉ metadata `db`).

## ACCEPTANCE CRITERIA
1. `workspace.update` ghi đúng chỗ (workspace / business_profile / settings.general); `GET /settings/workspace` đọc lại đúng + khớp `workspaceSettingsSchema`; chưa khai báo mà sửa MST → 409; sales → 403.
2. `member.invite`: tạo invite + mail có link; thiếu `Idempotency-Key` → 422; cùng key gửi lại → 1 invite; mời lại cùng email → lời mời cũ bị thu hồi; email đã là thành viên → 409; vượt hạn mức gói → 402 `PLAN_LIMIT_REACHED`.
3. `invite.revoke` → lời mời biến khỏi danh sách; gọi lại → 404.
4. `member.set_role`: đổi vai trò → `/me/authz` của người đó có quyền mới ngay; outbox `member.role_changed`; Owner → 422; undo trả vai trò cũ; undo sau khi đổi tiếp → 409.
5. `member.remove`: membership `removed`, người đó gọi API workspace → 403; outbox `member.removed`; Owner / tự gỡ → 422.
6. `working_hours.update` → `GET /settings/sla` trả lại đúng `days` / `pause_sla`; mặc định trước khi lưu; khớp `slaSettingsSchema`.
7. `GET /settings/members` khớp `membersPageSchema`: owner + thành viên + lời mời (pending, `invite: true`); `q` không dấu; `last` online / ISO / never; sales → 403.
8. `GET /settings/roles` khớp `settingsRolesSchema`: 5 vai trò, `count` theo membership active.
9. Mock FE parse cùng 4 schema; contract `workspace.update` / `working_hours.update` xanh ở mock + HTTP.
10. E2E http Cài đặt (sửa thông tin chung + tải lại, đổi múi giờ, giờ làm việc + tải lại, ma trận vai trò, mời thành viên → báo hết hạn mức gói dùng thử) xanh; E2E mock `settings` / `settings-ops` xanh.
11. Cổng D59 xanh (+ smoke bản build).

## CONSTRAINTS
- `sla.update_default` (TIP-034), vai trò tuỳ biến / nhóm / uỷ quyền (TIP-042), chuyển phụ trách khi gỡ thành viên (TIP-015), đổi workspace từ thẻ Cài đặt (FE mock chỉ toast) — ngoài TIP.
- Không đổi luật gói (trial `personal_pro` 1 người dùng) — nêu Q nếu cần.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched` · 11 AC có test thật · file ≤ 400 dòng · test file riêng
- [ ] Cổng D59 (khi làm · trước commit · chốt TIP) có output

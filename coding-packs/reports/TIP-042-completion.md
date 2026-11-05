### COMPLETION REPORT — TIP-042

**STATUS:** DONE. PR (`tip/042-custom-roles-teams`) is stacked on #87 (TIP-014b), which is stacked on #86 — merge in order #86 → #87 → this PR. AC 9/9 (AC8: the AI part is verified via integration contract tests, not ai:live — Q-050).

**COMMIT:** `38618367` (backend P1) · `f93b31eb` (FE P2 + worker job id fix) · close commit (report + bookkeeping) — SHA recorded in the progress table `goals/GOAL-RELEASE.md`.

**MIGRATION** (tenant — workspace cũ / demo cần `pnpm --filter @appchat/db db:migrate-tenants`): `20261102004200_custom_roles_teams` — `role.version` + `role.deleted_at`, `team.version` + `team.lead_user_id`, bảng `authz_revision` (singleton id = 1, seed revision 0), index `role_live_list_idx` (partial `deleted_at IS NULL`, INCLUDE name / version) và `team_list_idx` (INCLUDE name / version / lead_user_id). Expand-only, không sửa migration đã áp.

**PHẦN ĐÃ LÀM:**
- **Vai trò tuỳ biến** — `role.create` (trắng: permissions + data_scope đủ 6 module; hoặc `clone_from_key`), `role.update` (CAS `if_version`), `role.delete` (xoá mềm, còn thành viên / lời mời → 409 `HAS_DEPENDENCIES {members, invites}`, không tự chuyển vai trò). Khoá `custom:<uuid>` server sinh; 5 vai trò hệ thống bất biến (422 `system_role`). DC-298: 6 quyền riêng Chủ sở hữu không cấp (422 `owner_only`); nhân bản Chủ sở hữu bỏ chúng + `contract.sign` / `payment.refund_approve` kèm `dropped` và cảnh báo preview. `roles.manage` (chỉ Chủ sở hữu), `agentGrantable: false`, undo 24h (create / update).
- **Gán vai trò** — `member.invite` / `member.set_role` nhận 4 vai trò hệ thống + `custom:*`; handler, preview, accept lời mời và undo kiểm vai trò còn sống (tombstone → 422 / 409 `unavailable`, không fallback). Người không phải Chủ sở hữu không gán vai trò vượt quyền / phạm vi của mình (403 `escalation`), không tự đổi vai trò của mình.
- **Nhóm phẳng** — `team.create` / `team.update` / `team.set_members` (`members.manage`, CAS, thay tập nguyên khối; người ngoài workspace / không active → 422 `not_member`; trưởng nhóm phải thuộc nhóm — `not_in_team` / `lead_removed`). Resolver chỉ tính đồng đội có membership active.
- **Thu hồi tức thời** — mọi role.\* / team.\* tăng `authz_revision` trong cùng giao dịch tenant; `AuthzResolver` đọc revision mỗi lần và đưa vào khoá cache (`authz:<ws>:e<epoch>:r<rev>:…`); thiếu bảng → không cache; Redis lỗi → đọc DB. `member.role_changed` chỉ gửi cho người bị ảnh hưởng (đẩy nhanh UI; không phải rào bảo mật).
- **Uỷ quyền P0 → P1** — job `authz.legacy-delegations` (worker jobs, khởi động + mỗi giờ) chuyển `membership.delegations` thành vai trò tuỳ biến khoá ổn định, cập nhật có điều kiện rồi xoá delegations, tăng epoch — không để grant cũ sống lại.
- **API đọc** — `/settings/roles` và `/roles` cùng `RolesService` (system trước, tuỳ biến còn sống sau; thêm `name` / `is_system` / `version`, field cũ giữ); `/teams` thêm `lead_user_id` + `version`.
- **UI** — Vai trò & phân quyền: "Tạo vai trò", ✎ sửa (tuỳ biến), ⧉ nhân bản; `RoleEditor` + `RolePermissionMatrix` (quyền riêng Chủ sở hữu khoá, phạm vi 6 module), nhãn "Dựa trên vai trò …" + danh sách quyền bị bỏ; STALE_VERSION → báo + tải lại; HAS_DEPENDENCIES → báo số người. Nhóm (mục nav mới, `members.manage`): thẻ theo prototype "Phòng ban" (chỉ nhóm phẳng), Thành viên / Cấu hình / ⋯, trưởng nhóm khoá khi đổi thành viên. Thành viên: lựa chọn vai trò từ API, lọc theo quyền người gán; badge theo tên DB.

**FILES CHANGED:** theo manifest TIP (inline, 61 path). Lệch:
- **Thêm ngoài manifest:** `apps/api/src/http/identity/identity.http.module.ts` (import AuthzModule để settings controller dùng `RolesService`); `packages/core/src/authz/services/legacy-delegations.ts` + `packages/core/src/authz/jobs/authz.jobs.module.ts` (chuyển uỷ quyền P0 — mục TASK §1.8); 6 file ma trận `apps/api/test/integration/actions/{role,team}.*.action.test.ts` (luật ma trận §12 mỗi action) + `fixtures/action-matrix.ts` (bỏ 042 khỏi `LATER_TIPS`); `packages/core/src/kernel/actions/tip-owners.ts` + `packages/core/test/assistant-coverage.test.ts` (prefix role / team → 042, alias `lead_user_id`); FE `hooks/useRoleLabel.ts`, `styles/{role-editor,teams}.styles.ts`, mock `domains/authz-management.ts` (+ đăng ký ở `store` / `routes` / `handlers`), `messages/{vi,en}/errors.json` (`STALE_VERSION` chưa có chữ); `settings-shape.test.ts`, `e2e/settings.spec.ts` (ca cũ "nút tạo khoá" đổi theo hành vi mới).
- **Test đặt khác manifest:** `packages/actions/test/authz.test.ts` → `packages/actions/src/authz.test.ts` (chỗ test hiện hành của gói actions).
- **M không cần sửa:** `packages/shared/src/index.ts` (authz/index + api/index đã re-export), `packages/core/src/notify/events/kernel.rules.ts` (`member.role_changed` có sẵn → refresh_authz), `apps/api/src/http/authz/authz.controller.ts` (đã đọc `RolesService`), `apps/api/test/integration/authz.test.ts` (ca cũ vẫn đúng — kiểm revision nằm ở `custom-roles.test.ts` / `authz-management.contract.test.ts`), `features/settings/api.ts` (query giữ nguyên; teams ở `api/teams.ts`).
- **Mã người dùng của team.\*:** `z.string().min(1)` như action CRM / inbox (không `.uuid()`), server kiểm membership active; id không phải UUID → 422 `not_member` trước khi chạm cột uuid.

**TEST RESULTS** (đầu cổng chốt đã chạy `db:test-reset`):
- Acceptance criteria: 9/9
  1. **AC1 vòng đời** — tạo trắng / nhân bản / sửa / xoá qua Executor, audit + preview; hệ thống 422, Quản lý 403, tenant khác 404, key lạ 422. `custom-roles.test.ts` (int), ma trận `role.{create,update,delete}.action.test.ts`, `packages/core/test/custom-roles.test.ts`.
  2. **AC2 không leo quyền** — Quản lý gán / mời vai trò có quyền mình không có hoặc phạm vi rộng hơn → 403 `escalation`; giả is_system / key owner → 422; Owner duy nhất theo `workspace.ownerUserId`. `custom-roles.test.ts` (int + core).
  3. **AC3 gán** — mời → nhận → đổi → hoàn tác với vai trò tuỳ biến, đọc lại settings; tombstone / lời mời hết hạn → từ chối, không fallback. `custom-roles.test.ts`.
  4. **AC4 CAS / đồng thời** — hai update cùng version: một thắng, 409; xoá đua gán / nhận / hoàn tác không hồi sinh quyền; lỗi giữa chừng + thử lại cùng khoá không cấp lại. `custom-roles.test.ts`, `authz-management.contract.test.ts`.
  5. **AC5 nhóm** — set_members / lead nguyên khối, bất biến trưởng nhóm, người ngoài / không active 422, 409 version, người bị xoá không mở rộng scope. `teams.test.ts` (int 5 + core 5), ma trận `team.*`.
  6. **AC6 thu hồi** — hai resolver dùng chung Redis, cache nóng: sửa vai trò → request kế tiếp thấy quyền mới (không chờ TTL / event); Redis chết → đọc DB. `authz-management.contract.test.ts`.
  7. **AC7 API / FE** — zod chung mock + HTTP (`settings-shape.test.ts`); E2E mock `settings-roles.spec.ts` (4 ca: vai trò tuỳ biến end-to-end, nhóm, quyền Quản lý / Nhân viên, mobile 390 không tràn) + E2E http `settings-roles.spec.ts` (tạo → đọc DB → sửa → xoá; nhóm tạo → cấu hình).
  8. **AC8 uỷ quyền + AI** — job chuyển `membership.delegations` (`custom-roles.test.ts` AC8); agent.create với role.\* / team.\* → 422 `not_grantable`, `runToolIds` lọc bỏ, nguồn `agent` → 422 (`authz-management.contract.test.ts`). Ca ai:live grant / revoke D35: harness chỉ có actor Chủ sở hữu → Q-050 (đề xuất mở ở 044), quyền vẫn resolve mỗi lần gọi tool qua revision.
  9. **AC9 migration / hiệu năng** — vai trò hệ thống không đổi, tuỳ biến thiếu → fail closed, không lẫn tenant; EXPLAIN: `role_live_list_idx`, `authz_revision_pkey`, `team_list_idx` (`custom-roles.test.ts` AC9); đọc danh sách không N+1 (một truy vấn role + đếm membership gom).
- Lệnh đã chạy:
  - `turbo lint typecheck test build` 7 package (shared / actions / core / db / api / worker / web) — 24/24 task: unit core 517 · web 300 · shared 135 · db 21 · api 11 · worker 7 · actions 12.
  - Integration 15 file trong phạm vi (custom-roles / teams / authz-management contract / authz / settings / 6 ma trận role·team / member.invite / member.set_role / invite.revoke / assistant-vertical mục lục ma trận) — **69 passed**.
  - E2E mock `settings-roles` + `settings` + `roles` — passed (mobile skip theo spec); E2E http `settings-roles` + `settings` — 3 passed (API + worker build mới, cổng 4327 / 3428).
  - Parity: `settings:roles` 2,43% · `settings:members` 0,65% · `settings:teams` (mới) 4,91%; `parity --done` 102 PASS, `inbox:connect-channel` 6,20% ≤ trần 6,5% (DC-360).
  - `depcheck` 0 lỗi, không cảnh báo mới từ file TIP; lint:size / lint:tokens / i18n:check (5.466 key, 100%) sạch. Không đổi package.json → không cần `check:bundle`.

**ISSUES DISCOVERED:**
- E2E http bắt lỗi thật: job khởi động `authz.legacy-delegations:boot` — BullMQ cấm `:` trong custom id → worker jobs dừng khi boot, workspace mới kẹt `provisioning`. Sửa id `…-boot` + test hồi quy (`custom-roles.test.ts` › job chuyển uỷ quyền P0).
- Mock FE dùng id thành viên dạng `u_*` → schema team.\* nới `uuid()` thành chuỗi khác rỗng (server kiểm membership, id lạ 422).
- Gói dùng thử 1 người dùng → integration mua gói không giới hạn trong `beforeAll`; E2E http nhóm chỉ có Chủ sở hữu.

**ĐỐI CHIẾU STANDARDS** (mục APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `authz/rbac-permissions.md` | `can(permission)`, không phân quyền theo tên vai trò; Owner duy nhất từ `ownerUserId`; hệ thống bất biến; nhóm không cấp quyền thêm; DC-298 ở `custom-role-policy.ts` dùng chung core + web | — |
| `actions/action-registry.md` | 6 action zod, risk config / delete, `agentGrantable:false`, undo khai từng action, invalidates; ma trận §12 mỗi action | — |
| `api/response-envelope.md` | `{data}`; 409 `STALE_VERSION` / `HAS_DEPENDENCIES` kèm fields; 422 field-level | — |
| `events/outbox.md` | `member.role_changed` chỉ cho người bị ảnh hưởng qua outbox; revision là rào bảo mật, event chỉ tăng tốc | — |
| `database/tenant-db.md` + `indexing.md` | Bảng tenant không `workspace_id`; index `=`/sort đúng thứ tự, partial + INCLUDE; EXPLAIN | Danh sách vai trò / nhóm không phân trang (ít dòng, picker đọc đủ) → keyset trên index, không deferred join |
| `domain/concurrency.md` | `SELECT … FOR UPDATE` + CAS version; set_members thay nguyên khối trong một giao dịch | — |
| `domain/validation-defaults.md` / `gap-filling.md` | Tên 1–120, không trùng (không dấu); danh sách ≤ 200 không trùng; Q-050 ghi kèm đề xuất | — |
| `ops/observability-security.md` | Không log danh sách quyền / email; lỗi job ghi theo workspace | — |
| `ui/frontend-structure.md` / `interaction-patterns.md` | RolesSection / TeamsSection orchestrator; editor, ma trận, hook, style tách file; ghi chỉ `useAction`; đóng hộp chỉ khi thành công | — |
| `ui/prototype-parity.md` | `settings:roles` 2,43%, `settings:teams` 4,91% | PD-018 (mức 1, đề xuất) |
| `i18n/i18n.md` | `settings.roleEditor.*`, `settings.teams.*`, `actions.{role,team}.*` vi + en; 100% | — |
| `code/file-size-module-layout.md` + `testing.md` | Backend ≤ 177 dòng / file mới, FE ≤ 122; `types.ts` 373 (tách `roles.types.ts`); test ở file riêng | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/042-custom-roles-teams`, PR vào `dev`, xếp chồng #87 | — |

**GIẢ ĐỊNH ĐÃ CHỌN:** Q-050 (ai:live chưa có actor không phải Chủ sở hữu) — làm theo đề xuất, AC8 phần AI nghiệm thu bằng integration. Q-029 (ngữ nghĩa scope team theo `team_id`) thuộc 042c, không đụng.

**Lệch spec:** không thêm thư viện; không sửa `ActionExecutor`, `ROLE_DEFS`; không thêm `team.delete` / `team.manage`; không cây phòng ban.

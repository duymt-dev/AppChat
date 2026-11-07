# TIP-005: Authz engine

## HEADER
- TIP-ID: TIP-005
- Project: AppChat V2
- Module: `packages/db/prisma/tenant/authz.prisma` · `packages/core/src/authz` · `apps/api/src/http/authz` · `apps/api/src/http/kernel/request-actor.ts`
- Depends on: TIP-004 (xếp chồng — nhánh tách từ `tip/004-identity-auth`)
- Priority: P0 · REQ: A05 (5 vai trò + data scope, D27, D32)
- Estimated effort: 10 giờ
- **Files touched:**
  - `packages/db/prisma/tenant/authz.prisma` (điền) + migration `tenant/migrations/<ts>_005_authz`.
  - `packages/shared/src/authz/{permissions,roles}.ts` (modify: `DELEGABLE_PERMISSIONS`, `ROLE_NAMES`, `PERMISSION_GROUPS`, `teamUserIds?` trong `AuthzContext` — mở rộng tương thích ngược).
  - `packages/core/src/authz/` — `services/{authz-resolver,roles.service,teams.service}.ts`, `scope.ts` (`scopeFilter`, `assertInScope`), `seed.ts` (seed vai trò hệ thống), `authz.module.ts`, `public.ts`.
  - `packages/core/src/kernel/tenant-seeds.ts` (registry seed mặc định khi `tenant.provision` — domain tự đăng ký) + `identity/jobs/tenant-provision.processor.ts` (gọi seed).
  - `apps/api/src/http/authz/{authz.controller.ts, authz.http.module.ts}`; `apps/api/src/http/kernel/{request-actor,actor.module}.ts` (AuthzContext từ resolver thay `ROLE_DEFS` tạm của TIP-004).
  - Test: `packages/core/test/authz-unit.test.ts`, `apps/api/test/integration/{authz,role-isolation}.test.ts` + `role-isolation.harness.ts` (TIP domain sau thêm ca).
- **Parallel-safe with:** sequential (006, 013, 015 dựa trên AuthzContext + scopeFilter)

## CONTEXT
- Blueprint §3.2 bước 3 (permission + data scope → `SCOPE_FORBIDDEN`), §3.5 (ma trận permission × 5 vai trò, data scope mặc định, uỷ quyền `membership.delegations`), §4.4 authz (`GET /v1/me/authz`, `/v1/roles`, `/v1/permissions`, `/v1/teams`).
- Standard `authz/rbac-permissions.md` (quy tắc 1–9, D32 collaborator), `database/{tenant-db,indexing}.md`.
- FE mock: `GET /me/authz` → `{ role, is_owner, permissions, scope, team_ids }` (`apps/web/src/shared/api/mock/routes.ts`); `useCan` đọc đúng shape này.

## TASK
1. **Schema [T]:** `role(id, key unique, name, is_system, permissions text[], data_scope jsonb, created_at, updated_at)`, `team(id, name, created_at)`, `team_member(team_id, user_id, created_at)` PK `(team_id, user_id)` + index `(user_id) INCLUDE (team_id)`.
2. **Seed:** `tenant.provision` chạy registry seed của kernel; domain authz đăng ký seed 5 vai trò hệ thống (`ROLE_DEFS`, idempotent upsert theo `key`). TIP sau (SLA, loyalty, agent mẫu…) đăng ký seed của mình cùng cách.
3. **AuthzResolver:** `resolve(workspaceId, userId, membership)` → `AuthzContext`:
   - `isOwner` = `workspace.owner_user_id === userId` (quy tắc 7 — không theo tên vai trò);
   - vai trò hệ thống → permission + scope từ `ROLE_DEFS` (code là nguồn sự thật, DC-024); vai trò tuỳ biến `custom:*` → bảng `role` (permission ∩ danh mục);
   - uỷ quyền: `membership.delegations` ∩ `DELEGABLE_PERMISSIONS` (`contract.sign`, `payment.refund_approve`) cộng vào quyền;
   - `teamIds` + `teamUserIds` từ `team_member`;
   - cache Redis 60 s, khoá gồm `(ws, user, role_key, delegations)` + phiên bản workspace (`authz.invalidate(ws)` tăng phiên bản — TIP-013 / 042 gọi khi đổi vai trò / nhóm).
4. **Executor / API:** `JwtActorResolver` lấy AuthzContext từ resolver; Authorizer: `self` luôn được, `platform_admin` chỉ khi `user.is_platform_admin`, còn lại `can()`.
5. **Scope:** `scopeFilter(authz, module, fields)` → điều kiện `where` Prisma: `all` → `{}`; `none` → không khớp gì; `own` → `owner = me OR assignee = me` (+ `contactIds` collaborator khi truyền — D32, TIP-015 cấp); `team` → owner ∈ `teamUserIds ∪ {me}`. `assertInScope(authz, module, row, fields)` → `SCOPE_FORBIDDEN` 403.
6. **Endpoint:** `GET /v1/me/authz` (cần `X-Workspace-Id`), `GET /v1/roles` (vai trò + số thành viên active), `GET /v1/permissions` (danh mục nhóm theo module), `GET /v1/teams` (nhóm + thành viên).
7. **Harness role-isolation** trên DB thật: helper dùng lại cho TIP domain; TIP-005 phủ ca `own` / `team` / `all` / `none` trên bảng kernel.

## SPECIFICATIONS
### Business Rules
- Code chỉ kiểm permission, không kiểm tên vai trò (ngoại lệ duy nhất: chọn nguồn định nghĩa vai trò hệ thống vs tuỳ biến trong resolver).
- Vai trò hệ thống không sửa / xoá (P1 mới có sửa vai trò — TIP-042).
- Thành viên `custom:*` mà DB tenant không có vai trò đó → không quyền, scope `none` (không lỗi 500).

### Validation & Error Handling
- Ngoài scope → `SCOPE_FORBIDDEN` 403; thiếu permission → `FORBIDDEN` 403 (TIP-003).

## ACCEPTANCE CRITERIA
1. Migration tenant 005 áp lên template + DB tenant hiện có (`tenant-migrate`); `team_member` có index `(user_id) INCLUDE (team_id)`.
2. `tenant.provision` seed đúng 5 vai trò hệ thống (key, permissions, data_scope khớp `ROLE_DEFS`); chạy lại không nhân đôi.
3. Ma trận: với mỗi vai trò, `GET /v1/me/authz` trả permissions + scope đúng Blueprint §3.5 (so với `ROLE_DEFS`); Owner = `workspace.owner_user_id` (kể cả khi role_key khác).
4. Uỷ quyền: Quản lý có `delegations=['contract.sign']` → có `contract.sign`; `delegations=['billing.manage']` (không uỷ quyền được) → bị bỏ qua.
5. Vai trò tuỳ biến trong bảng `role` → quyền + scope theo bảng; permission lạ trong bảng bị lọc; `custom:*` không có dòng → không quyền.
6. Cache: lần 2 không chạm DB tenant; `invalidate(ws)` → đọc lại.
7. Executor dùng AuthzContext thật: accountant gọi action cần `inbox.manage` → 403; `platform_admin` chỉ khi user là admin nền tảng.
8. `scopeFilter` / `assertInScope` (unit) đủ 4 mức; role-isolation trên DB thật: sales A không thấy bản ghi của sales B (`own`), thành viên cùng nhóm thấy nhau (`team`), quản lý thấy hết (`all`), kế toán ở inbox không thấy gì (`none`).
9. `GET /v1/roles` (5 vai trò + số thành viên), `/v1/permissions` (đủ danh mục, nhóm theo module), `/v1/teams`.
10. Cổng D59 xanh (+ smoke bản build — Q-009).

## CONSTRAINTS
- Không đổi schema action. Không kiểm tên vai trò trong handler.
- Bảng `team` / `team_member` có từ đầu; UI Nhóm ở P1 (TIP-042).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched` · 10 AC có test thật (Postgres + Memurai)
- [ ] Cổng D59 trước commit + chốt TIP
- [ ] Commit + SHA + report + ba sổ + tiến độ

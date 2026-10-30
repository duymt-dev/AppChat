### COMPLETION REPORT — TIP-005

**STATUS:** DONE
**COMMIT:** `0fcd2e9` (code) trên nhánh `tip/005-authz` (xếp chồng trên `tip/004-identity-auth`) — SHA cuối ở bảng tiến độ `goals/GOAL-BACKEND.md`

**FILES CHANGED:**
- Created:
  - `packages/db/prisma/tenant/authz.prisma` (điền: `role`, `team`, `team_member`) + migration `tenant/migrations/20261030110000_005_authz` (sinh bằng `prisma migrate diff` + index viết tay `team_member_user_idx (user_id) INCLUDE (team_id)`).
  - `packages/core/src/kernel/tenant-seeds.ts` — registry seed DB tenant (DC-026).
  - `packages/core/src/authz/{seed.ts, scope.ts, public.ts, services/{authz-resolver,roles.service}.ts}`; `authz.module.ts` (điền).
  - `packages/core/src/kernel/actions/authorizer.ts` (đổi tên từ `dev-authorizer.ts`: thêm kiểm `platform_admin` ở DB nền tảng).
  - `apps/api/src/http/authz/authz.controller.ts`; `authz.http.module.ts` (điền).
  - Test: `packages/core/test/authz-unit.test.ts`, `apps/api/test/integration/{authz.test.ts, role-isolation.harness.ts}`.
- Modified: `packages/shared/src/authz/{permissions,roles}.ts` (`PERMISSION_GROUPS`, `DELEGABLE_PERMISSIONS`, `ROLE_NAMES`, `isSystemRole`, `isPermissionKey`, `AuthzContext.teamUserIds?` — mở rộng tương thích ngược), `packages/core/src/{index.ts (1 dòng facade), kernel/{index.ts, actions/actions.module.ts}, identity/{jobs/tenant-provision.processor.ts (chạy seed trước khi active), public.ts}}`, `apps/api/src/{app.module.ts, http/kernel/{request-actor,actor.module}.ts}`, `apps/api/test/integration/setup.ts` (harness chạy seed như provision), `coding-packs/DECISIONS.md`.

**TEST RESULTS:**
- Acceptance criteria: 10/10 pass (Postgres 16 native + Memurai thật)
  1. Template có migration 005 + `team_member_user_idx`; `tenantMigrate` áp 005 lên DB tenant "cũ" (đã gỡ bảng 005) → `done`, bảng có lại — **pass**
  2. `provisionWorkspace` (job `tenant.provision`) seed đúng 5 vai trò hệ thống (key, `is_system`, permissions, data_scope = `ROLE_DEFS`); chạy seed lại vẫn 5 dòng — **pass**
  3. `GET /v1/me/authz` cho owner / manager / sales / cs / accountant: permissions + scope đúng Blueprint §3.5; user là `workspace.owner_user_id` nhưng `role_key='manager'` → vẫn `is_owner` + đủ quyền — **pass**
  4. Uỷ quyền: Quản lý `delegations=['contract.sign','billing.manage']` → có `contract.sign`, không có `billing.manage` — **pass**
  5. Vai trò tuỳ biến `custom:viewer` từ bảng → quyền lọc theo danh mục (bỏ `hack.all`), scope theo bảng (thiếu = none); `custom:ghost` không có dòng → không quyền, mọi scope none — **pass**
  6. Cache Redis: lần 2 không đọc DB (`loads` không đổi); `invalidate(ws)` → đọc lại — **pass**
  7. Executor với AuthzContext thật: accountant gọi action cần `inbox.manage` → 403; `platform_admin` chỉ đúng khi `user.is_platform_admin`; `self` luôn được — **pass**
  8. `scopeFilter` / `inScope` / `assertInScope` unit đủ 4 mức + collaborator (D32); role-isolation DB thật: sales A chỉ thấy bản ghi A, sales B chỉ thấy B (`own`), cùng nhóm thấy cả hai (`team`, `teamIds` từ `team_member`), Quản lý thấy hết (`all`), Kế toán ở inbox không thấy gì (`none`) — **pass**
  9. `GET /v1/roles` (5 vai trò hệ thống + `member_count`), `/v1/permissions` (đủ danh mục, nhóm theo module), `/v1/teams`; chưa đăng nhập → 401 — **pass**
  10. Cổng D59 — **pass** (dưới)
- **Cổng "trước commit":** `pnpm turbo run lint typecheck test` (shared · core · api · worker · db · web) 18/18 task — core 66 · shared 48 · db 17 · api 5 · worker 6 · web 72; `pnpm depcheck` xanh; `lint:size` 989 file.
- **Cổng "chốt TIP":** `pnpm lint` 13/13 · `pnpm typecheck` 13/13 · `pnpm test` 13/13 task, 0 failed · `db test:integration` 7 passed · `api test:integration` **47 passed** (authz 9 · auth 11 · workspaces 10 · actions 13 · relay-sequence 3 · contract 1) · `pnpm depcheck` xanh (99 known) · `pnpm i18n:check` 100% · `pnpm build` 3/3 · smoke bản build (Q-009): api `node dist/main.js` → health 200, `/v1/me/authz` + `/v1/roles` không token 401; worker `ROLE=jobs` khởi động sạch · full E2E hồi quy mock 418 ca → **222 passed · 0 failed · 196 skipped** (3.5m, lượt 2; lượt 1: 220 passed · 2 failed chập chờn `quotes.spec.ts:37`, `settings-ops.spec.ts:44` — chạy riêng 2 spec × 3 lần 24/24 xanh; module web không đổi — Q-010). E2E http + parity: N/A — TIP không có màn UI (trang Vai trò & phân quyền nối API ở TIP-013).

**ISSUES DISCOVERED:**
- Không có.

**GIẢ ĐỊNH ĐÃ CHỌN:**
- DC-024 — quyền vai trò hệ thống lấy từ code (`ROLE_DEFS`); bảng `role` là bản sao seed + nơi lưu vai trò tuỳ biến.
- DC-025 — Owner = `workspace.owner_user_id`.
- DC-026 — registry seed DB tenant ở kernel; `tenant.provision` chạy seed trước khi `active`.
- `scopeFilter` trả điều kiện `where` Prisma (repo truyền tên cột owner / assignee / contact); scope `none` = `{ AND: [{ id: { in: [] } }] }` (bảng nào cũng có `id`).
- Cache AuthzContext khoá theo `(ws, phiên bản, user, role_key, delegations)` → đổi vai trò / uỷ quyền ở DB nền tảng tự đổi khoá; đổi nhóm / vai trò tuỳ biến gọi `AuthzResolver.invalidate(ws)` (TIP-013 / 042).

**DEVIATIONS FROM SPEC:** không có.

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-015 (CRM) cấp `contactIds` collaborator cho `scopeFilter` (index `contact_collaborator(user_id, contact_id)`) và thêm ca role-isolation vào `role-isolation.harness.ts`.

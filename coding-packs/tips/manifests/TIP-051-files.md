# TIP-051 — exact file manifest

M = sửa, C = tạo mới. Không wildcard thư mục; test liệt kê từng file. Không đổi 9 bảng nghiệp vụ có `team_id`.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/db/prisma/tenant/authz.prisma` | `Team` thêm `parentId` / `kind` / `path` / `sort` / `archivedAt`; model `TeamAgent` |
| C | `packages/db/prisma/tenant/migrations/20261116100000_org_units/migration.sql` | Cột cây + backfill `path` nhóm cũ, `team_agent`, index `team_path_idx` (text_pattern_ops), `team_children_idx`, `team_agent_agent_idx` |
| C | `packages/db/test/org-units-migration.test.ts` | AC1: nhóm cũ thành đơn vị `team` dưới gốc, giữ id / trưởng / thành viên |
| M | `packages/shared/src/authz/permissions.ts` | `DataScope` thêm `dept`; `AuthzContext.deptTeamIds` |
| C | `packages/shared/src/authz/unit-scope.ts` | `scopeUnitIds(authz, level)` — một nguồn cho 3 lớp scope |
| M | `packages/shared/src/authz/index.ts` | Export `unit-scope` |
| M | `packages/shared/src/authz/custom-role-policy.ts` | `ROLE_SCOPES` + `SCOPE_RANK` có `dept` |
| M | `packages/shared/src/authz/roles.test.ts` | AC7: `team` không cấp được `dept`; rank đúng |
| M | `packages/shared/src/api/settings.ts` | `dataScope` enum thêm `dept` |
| C | `packages/shared/src/api/org-units.ts` | `OrgUnitDto`, `orgTreeSchema` (gốc ảo + đơn vị) |
| M | `packages/shared/src/api/teams.ts` | `kind` + `parent_id` optional |
| M | `packages/shared/src/api/index.ts` | Export `org-units` |
| C | `packages/actions/src/org-units.ts` | `org_unit.create / update / move / set_members / delete` |
| M | `packages/actions/src/authz.ts` | `scopeValue` thêm `dept`; mô tả `team.*` ghi alias |
| M | `packages/actions/src/index.ts` | Đăng ký `org-units` |
| M | `packages/actions/src/authz.test.ts` | Schema `org_unit.*` + `dept` |
| M | `apps/web/messages/vi/actions.json` | Tiêu đề `org_unit.*` |
| M | `apps/web/messages/en/actions.json` | Tiêu đề `org_unit.*` |
| C | `packages/core/src/authz/org/org-units.service.ts` | Luật cây §2: cấp hợp lệ, sâu ≤ 6, tên anh em, chống vòng, chuyển `path` cây con, điều kiện lưu trữ |
| C | `packages/core/src/authz/org/org-unit.handlers.ts` | Handler `org_unit.*` (CAS, khoá, revision, event `member.role_changed`, undo) |
| C | `packages/core/src/authz/org/org-tree.read.ts` | Đọc cây cho `GET /v1/org-units` (gốc ảo, người active, agent chưa xoá) |
| M | `packages/core/src/authz/authz-management.providers.ts` | Thêm `ORG_UNIT_HANDLERS` |
| M | `packages/core/src/authz/authz.module.ts` | Provider đọc cây |
| M | `packages/core/src/authz/public.ts` | Export đọc cây |
| M | `packages/core/src/authz/actions/team.handlers.ts` | `team.*` gọi chung service đơn vị (alias), không đụng `team_agent` |
| M | `packages/core/src/authz/services/team-members.ts` | Helper dùng chung cây (tên anh em, thành viên agent) |
| M | `packages/core/src/authz/services/roles.service.ts` | `teams()` thêm `kind` / `parent_id`, bỏ đơn vị lưu trữ |
| M | `packages/core/src/authz/services/authz-resolver.ts` | `SCOPES` có `dept`; tính + cache `deptTeamIds` (một câu theo `path`) |
| M | `packages/core/src/authz/scope.ts` | Nhánh `team` / `dept` qua `scopeUnitIds` (filter + inScope) |
| M | `packages/core/src/authz/data-access/scope-sql.ts` | Nhánh `team` / `dept` qua `scopeUnitIds` |
| M | `packages/core/src/authz/data-access/record-policy.ts` | Nhánh `team` / `dept` qua `scopeUnitIds` |
| M | `packages/core/src/authz/data-access/team-snapshot.ts` | `soleTeamOf` = đơn vị lá sâu nhất duy nhất cùng nhánh |
| M | `packages/core/src/ai/agents/agent-authz.ts` | Chép `deptTeamIds` của người ra lệnh |
| M | `packages/core/src/inbox/services/nav-badges.ts` | Khoá cache thêm `deptTeamIds` |
| M | `packages/core/src/crm/memory/summary.ts` | `narrow` tính `dept`; khoá thêm `deptTeamIds` |
| M | `packages/core/src/crm/merge/candidates.ts` | Khoá cache thêm `deptTeamIds` |
| M | `packages/core/src/insights/exports/export-runner.ts` | Khoá cache thêm `deptTeamIds` |
| M | `packages/core/src/support/categories/read.ts` | Khoá cache thêm `deptTeamIds` |
| M | `packages/core/src/crm/services/contact-timeline-export.ts` | `timelineStamp` thêm `deptTeamIds` |
| C | `packages/core/test/org-units.test.ts` | Unit luật cây + `soleTeamOf` nhánh (AC4) + `scopeUnitIds` |
| M | `packages/core/test/teams.test.ts` | Giữ xanh với service chung |
| M | `packages/core/test/record-scope.test.ts` | Bảng chân trị thêm `dept` |
| M | `apps/api/src/http/authz/authz.controller.ts` | `GET /v1/org-units` |
| C | `apps/api/test/integration/actions/org_unit.create.action.test.ts` | Tạo theo cấp hợp lệ, tên trùng 409 |
| C | `apps/api/test/integration/actions/org_unit.move.action.test.ts` | AC2 |
| C | `apps/api/test/integration/actions/org_unit.set_members.action.test.ts` | AC5 |
| C | `apps/api/test/integration/actions/org_unit.delete.action.test.ts` | AC6 |
| C | `apps/api/test/integration/actions/org_unit.update.action.test.ts` | Đổi tên / trưởng, CAS, undo |
| C | `apps/api/test/integration/org-dept-scope.test.ts` | AC3 + EXPLAIN §7 |
| M | `apps/api/test/integration/authz-management.contract.test.ts` | Hợp đồng `/v1/org-units` + `/v1/teams` mới |
| M | `apps/web/src/features/settings/registry.ts` | Mục `org_dept`; nhãn `teams` = Phòng ban; bỏ ghi chú ẩn |
| M | `apps/web/src/features/settings/screens/SettingsScreen.tsx` | Map `org_dept` |
| C | `apps/web/src/features/settings/org-types.ts` | Kiểu đơn vị / cấp / màu cấp (không sửa `types.ts`) |
| C | `apps/web/src/features/settings/api/org-units.ts` | `orgTreeQuery` |
| C | `apps/web/src/features/settings/hooks/useOrgTree.ts` | Dựng cây, thống kê cấp, thao tác qua `useAction` |
| C | `apps/web/src/features/settings/components/OrgChartSection.tsx` | Sơ đồ tổ chức (prototype ~L8277) |
| C | `apps/web/src/features/settings/components/OrgChartNode.tsx` | Ô + đường nối (prototype `orgBox` / `orgNode`) |
| C | `apps/web/src/features/settings/components/OrgUnitModal.tsx` | Thêm / sửa / chuyển / xoá đơn vị |
| C | `apps/web/src/features/settings/styles/org.styles.ts` | Style sơ đồ (token) |
| M | `apps/web/src/features/settings/components/TeamsSection.tsx` | Phòng ban: thẻ có cấp + cha, chế độ xem |
| C | `apps/web/src/features/settings/components/TeamsToolbar.tsx` | Tìm, Chi nhánh, Phòng ban, Thẻ / Danh sách nhân sự, tạo |
| C | `apps/web/src/features/settings/components/StaffList.tsx` | Danh sách nhân sự gồm người + AI agent, `Pager` D42 |
| M | `apps/web/src/features/settings/components/TeamEditor.tsx` | Chọn AI agent + đơn vị cha |
| M | `apps/web/src/features/settings/styles/teams.styles.ts` | Toolbar + danh sách nhân sự |
| C | `apps/web/src/shared/api/mock/domains/org-units.ts` | Mock cây + `org_unit.*` |
| M | `apps/web/src/shared/api/mock/handlers.ts` | Đăng ký mock `org-units` |
| M | `apps/web/src/shared/api/mock/domains/authz-management.ts` | `/teams` mock thêm `kind` / `parent_id`, scope `dept` |
| M | `apps/web/messages/vi/settings.json` | Chuỗi Sơ đồ tổ chức / Phòng ban / scope `dept` |
| M | `apps/web/messages/en/settings.json` | Như trên (en) |
| C | `apps/web/e2e/settings-org.spec.ts` | AC8–9 (mock) |
| C | `apps/web/e2e/http/settings-org.spec.ts` | AC8–9 (http) |
| M | `tools/parity/parity.manifest.ts` | Thêm `settings:org_dept`; bỏ mask PD-018 phần lọc / chế độ xem của `settings:teams` |

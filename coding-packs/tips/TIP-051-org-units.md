# TIP-051 — Cây đơn vị tổ chức: Phòng ban + Sơ đồ tổ chức, phạm vi dữ liệu "Phòng ban", AI agent là thành viên (D64)

## HEADER
- **Parallel-safe with TIP-051d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/core/src/authz/authz-management.providers.ts`, `packages/core/src/authz/data-access/team-snapshot.ts`, `packages/shared/src/api/settings.ts`, `tools/parity/parity.manifest.ts`; integrate 051 before051d.
- **Parallel-safe with TIP-046 (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 051 before046.
- **Parallel-safe with TIP-051b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/shared/src/authz/index.ts`; integrate 051 before051b.
- **Parallel-safe with TIP-051c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 051 before051c.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003c before051.
- **Parallel-safe with TIP-003e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003e before051.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `tools/parity/parity.manifest.ts`; integrate 004b before051.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 006d before051.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 012b before051.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `apps/web/src/features/settings/screens/SettingsScreen.tsx`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 012c before051.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `tools/parity/parity.manifest.ts`; integrate 013b before051.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`; integrate 013c before051.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 014b before051.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 014c before051.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/crm/memory/summary.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 015b before051.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 015c before051.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/authz/data-access/record-policy.ts`, `packages/core/src/authz/data-access/scope-sql.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 015d before051.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/authz/data-access/record-policy.ts`, `packages/core/src/authz/data-access/scope-sql.ts`, `packages/core/src/crm/memory/summary.ts`, `packages/core/src/crm/merge/candidates.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 015e before051.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 015f before051.
- **Parallel-safe with TIP-016b (coverage-closure manifest):** sequential, shares `packages/core/src/inbox/services/nav-badges.ts`; integrate 016b before051.
- **Parallel-safe with TIP-017b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 017b before051.
- **Parallel-safe with TIP-018b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 018b before051.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `packages/core/src/crm/memory/summary.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 019b before051.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 019c before051.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 020b before051.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 020d before051.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`; integrate 020e before051.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 022b before051.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023b before051.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023c before051.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023d before051.
- **Parallel-safe with TIP-023e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 023e before051.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023f before051.
- **Parallel-safe with TIP-023g (coverage-closure manifest):** sequential, shares `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023g before051.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 025b before051.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/core/src/crm/memory/summary.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 026b before051.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/crm/memory/summary.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 026c before051.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 027b before051.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 030b before051.
- **Parallel-safe with TIP-030c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 030c before051.
- **Parallel-safe with TIP-031b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 031b before051.
- **Parallel-safe with TIP-031c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 031c before051.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/api/settings.ts`, `tools/parity/parity.manifest.ts`; integrate 032b before051.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/authz/data-access/record-policy.ts`, `packages/core/src/authz/data-access/scope-sql.ts`, `tools/parity/parity.manifest.ts`; integrate 032c before051.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032d before051.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/inbox/services/nav-badges.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032e before051.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `apps/web/src/features/settings/screens/SettingsScreen.tsx`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 033b before051.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 033c before051.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `apps/web/src/features/settings/screens/SettingsScreen.tsx`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/core/src/support/categories/read.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 034b before051.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 034c before051.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 034d before051.
- **Parallel-safe with TIP-036 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 036 before051.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before051.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/insights/exports/export-runner.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before051.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before051.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 039 before051.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 040 before051.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 041 before051.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/api/src/http/authz/authz.controller.ts`, `apps/api/test/integration/authz-management.contract.test.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/TeamEditor.tsx`, `apps/web/src/features/settings/components/TeamsSection.tsx`, `apps/web/src/features/settings/registry.ts`, `apps/web/src/features/settings/screens/SettingsScreen.tsx`, `packages/actions/src/authz.ts`, `packages/actions/src/index.ts`, `packages/core/src/authz/actions/team.handlers.ts`, `packages/core/src/authz/authz-management.providers.ts`, `packages/core/src/authz/authz.module.ts`, `packages/core/src/authz/public.ts`, `packages/core/src/authz/services/authz-resolver.ts`, `packages/core/src/authz/services/roles.service.ts`, `packages/core/src/authz/services/team-members.ts`, `packages/core/test/teams.test.ts`, `packages/db/prisma/tenant/authz.prisma`, `packages/shared/src/api/index.ts`, `packages/shared/src/api/settings.ts`, `packages/shared/src/api/teams.ts`, `packages/shared/src/authz/custom-role-policy.ts`, `tools/parity/parity.manifest.ts`; integrate 042 before051.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `apps/web/src/features/settings/screens/SettingsScreen.tsx`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 042b before051.
- **Parallel-safe with TIP-042c (coverage-closure manifest):** sequential, shares `packages/core/src/authz/data-access/record-policy.ts`, `packages/core/src/authz/data-access/scope-sql.ts`, `packages/core/src/authz/data-access/team-snapshot.ts`, `packages/core/src/authz/public.ts`, `packages/core/src/authz/scope.ts`, `packages/core/src/authz/services/authz-resolver.ts`, `packages/core/test/record-scope.test.ts`, `packages/shared/src/authz/permissions.ts`; integrate 042c before051.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before051.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `packages/actions/src/index.ts`, `packages/core/src/authz/authz.module.ts`, `packages/core/src/authz/public.ts`, `packages/core/src/authz/services/authz-resolver.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/api/settings.ts`, `tools/parity/parity.manifest.ts`; integrate 045b before051.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/shared/src/authz/custom-role-policy.ts`, `packages/shared/src/authz/permissions.ts`, `packages/shared/src/authz/roles.test.ts`; integrate 047b before051.
- **Parallel-safe with TIP-047c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/insights/exports/export-runner.ts`, `packages/shared/src/api/index.ts`; integrate 047c before051.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `apps/web/src/features/settings/screens/SettingsScreen.tsx`, `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 047d before051.
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 048 before051.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`; integrate 048b before051.
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 048c before051.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 048d before051.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 048e before051.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 048f before051.
- **Parallel-safe with TIP-048g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 048g before051.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 048h before051.
- **Parallel-safe with TIP-049 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 049 before051.
- **Parallel-safe with TIP-049d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 049d before051.
- **TIP-ID:** TIP-051 · **Project:** AppChat V2 · **Module:** Authz + Cài đặt (Phòng ban, Sơ đồ tổ chức) · **Priority:** P0 · **Estimated:** L (1 pha, 2 PR nếu cần: backend → UI)
- **Depends on:** TIP-050 và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 051b, 051c, 044, 045, 046.
- **Vì sao phụ thuộc:** đổi kiểu `DataScope` + `AuthzContext` dùng chung (`packages/shared/src/authz/*`), lớp scope (`scope.ts`, `scope-sql.ts`, `record-policy.ts`) mà mọi module đọc; làm sau các TIP đang sửa cùng file để không đè. 051b / 051c xây trên bảng đơn vị này.
- **Files touched:** [exact M/C manifest](manifests/TIP-051-files.md). Không sửa 9 bảng nghiệp vụ có `team_id` (giữ nguyên cột + index). `settings/types.ts` (387 — sát trần FE) không sửa; kiểu mới ở `settings/org-types.ts`.
- **Quyết định nguồn:** **D64** · **DC-924** · DC-921 (agent là nhân viên — có trong danh sách nhân viên, sơ đồ tổ chức) · DC-299 (scope `team` theo `team_id` bản ghi) · PD-909 · REQ-M04b · rbac-permissions §5.
- **Dòng COVERAGE nhận:** REQ-M04b (cây + scope + UI) · D64 · DC-924 · PD-909.

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2`. Web chỉ import `@appchat/{actions,shared,ui}`; ghi chỉ bằng `useAction(id).run(input)`.
- **Hiện trạng (rà `origin/dev` 2026-11-14; số dòng `~` kiểm lại ở Rà):**
  - **Bảng:** `packages/db/prisma/tenant/authz.prisma` — `Team` (~L25–35: id, name, version, `lead_user_id`, created_at) phẳng; `TeamMember` (~L37–44: PK `(team_id, user_id)`, chỉ người). Index `team_member_user_idx (user_id) INCLUDE (team_id)`, `team_list_idx (created_at, id) INCLUDE (...)`. Không FK nào trỏ vào `team` từ bảng nghiệp vụ.
  - **`team_id` chụp trên 9 bảng** (DC-299): `contact`, `conversation`, `quote`, `contract`, `order`, `invoice`, `appointment`, `ticket` (text), `lead_routing_rule`; mỗi bảng có index `*_team_*_idx` dẫn đầu bằng `team_id`.
  - **Scope:** `DataScope = 'own' | 'team' | 'all' | 'none'` (`shared/authz/permissions.ts` ~L27); `AuthzContext.teamIds` ~L41. Ba chỗ so `level === 'team'`: `core/src/authz/scope.ts` ~L30 / ~L43, `data-access/scope-sql.ts` ~L40, `data-access/record-policy.ts` ~L45. Danh sách giá trị scope lặp ở `shared/authz/custom-role-policy.ts` (`ROLE_SCOPES` ~L19, `SCOPE_RANK` ~L61), `actions/src/authz.ts` (`scopeValue` ~L12), `shared/api/settings.ts` (~L6), `core/src/authz/services/authz-resolver.ts` (`SCOPES` ~L25).
  - **Resolver:** `authz-resolver.ts` ~L92–110 tính `teamIds` (team_member của mình) + `teamUserIds` (đồng đội còn active).
  - **Chụp nhóm:** `data-access/team-snapshot.ts` — `soleTeamOf` (0 hoặc ≥ 2 nhóm → null), `snapshotTeam` (quote / order / contract create); `routing-apply.handler.ts` ~L82 dùng `soleTeamOf`.
  - **Action:** `actions/src/authz.ts` ~L79–117 `team.create / update / set_members` (config, `members.manage`, không `team.delete`). Handler `core/src/authz/actions/team.handlers.ts` (143), helper `services/team-members.ts` (61). Đọc `GET /v1/teams` (`authz.controller.ts` ~L43–47 → `roles.service.ts` `teams()` ~L80–97).
  - **Khoá cache có `teamIds`:** `inbox/services/nav-badges.ts` ~L104 · `crm/memory/summary.ts` ~L22–23 · `crm/merge/candidates.ts` ~L24 · `insights/exports/export-runner.ts` ~L65 · `support/categories/read.ts` ~L18 · `crm/services/contact-timeline-export.ts` ~L109. `ai/agents/agent-authz.ts` ~L24 chép `teamIds` của người ra lệnh.
  - **FE:** `settings/registry.ts` ~L2 ẩn "Sơ đồ tổ chức / Phòng ban (cây)"; mục `teams` ~L36 (nhãn "Nhóm"). `TeamsSection.tsx` (108, PD-018 nhóm phẳng, không lọc chi nhánh / khối, không xoá), `TeamEditor.tsx` (102), `SettingsScreen.tsx` (88: map ~L43, `WITH_SUB` ~L70), `RolePermissionMatrix.tsx` (58, đọc `ROLE_SCOPES`). Mock `shared/api/mock/domains/authz-management.ts` (224).
  - **Prototype (2026-11-10):** Sơ đồ tổ chức ~L8277–8283 (khung cuộn ngang + chú thích), `orgTree` ~L8844 (Tập đoàn → Công ty con → Chi nhánh → Phòng ban → Nhóm, mỗi nút có `lead`), `orgTypes` ~L9104 (nhãn + màu + icon từng cấp), `orgChildType` / `orgAdd` / `orgEdit` / `orgDel` / `orgSave` ~L9105–9115, `orgBox` ~L9116, `orgNode` (đường nối) ~L9808–9818, `orgStats` ~L11820, modal "Thêm đơn vị tổ chức / Sửa đơn vị" ~L8612 + ~L11822–11827, nav ~L11405 (`org_dept` "Sơ đồ tổ chức", `teams` "Phòng ban"). Phòng ban ~L7168–7215: tìm, chọn Chi nhánh / Khối, "Thẻ phòng ban" / "Danh sách nhân sự", thẻ (màu, tên, số thành viên, avatar, Thành viên / Cấu hình), danh sách nhân sự (tên · phòng ban · chi nhánh · khối · vai trò · trạng thái). Dữ liệu prototype ở localStorage, thành viên chỉ là người.
- **Key files to read first:** DC-924, DC-921, PD-909, D64 · rbac-permissions §5 · các file nêu trên · `apps/api/test/integration/actions/team.*.action.test.ts` (giữ xanh).
- **Patterns to follow:** CAS + `bumpTenantAuthzRevision` + event `member.role_changed` như `team.handlers.ts`; deferred join / index theo `standards/database/indexing.md`; FE `PageStates`, `EntityDrawer`, style qua `use*Styles` + token `@appchat/ui`.

## APPLICABLE STANDARDS
- [authz/rbac-permissions](../standards/authz/rbac-permissions.md) §5 — scope `dept` (D64).
- [database/tenant-db](../standards/database/tenant-db.md) · [database/indexing](../standards/database/indexing.md) — `text_pattern_ops` cho tiền tố `path`, EXPLAIN scope `dept`.
- [actions/action-registry](../standards/actions/action-registry.md) · [api/response-envelope](../standards/api/response-envelope.md) · [events/outbox](../standards/events/outbox.md).
- [domain/concurrency](../standards/domain/concurrency.md) — CAS `version`, khoá dòng khi chuyển cây.
- [ui/frontend-structure](../standards/ui/frontend-structure.md) · [ui/prototype-parity](../standards/ui/prototype-parity.md) (§6b mức 1 — PD-909) · [ui/interaction-patterns](../standards/ui/interaction-patterns.md) · [i18n/i18n](../standards/i18n/i18n.md).
- [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).

## Rà trước khi làm
1. Rebase `origin/dev` mới nhất (050 đã merge). `python -X utf8 tools/obligations/manifests.py 051`. Kiểm số dòng `~`; lệch → ghi "Rà lại <ngày>" trong report.
2. `git grep -n "'own', 'team'\|level === 'team'\|teamIds" -- packages apps` — mọi chỗ mới xuất hiện sau ngày rà phải vào manifest (báo PM nếu ngoài danh sách).
3. Kiểm migration tenant mới nhất trên dev; tên migration của TIP phải xếp sau (mặc định `20261116100000_org_units`).
4. Đọc lại `team.handlers.ts` / `team-members.ts` / test `team.*.action.test.ts`: `team.*` phải giữ nguyên hành vi (alias).
5. Chạy `pnpm parity settings:teams` **trước khi sửa**, lưu số làm mốc.

## TASK
Đổi Nhóm phẳng thành **cây đơn vị** (gốc = workspace → Chi nhánh → Phòng ban → Nhóm), thêm **AI agent làm thành viên** đơn vị, thêm **scope `dept`** (đơn vị mình + mọi đơn vị con) cho vai trò tuỳ biến, và làm hai mục Cài đặt theo prototype: **Sơ đồ tổ chức** + **Phòng ban** (thẻ / danh sách nhân sự gồm cả AI agent). Không đổi dữ liệu 9 bảng nghiệp vụ; `team.*` giữ làm alias.

## SPECIFICATIONS

### 1. Bảng (migration `20261116100000_org_units`)
- `team` thêm:
  - `parent_id uuid NULL REFERENCES team(id)`. Null = con trực tiếp của gốc (workspace).
  - `kind text NOT NULL DEFAULT 'team' CHECK (kind IN ('branch','dept','team'))`.
  - `path text NOT NULL` = `/<id tổ tiên>/…/<id>/`.
  - `sort int NOT NULL DEFAULT 0`.
  - `archived_at timestamptz NULL`.
- **Backfill:** nhóm cũ → `kind 'team'`, `parent_id NULL`, `path '/' || id || '/'`. Giữ nguyên id, tên, trưởng nhóm, thành viên.
- **Index mới:**
  - `team_path_idx ON team (path text_pattern_ops)`.
  - `team_children_idx ON team (parent_id, sort, id) WHERE archived_at IS NULL`.
- **Bảng mới** `team_agent (team_id uuid NOT NULL REFERENCES team(id), agent_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (team_id, agent_id))` + `team_agent_agent_idx (agent_id) INCLUDE (team_id)`.
  - Tách khỏi `team_member` để mọi truy vấn theo người (`where: { userId }`) giữ đúng.
  - Không FK sang `ai_agent` theo quy ước domain; đọc bỏ agent đã xoá (`deleted_at`).
- **Trưởng đơn vị:** dùng `team.lead_user_id` có sẵn; trưởng là người và phải là thành viên của chính đơn vị.
- **Prisma:** `authz.prisma` thêm field + model `TeamAgent`. Chạy đủ 3 lệnh ở CLAUDE.md §7.
- **Gốc không lưu thành dòng** (PD-909 bỏ cấp "Tập đoàn"). API trả gốc ảo: tên workspace, trưởng = Chủ sở hữu.

### 2. Luật cây (`core/src/authz/org/org-units.service.ts`)
- **Cấp con hợp lệ:**

  | Cha | Con được phép |
  |---|---|
  | gốc | `branch` · `dept` · `team` |
  | `branch` | `dept` · `team` |
  | `dept` | `dept` · `team` |
  | `team` | `team` |

  Sâu tối đa 6 cấp (đếm `/` trong `path`), vượt → 422 `depth_exceeded`.
- **Tên:** không trùng giữa các anh em chưa lưu trữ (so `foldName` như `assertTeamNameFree`), trùng → 409.
- **Chuyển (`move`):**
  - Khoá dòng đơn vị + cha mới (`FOR UPDATE`, thứ tự theo id) + CAS `version`.
  - Cha mới thuộc cây con của chính nó → 422 `cycle`.
  - Cập nhật `path` cả cây con một câu lệnh: `UPDATE team SET path = $new || substr(path, length($old) + 1) WHERE path LIKE $old || '%'`.
  - Bump `authz_revision` vì tập `dept` của người trong cây đổi.
- **Lưu trữ (`delete`):** chỉ khi:
  - không còn thành viên (người lẫn agent);
  - không còn con chưa lưu trữ;
  - không có `lead_routing_rule.team_id` trỏ tới.

  Vi phạm → 409 `unit_not_empty` kèm lý do. Bản ghi nghiệp vụ giữ `team_id`; vẫn nằm trong scope `dept` của tổ tiên vì `path` giữ nguyên.
- **Thành viên người** phải là membership active (dùng lại `assertActiveMembers`).
- **Thành viên agent:** agent tồn tại, chưa xoá. Agent ở được nhiều đơn vị.
- Mọi ghi tăng `version` đơn vị, bump `authz_revision` cùng transaction, phát `member.role_changed` cho người bị tác động. Thêm / bớt agent không phát gì.

### 3. Action (`packages/actions/src/org-units.ts`)
Tất cả `module: 'settings'`, quyền `members.manage`, `agentGrantable: false` (nhóm giữ `members.manage` — TIP-050 §3), `invalidates: ['org','teams','members','me']`.

| Action | Input | Risk | Undo |
|---|---|---|---|
| `org_unit.create` | `name`, `kind`, `parent_id?`, `lead_user_id?`, `user_ids?`, `agent_ids?` | config | — |
| `org_unit.update` | `unit_id`, `if_version`, `name?`, `lead_user_id?` (null bỏ) | config | 24h |
| `org_unit.move` | `unit_id`, `if_version`, `parent_id` (null = gốc), `sort?` | config | 24h |
| `org_unit.set_members` | `unit_id`, `if_version`, `user_ids`, `agent_ids` (thay nguyên khối) | config | 24h |
| `org_unit.delete` | `unit_id`, `if_version` (lưu trữ) | delete | 24h (bỏ lưu trữ) |

- `team.create / update / set_members` **giữ nguyên** input / output / test. Handler gọi chung service:
  - `team.create` = đơn vị `kind team` dưới gốc;
  - `team.set_members` chỉ thay người, không đụng `team_agent`.
- Ghi chú "alias — dùng `org_unit.*`" vào `description`.
- `scopeValue` (`actions/src/authz.ts` ~L12) thêm `'dept'`.
- Tiêu đề action vi + en ở `apps/web/messages/{vi,en}/actions.json`.

### 4. Scope `dept`
- **`shared/authz/permissions.ts`:**
  - `DataScope = 'own' | 'team' | 'dept' | 'all' | 'none'`.
  - `AuthzContext.deptTeamIds?: readonly string[]` = đơn vị của mình + mọi con cháu, gồm cả đơn vị đã lưu trữ.
- **`shared/authz/unit-scope.ts` (mới):** `scopeUnitIds(a, level)`:
  - `team` → `a.teamIds`;
  - `dept` → `a.deptTeamIds ?? a.teamIds`;
  - mức khác → `[]`.
- **Ba chỗ so scope** (`scope.ts`, `scope-sql.ts`, `record-policy.ts`): nhánh `team` thành `level === 'team' || level === 'dept'` với `scopeUnitIds`. Bảng chân trị khác giữ nguyên:
  - `dept` = own + `team_id ∈ deptTeamIds`;
  - `team_id` null → chỉ nhánh own.
- **Thứ tự scope:**
  - `ROLE_SCOPES = ['own','team','dept','all','none']`;
  - `SCOPE_RANK = { none 0, own 1, team 2, dept 3, all 4 }`.

  `scopeEscalationOf` tự đúng: người gán `team` không cấp được `dept`.
- **Danh sách giá trị scope** thêm `'dept'` ở: `shared/api/settings.ts` ~L6, `authz-resolver.ts` `SCOPES` ~L25.
- **Resolver** (`authz-resolver.ts` ~L99–110):
  - Sau `teamIds`, đọc `deptTeamIds` bằng một câu: `SELECT d.id FROM team d JOIN team m ON d.path LIKE m.path || '%' WHERE m.id = ANY($teamIds)`. Bảng đơn vị nhỏ, ghi EXPLAIN.
  - Lưu `deptTeamIds` vào cache. Owner trả `deptTeamIds` như người thường (scope all không dùng).
- **`agent-authz.ts` ~L24:** chép `deptTeamIds` của người ra lệnh. Agent trực kênh giữ scope `all` trong hội thoại đang phục vụ.
- **Khoá cache:** 6 file ở CONTEXT thêm `deptTeamIds` (đã sort) cạnh `teamIds`. `summary.ts` ~L22 `narrow` tính cả `'dept'`.
- **`team-snapshot.ts`:** `soleTeamOf` → "đơn vị lá sâu nhất duy nhất":
  - đọc ≤ 10 đơn vị chưa lưu trữ của người kèm `path`;
  - chọn đơn vị có `path` dài nhất **mà mọi đơn vị còn lại là tiền tố của nó** (cùng một nhánh);
  - khác nhánh → null như cũ. Người chỉ ở 1 đơn vị → đơn vị đó (không đổi hành vi cũ).
- **Vai trò hệ thống không đổi** (Quản lý `all`, Sales `own`…). `dept` dùng cho vai trò tuỳ biến và vai trò mẫu (051b).

### 5. Đọc
- `GET /v1/org-units` (`authz.controller.ts`, đọc ở `org/org-tree.read.ts`, quyền `members.manage` như `/v1/teams`) → `{ data: { root: { name, owner_user_id }, units: OrgUnitDto[] } }`:
  - `OrgUnitDto = { id, parent_id, kind, name, lead_user_id, user_ids, agent_ids, sort, version }`;
  - chỉ đơn vị chưa lưu trữ, sắp `(parent_id, sort, id)`;
  - `user_ids` chỉ membership active; `agent_ids` chỉ agent chưa xoá.
- DTO ở `shared/api/org-units.ts`, export ở `shared/api/index.ts`.
- `GET /v1/teams` giữ shape, thêm `kind` + `parent_id` (optional) và bỏ đơn vị đã lưu trữ — picker cũ (chia lead, lọc ticket) chạy như trước, thấy cả đơn vị cây.

### 6. UI (PD-909, mức 1 — nội dung thật, bố cục prototype)
- **`registry.ts`:**
  - bỏ "Sơ đồ tổ chức / Phòng ban" khỏi chú thích ẩn ~L2;
  - thêm mục `org_dept` (icon `ic-grid`, `perm: 'members.manage'`) trước `teams`;
  - nhãn `teams` thành "Phòng ban";
  - `SectionKey` thêm `'org_dept'`.
- **`SettingsScreen.tsx`:** map `org_dept: OrgChartSection`.
- **Sơ đồ tổ chức** (`OrgChartSection.tsx` + `OrgChartNode.tsx` + `useOrgTree.ts`):
  - hàng thống kê theo `orgStats`: Công ty · Chi nhánh · Phòng ban · Nhóm · AI agent;
  - khung cuộn ngang, cây nút + đường nối như `orgNode` ~L9808. Gốc = workspace (nhãn "Công ty", màu / icon cấp `company` của `orgTypes`);
  - mỗi ô: màu + icon cấp, tên, nhãn cấp, avatar + tên trưởng, "N người · M AI";
  - hover hiện Thêm / Sửa / Xoá (gốc chỉ Thêm);
  - chú thích dưới khung như prototype ~L8282.
- **`OrgUnitModal.tsx`** (Thêm đơn vị tổ chức / Sửa đơn vị):
  - các trường: tên, cấp, trưởng, đơn vị cha (đổi cha = `org_unit.move`);
  - cấp mặc định theo `orgChildType` (gốc → Phòng ban); chọn được trong các cấp hợp lệ của §2;
  - Xoá = `org_unit.delete` qua `ConfirmActionHost`, lỗi 409 hiện lý do.
- **Phòng ban** (`TeamsSection.tsx` sửa, thêm `TeamsToolbar.tsx`, `StaffList.tsx`):
  - toolbar: tìm, chọn Chi nhánh, chọn Phòng ban (thay "Khối"), "Thẻ phòng ban" / "Danh sách nhân sự", nút tạo;
  - thẻ: hiện cấp + đường dẫn cha;
  - **Danh sách nhân sự** gồm **người và AI agent** (DC-921) với cột tên · đơn vị · chi nhánh · phòng ban · vai trò (agent: nhãn "AI agent") · trạng thái (agent: Đang chạy / Tạm dừng). Có `Pager` theo D42.
- **`TeamEditor.tsx`:** thêm chọn AI agent (danh sách từ `agentsQuery`) và đơn vị cha. Lưu bằng `org_unit.set_members` / `org_unit.update` / `org_unit.move`.
- **`RolePermissionMatrix.tsx`:** không sửa code (đọc `ROLE_SCOPES`); thêm nhãn i18n `dept` "Phòng ban (gồm đơn vị con)".
- **Mock + i18n + parity:**
  - mock domain `org-units.ts` + đăng ký ở `handlers.ts`;
  - i18n `settings.json` vi + en;
  - `parity.manifest.ts`: thêm `settings:org_dept`; bỏ mask PD-018 của `settings:teams` cho lọc chi nhánh / khối và chế độ xem; giữ mask dữ liệu.

### 7. EXPLAIN (ghi vào report)
- Danh sách khách và hội thoại với vai trò scope `dept` 3 đơn vị → Index / Bitmap scan trên `contact_team_recent_idx` / `conversation_team_recent_idx` với `team_id = ANY(...)`.
- Câu `deptTeamIds` của resolver.

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given tenant có nhóm phẳng cũ, when chạy migration, then mỗi nhóm thành đơn vị `team` dưới gốc, `path = /id/`, id / tên / trưởng / thành viên giữ; `team.*` cũ chạy y nguyên | `packages/db/test/org-units-migration.test.ts` + `team.*.action.test.ts` xanh |
| 2 | Given Phòng Kinh doanh có Nhóm 1, Nhóm 2, when `org_unit.move` Phòng Kinh doanh vào Nhóm 1, then 422 `cycle`; move hợp lệ cập nhật `path` cả cây con trong một transaction, CAS lệch → 409 | `org_unit.move.action.test.ts` |
| 3 | Given vai trò tuỳ biến scope crm `dept`, người là thành viên Phòng Kinh doanh, when xem danh sách khách, then thấy khách `team_id` = Phòng Kinh doanh, Nhóm 1, Nhóm 2 + khách mình phụ trách; không thấy khách Phòng CSKH; mở trực tiếp → 404 | `apps/api/test/integration/org-dept-scope.test.ts` |
| 4 | Given người ở Phòng Kinh doanh và Nhóm 1 (cùng nhánh), when tạo báo giá, then `team_id` = Nhóm 1; người ở Nhóm 1 và Phòng CSKH → null | `packages/core/test/org-units.test.ts` |
| 5 | Given `org_unit.set_members` có `agent_ids`, when đọc `GET /v1/org-units`, then đơn vị có agent; agent bị xoá không còn hiện; `team.set_members` không gỡ agent | `org_unit.set_members.action.test.ts` |
| 6 | Given đơn vị còn thành viên / con / rule chia lead, when `org_unit.delete`, then 409 `unit_not_empty`; đơn vị rỗng → lưu trữ, bản ghi cũ vẫn trong scope `dept` của phòng cha, hoàn tác trong 24h | `org_unit.delete.action.test.ts` |
| 7 | Given người gán có scope `team`, when tạo vai trò tuỳ biến scope `dept`, then 403 vượt quyền như cũ | `packages/shared/src/authz/roles.test.ts` + `role.create.action.test.ts` (chạy lại) |
| 8 | Given Cài đặt › Sơ đồ tổ chức, when thêm / sửa / chuyển / xoá đơn vị, then cây vẽ lại đúng prototype; ô hiện trưởng + "N người · M AI" | `apps/web/e2e/settings-org.spec.ts` (mock) + `e2e/http/settings-org.spec.ts` |
| 9 | Given Phòng ban › Danh sách nhân sự, when có agent trong đơn vị, then agent hiện cùng người, nhãn "AI agent"; lọc Chi nhánh / Phòng ban đúng | e2e như AC8 |
| 10 | Given màn `settings:org_dept`, `settings:teams` | `pnpm parity settings:org_dept settings:teams` < 5% (mask chỉ dữ liệu) |
| 11 | Given EXPLAIN §7 | report có kế hoạch Index / Bitmap scan |

### Commands / evidence gate
- Sau migration: `pnpm --filter @appchat/db run db:generate` → `db:migrate-tenants` → `db:setup`; kiểm `appchat_tenant_template` có `20261116100000_org_units`.
- `pnpm turbo run lint typecheck test --filter=@appchat/{shared,actions,core,db,api,web}` · `pnpm depcheck`.
- Integration (`--workers=1`, slot Postgres): `org_unit.*.action.test.ts`, `team.*.action.test.ts`, `role.*.action.test.ts`, `org-dept-scope.test.ts`, `authz-management.contract.test.ts`, `record-scope-realtime.test.ts`.
- `pnpm parity settings:org_dept settings:teams` · `pnpm e2e settings-org` (mock + http). Sửa lớp scope dùng chung → chạy thêm `pnpm parity --done`.

## CONSTRAINTS
- **DO NOT:**
  - đổi cột / index / dữ liệu `team_id` của 9 bảng nghiệp vụ;
  - đổi scope 5 vai trò hệ thống;
  - xoá cứng đơn vị;
  - cho trưởng đơn vị quyền thêm (trưởng chỉ là nhãn + người nhận mặc định);
  - đổi nghĩa scope `team`;
  - nhồi thêm vào `settings/types.ts` (387) hay `ManageChannelDrawer.tsx`;
  - thêm thư viện vẽ cây.
- **REUSE:**
  - `team-members.ts` (`assertActiveMembers`, `assertLead`, `lockTeam`), `bumpTenantAuthzRevision`, `foldName`, `agentsQuery` (`@/features/agents/api`);
  - `EntityDrawer`, `PageStates`, `ListPager`, `ConfirmActionHost`.
- **SKIP:**
  - kênh theo phòng ban, vai trò mẫu (051b);
  - loại liên hệ (051c);
  - KPI / phân ca (P3);
  - dòng agent ở mục Thành viên, ô Phòng ban ở form thành viên, đơn vị cho bản ghi agent tạo, lọc Phòng ban ở Lịch hẹn → TIP-051d (DC-927).

## Quality Gate
- [x] Dựa trên code `origin/dev` 2026-11-14 (đường dẫn + dòng `~` ở CONTEXT); người thi công kiểm lại ở Rà #1–2.
- [x] Không đổi luật commerce / 5 vai trò; scope mới chỉ mở rộng, `team` giữ nghĩa (DC-299).
- [x] Bảng chân trị scope một nguồn (`scopeUnitIds`) cho Prisma / SQL / bản ghi đơn.
- **Gap:**
  - Gốc không lưu thành dòng nên "Tập đoàn nhiều công ty" không làm (PD-909).
  - Bản ghi agent tự tạo mang đơn vị của agent → TIP-051d.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Đúng manifest; không thêm file ngoài danh sách.
- [ ] Đủ 3 lệnh DB (generate → migrate-tenants → setup) và kiểm template.
- [ ] AC 1–11 có kết quả từng cái, dán output thật + EXPLAIN.
- [ ] **Action-first:** ghi chỉ qua `org_unit.*` / `team.*` và ActionExecutor; FE chỉ `useAction`.
- [ ] **Tenant + scope:** mọi list / get vẫn áp `scopeFilter` / `recordScopeSql`; `dept` qua `scopeUnitIds` ở cả 3 chỗ.
- [ ] **UI:** token `@appchat/ui`, không màu / px cứng; i18n vi + en; parity < 5%.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA; PR vào `dev`.

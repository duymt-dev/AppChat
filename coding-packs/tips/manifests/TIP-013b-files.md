# TIP-013b — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `apps/web/src/features/settings/components/GeneralSection.tsx` | Chuyển/mua/logo thật |
| M | `apps/web/src/features/settings/components/MembersSection.tsx` | Lọc/xuất |
| M | `apps/web/src/features/settings/components/MemberModal.tsx` | Mời bằng SĐT |
| M | `apps/web/src/features/settings/components/SettingsShell.tsx` | Hướng dẫn |
| M | `apps/web/src/features/settings/components/TagsSection.tsx` | Tìm hiểu thêm |
| M | `apps/web/src/features/settings/registry.ts` | Số đếm từ API + mục Tài khoản nhận tiền |
| C | `apps/web/src/features/settings/components/PaymentAccountSection.tsx` | Tài khoản nhận tiền |
| C | `apps/web/src/features/settings/hooks/useNavCounts.ts` | Số đếm |
| C | `apps/web/src/features/settings/components/LogoUpload.tsx` | Upload logo |
| M | `apps/web/src/features/settings/api.ts` | Queries |
| M | `apps/web/src/shared/api/mock/domains/settings-apps.ts` | Mock |
| M | `packages/actions/src/settings.ts` | invite phone, workspace logo |
| M | `packages/core/src/identity/actions/member-invite.handler.ts` | Mời SĐT |
| M | `packages/db/prisma/platform/identity.prisma` | workspace.logo_file_id; invite.phone, email nullable |
| C | `packages/db/prisma/platform/migrations/20261102006250_settings_workspace/migration.sql` | logo_file_id; invite.phone + CHECK (email IS NOT NULL OR phone IS NOT NULL); unique partial (workspace_id, lower(email)) / (workspace_id, phone) WHERE status = pending |
| M | `packages/core/src/identity/actions/workspace-update.handler.ts` | Logo |
| M | `apps/api/src/http/identity/settings.controller.ts` | members filter, nav-counts |
| C | `packages/core/src/identity/services/nav-counts.ts` | COUNT theo quyền |
| M | `apps/web/messages/vi/settings.json` | Chuỗi |
| M | `apps/web/messages/en/settings.json` | Strings |
| M | `tools/parity/parity.manifest.ts` | settings:payments |
| C | `apps/api/test/integration/settings-workspace.test.ts` | Integration |
| C | `apps/web/e2e/settings-members.spec.ts` | E2E |

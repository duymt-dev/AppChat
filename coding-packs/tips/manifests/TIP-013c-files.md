# TIP-013c — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/db/prisma/tenant/crm.prisma` | member_availability, member_absence |
| C | `packages/db/prisma/tenant/migrations/20261102006300_member_availability/migration.sql` | Bảng + index (user_id, from, to) |
| C | `packages/core/src/identity/availability/availability.service.ts` | isAvailable(user, at) |
| C | `packages/core/src/identity/availability/availability.handlers.ts` | Actions |
| M | `packages/core/src/identity/identity.module.ts` | Đăng ký |
| M | `packages/core/src/identity/public.ts` | Facade isAvailable |
| M | `packages/core/src/inbox/services/pipeline.ts` | Kiểm availability |
| M | `packages/actions/src/settings.ts` | availability.* |
| C | `apps/web/src/features/settings/components/AvailabilityEditor.tsx` | Lịch ca + vắng |
| M | `apps/web/src/features/settings/components/ProfileSection.tsx` | Mount editor |
| M | `apps/web/src/features/settings/components/MembersSection.tsx` | Ca thành viên |
| M | `apps/web/messages/vi/settings.json` | Chuỗi |
| M | `apps/web/messages/en/settings.json` | Strings |
| M | `apps/web/messages/vi/actions.json` | availability |
| M | `apps/web/messages/en/actions.json` | availability |
| C | `packages/core/test/availability.test.ts` | Unit |
| C | `apps/api/test/integration/owner-availability.test.ts` | Integration |
| C | `apps/web/e2e/settings-availability.spec.ts` | E2E |
| C | `packages/core/src/inbox/events/member-removed.consumer.ts` | Hội thoại → hàng chung |
| M | `packages/core/src/inbox/inbox.module.ts` | Đăng ký consumer |
| C | `packages/core/src/crm/events/member-removed.consumer.ts` | Thông báo + bộ lọc owner_removed |
| M | `packages/core/src/crm/crm.module.ts` | Đăng ký consumer |
| M | `packages/core/src/crm/services/crm-read.service.ts` | Bộ lọc owner_removed |

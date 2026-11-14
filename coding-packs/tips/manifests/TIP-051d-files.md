# TIP-051d — exact file manifest

M = sửa, C = tạo mới. Không wildcard thư mục; test liệt kê từng file. `settings/types.ts` không sửa. Handler tạo bản ghi chỉ thêm 1 tham số `agent`.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/db/prisma/platform/identity.prisma` | `Invite.unitIds` (uuid[]) |
| C | `packages/db/prisma/platform/migrations/20261116120000_invite_units/migration.sql` | Cột `invite.unit_ids uuid[] NOT NULL DEFAULT '{}'` |
| M | `packages/shared/src/api/settings.ts` | `settingsMemberSchema.kind` / `agent_status`; `membersPageSchema.people_total` / `agent_total` / `agent_limit` |
| C | `packages/actions/src/member-units.ts` | `member.set_units` (config, `members.manage`, undo 24h) |
| M | `packages/actions/src/settings.ts` | `member.invite` thêm `unit_ids?` |
| M | `packages/actions/src/index.ts` | Đăng ký `member-units` |
| M | `apps/web/messages/vi/actions.json` | Tiêu đề `member.set_units` |
| M | `apps/web/messages/en/actions.json` | Tiêu đề `member.set_units` |
| C | `packages/core/src/authz/org/member-units.handler.ts` | Thay tập đơn vị của người / agent, khoá theo id, version + revision, trưởng đơn vị 422 |
| M | `packages/core/src/authz/authz-management.providers.ts` | Đăng ký handler `member.set_units` |
| M | `packages/core/src/identity/actions/member-invite.handler.ts` | Lưu `unit_ids` lời mời (kiểm đơn vị sống) |
| M | `packages/core/src/identity/services/invites.service.ts` | `accept()` gắn `team_member` các đơn vị sống sau commit nền tảng; audit `invite.units_skipped` |
| M | `packages/core/src/identity/settings/settings-read.service.ts` | `members(include_agents)`: dòng agent (đơn vị qua `team_agent`, hoạt động cuối theo lô), tổng + `agent_limit` |
| M | `apps/api/src/http/identity/settings.controller.ts` | Query `include_agents` |
| M | `packages/core/src/authz/data-access/team-snapshot.ts` | `actorAgentId`; `soleTeamOf` / `snapshotTeam` fallback đơn vị của agent |
| M | `packages/core/src/crm/services/contacts.service.ts` | `createContact` truyền agent |
| M | `packages/core/src/sales/quotes/actions/quote-write.handlers.ts` | `snapshotTeam` truyền agent |
| M | `packages/core/src/sales/orders/actions/order-create.handlers.ts` | `snapshotTeam` truyền agent |
| M | `packages/core/src/contracts/actions/contract-create.ts` | `snapshotTeam` truyền agent |
| M | `packages/core/src/booking/actions/appointment-book.handlers.ts` | `soleTeamOf` truyền agent |
| M | `packages/core/src/booking/services/calendar-read.service.ts` | Lọc `unit_id` theo `team.path` (đơn vị + con) |
| M | `apps/api/src/http/booking/calendar.controller.ts` | Query `unit_id` |
| M | `packages/core/src/support/services/tickets-read.service.ts` | `teams()` bỏ đơn vị đã lưu trữ |
| C | `packages/core/test/agent-unit-snapshot.test.ts` | AC5 |
| M | `apps/api/test/integration/settings.test.ts` | AC1 |
| M | `apps/api/test/integration/actions/member.invite.action.test.ts` | AC2, AC4 |
| C | `apps/api/test/integration/actions/member.set_units.action.test.ts` | AC3 |
| C | `apps/web/src/features/settings/member-types.ts` | `MemberRow` (kind, agent_status) |
| M | `apps/web/src/features/settings/api.ts` | `membersQuery(q, { includeAgents })` |
| M | `apps/web/src/features/settings/components/MembersSection.tsx` | Dòng agent, Lọc Tất cả / Người / AI Agent, chân hai hạn mức |
| C | `apps/web/src/features/settings/components/MemberAgentRow.tsx` | Dòng agent + menu Đổi phòng ban / Mở cấu hình |
| M | `apps/web/src/features/settings/components/MemberModal.tsx` | Ô Phòng ban (chọn nhiều); chế độ agent chỉ đổi phòng ban |
| M | `apps/web/src/features/settings/components/OwnershipTransferModal.tsx` | Bỏ agent khỏi ứng viên |
| M | `apps/web/src/features/settings/styles/members.styles.ts` | Nhãn AI, chip AI Agent, chân bảng |
| C | `apps/web/src/shared/org/units-query.ts` | `unitsQuery` dùng chung (đọc `/teams`) |
| M | `apps/web/src/features/calendar/components/CalendarHeader.tsx` | Lựa chọn Phòng ban từ `unitsQuery` |
| M | `apps/web/src/features/calendar/calendar-store.ts` | `filter.unit_id` |
| M | `apps/web/src/features/calendar/api.ts` | Tham số `unit_id` |
| M | `apps/web/src/features/calendar/types.ts` | Kiểu filter `unit_id` |
| M | `apps/web/src/shared/api/mock/domains/settings.ts` | `/settings/members?include_agents`, `member.set_units` |
| M | `apps/web/src/shared/api/mock/domains/calendar.ts` | Lọc `unit_id` |
| M | `apps/web/src/shared/api/mock/settings-shape.test.ts` | Shape dòng agent |
| M | `apps/web/messages/vi/settings.json` | Chuỗi Thành viên (AI Agent, lọc, chân, phòng ban) |
| M | `apps/web/messages/en/settings.json` | Như trên (en) |
| M | `apps/web/messages/vi/calendar.json` | Nhãn lọc Phòng ban |
| M | `apps/web/messages/en/calendar.json` | Như trên (en) |
| M | `apps/web/e2e/settings.spec.ts` | AC7 (mock) |
| M | `apps/web/e2e/http/settings.spec.ts` | AC7 (http) |
| M | `apps/web/e2e/calendar.spec.ts` | AC6 (mock) |
| M | `apps/web/e2e/http/calendar.spec.ts` | AC6 (http) |
| M | `tools/parity/parity.manifest.ts` | Mask PD-911 ở `settings:members` |

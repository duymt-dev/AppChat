# TIP-051b — exact file manifest

M = sửa, C = tạo mới. Không wildcard thư mục; test liệt kê từng file. File sát trần (`ManageChannelDrawer.tsx` 377, `actions/src/settings-apps.ts` 408) chỉ thêm 1–2 dòng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/core/src/channels/services/accounts.service.ts` | `AccountSettings.unit_id` + mặc định null |
| M | `packages/actions/src/settings-apps.ts` | `channel.update_settings` `patch.unit_id` (1 dòng schema) |
| M | `packages/core/src/channels/actions/channel-manage.handlers.ts` | Kiểm đơn vị + quyền `members.manage` / `crm.reassign`; agent của tài khoản vào `team_agent` |
| M | `packages/core/src/channels/services/read.service.ts` | Trả `unit_id` + `unit_name` (đọc theo lô) |
| M | `packages/shared/src/api/channels.ts` | `channelAccountSchema` thêm `unit_id` / `unit_name` |
| M | `packages/core/src/inbox/services/pipeline.ts` | Hội thoại mới `team_id` = đơn vị khách ?? `unit_id` tài khoản (cả nhóm Zalo); truyền `unitId` cho identity |
| M | `packages/core/src/crm/services/identity.service.ts` | `InboundIdentity.unitId?` → `contact.team_id` khi tạo khách mới |
| M | `packages/core/src/crm/routing/routing-apply.handler.ts` | `team` = rule ?? đơn vị tài khoản ?? `soleTeamOf` |
| M | `packages/core/src/crm/routing/routing.repo.ts` | `poolUsers`: rule mặc định không pool riêng + tài khoản có `unit_id` → thành viên phòng + con |
| M | `packages/core/src/inbox/services/assignee-candidates.ts` | Lọc ứng viên theo đơn vị hội thoại (người + agent), ngoài phòng xếp sau cho Owner / scope all |
| C | `packages/shared/src/authz/role-templates.ts` | `ROLE_TEMPLATES` hr · marketing · ops · viewer |
| C | `packages/shared/src/authz/role-templates.test.ts` | Mỗi mẫu qua `checkRoleDraft`, không quyền Owner / quản trị (AC6) |
| M | `packages/shared/src/authz/index.ts` | Export `role-templates` |
| M | `apps/web/src/features/settings/hooks/useRoleEditor.ts` | `templateDraft(t)` |
| C | `apps/web/src/features/settings/components/RoleTemplatePicker.tsx` | Hộp chọn 4 mẫu |
| M | `apps/web/src/features/settings/components/RolesSection.tsx` | Nút "Tạo từ mẫu" |
| C | `apps/web/src/features/settings/components/ChannelUnitField.tsx` | Ô "Phòng ban nhận (hội thoại)" — đọc `orgTreeQuery`, ghi `channel.update_settings` |
| M | `apps/web/src/features/settings/components/ConnectChannelModal.tsx` | 1 dòng `<ChannelUnitField/>` trước khối chia |
| M | `apps/web/src/features/settings/components/ManageChannelDrawer.tsx` | 1 dòng `<ChannelUnitField/>` trước khối chia |
| M | `apps/web/src/features/settings/components/ChannelCard.tsx` | Chip tên phòng ban |
| M | `apps/web/src/features/settings/channel-types.ts` | Kiểu `unit_id` / `unit_name` |
| M | `apps/web/src/shared/api/mock/domains/settings-apps.ts` | Mock nhận / trả `unit_id` |
| M | `apps/web/messages/vi/settings.json` | Chuỗi phòng ban nhận + vai trò mẫu |
| M | `apps/web/messages/en/settings.json` | Như trên (en) |
| C | `apps/api/test/integration/channel-unit-routing.test.ts` | AC1–2 |
| C | `apps/api/test/integration/inbox-assignees-unit.test.ts` | AC5 |
| M | `apps/api/test/integration/actions/channel.update_settings.action.test.ts` | AC4 |
| M | `apps/api/test/integration/actions/lead_routing.apply.action.test.ts` | AC3 |
| M | `packages/core/test/lead-routing.test.ts` | Pool theo phòng (unit) |
| M | `apps/web/e2e/settings-roles.spec.ts` | AC6 (mock) |
| M | `apps/web/e2e/http/channels.spec.ts` | AC7 |

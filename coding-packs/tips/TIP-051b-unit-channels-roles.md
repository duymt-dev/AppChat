# TIP-051b — Kênh theo phòng ban nhận, chia hội thoại trong phòng, agent vào phòng, vai trò mẫu Nhân sự / Marketing / Vận hành / Chỉ xem (D64)

## HEADER
- **Parallel-safe with TIP-051d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 051b before051d.
- **Parallel-safe with TIP-051 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/shared/src/authz/index.ts`; integrate 051 before051b.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/channel-types.ts`, `apps/web/src/features/settings/components/ConnectChannelModal.tsx`, `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `packages/actions/src/settings-apps.ts`, `packages/core/src/channels/actions/channel-manage.handlers.ts`, `packages/core/src/channels/services/accounts.service.ts`, `packages/core/src/crm/routing/routing.repo.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/core/test/lead-routing.test.ts`, `packages/shared/src/api/channels.ts`; integrate 042b before051b.
- **Parallel-safe with TIP-051c (coverage-closure manifest):** sequential, shares `apps/api/test/integration/actions/lead_routing.apply.action.test.ts`, `packages/core/src/crm/routing/routing-apply.handler.ts`; integrate 051b before051c.
- **Parallel-safe with TIP-001b (coverage-closure manifest):** sequential, shares `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`; integrate 001b before051b.
- **Parallel-safe with TIP-003b (coverage-closure manifest):** sequential, shares `packages/core/src/inbox/services/pipeline.ts`; integrate 003b before051b.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`; integrate 004b before051b.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 006d before051b.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/settings-apps.ts`; integrate 012b before051b.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`; integrate 012c before051b.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`; integrate 013b before051b.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/core/src/inbox/services/pipeline.ts`; integrate 013c before051b.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`, `packages/actions/src/settings-apps.ts`, `packages/core/src/channels/actions/channel-manage.handlers.ts`, `packages/core/src/channels/services/read.service.ts`, `packages/core/src/crm/services/identity.service.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/shared/src/api/channels.ts`; integrate 014b before051b.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/ChannelCard.tsx`, `apps/web/src/features/settings/components/ConnectChannelModal.tsx`, `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`, `packages/core/src/channels/services/accounts.service.ts`; integrate 014c before051b.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `packages/core/src/crm/services/identity.service.ts`, `packages/core/src/inbox/services/pipeline.ts`; integrate 015c before051b.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `packages/core/src/inbox/services/pipeline.ts`; integrate 015d before051b.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `packages/core/src/crm/services/identity.service.ts`, `packages/core/src/inbox/services/pipeline.ts`; integrate 015e before051b.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `packages/core/src/crm/services/identity.service.ts`, `packages/core/src/inbox/services/pipeline.ts`; integrate 015f before051b.
- **Parallel-safe with TIP-017b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/settings-apps.ts`; integrate 017b before051b.
- **Parallel-safe with TIP-018b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 018b before051b.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020b before051b.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020d before051b.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020e before051b.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/channel-types.ts`, `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `packages/actions/src/settings-apps.ts`, `packages/core/src/channels/actions/channel-manage.handlers.ts`, `packages/core/src/channels/services/accounts.service.ts`, `packages/core/src/channels/services/read.service.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/shared/src/api/channels.ts`; integrate 022b before051b.
- **Parallel-safe with TIP-022d (coverage-closure manifest):** sequential, shares `packages/core/src/channels/services/accounts.service.ts`; integrate 022d before051b.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `apps/api/test/integration/actions/channel.update_settings.action.test.ts`, `packages/core/src/channels/actions/channel-manage.handlers.ts`, `packages/core/src/channels/services/read.service.ts`; integrate 023b before051b.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `packages/actions/src/settings-apps.ts`, `packages/core/src/channels/services/read.service.ts`, `packages/shared/src/api/channels.ts`; integrate 023c before051b.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/settings-apps.ts`; integrate 026b before051b.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 030b before051b.
- **Parallel-safe with TIP-031c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 031c before051b.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 032b before051b.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/settings-apps.ts`; integrate 033b before051b.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 034b before051b.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/channel-types.ts`, `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`, `packages/actions/src/settings-apps.ts`, `packages/core/src/channels/services/accounts.service.ts`, `packages/shared/src/api/channels.ts`; integrate 037 before051b.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 039 before051b.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before051b.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/e2e/settings-roles.spec.ts`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/RolesSection.tsx`, `apps/web/src/features/settings/hooks/useRoleEditor.ts`; integrate 042 before051b.
- **Parallel-safe with TIP-042c (coverage-closure manifest):** sequential, shares `packages/core/src/crm/services/identity.service.ts`, `packages/core/src/inbox/services/pipeline.ts`; integrate 042c before051b.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 043 before051b.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 045b before051b.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 047b before051b.
- **Parallel-safe with TIP-047c (coverage-closure manifest):** sequential, shares `packages/actions/src/settings-apps.ts`; integrate 047c before051b.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 047d before051b.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `packages/core/src/channels/services/accounts.service.ts`, `packages/core/src/channels/services/read.service.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/shared/src/api/channels.ts`; integrate 048b before051b.
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/channel-types.ts`, `apps/web/src/features/settings/components/ChannelCard.tsx`, `apps/web/src/features/settings/components/ConnectChannelModal.tsx`, `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`; integrate 048c before051b.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `apps/web/e2e/http/channels.spec.ts`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 048d before051b.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `apps/web/e2e/http/channels.spec.ts`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 048e before051b.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `packages/core/src/inbox/services/pipeline.ts`; integrate 048f before051b.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `apps/web/e2e/http/channels.spec.ts`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 048h before051b.
- **Parallel-safe with TIP-049d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`; integrate 049d before051b.
- **TIP-ID:** TIP-051b · **Project:** AppChat V2 · **Module:** Kênh + Chia lead + Vai trò · **Priority:** P0 · **Estimated:** M (1 pha)
- **Depends on:** TIP-051 (bảng đơn vị, `team_agent`, scope `dept`, `GET /v1/org-units`) và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 051c, 044, 045, 046.
- **Vì sao phụ thuộc:** `unit_id` trỏ đơn vị của 051; vai trò mẫu dùng scope `dept` của 051. Sửa `pipeline.ts`, `accounts.service.ts`, `ManageChannelDrawer.tsx`, `ConnectChannelModal.tsx`, `settings-apps.ts` mà nhiều TIP kênh (048*) cũng sửa → tích hợp sau.
- **Files touched:** [exact M/C manifest](manifests/TIP-051b-files.md). `ManageChannelDrawer.tsx` (377 — sát trần FE 400) chỉ thêm 1 dòng gọi component mới; `settings-apps.ts` (408) chỉ thêm 1 trường schema.
- **Quyết định nguồn:** **D64** (#4, #5) · **DC-925** · DC-921 (agent là nhân viên) · DC-238 / TIP-042b (chia lead) · DC-299 (team_id hội thoại) · prototype "Phòng ban nhận hội thoại" ~L852 / "Phòng ban nhận" ~L932 · mẫu agent "Tuyển dụng & HR" (`catalog.ts` tpl_17).
- **Dòng COVERAGE nhận:** REQ-M04b (kênh + vai trò mẫu) · DC-925.

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2`.
- **Hiện trạng (rà `origin/dev` 2026-11-14; số dòng `~` kiểm lại ở Rà):**
  - **Cài đặt tài khoản kênh:** `channels/services/accounts.service.ts` (121) — `AccountSettings` ~L13–35, `defaultSettings()` ~L44–56, `settingsOf` ~L59. Không có ô phòng ban.
  - **Action:** `channel.update_settings` khai ở `packages/actions/src/settings-apps.ts` ~L161–196; handler ở `channels/actions/channel-manage.handlers.ts` ~L35–64, merge `patch` vào settings. DTO đọc `shared/api/channels.ts` ~L15–50; `channels/services/read.service.ts` ~L118–132.
  - **Tạo hội thoại:** `inbox/services/pipeline.ts` ~L145–170, `teamId: m.isGroup ? null : (contact?.teamId ?? null)` ~L158. Khách mới tạo bởi `crm/services/identity.service.ts` `resolve()` ~L34–60, không có `team_id`. Event `lead.routing_requested` ~L189–192 mang `channel_account_id`.
  - **Chia lead:** `crm/routing/routing-apply.handler.ts` (100):
    - `ruleFor(tx, channel_account_id)` ~L49;
    - pool `poolUsers` ~L75 (`routing.repo.ts` ~L108–112: `userIds` hoặc thành viên `team_id` của rule);
    - `team = rule.teamId ?? soleTeamOf(user)` ~L82.
    - Rule `lead_routing_rule` có `team_id` (pool theo nhóm).
  - **Ứng viên phụ trách** (gán tay): `inbox/services/assignee-candidates.ts` (46), gồm người active + agent đang chạy.
  - **FE kênh:**
    - `ChannelRoutingFields.tsx` (38) dùng ở wizard `ConnectChannelModal.tsx` ~L215 và drawer `ManageChannelDrawer.tsx` ~L278.
    - Prototype có ô "Phòng ban nhận hội thoại" (wizard ~L852) / "Phòng ban nhận" (drawer ~L932) đặt trước "Cách chia".
  - **Vai trò:**
    - `RolesSection.tsx` (122): nút "Tạo vai trò" ~L39, nhân bản ~L66 (`cloneDraft`); `useRoleEditor.ts` (86): `blankDraft` / `cloneDraft` / `editDraft`.
    - `shared/authz/custom-role-policy.ts`: `cloneSystemRole`, `checkRoleDraft` (đủ 6 module).
    - `ROLE_DEFS` có 5 vai trò hệ thống (`roles.ts`).
- **Key files to read first:** DC-925, D64, TIP-051 §1–§4, TIP-042b (chia lead), `standards/channels/omnichannel-adapter.md` (settings tài khoản), các file nêu trên.

## APPLICABLE STANDARDS
- [authz/rbac-permissions](../standards/authz/rbac-permissions.md) — vai trò mẫu là vai trò tuỳ biến (không thêm vai trò hệ thống).
- [channels/omnichannel-adapter](../standards/channels/omnichannel-adapter.md) — settings tài khoản kênh.
- [actions/action-registry](../standards/actions/action-registry.md) · [events/outbox](../standards/events/outbox.md).
- [database/indexing](../standards/database/indexing.md) — pool theo `team_member` / `team_agent` dùng index có sẵn.
- [ui/frontend-structure](../standards/ui/frontend-structure.md) · [ui/prototype-parity](../standards/ui/prototype-parity.md) (ô có sẵn trong prototype) · [i18n/i18n](../standards/i18n/i18n.md).
- [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).

## Rà trước khi làm
1. Rebase `origin/dev` (051 đã merge). `python -X utf8 tools/obligations/manifests.py 051b`. Kiểm số dòng `~` (đặc biệt `pipeline.ts`, `ManageChannelDrawer.tsx` sau các TIP kênh 048*).
2. Kiểm `ManageChannelDrawer.tsx` còn chỗ (≤ 400). Thêm dòng vượt trần → tách khối Phân công ra `ChannelAssignBlock.tsx` trước (ghi report).
3. Đọc `catalog.ts` mẫu agent `tpl_17` ("Tuyển dụng & HR"): quyền / tool mặc định. Vai trò mẫu "Nhân sự" không được rộng hơn mẫu agent đó cộng quyền xem cơ bản.
4. Chạy `pnpm parity settings:channels settings:roles` **trước khi sửa**, lưu mốc.

## TASK
- Tài khoản kênh gán **phòng ban nhận** (`unit_id`): hội thoại mới mang đơn vị đó. Người scope `team` / `dept` của phòng thấy; phòng khác không thấy (hội thoại tuyển dụng chỉ phòng Nhân sự).
- Chia lead / gán chỉ trong thành viên phòng.
- AI agent trực tài khoản đó tự vào phòng ban (DC-921).
- Thêm **4 vai trò mẫu** để tạo vai trò tuỳ biến nhanh.

## SPECIFICATIONS

### 1. `unit_id` trên tài khoản kênh
- `AccountSettings` thêm `unit_id: string | null` (mặc định `null` ở `defaultSettings()`).
- `channel.update_settings` `patch.unit_id: z.string().uuid().nullable().optional()`.
- **Handler:** kiểm đơn vị tồn tại + chưa lưu trữ (422 `unit_not_found`). Cần thêm `members.manage` **hoặc** `crm.reassign` để đổi (giống `assign_mode`), thiếu → 403.
- **Đọc:** `channelAccountSchema` thêm `unit_id` + `unit_name` (optional); `read.service.ts` điền tên đơn vị (một lượt đọc theo lô, không N+1).
- **Agent vào phòng (DC-925 c):**
  - Khi lưu `unit_id` khác null và tài khoản có `agent_id` (hoặc khi đổi `agent_id` trên tài khoản đã có `unit_id`): `INSERT INTO team_agent … ON CONFLICT DO NOTHING` cùng transaction, ghi vào `after` của log.
  - Không tự gỡ agent khỏi phòng cũ. Gỡ ở Phòng ban (051).

### 2. Hội thoại + khách mang đơn vị
- **`pipeline.ts` ~L158:** `teamId = m.isGroup ? (st.unit_id ?? null) : (contact?.teamId ?? st.unit_id ?? null)`.
  - Nhóm Zalo của tài khoản có phòng ban → mang phòng ban; trước đây null.
  - Khách đã có đơn vị → giữ đơn vị khách (DC-299).
- **Khách mới từ tin vào** (`identity.service.ts` `resolve()`): nhận `unitId` qua `InboundIdentity.unitId?` (pipeline truyền `st.unit_id`), ghi `contact.team_id` lúc tạo. Khách cũ không đổi.
- `lead_routing.apply` ~L82: `team = rule.teamId ?? unitOfAccount ?? soleTeamOf(user)`. `unitOfAccount` đọc `settings.unit_id` của `p.channel_account_id`.

### 3. Chia trong phòng
- **`routing.repo.ts` `poolUsers`:** tài khoản có `unit_id` và rule đang áp là **rule mặc định** (`channel_account_id` null) không có `team_id` / `user_ids` riêng → pool = thành viên người của `unit_id` **và đơn vị con**. Đọc một câu theo `team.path` (index `team_path_idx`) + `team_member`.
  - Rule riêng của tài khoản giữ nguyên ưu tiên.
  - Pool rỗng → `no_eligible` như cũ (hàng chung).
- **`assignee-candidates.ts`:** hội thoại có `team_id`, người gán có scope inbox khác `all` → ứng viên lọc theo thành viên đơn vị (người + agent trong `team_agent`) của `team_id` và đơn vị con. Owner / scope `all` thấy đủ như cũ, nhóm "Ngoài phòng ban" xếp sau.
- Agent không bị chia lead tự động (giữ TIP-042b: lead chia cho người). Agent trực kênh vẫn theo `agent_id` của tài khoản.

### 4. Vai trò mẫu (DC-925 b)
- **`shared/authz/role-templates.ts` (mới):** `ROLE_TEMPLATES` gồm 4 mẫu, mỗi mẫu có `key`, `name_key` (i18n), `permissions`, `scope` đủ 6 module (qua `checkRoleDraft`).

  | Mẫu | Quyền chính | Scope |
  |---|---|---|
  | `hr` — Nhân sự | `inbox.view` / `reply` / `assign`, `crm.view` / `edit`, `booking.view` / `manage`, `ticket.view` / `manage`, `kb.manage`, `assistant.use`, `insights.view` | inbox / crm / booking / support `dept`, sales `none`, insights `dept` |
  | `marketing` | `campaign.view` / `manage`, `crm.view` / `edit` / `export`, `inbox.view` / `reply`, `kb.manage`, `assistant.use`, `insights.view` | crm / insights `all`, inbox `dept`, sales `none`, booking `none`, support `none` |
  | `ops` — Vận hành / Kỹ thuật | `ticket.view` / `manage`, `sla.manage`, `booking.view` / `manage`, `inbox.view` / `reply` / `assign`, `crm.view`, `order.view`, `assistant.use`, `insights.view` | support / booking / inbox `dept`, crm `all`, sales `dept`, insights `dept` |
  | `viewer` — Chỉ xem | các quyền `*.view` + `insights.view` | 6 module `dept` |

  Danh sách quyền cuối cùng do người thi công đối chiếu `PERMISSIONS` thật; bỏ quyền không còn tồn tại; không thêm quyền `OWNER_ONLY` / `members.manage` / `billing.manage` / `roles.manage`.
- **`RolesSection.tsx`:** nút "Tạo từ mẫu" cạnh "Tạo vai trò" mở `RoleTemplatePicker.tsx` (4 thẻ: tên, mô tả, số quyền). Chọn mẫu → `templateDraft(t)` (thêm ở `useRoleEditor.ts`) → mở editor có sẵn → lưu bằng `role.create` (đã có) thành `custom:*`.
- Không thêm vai trò hệ thống. Không seed vai trò mẫu vào DB.
- Người tạo bị chặn vượt quyền như cũ (`assertNoEscalation` / `scopeEscalationOf`).

### 5. UI kênh
- `ChannelUnitField.tsx` (mới): ô chọn "Phòng ban nhận hội thoại" (wizard) / "Phòng ban nhận" (drawer) đặt **trước** `ChannelRoutingFields`.
  - Danh sách từ `orgTreeQuery` (051), hiện đường dẫn "Chi nhánh › Phòng ban"; "— Không gán —" = null.
  - Đổi → `channel.update_settings { patch: { unit_id } }`. Thiếu quyền → chỉ đọc.
- Wizard `ConnectChannelModal.tsx` ~L215 và drawer `ManageChannelDrawer.tsx` ~L278 mỗi file thêm 1 dòng `<ChannelUnitField …/>`.
- Thẻ kênh `ChannelCard.tsx`: hiện chip tên phòng ban khi có.
- Mock `settings-apps.ts` (mock domain) nhận `unit_id`; i18n `settings.json` vi + en.

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given tài khoản Zalo gán `unit_id` = Phòng Nhân sự, when khách lạ nhắn lần đầu, then khách mới + hội thoại có `team_id` = Phòng Nhân sự; người Phòng Kinh doanh scope `dept` không thấy hội thoại; người Phòng Nhân sự thấy | `apps/api/test/integration/channel-unit-routing.test.ts` |
| 2 | Given khách cũ đã có `team_id` = Kinh doanh nhắn vào tài khoản Phòng Nhân sự, when tạo hội thoại mới, then `team_id` = Kinh doanh (giữ đơn vị khách) | như AC1 |
| 3 | Given rule mặc định bật round robin không có pool riêng, tài khoản có `unit_id`, when lead mới, then người nhận ∈ thành viên phòng (gồm đơn vị con); phòng không có người đủ quyền → `no_eligible` | `lead_routing.apply.action.test.ts` (thêm ca) + `packages/core/test/lead-routing.test.ts` |
| 4 | Given `channel.update_settings` đặt `unit_id` cho tài khoản có agent, when đọc `GET /v1/org-units`, then agent nằm trong `agent_ids` của phòng; đơn vị không tồn tại → 422; người thiếu `members.manage` và `crm.reassign` → 403 | `channel.update_settings.action.test.ts` (thêm ca) |
| 5 | Given người gán scope `dept` mở ô phụ trách hội thoại thuộc Phòng Nhân sự, when xem ứng viên, then chỉ người + agent của phòng; Owner thấy đủ, ngoài phòng xếp sau | `apps/api/test/integration/inbox-assignees-unit.test.ts` |
| 6 | Given Vai trò & phân quyền, when "Tạo từ mẫu" → Nhân sự → Lưu, then vai trò `custom:*` có đúng quyền + scope mẫu; người gán scope `team` chọn mẫu có `dept` → lỗi vượt quyền | `packages/shared/src/authz/role-templates.test.ts` + `apps/web/e2e/settings-roles.spec.ts` (thêm ca) |
| 7 | Given wizard / drawer kênh, when chọn Phòng ban nhận, then lưu và thẻ kênh hiện chip phòng ban | `apps/web/e2e/http/channels.spec.ts` (thêm ca) |
| 8 | Given màn `settings:channels`, `settings:roles` | `pnpm parity settings:channels settings:roles` < 5% |

### Commands / evidence gate
- `pnpm turbo run lint typecheck test --filter=@appchat/{shared,actions,core,api,web}` · `pnpm depcheck`.
- Integration (`--workers=1`, slot Postgres): `channel-unit-routing.test.ts`, `inbox-assignees-unit.test.ts`, `channel.update_settings.action.test.ts`, `lead_routing.apply.action.test.ts`.
- `pnpm e2e settings-roles` (mock + http) · `pnpm e2e channels` (http) · `pnpm parity settings:channels settings:roles`.

## CONSTRAINTS
- **DO NOT:**
  - đổi 5 vai trò hệ thống;
  - seed vai trò mẫu thành vai trò thật;
  - chia lead cho agent;
  - ghi đè `team_id` khách cũ;
  - gỡ agent khỏi phòng cũ tự động;
  - nhồi logic vào `ManageChannelDrawer.tsx` / `settings-apps.ts` quá 1–2 dòng;
  - đổi luật chia lead TIP-042b khi tài khoản không có `unit_id`.
- **REUSE:** `orgTreeQuery` + `team_agent` (051), `role.create`, `cloneDraft` / `checkRoleDraft`, `eligibleUsers`, `ChannelRoutingFields`.
- **SKIP:**
  - loại liên hệ (051c);
  - phân ca / KPI (P3);
  - chia theo kỹ năng;
  - gỡ agent khi đổi phòng;
  - dòng agent ở Thành viên, đơn vị cho bản ghi agent tạo (TIP-051d).

## Quality Gate
- [x] Dựa trên code `origin/dev` 2026-11-14; prototype có ô "Phòng ban nhận" (không phải lệch mới).
- [x] Không đổi hành vi khi `unit_id` null (mặc định) — tenant cũ không đổi gì.
- [x] Vai trò mẫu không vượt quyền người tạo (dùng kiểm sẵn có).
- **Gap:** quyền trong bảng §4 là đề xuất; người thi công đối chiếu `PERMISSIONS` thật và ghi bảng cuối vào report.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Đúng manifest; file sát trần chỉ thêm 1–2 dòng.
- [ ] AC 1–8 có kết quả từng cái, dán output thật.
- [ ] **Action-first:** `unit_id` chỉ qua `channel.update_settings`; vai trò qua `role.create`.
- [ ] **Scope:** hội thoại / khách mới mang `team_id` đúng, list vẫn áp `scopeFilter` / `recordScopeSql`.
- [ ] i18n vi + en; token `@appchat/ui`; parity < 5%.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA; PR vào `dev`.

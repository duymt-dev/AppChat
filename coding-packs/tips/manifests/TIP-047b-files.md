# TIP-047b — exact file manifest

M = sửa, C = tạo mới. Có ba dòng M tương lai, cần TIP đứng trước đã tích hợp:
- 026c sửa `crm-activities.prisma` / `contact-activities.ts` cùng chỗ (thứ tự 026c → 047b).
- 047 tạo `packages/voice`.

Không dùng wildcard thư mục; test liệt kê từng file.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/db/prisma/tenant/callcenter.prisma` | 13 bảng Gọi điện (DC-903) + enum; dòng đầu sở hữu TIP-047b |
| C | `packages/db/prisma/tenant/migrations/20261114100000_callcenter/migration.sql` | Bảng + enum + CHECK + FK nội DB + index §1.2 / §2; `contact_task` kind / callback; điền `role.data_scope.callcenter` + quyền 5 vai trò hệ thống; dòng `call_ivr` mặc định |
| M | `packages/db/prisma/tenant/crm-activities.prisma` | `contact_task.kind` · `callback_caller` · `callback_agent_id` · `call_id` · `phone_e164` · `missed_count` |
| M | `packages/db/prisma/platform/billing.prisma` | `plan.max_call_extensions` |
| M | `packages/db/prisma/platform/routing.prisma` | `tenant_call_route` (zcc / trunk / số → workspace, line) |
| M | `packages/db/prisma/platform/ai-config.prisma` | `model_price.unit` + `credits_per_unit` |
| C | `packages/db/prisma/platform/migrations/20261114100100_voice_pricing/migration.sql` | Cột gói + giá; bảng `tenant_call_route`; CHECK `subscription_addon` / `quota_reservation` thêm `call_extensions`; UPDATE hạn mức máy cho gói có sẵn; dòng giá voice `active = false`; tăng thế hệ `ai` |
| M | `packages/db/test/prisma-stubs.test.ts` | OWNERS `callcenter: '047b'`; tổng 65 → 66 |
| C | `packages/db/test/callcenter-migration.test.ts` | AC1–2: dữ liệu cũ giữ, CHECK / unique từng ca |
| M | `packages/db/test/factories/index.ts` | Export factory Gọi điện |
| C | `packages/db/test/factories/callcenter.ts` | Factory cuộc gọi / việc gọi lại cho EXPLAIN 100k (AC4) |
| M | `packages/shared/src/codes.ts` | `CODE_FORMATS.call` (CG, pad 6) |
| M | `packages/shared/src/authz/permissions.ts` | 5 quyền `call.*` / `callcenter.manage`; `SCOPE_MODULES` thêm `callcenter` |
| M | `packages/shared/src/authz/roles.ts` | `ALL` + 5 vai trò: quyền + scope `callcenter` theo D61 #5 |
| M | `packages/shared/src/authz/roles.test.ts` | Quyền / scope Gọi điện của từng vai trò |
| M | `packages/shared/src/authz/custom-role-policy.ts` | Bắt đủ module `callcenter` (chú thích "sáu module" → theo `SCOPE_MODULES`) |
| M | `packages/actions/src/define.ts` | `ModuleKey` thêm `callcenter` |
| M | `packages/shared/src/crm/labels.ts` | `CONTACT_SOURCES` + `SOURCE_STYLE.call`; `sourceOfChannel('call')` |
| M | `packages/shared/src/crm/activity-state.ts` | `CONTACT_TASK_KINDS`, `CALLBACK_CALLERS` |
| M | `packages/shared/src/api/contact-activities.ts` | DTO việc: `kind`, `callback_at`, `callback_caller` |
| M | `packages/actions/src/crm.ts` | Enum nguồn dùng `CONTACT_SOURCES` |
| M | `packages/actions/src/crm-schemas.ts` | Enum nguồn dùng `CONTACT_SOURCES` |
| M | `packages/shared/src/data-transfer/registry.ts` | Tuỳ chọn nguồn dùng `CONTACT_SOURCES` |
| M | `packages/shared/src/support/ticket-state.ts` | `TICKET_CHANNELS` thêm `call` |
| M | `packages/actions/src/support.ts` | `ticket.create` channel dùng `TICKET_CHANNELS` |
| M | `packages/shared/src/billing/catalog.ts` | `PlanSeed.max_call_extensions` + giá trị 8 gói; `ADDONS` `addon_call_extension` 200.000đ; `ADDON_RESOURCE`; `PLAN_COMPARE` nhóm `callcenter` |
| M | `packages/shared/src/billing/rules.ts` | `QuotaResource` thêm `call_extensions`; `planHasCalls` |
| M | `packages/shared/src/billing/plans.test.ts` | Hạn mức máy theo gói + addon item → resource |
| M | `packages/shared/src/api/billing.ts` | `addons[].kind` thêm `call_extension` |
| M | `packages/shared/src/api/identity.ts` | `meSchema.workspaces[].features.calls` |
| M | `packages/shared/src/api/platform-admin.ts` | DTO gói `max_call_extensions`; DTO giá `unit` / `credits_per_unit` |
| M | `packages/shared/src/i18n/server/vi/billing.ts` | Nhãn `addon_call_extension` |
| M | `packages/shared/src/i18n/server/en/billing.ts` | Như trên (en) |
| M | `packages/core/src/billing/seed.ts` | Ghi `maxCallExtensions` khi tạo gói thiếu |
| M | `packages/core/src/billing/services/quota.service.ts` | `PlanLimits.callExtensions` (+ addon) |
| M | `packages/core/src/billing/services/addons.service.ts` | `activeAddons` / `withAddons` thêm `call_extensions` |
| M | `packages/core/src/billing/services/plan-changes.service.ts` | Item → resource qua `ADDON_RESOURCE` |
| M | `packages/core/src/billing/lifecycle/types.ts` | `AddonSnapshot.resource` thêm `call_extensions` |
| M | `packages/core/src/billing/services/billing-read.service.ts` | `forMe` trả `features.calls` theo gói + addon |
| M | `packages/core/src/billing/services/usage-receipt.ts` | Ghi chú ref `voice_turn` / `zcc_consent` (047c dùng) |
| M | `apps/api/src/http/identity/me.view.ts` | Chuyển `features.calls` vào `/me` |
| M | `packages/actions/src/admin-config.ts` | `admin.plan.*` nhận `max_call_extensions`; `admin.model_price.upsert` nhận `unit` / `credits_per_unit` |
| M | `packages/core/src/platform/actions/plan.handler.ts` | Lưu `maxCallExtensions` (CAS) |
| M | `packages/core/src/platform/actions/model.handlers.ts` | Lưu `unit` / `creditsPerUnit` |
| M | `packages/core/src/platform/services/config-read.ts` | Đọc trường mới cho màn quản trị |
| M | `packages/core/src/ai/router/provider.store.ts` | Đọc `unit` / `credits_per_unit` (Number) vào bảng giá |
| M | `packages/core/test/authz-unit.test.ts` | Nhóm quyền `call` / `callcenter`, scope module mới |
| M | `apps/api/test/integration/billing-lifecycle.test.ts` | AC6 hạn mức máy + addon `call_extensions` |
| M | `apps/api/test/integration/platform-admin.test.ts` | AC7 sửa hạn mức máy + dòng giá voice |
| M | `apps/api/test/integration/custom-roles.test.ts` | AC5 vai trò tuỳ biến cũ + `missing_module` |
| M | `apps/api/test/integration/billing.test.ts` | AC9 `/me.features.calls` |
| M | `apps/web/src/features/settings/perm-groups.ts` | Nhóm quyền `callcenter` (bỏ chú thích "nhóm OUT Gọi điện") |
| M | `apps/web/src/features/platform-admin/components/PlanForm.tsx` | Ô "Máy nhánh tổng đài" |
| M | `apps/web/src/features/platform-admin/components/PlansPanel.tsx` | Cột hạn mức máy |
| M | `apps/web/src/features/platform-admin/components/ModelPricesPanel.tsx` | Đơn vị + đơn giá theo đơn vị |
| M | `apps/web/src/shared/api/mock/domains/platform-admin.ts` | Mock trường mới |
| M | `apps/web/src/shared/api/mock/identity-shape.test.ts` | Shape `/me` có `features.calls` |
| M | `fixtures/prototype-parity/shell.json` | `workspaces[].features.calls` cho mock `/me` |
| M | `apps/web/messages/vi/settings.json` | `perms.call_*`, `group.callcenter`, `module.callcenter` (vai trò) |
| M | `apps/web/messages/en/settings.json` | Như trên (en) |
| M | `apps/web/messages/vi/platformAdmin.json` | Nhãn hạn mức máy, đơn vị giá |
| M | `apps/web/messages/en/platformAdmin.json` | Như trên (en) |
| M | `apps/web/messages/vi/customers.json` | `source.call` |
| M | `apps/web/messages/en/customers.json` | Như trên (en) |
| M | `apps/web/messages/vi/tickets.json` | `channel.call` |
| M | `apps/web/messages/en/tickets.json` | Như trên (en) |

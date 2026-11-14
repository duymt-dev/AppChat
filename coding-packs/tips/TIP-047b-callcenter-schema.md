# TIP-047b — Dữ liệu tổng đài: `tenant/callcenter.prisma`, việc gọi lại, giá voice, hạn mức máy, quyền (Gọi điện, D61)

## HEADER
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `packages/db/test/prisma-stubs.test.ts`; integrate 047b before048.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`, `packages/db/prisma/platform/routing.prisma`, `packages/shared/src/crm/labels.ts`, `packages/shared/src/support/ticket-state.ts`; integrate 047b before048b.
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 047b before048c.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 047b before048d.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 047b before048e.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `packages/db/test/prisma-stubs.test.ts`; integrate 047b before048f.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 047b before048h.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/crm.ts`, `packages/db/prisma/tenant/crm-activities.prisma`, `packages/shared/src/api/contact-activities.ts`, `packages/shared/src/crm/activity-state.ts`, `packages/shared/src/data-transfer/registry.ts`; integrate 026b before047b.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`, `packages/db/prisma/tenant/crm-activities.prisma`, `packages/shared/src/api/contact-activities.ts`, `packages/shared/src/crm/activity-state.ts`, `packages/shared/src/crm/labels.ts`; integrate 026c before047b.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/api/test/integration/billing-lifecycle.test.ts`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/core/src/billing/lifecycle/types.ts`, `packages/core/src/billing/services/addons.service.ts`, `packages/core/src/billing/services/billing-read.service.ts`, `packages/core/src/billing/services/plan-changes.service.ts`, `packages/core/src/billing/services/quota.service.ts`, `packages/db/prisma/platform/billing.prisma`, `packages/shared/src/api/billing.ts`, `packages/shared/src/i18n/server/en/billing.ts`, `packages/shared/src/i18n/server/vi/billing.ts`; integrate 039 before047b.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `apps/api/test/integration/platform-admin.test.ts`, `apps/web/src/features/platform-admin/components/ModelPricesPanel.tsx`, `apps/web/src/features/platform-admin/components/PlanForm.tsx`, `apps/web/src/features/platform-admin/components/PlansPanel.tsx`, `packages/actions/src/admin-config.ts`, `packages/core/src/ai/router/provider.store.ts`, `packages/core/src/platform/actions/model.handlers.ts`, `packages/core/src/platform/actions/plan.handler.ts`, `packages/core/src/platform/services/config-read.ts`, `packages/db/prisma/platform/ai-config.prisma`, `packages/db/prisma/platform/billing.prisma`, `packages/shared/src/api/platform-admin.ts`; integrate 040 before047b.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/api/test/integration/custom-roles.test.ts`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/shared/src/authz/custom-role-policy.ts`; integrate 042 before047b.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/settings.json`; integrate 047b before047d.
- **Parallel-safe with TIP-003b (coverage-closure manifest):** sequential, shares `packages/core/src/billing/services/usage-receipt.ts`; integrate 003b before047b.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `packages/actions/src/define.ts`; integrate 003c before047b.
- **Parallel-safe with TIP-003e (coverage-closure manifest):** sequential, shares `packages/actions/src/support.ts`; integrate 003e before047b.
- **Parallel-safe with TIP-003f (coverage-closure manifest):** sequential, shares `packages/actions/src/crm.ts`; integrate 003f before047b.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 004b before047b.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 006d before047b.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 012b before047b.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 012c before047b.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013b before047b.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013c before047b.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/db/prisma/platform/routing.prisma`; integrate 014b before047b.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 014c before047b.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`; integrate 015b before047b.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `packages/actions/src/crm.ts`, `packages/shared/src/data-transfer/registry.ts`; integrate 015c before047b.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`, `packages/actions/src/crm.ts`, `packages/actions/src/define.ts`; integrate 015d before047b.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`, `packages/actions/src/crm.ts`; integrate 015e before047b.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/vi/customers.json`, `packages/actions/src/crm.ts`; integrate 015f before047b.
- **Parallel-safe with TIP-017b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 017b before047b.
- **Parallel-safe with TIP-018b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 018b before047b.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `packages/core/src/billing/services/usage-receipt.ts`; integrate 019b before047b.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `packages/db/test/prisma-stubs.test.ts`; integrate 019c before047b.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020b before047b.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020d before047b.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/core/src/ai/router/provider.store.ts`; integrate 020e before047b.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 022b before047b.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `packages/actions/src/define.ts`, `packages/shared/src/i18n/server/en/billing.ts`, `packages/shared/src/i18n/server/vi/billing.ts`; integrate 023b before047b.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/customers.json`, `apps/web/messages/en/tickets.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/tickets.json`, `packages/actions/src/define.ts`; integrate 023c before047b.
- **Parallel-safe with TIP-023e (coverage-closure manifest):** sequential, shares `packages/core/src/ai/router/provider.store.ts`; integrate 023e before047b.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `packages/core/src/ai/router/provider.store.ts`, `packages/core/src/platform/actions/model.handlers.ts`, `packages/core/src/platform/services/config-read.ts`, `packages/shared/src/api/platform-admin.ts`; integrate 023f before047b.
- **Parallel-safe with TIP-023g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/tickets.json`, `apps/web/messages/vi/tickets.json`; integrate 023g before047b.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `packages/actions/src/crm.ts`, `packages/actions/src/support.ts`, `packages/shared/src/data-transfer/registry.ts`; integrate 025b before047b.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `packages/shared/src/data-transfer/registry.ts`; integrate 027b before047b.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 030b before047b.
- **Parallel-safe with TIP-031c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 031c before047b.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/define.ts`; integrate 032b before047b.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/shared/src/data-transfer/registry.ts`; integrate 033b before047b.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/en/tickets.json`, `apps/web/messages/vi/settings.json`, `apps/web/messages/vi/tickets.json`, `packages/shared/src/data-transfer/registry.ts`; integrate 034b before047b.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/tickets.json`, `apps/web/messages/vi/tickets.json`, `packages/actions/src/define.ts`, `packages/actions/src/support.ts`, `packages/shared/src/data-transfer/registry.ts`; integrate 034c before047b.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/tickets.json`, `apps/web/messages/vi/tickets.json`; integrate 034d before047b.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 037 before047b.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `packages/shared/src/data-transfer/registry.ts`; integrate 038b before047b.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before047b.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 042b before047b.
- **Parallel-safe with TIP-042c (coverage-closure manifest):** sequential, shares `packages/core/test/authz-unit.test.ts`, `packages/shared/src/authz/permissions.ts`, `packages/shared/src/authz/roles.ts`; integrate 042c before047b.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 043 before047b.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/crm.ts`, `packages/actions/src/define.ts`, `packages/db/test/factories/index.ts`; integrate 045b before047b.
- **TIP-ID:** TIP-047b · **Project:** AppChat V2 · **Module:** Gọi điện — dữ liệu + gói + quyền (không handler, không UI) · **Priority:** P0 · **Estimated:** M
- **Depends on:** 047, 026c, 042 và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 047c, 047d, 044, 045, 046.
- **Vì sao phụ thuộc:**
  - 047 tạo `packages/voice` (ghép theo lớp: voice + infra → schema → action → FE).
  - 026c nâng `contact_opportunity` và chiếm migration `20261112100000`. `call.opportunity_id` trỏ tới cơ hội 026c. `crm-activities.prisma` (chủ 026b) phải ghép theo thứ tự 026c → 047b.
  - 042 (vai trò tuỳ biến) dùng `SCOPE_MODULES`: thêm module scope `callcenter` phải chạy được với vai trò tuỳ biến đã lưu.
  - 039 / 040 (gói, addon, Quản trị nền tảng) đã DONE: mở rộng, không viết lại.
- **Files touched:** [exact M/C manifest](manifests/TIP-047b-files.md). File prisma mới `tenant/callcenter.prisma` (chủ 047b). Sửa có chủ đích bốn file prisma của TIP khác: `crm-activities.prisma` (026b), `platform/ai-config.prisma` (019), `platform/billing.prisma` (009), `platform/routing.prisma` (002 — route cuộc gọi).
- **Quyết định nguồn:** D61 (#3, #5, #6, #10) · DC-903 · DC-907 c (giá STT / TTS local = 0) · **DC-909** (token OA ở kho `oauth_grant` của TIP-048 — sửa 2026-11-14) · COMMERCE §10 (Gọi điện) · Blueprint §2.2, §3.5.
- **Dòng COVERAGE nhận:** REQ-O02 · REQ-O07 (dữ liệu) · REQ-O11 (cột hết hạn) · REQ-O12 (gói / addon) · D61-plans · D61-perms · DC-903 · COM-10-voice.

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2`. DB tenant riêng mỗi workspace (`TenantDbResolver`): không `workspace_id`, không RLS. DB nền tảng chứa gói / ví / giá model.
- **Hiện trạng (rà 2026-11-13):**
  - **Prisma tenant:** một domain một file. Dòng đầu bắt buộc `// tenant/<file>.prisma — sở hữu: TIP-<id> (02-TASK-GRAPH.md → Bản đồ sở hữu file).`. `packages/db/test/prisma-stubs.test.ts` có OWNERS (tenant L15–38) và `expect(n).toBe(65)` (L56).
  - **Migration:**
    - Tenant mới nhất trên chuỗi PR: `20261113010000_transfer_ticket_categories`. 026c dùng `20261112100000_opportunity_pipeline`, 032e dùng `20261112110000_finance_rows`.
    - Platform mới nhất: `20261111030000_delivery_membership_index`.
    - DC-903 đặt `20261114100000_callcenter` (tenant) + `20261114100100_voice_pricing` (platform). Đổi mốc khi ghép nếu dev đã có migration mới hơn (ghi DV).
  - **`contact_task`** (`crm-activities.prisma` L31–51): title, description, due_at, assignee_user_id, state, version… Chưa có loại việc.
  - **Mã chứng từ** `packages/shared/src/codes.ts` `CODE_FORMATS` (KH, SP, BG, HĐ, DH, TT, PT, LH, TKT, CD). Chưa có `CG`.
  - **Quyền** `packages/shared/src/authz/permissions.ts`:
    - `PERMISSIONS` là mảng phẳng L2–21.
    - `SCOPE_MODULES` L25 có 6 phần tử: inbox, crm, sales, booking, support, insights.
    - `PERMISSION_GROUPS` L52 nhóm theo tiền tố.
    - Vai trò `roles.ts`: `ROLE_DEFS` L40–74, `ALL` L38. Vai trò hệ thống đọc từ code (`authz-resolver.ts:115`), vai trò tuỳ biến đọc DB qua `parseScope` (module thiếu → `none`).
    - `checkRoleDraft` (`custom-role-policy.ts:31`) bắt đủ mọi module (`missing_module`).
    - `ModuleKey` của action ở `packages/actions/src/define.ts:8–10` chưa có `callcenter`.
  - **Gói / addon:**
    - `Plan` (`platform/billing.prisma` L34–58) có `maxUsers` / `maxChannels` / `maxAgents`.
    - `PLAN_SEEDS` + `ADDONS` + `PLAN_COMPARE` ở `packages/shared/src/billing/catalog.ts`. `ADDONS` L214: `addon_user` 150k, `addon_channel` 200k, kiểu `kind: 'user' | 'channel'`.
    - `subscription_addon.resource` có CHECK `users | channels` (migration `20261102003900_billing_lifecycle` L49). `quota_reservation.resource` có CHECK `users | channels | agents`.
    - `QuotaResource` (`shared/billing/rules.ts:11`), `QuotaService.limits/assert`, `activeAddons` / `withAddons` (`addons.service.ts`).
    - Ánh xạ item → resource cứng ở `plan-changes.service.ts:129` (`item === 'addon_channel' ? 'channels' : 'users'`). `AddonSnapshot.resource` ở `lifecycle/types.ts:40`.
    - `seedPlans` (`billing/seed.ts`) chỉ tạo gói thiếu, không ghi đè.
    - Quản trị nền tảng sửa gói qua `admin.plan.*` (`platform/actions/plan.handler.ts`, `PlanForm.tsx`, DTO `api/platform-admin.ts`).
  - **Giá model** `ModelPrice` (`platform/ai-config.prisma` L79–91): khoá (provider_key, model), `credits_per_1k_in/out`, tier. Đọc ở `provider.store.ts` (cache + thế hệ `ai`). Admin sửa qua `admin.model_price.upsert` (`model.handlers.ts`, `ModelPricesPanel.tsx`).
  - **Nguồn khách** `CONTACT_SOURCES` (`shared/crm/labels.ts:19`). Enum cứng lặp ở `actions/src/crm.ts:317`, `crm-schemas.ts:21`, `shared/data-transfer/registry.ts:103`, nhãn `messages/*/customers.json` `source.*`.
  - **Kênh ticket** `TICKET_CHANNELS` (`shared/support/ticket-state.ts:11`) + `ticket.create` channel enum (`actions/src/support.ts:48`). Cột `ticket.channel` là text, không CHECK.
  - **Prototype:** quyền L8854 nhóm "GỌI ĐIỆN"; gói L11514 / L11529; addon L11541; Cài đặt Tổng đài L8173–8582; seed L8758–8763.
- **Key files to read first:** DC-903, D61, COMMERCE §10 · Blueprint §2.2 (bảng callcenter) + §3.5 · `standards/database/{tenant-db,indexing}.md` · `standards/authz/rbac-permissions.md` · các file nêu trên.
- **Patterns to follow:**
  - Migration SQL viết tay kèm FK nội DB + CHECK + index như `20261102003700_marketing`.
  - Bảng con không có Prisma relation xuyên domain (Blueprint §2.1).
  - Seed gói idempotent; dòng cấu hình mặc định chèn trong migration như `booking_setting`.
  - Đổi CHECK bằng `DROP CONSTRAINT … ADD CONSTRAINT` trong cùng migration.

## APPLICABLE STANDARDS
- [database/tenant-db](../standards/database/tenant-db.md) · [database/indexing](../standards/database/indexing.md) — DB tenant, không `workspace_id`; composite `=` trước range / sort; INCLUDE; partial; deferred join cho list có LIMIT; EXPLAIN.
- [authz/rbac-permissions](../standards/authz/rbac-permissions.md) — permission mới, data scope module mới, vai trò tuỳ biến.
- [domain/money-time-numbering](../standards/domain/money-time-numbering.md) — mã `CG-`, tiền chuỗi VND, thời điểm `timestamptz`.
- [domain/state-machine](../standards/domain/state-machine.md) · [domain/validation-defaults](../standards/domain/validation-defaults.md) — trạng thái cuộc gọi là enum đóng, giới hạn độ dài.
- [plans/COMMERCE-DECISIONS](../plans/COMMERCE-DECISIONS.md) §10 — gói có Gọi điện, addon "User tổng đài" 200.000đ, credit voice.
- [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).

## Rà trước khi làm
1. Rebase lên `origin/dev` mới nhất, sau khi 026c và chuỗi PR hiện tại đã merge.
   - `python -X utf8 tools/obligations/manifests.py 047b`.
   - Đổi mốc hai migration nếu dev đã có migration mới hơn. Ghi DV kèm tên mới, và sửa tên trong Blueprint §2.2 + DC-903 bằng DC mới.
2. Kiểm vai trò tuỳ biến đã lưu ở demo / dev: đếm `role` có `data_scope` thiếu khoá `callcenter` sau khi thêm module, rồi ghi report.
   - Quy tắc: vai trò tuỳ biến cũ chưa có khoá `callcenter` đọc là `none` (`parseScope`). Migration điền khoá mặc định theo §3.3.
   - Lưu nháp vai trò cũ ở UI phải không bị `missing_module` chặn.
3. Đối chiếu bảng gói prototype L11514 / L11529 với `PLAN_SEEDS` hiện tại (tên khoá `personal_max`, `business`, `ultimate`, `enterprise`). Lệch thì theo D61 #3, không theo prototype (Team "User tổng đài 2" là lệch — D61 chốt Team không có).
4. Đo `contact_task` hiện có: số dòng, số dòng `due_at` null. Migration thêm cột phải giữ nguyên dữ liệu 026b.

## TASK
Dựng toàn bộ dữ liệu cho Gọi điện mà 047c / 047d dùng; không handler, không UI.
- `tenant/callcenter.prisma` + migration theo DC-903.
- `contact_task` thêm loại `callback`.
- Mã `CG-`.
- Quyền `call.*` + module scope `callcenter` + vai trò hệ thống.
- Gói có Gọi điện + hạn mức máy + addon "User tổng đài".
- Dòng giá voice ở `model_price`.
- Nguồn khách / kênh ticket `call`.
- Seed cấu hình mặc định của workspace mới.

## SPECIFICATIONS

### 1. Tenant — `packages/db/prisma/tenant/callcenter.prisma` + migration `20261114100000_callcenter` (DC-903)
Dòng đầu `// tenant/callcenter.prisma — sở hữu: TIP-047b (02-TASK-GRAPH.md → Bản đồ sở hữu file).`. Không Prisma relation xuyên domain; FK nội DB viết SQL trong migration.

| Bảng | Cột chính | Ràng buộc / index |
|---|---|---|
| `call_line` | id, name, number_e164 null, channel_kind (`pstn · zcc · personal_forwarding · personal_sim_gateway · webrtc_widget`), carrier null, sip_mode (`peering · register`) null, sip_host null, sip_user null, secret_enc bytea null, zcc_oa_id null, zcc_route_id null (3 số), oauth_grant_id uuid null (token OA ở `oauth_grant` — TIP-048, DC-909; không lưu token trong `call_line`), forward_codes jsonb (`**21*` / `**61*` / `**62*` / `**67*` hiển thị), max_concurrent int, inbound_default bool, outbound_allowed bool, active bool, status (`connected · error · disabled`), last_error text null, version, created_at, updated_at | unique(number_e164) WHERE number_e164 IS NOT NULL; unique(zcc_oa_id, zcc_route_id) WHERE zcc_oa_id IS NOT NULL; CHECK channel_kind ≠ `personal_sim_gateway` OR max_concurrent = 1; CHECK `zcc` ⇒ zcc_oa_id NOT NULL (`oauth_grant_id` có thể null tới khi uỷ quyền OA xong — 047c báo trạng thái `error` "chưa uỷ quyền OA") |
| `call_extension` | id, ext text (2–5 chữ số), user_id null, agent_id null, can_receive, can_dial, device (`webphone`), caller_line_id null, status (`online · offline · busy · acw · away`), status_changed_at, version | unique(ext); unique(user_id) WHERE user_id IS NOT NULL; unique(agent_id) WHERE agent_id IS NOT NULL; CHECK đúng một trong user_id / agent_id; CHECK ext ~ '^[0-9]{2,5}$'; FK caller_line_id → call_line ON DELETE SET NULL |
| `call_queue` | id, name, strategy (`sequential · ring_all · least_calls · longest_idle`), max_wait_s (30–300), overflow (`voicemail · ai · any_free · queue`), overflow_queue_id null, caller_line_id null, version | unique(lower(name)); CHECK max_wait_s BETWEEN 30 AND 300; CHECK overflow = 'queue' ⇔ overflow_queue_id NOT NULL; CHECK overflow_queue_id ≠ id |
| `call_queue_member` | queue_id, extension_id, position | pk(queue_id, extension_id); idx(extension_id) |
| `call_ivr` | id smallint = 1, greeting_file_id null, ai_first bool, ai_agent_id null, after_hours (`voicemail_callback · ai`), record_calls bool default true, record_notice bool default true, transcribe bool default true, monitor_enabled bool default true, version | CHECK id = 1; CHECK record_calls ⇒ record_notice (D61 #10) |
| `call_ivr_key` | key smallint (0–9), target (`any · ai · queue · extension · voicemail`), target_id null | pk(key); CHECK target ∈ (queue, extension) ⇔ target_id NOT NULL |
| `call` | id, code (`CG-`), direction (`in · out`), channel_kind, line_id, caller_phone null, external_user_id null, contact_id null, opportunity_id null, queue_id null, extension_id null, answered_by_user_id null, agent_id null, status (`ringing · in_progress · completed · missed · voicemail · ai_handled · failed`), end_reason text null, started_at, answered_at null, ended_at null, duration_s int default 0, wait_s int default 0, missed_count int default 0, callback_task_id null, ticket_id null, livekit_room text, initiated_by_user_id null, note text default '', version, created_at, updated_at | unique(code); unique(livekit_room); index theo §1.2 |
| `call_leg` | id, call_id, role (`customer · agent · ai · monitor`), user_id null, agent_id null, extension_id null, mode (`normal · listen · whisper · barge`), transfer_from_leg_id null, joined_at, left_at null | idx(call_id, joined_at); FK call_id ON DELETE CASCADE |
| `call_recording` | call_id (pk), file_id, duration_s, channels smallint, expires_at, deleted_at null | idx(expires_at) WHERE deleted_at IS NULL |
| `call_transcript` | call_id (pk), segments jsonb (`[{speaker, start_ms, end_ms, text, text_vi?}]`), language, expires_at, deleted_at null | idx(expires_at) WHERE deleted_at IS NULL |
| `call_summary` | call_id (pk), summary text, sentiment (`positive · neutral · negative`) null, suggestion jsonb null (đề xuất giai đoạn / việc — chỉ gợi ý), ai_run_id null, created_at | giữ sau 12 tháng (D61 #10) |
| `zcc_consent` | id, line_id, zalo_user_id null, phone_e164 null, contact_id null, requested_by_user_id, requested_at, status (`pending · granted · expired · declined · failed`), granted_at null, callable_until null, cost_vnd bigint null, billed_to (`oa · app`), ledger_ref text null, external_ref text null, version | idx(line_id, zalo_user_id, requested_at DESC); idx(line_id, phone_e164, requested_at DESC); idx(contact_id, requested_at DESC); CHECK zalo_user_id hoặc phone_e164 khác null |
| `call_webhook_receipt` | provider (`livekit · zcc`), event_id, call_id null, received_at, processed_at null, outcome (`applied · ignored_stale · ignored_duplicate · failed`) null | pk(provider, event_id); idx(received_at) (dọn sau 30 ngày — 047c job) |

1. **Enum** dùng Postgres ENUM (`call_status`, `call_direction`, `call_channel_kind`, …) như các file khác. `status` của `call_extension` là trạng thái hiển thị; nguồn thật là sự kiện LiveKit (047c).
2. **Index cho list / KPI** (indexing.md, dán EXPLAIN ở report cho 100k cuộc):
   - Nhật ký theo kỳ: `call (started_at DESC, id DESC) INCLUDE (status, direction, channel_kind, contact_id, extension_id, duration_s)`.
   - Tab theo trạng thái: `call (status, started_at DESC, id DESC)`.
   - Gọi nhỡ (partial): `call (started_at DESC, id DESC) WHERE status IN ('missed','voicemail')`.
   - 360° theo khách: `call (contact_id, started_at DESC, id DESC) WHERE contact_id IS NOT NULL`.
   - Scope own: `call (answered_by_user_id, started_at DESC)` + `call (initiated_by_user_id, started_at DESC)`.
   - Tìm theo số: `call (caller_phone, started_at DESC) WHERE caller_phone IS NOT NULL`.
   - Gọi nhỡ lặp (khoá tìm việc mở): `call (caller_phone, status, started_at DESC) WHERE status = 'missed'`.
   - Cuộc đang diễn ra: `call (status) WHERE status IN ('ringing','in_progress')`.
3. **FK nội DB** (SQL trong migration):
   - call → call_line, call_queue, call_extension: SET NULL khi xoá cấu hình. Không xoá cứng `call_line` khi còn cuộc; 047c chỉ `active = false`.
   - call_leg, call_recording, call_transcript, call_summary → call: CASCADE.
   - **Không** FK sang contact / contact_opportunity / ticket / contact_task (domain khác — handler kiểm, như 026c).
4. **Thời hạn** `expires_at = ended_at + interval '12 months'` do 047c ghi. Cột ở đây chỉ có index cho job dọn. `call_summary` không có hạn.

### 1b. Route nền tảng (`platform/routing.prisma`, chủ 002 — định tuyến không qua X-Workspace-Id, Blueprint §2.0)
- Bảng `tenant_call_route` gồm `route_key` text pk, `workspace_id`, `line_id`, `kind` (`zcc · trunk · number`), `status` (`active · disabled`), `updated_at`. Index `(workspace_id)`.
  - Khoá route: `zcc:<oa_id>` cho webhook ZCC, `trunk:<livekit_trunk_id>` cho cuộc SIP vào, `number:<e164>` cho số gọi tới.
  - 047c ghi dòng route khi lưu / tắt `call_line`. Mẫu là `connections.service.ts` upsert `tenant_integration_route`.
- Webhook LiveKit không cần route: tên phòng `ws_<workspace>_call_<callId>` mang sẵn workspace, 047c kiểm cuộc gọi có trong DB tenant đó.
- Migration platform `20261114100100_voice_pricing` tạo bảng này (cùng migration với giá / gói).

### 2. `contact_task` loại `callback` (sửa `crm-activities.prisma`, chủ 026b — DC-903 b)
- Thêm cột:
  - `kind` enum `contact_task_kind` (`task · callback`) default `task`.
  - `callback_caller` (`user · agent`) null.
  - `callback_agent_id` null.
  - `call_id` null.
  - `phone_e164` null (gọi nhỡ từ số chưa thành khách nháp).
  - `missed_count` int default 0.
- **Gọi nhỡ số lạ vẫn có khách nháp** (D61 #6), nên `contact_id` giữ NOT NULL. `phone_e164` chỉ là bản chụp số gọi lại.
- CHECK `kind = 'callback'` ⇔ `callback_caller` NOT NULL. CHECK `callback_caller = 'agent'` ⇔ `callback_agent_id` NOT NULL.
- Index:
  - Việc gọi lại mở theo hạn: `contact_task (kind, state, due_at, id) WHERE kind = 'callback' AND state = 'open'`. Dùng cho Lịch hẹn, tab Gọi nhỡ, nhắc trước 10 phút.
  - Gom gọi nhỡ lặp: `contact_task (contact_id, kind, state) WHERE kind = 'callback' AND state = 'open'`.
- Không đổi luật / handler của `contact_task.*` (047c thêm action riêng `call.schedule_callback`). Dòng cũ nhận `kind = 'task'`.
- `packages/shared/src/crm/activity-state.ts` thêm `CONTACT_TASK_KINDS`. `packages/shared/src/api/contact-activities.ts` thêm `kind`, `callback_at` (= due_at), `callback_caller` vào DTO việc. Mặc định `task`, client cũ không vỡ.

### 3. Quyền + data scope (D61 #5, Blueprint §3.5)
1. `PERMISSIONS` thêm `call.use`, `call.view`, `call.listen`, `call.monitor`, `callcenter.manage`. `PERMISSION_GROUPS` tự nhóm theo tiền tố, cần sửa `authz-unit.test.ts` nếu test liệt kê nhóm.
2. `SCOPE_MODULES` thêm `callcenter`. `ScopeModule` mở rộng. `ModuleKey` (`define.ts`) thêm `callcenter`.
3. **Vai trò hệ thống** (`roles.ts`):
   - owner / manager: cả 5 quyền, scope `callcenter: all` (`ALL` thêm khoá).
   - sales / cs / accountant: `call.use` + `call.view`, scope `callcenter: own`.
   - `call.listen`, `call.monitor`, `callcenter.manage` không cấp cho sales / cs / accountant. Prototype L8854 cho CS nghe ghi âm; D61 #5 chốt chỉ owner + manager.
4. **Vai trò tuỳ biến đã lưu:**
   - Migration tenant điền `data_scope.callcenter` cho dòng `role` chưa có khoá: `own` nếu vai trò có `inbox` ≠ `none`, ngược lại `none`.
   - Không tự thêm quyền `call.*` vào vai trò tuỳ biến (Chủ DN tự bật).
   - `checkRoleDraft` vẫn bắt đủ module mới.
5. Seed `SYSTEM_ROLES_SEED` (bản sao trong bảng `role`) cập nhật tự động vì đọc `ROLE_DEFS`. Workspace cũ nhận bản mới khi `runTenantSeeds` chạy lại (restore) hoặc qua migration tenant: cập nhật `permissions` + `data_scope` của 5 dòng `is_system = true` theo `ROLE_DEFS` mới.
6. Web: `apps/web/src/features/settings/perm-groups.ts` thêm nhóm `callcenter` (5 quyền), xoá chú thích "nhóm OUT Gọi điện". Nhãn `settings.json` (`perms.call_*`, `group.callcenter`, `module.callcenter`) vi + en. Thêm ở 047b để trang Vai trò không lộ khoá thô ngay khi quyền tồn tại.

### 4. Gói, hạn mức máy, addon (D61 #3, COMMERCE §10)
1. **`Plan` thêm `max_call_extensions int null`** (migration platform). Ý nghĩa:
   - `0` = gói không có Gọi điện.
   - `null` = không giới hạn.
   - Máy AI (900) không tính.
2. **`PlanSeed`** thêm `max_call_extensions`:
   - free / personal / personal_pro / team = 0.
   - personal_max = 1 · business = 5 · ultimate = null · enterprise = null (tuỳ chỉnh qua Quản trị nền tảng).
   - `seedPlans` chỉ tạo gói thiếu. Migration platform `UPDATE plan SET max_call_extensions = … WHERE key = …` cho gói đã có, chỉ khi cột vừa thêm còn mặc định (không ghi đè sửa tay sau này).
3. **Addon `addon_call_extension`:**
   - `ADDONS` thêm `{ key: 'addon_call_extension', kind: 'call_extension', price: '200000', period: 'month' }`. Kiểu `Addon.kind` mở rộng `'user' | 'channel' | 'call_extension'`.
   - Thẻ 150.000đ vẫn là `addon_user` "Thêm người dùng".
4. **Resource `call_extensions`:**
   - `QuotaResource` thêm `'call_extensions'`.
   - `PlanLimits.callExtensions`.
   - `activeAddons` trả thêm khoá `call_extensions`.
   - `withAddons` cộng addon `call_extensions`.
   - Ánh xạ item → resource ở `plan-changes.service.ts:129` thành bảng `ADDON_RESOURCE` trong `shared/billing/catalog.ts` (`addon_user → users`, `addon_channel → channels`, `addon_call_extension → call_extensions`). `AddonSnapshot.resource` mở kiểu tương ứng.
   - Migration platform: `subscription_addon_resource_check` thêm `'call_extensions'`; `quota_reservation` CHECK thêm `'call_extensions'`.
5. **`billing.quote` / `create_invoice`** nhận item mới không cần sửa luồng (đi theo `ADDONS`). Nếu bước rà phát hiện danh sách item cứng ở chỗ khác thì sửa trong 047b và ghi report.
6. **Gói hiển thị:**
   - `PLAN_COMPARE` thêm nhóm `callcenter`, theo prototype L11514 / L11529 sửa theo D61 #3:
     - "Tổng đài Voice": personal `— — — ✓`, business `— ✓ ✓ ✓`.
     - "Ghi âm & phiên dịch": như trên.
     - "IVR · Hàng đợi": như trên.
     - "User tổng đài": personal `— — — 1`, business `— 5 Không giới hạn Tuỳ chỉnh`.
   - Nhãn server `i18n/server/{vi,en}/billing.ts` (`addon_call_extension`). Dòng ví "Phút gọi Voice" / "Số hotline riêng" vẫn là Sắp có (thuộc 047d, hiển thị).
7. **Quản trị nền tảng:** `admin.plan.*` nhận / trả `max_call_extensions` (`actions/src/admin-config.ts`, `platform/actions/plan.handler.ts`, `platform/services/config-read.ts`, DTO `api/platform-admin.ts`, `PlanForm.tsx` + `PlansPanel.tsx` thêm ô). CAS version như các trường khác.
8. **Kiểm gói ở đâu:** 047b chỉ cung cấp `QuotaService.limits().callExtensions` + `planHasCalls(limits)`. 047c gọi `assert(ws, 'call_extensions', n)` khi tạo máy nhánh người; 047d ẩn rail / nút theo `/me`. `meSchema.workspaces[].features.calls: boolean` thêm ở 047b (`me.view.ts` + `billing-read.service.ts forMe`), mặc định false, để 047d đọc.

### 5. Giá voice (`model_price`, DC-904 e)
- Migration platform `20261114100100_voice_pricing`:
  - Thêm `unit` (`tokens_1k · minute · chars_1k`) default `tokens_1k` vào `model_price`.
  - Thêm `credits_per_unit decimal(12,4) null` cho đơn vị không phải token.
  - Seed dòng voice (DC-907 c): `stt:local` (minute, `credits_per_unit = 0`, `active = true`) và `tts:local` (chars_1k, `0`, `active = true`) cho Voice AI tự dựng; `voice_realtime:<model>` (minute) `active = false` (chỉ bật khi dùng chế độ Realtime có key); `zcc:consent_request` (đơn vị lượt, giá theo Zalo — Q-902 / DC-907 e) `active = false`.
  - `PlatformConfigRevision` scope `ai` tăng cùng transaction (DC-370).
- `PriceBook` / `CreditMeter` **chưa** tính voice ở 047b; 047c mở rộng. 047b chỉ đảm bảo `provider.store.ts` đọc được cột mới (Number), và `ModelPricesPanel.tsx` + `admin.model_price.upsert` nhận `unit` + `credits_per_unit`.
- Credit ledger: `ref_type` mới `voice_turn` và `zcc_consent` không cần đổi schema (`credit_ledger` unique(workspace_id, ref_type, ref_id) đã idempotent). Ghi chú trong `usage-receipt.ts` để 047c dùng.

### 6. Mã, nguồn, kênh
- `CODE_FORMATS` thêm `call: { prefix: 'CG', pad: 6 }`. `nextCode(tx, 'call')` dùng bộ đếm sẵn (bảng `sequence_counter` tự tạo dòng). Không đổi `CODE_START`.
- `CONTACT_SOURCES` thêm `'call'`:
  - `SOURCE_STYLE.call = { label: 'Gọi điện', color: <token tím ic-phone> }`.
  - Enum lặp ở `actions/src/crm.ts:317`, `crm-schemas.ts:21`, `shared/data-transfer/registry.ts:103` đổi sang dùng `CONTACT_SOURCES` (một nguồn sự thật).
  - Nhãn `messages/{vi,en}/customers.json` `source.call`.
  - `sourceOfChannel` thêm `'call'` (kênh `call` → `call`).
- `TICKET_CHANNELS` thêm `'call'`. `ticket.create` channel enum dùng `TICKET_CHANNELS`. Nhãn `messages/{vi,en}/tickets.json` `channel.call`. `ai-complaint.consumer.ts` không đổi.

### 7. Cấu hình mặc định của workspace
- Migration tenant chèn `call_ivr` id 1 mặc định bằng `INSERT … ON CONFLICT DO NOTHING`, cùng mẫu `booking_setting` (migration `033_booking`). Giá trị: ai_first false, after_hours `voicemail_callback`, ghi âm + thông báo + transcript + giám sát bật.
  - Workspace mới clone từ `appchat_tenant_template` (đã áp migration), nên không cần tenant seed.
  - Workspace cũ nhận dòng qua `db:migrate-tenants`.
- Không tạo `call_line` / máy nhánh (Chủ DN tự cấu hình). Chưa có module Nest `packages/core/src/callcenter/` ở 047b (047c tạo).

### 8. Lệnh DB (CLAUDE.md §7 — đủ ba lệnh, đúng thứ tự)
`pnpm --filter @appchat/db run db:generate` → `db:migrate-tenants` → `db:setup`. Kiểm `_appchat_migrations` của `appchat_tenant_template` có `20261114100000_callcenter` và DB nền tảng có `20261114100100_voice_pricing`.

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given DB demo có dữ liệu 026b / 026c, when chạy ba lệnh DB, then mọi workspace + template có bảng `call*` / `zcc_consent` / `call_webhook_receipt`, `contact_task.kind` = `task` cho dòng cũ, không mất dữ liệu | `packages/db/test/callcenter-migration.test.ts` + log ba lệnh + truy vấn `_appchat_migrations` |
| 2 | Given ràng buộc, when chèn máy nhánh trùng số / số 1 chữ số / vừa user vừa agent, SIM gateway `max_concurrent = 2`, nhóm tràn `queue` không có đích, IVR phím 10, ghi âm bật mà tắt thông báo, then DB từ chối từng ca | `callcenter-migration.test.ts` (ca CHECK / unique) |
| 3 | Given `prisma-stubs.test.ts`, when chạy, then OWNERS có `callcenter: '047b'`, dòng đầu file đúng mẫu, tổng file = 66 | `pnpm --filter @appchat/db test` |
| 4 | Given 100k cuộc + 30k việc gọi lại sinh bằng factory, when EXPLAIN nhật ký kỳ 7 ngày LIMIT 20, tab Gọi nhỡ, 360° theo khách, scope own, việc gọi lại mở theo hạn, then Index Scan / Index Only Scan đúng index §1.2 / §2, không Seq Scan | EXPLAIN (ANALYZE, BUFFERS) dán report |
| 5 | Given vai trò hệ thống + vai trò tuỳ biến cũ (inbox own / inbox none), when đọc quyền sau migration, then owner / manager có 5 quyền scope all; sales / cs / accountant có `call.use` + `call.view` scope own; tuỳ biến cũ có `callcenter` own / none, không tự có `call.*`; `checkRoleDraft` thiếu `callcenter` → `missing_module` | `packages/shared/src/authz/roles.test.ts` + `packages/core/test/authz-unit.test.ts` + integration `custom-roles.test.ts` |
| 6 | Given gói Business (5 máy) + 2 addon `addon_call_extension` còn hạn, when `QuotaService.limits()`, then `callExtensions = 7`; gói Personal Pro → 0; Ultimate → null; addon hết hạn không còn cộng; mua addon qua `billing.create_invoice` → `subscription_addon.resource = 'call_extensions'` | `apps/api/test/integration/billing-lifecycle.test.ts` (ca mới) + unit `rules` |
| 7 | Given Quản trị nền tảng, when sửa `max_call_extensions` của Business = 8 và bật dòng giá `stt:<model>` đơn vị minute, then lưu với CAS, thế hệ `ai` tăng, `provider.store` đọc được đơn giá mới ≤ 2 giây | `apps/api/test/integration/platform-admin.test.ts` (ca mới) |
| 8 | Given `CODE_FORMATS.call`, `CONTACT_SOURCES` có `call`, `TICKET_CHANNELS` có `call`, when tạo khách nguồn `call` / ticket kênh `call` qua action có sẵn, then hợp lệ, nhãn vi / en đủ, enum không còn lặp cứng | unit shared + `pnpm i18n:check` + integration `contacts` / `tickets` ca ngắn |
| 9 | Given `/me` của workspace Business / Personal Pro, when gọi, then `features.calls` = true / false | integration `identity` ca mới + `identity-shape.test.ts` mock |

### Commands / evidence gate
- Cổng commit (D59): `pnpm turbo run lint typecheck test --filter=@appchat/{shared,actions,db,core,web}` · `pnpm depcheck` · `pnpm lint:size` · `pnpm i18n:check`.
- DB: ba lệnh §8, rồi `psql … -d appchat_tenant_template -c "SELECT name FROM _appchat_migrations ORDER BY name DESC LIMIT 3;"`.
- Integration (cổng riêng theo sync wD:pD, `--workers=1`, `TENANT_CLIENT_CACHE=10`): `pnpm --filter @appchat/api test:integration -- test/integration/billing-lifecycle.test.ts test/integration/platform-admin.test.ts test/integration/custom-roles.test.ts`.
- EXPLAIN như AC4.

## CONSTRAINTS
- **DO NOT:**
  - Thêm `workspace_id` / RLS vào bảng tenant.
  - Dùng Prisma relation xuyên domain.
  - FK sang contact / cơ hội / ticket / contact_task.
  - Viết handler / controller / UI (047c / 047d).
  - Đổi luật `contact_task.*` hiện có.
  - Cấp `call.listen` cho CSKH (D61 #5 thắng prototype L8854).
  - Cho Team có Gọi điện.
  - Đổi giá `addon_user` 150k.
  - Bật sẵn dòng giá voice khi chưa có giá thật.
  - Lưu token OA / mật khẩu SIP dạng rõ.
- **REUSE:**
  - Mã hoá bí mật như kênh (`encryptSecret` của kernel).
  - `nextCode`, mẫu dòng mặc định `booking_setting`.
  - `QuotaService` / `activeAddons` / `withAddons`, `seedPlans`.
  - `admin.plan.*` / `admin.model_price.upsert`.
  - Mẫu migration `marketing` / `billing_lifecycle`.
- **SKIP:**
  - Kiểm hạn mức lúc tạo máy (047c gọi `assert`).
  - Dọn ghi âm hết hạn (job 047c).
  - Hiển thị gói / ví / rail (047d).
  - "Phút gọi Voice" / "Số hotline riêng" (Sắp có).

## Quality Gate
- [x] Manifest chính xác (file-level M/C). Giao file khai hai phía bằng `manifests.py --sync 047 047b 047c 047d`.
- [x] Bảng khớp DC-903 + Blueprint §2.2. Index theo indexing.md (= trước, range / sort sau, partial, INCLUDE). Dữ liệu cũ giữ.
- [x] Quyền khớp D61 #5 + Blueprint §3.5. Vai trò tuỳ biến cũ có đường nâng cấp rõ.
- [x] Gói / addon khớp D61 #3 + COMMERCE §10. Không đổi giá / luật đã chốt khác.
- **Gap đã khai:**
  - Phí yêu cầu gọi Zalo chưa có số thật (DC-907 e) nên dòng tắt; STT / TTS local giá 0, Realtime tắt (DC-907 c).

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Implement đúng `Files touched` (manifest), không thêm file ngoài scope.
- [ ] AC 1–9 có kết quả từng cái, dán output thật (`pnpm …`, EXPLAIN), không "pass" chung chung.
- [ ] **Tenant DB (BUILDER-HANDOFF):** không `workspace_id`; chạy CẢ `db:generate` → `db:migrate-tenants` → `db:setup`; template có migration mới.
- [ ] **Quyền / COMMERCE đã chốt chỉ đổi đúng D61:** 5 quyền `call.*` theo bảng; Team / Miễn phí / Cá nhân / Cá nhân Pro = 0 máy; addon 200.000đ; `addon_user` giữ 150.000đ.
- [ ] **Index:** EXPLAIN dán report cho 5 truy vấn AC4; không Seq Scan trên 100k.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA.

# TIP-015b: Trí nhớ khách của AI — `contact_memory`, `contact.remember`, tóm tắt Hồ sơ 360°, KPI 360° (công nợ, hợp đồng, đơn / thu gần nhất), cột "AI gợi ý"

## HEADER
- **Parallel-safe with TIP-025b (Inbox integration manifest):** sequential, shares `apps/api/src/http/crm/contacts.controller.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/customers/api.ts`, `apps/web/src/features/inbox/components/Blocks360.tsx`, `apps/web/src/features/inbox/components/Profile360Content.tsx`, `apps/web/src/shared/api/mock/domains/customers.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/core/src/index.ts`, `packages/db/prisma/tenant/crm.prisma`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 015b before025b.
- **Parallel-safe with TIP-022b (agent behavior manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/ai/src/prompts/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/ai/reply/reply-context.ts`, `packages/core/src/ai/reply/reply-tools.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 015b before022b.
- **Parallel-safe with TIP-014b (Zalo lifecycle manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `packages/actions/src/index.ts`, `packages/core/src/crm/public.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 015b before014b.
- **Parallel-safe with TIP-032b (accepted foundation manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032b before015b.
- **Parallel-safe with TIP-045b (hardening manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/customers/types.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/ai/reply/reply-context.ts`, `packages/core/src/ai/reply/reply-tools.ts`, `packages/core/src/contracts/services/contracts-read.service.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/jobs/crm.jobs.module.ts`, `packages/core/src/crm/services/contact-view.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/core/src/index.ts`, `packages/core/src/sales/payments/services/invoices-read.service.ts`, `packages/db/prisma/tenant/crm.prisma`, `packages/shared/src/api/crm.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/crm.ts`, `packages/shared/src/i18n/server/vi/crm.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 015b before045b. Recompute for later TIPs.
- **Parallel-safe with TIP-030b (contract files manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/ai/src/prompts/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/contracts/services/contracts-read.service.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 030b before015b. Recompute when incomplete manifests expand.
- **Parallel-safe with TIP-023c (genui revised manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/customers/screens/CustomersScreen.tsx`, `packages/actions/src/index.ts`, `packages/ai/src/prompts/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023c before015b. Recompute when remaining manifests expand.
- **Parallel-safe with TIP-023c (genui exact manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/customers.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/customers.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/customers/screens/CustomersScreen.tsx`, `packages/actions/src/index.ts`, `packages/ai/src/prompts/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-023c before TIP-015b. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-023b (complete manifest intersection):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/ai/src/prompts/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/ai/reply/reply-tools.ts`, `packages/core/src/contracts/services/contracts-read.service.ts`, `packages/core/src/crm/actions/contact-merge.handler.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/core/src/index.ts`, `packages/core/src/sales/payments/services/invoices-read.service.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/crm.ts`, `packages/shared/src/i18n/server/vi/crm.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-023b before TIP-015b.
- **Parallel-safe with TIP-023b (public API wiring):** sequential, shares `packages/core/src/index.ts`, `packages/shared/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/ai/src/prompts/index.ts`; integrate TIP-023b before TIP-015b.
- **Parallel-safe with TIP-023b (exact manifest audit):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/ai/reply/reply-tools.ts`, `packages/core/src/contracts/services/contracts-read.service.ts`, `packages/core/src/crm/actions/contact-merge.handler.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/services/crm-read.service.ts`, `packages/core/src/sales/payments/services/invoices-read.service.ts`, `packages/shared/src/i18n/server/en/crm.ts`, `packages/shared/src/i18n/server/vi/crm.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-023b before TIP-015b. Recompute on later manifest expansion; this is not whole-graph parallel clearance.
- **Parallel-safe with TIP-032b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-032b before TIP-015b. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-020b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate TIP-015b before TIP-020b. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-023b:** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate TIP-023b before TIP-015b. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-023c:** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate TIP-023c before TIP-015b. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-030b:** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate TIP-030b before TIP-015b. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-036:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/ai/reply/reply-context.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate TIP-015b before TIP-036. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-037:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-015b before TIP-037. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-038:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-015b before TIP-038. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-038b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-015b before TIP-038b. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-039:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-015b before TIP-039. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-040:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-015b before TIP-040. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-041:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate TIP-015b before TIP-041. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-042:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-015b before TIP-042. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-042b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/jobs/crm.jobs.module.ts`, `packages/db/prisma/tenant/crm.prisma`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-015b before TIP-042b. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-042c:** sequential, shares `coding-packs/plans/BLUEPRINT.md`, `packages/core/src/contracts/services/contracts-read.service.ts`, `packages/core/src/sales/payments/services/invoices-read.service.ts`, `packages/db/prisma/tenant/crm.prisma`; integrate TIP-015b before TIP-042c. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-043:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/ai/src/prompts/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-015b before TIP-043. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-045b:** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate TIP-015b before TIP-045b. Recompute after incomplete manifests expand.
- TIP-ID: TIP-015b (bổ sung TIP-015 / 022 — chèn sau TIP-023b, DC-231)
- **Dòng COVERAGE nhận:** REQ-D10a/D10b; REQ-F01-c/F02b/F02c/F08g; PRO-customers-rowai; DEF-015-2/015-3/015-4/022-1/026-1; COM-5-15/9-22; DC-151; ACT-contact.remember. Không nhận contact.forget/privacy.erase hoặc ai.summarize tổng quát.
- Project: AppChat V2
- Module: `packages/db/prisma/tenant/crm.prisma` (`contact_memory` đã có bảng) · `packages/core/src/crm/services/contact360.ts` · `packages/core/src/ai/reply/{reply-context, reply-tools}.ts` · `packages/actions/src/crm.ts` · FE `features/customers/components/Profile*`
- Depends on: TIP-015/022/029/030/031/032/033/034/035; tích hợp sau023b/023c/030b/032b vì UI, action contract và dữ liệu chung; trước036/020b/043/045b và các TIP chia sẻ file phía sau. Không chờ036 cho điểm, không chờ044 để tạo ba ca live.
- Priority: P0 · REQ: F02, F05, D05 · Decision: D10 (Blueprint §2.2 `contact_memory`, §5.3) · DC-231
- Estimated effort: XL (memory lifecycle, scoped summary, KPI/links, UI + live cases); không dùng ước lượng10 giờ cũ làm giới hạn phạm vi.
- **Parallel-safe with:** sequential, shares `packages/core/src/crm/services/contact360.ts` and `packages/core/src/ai/reply/reply-context.ts` with TIP-036; hoàn tất 015b trước 036, không chạy cùng worktree.

### Files touched (exact manifest)

| Op | File |
|---|---|
| M | `packages/core/src/crm/actions/contact-merge.handler.ts` |
| C | `packages/core/src/crm/memory/merge.ts` |
| M | `packages/actions/src/index.ts` |
| M | `packages/core/src/index.ts` |
| M | `packages/db/prisma/tenant/crm.prisma` |
| M | `packages/shared/src/api/crm.ts` |
| M | `packages/shared/src/api/index.ts` |
| M | `packages/shared/src/index.ts` |
| M | `packages/shared/src/events.ts` |
| M | `packages/core/src/crm/crm.module.ts` |
| M | `packages/core/src/crm/public.ts` |
| M | `packages/core/src/crm/jobs/crm.jobs.module.ts` |
| M | `packages/core/src/crm/services/contact360.ts` |
| M | `packages/core/src/crm/services/contact-view.ts` |
| M | `packages/core/src/crm/services/crm-read.service.ts` |
| M | `packages/core/src/contracts/services/contracts-read.service.ts` |
| M | `packages/core/src/sales/payments/services/invoices-read.service.ts` |
| M | `packages/core/src/ai/reply/reply-context.ts` |
| M | `packages/core/src/ai/reply/reply-tools.ts` |
| M | `packages/core/src/ai/jobs/ai.jobs.module.ts` |
| M | `apps/api/src/http/crm/contacts.controller.ts` |
| M | `apps/web/src/features/customers/screens/CustomersScreen.tsx` |
| M | `apps/web/src/features/customers/components/Customer360Drawer.tsx` |
| M | `apps/web/src/features/customers/components/Cells.tsx` |
| M | `apps/web/src/features/customers/api.ts` |
| M | `apps/web/src/features/customers/types.ts` |
| M | `apps/web/src/features/inbox/components/Blocks360.tsx` |
| M | `apps/web/src/features/inbox/components/Profile360Content.tsx` |
| M | `apps/web/messages/vi/customers.json` |
| M | `apps/web/messages/en/customers.json` |
| M | `apps/web/messages/vi/inbox.json` |
| M | `apps/web/messages/en/inbox.json` |
| M | `apps/web/messages/vi/actions.json` |
| M | `apps/web/messages/en/actions.json` |
| M | `packages/shared/src/i18n/server/vi/crm.ts` |
| M | `packages/shared/src/i18n/server/en/crm.ts` |
| M | `tools/parity/parity.manifest.ts` |
| M | `coding-packs/plans/BLUEPRINT.md` |
| M | `apps/web/src/shared/api/mock/domains/customers.ts` |
| M | `apps/web/src/shared/api/mock/domains/inbox.ts` |
| M | `packages/ai/src/prompts/index.ts` |
| C | `packages/actions/src/contact-memory.ts` |
| C | `packages/shared/src/api/contact-memory.ts` |
| C | `packages/db/prisma/tenant/migrations/20261102001510_contact_memory/migration.sql` |
| C | `packages/core/src/crm/memory/memory.module.ts` |
| C | `packages/core/src/crm/memory/memory.providers.ts` |
| C | `packages/core/src/crm/memory/handlers.ts` |
| C | `packages/core/src/crm/memory/repository.ts` |
| C | `packages/core/src/crm/memory/normalize.ts` |
| C | `packages/core/src/crm/memory/summary.ts` |
| C | `packages/core/src/crm/memory/revision.ts` |
| C | `packages/core/src/crm/memory/summary-consumer.ts` |
| C | `packages/core/src/crm/memory/read.ts` |
| C | `packages/core/src/crm/insights/customer-kpis.ts` |
| C | `packages/core/src/crm/insights/customer-debt.ts` |
| C | `packages/core/src/crm/insights/customer-links.ts` |
| C | `packages/core/src/crm/insights/next-action.ts` |
| C | `packages/core/src/crm/insights/read.ts` |
| C | `packages/ai/src/prompts/contact-summary.vi.md` |
| C | `packages/ai/src/prompts/contact-summary.en.md` |
| C | `apps/web/src/shared/contact-memory/MemoryPanel.tsx` |
| C | `apps/web/src/shared/contact-memory/useContactMemory.ts` |
| C | `apps/web/src/shared/contact-memory/api.ts` |
| C | `apps/web/src/features/customers/hooks/useAssignContactAi.ts` |
| C | `packages/core/test/contact-memory.test.ts` |
| C | `packages/core/test/contact-insights.test.ts` |
| C | `apps/api/test/integration/contact-memory.test.ts` |
| C | `apps/web/src/shared/contact-memory/MemoryPanel.test.tsx` |
| C | `apps/web/e2e/http/contact-memory.spec.ts` |
| C | `apps/web/e2e/contact-memory.spec.ts` |
| C | `tools/parity/modules/contact-memory.ts` |
| C | `fixtures/ai-eval/contact-memory.json` |
| C | `coding-packs/reports/TIP-015b-completion.md` |

## CONTEXT
- Working directory: D:/CODING/AppChat_Ver2; stack theo BUILDER-HANDOFF: NestJS/Prisma, Postgres16 native/pg_trgm, AI SDK qua AgentEngine, React/TanStack Query. Không Docker, không thêm thư viện.
- Blueprint §2.2 + §5.3: agent lắp ngữ cảnh có `contact_memory`; AI ghi nhớ sự kiện về khách (sở thích, dị ứng, lịch quen…). Bảng có nhưng **không chỗ nào ghi** (chỉ `contact.merge` dời bản ghi); report TIP-015 / 022 ghi "TIP riêng sau" mà task graph không có.
- Hồ sơ 360°: `kpis: []`, `recent_order` / `recent_payment` rỗng, không có công nợ / hợp đồng hiệu lực (`contact360.ts`); quy đổi điểm sai `×10` (TIP-036 sửa).
- Schema crm.prisma:203–213 chỉ có fact/sourceRunId/confidence/createdAt; reply-context.ts:81 đã đọc10 fact nhưng chưa writer. ContactsController:130–134 trả `/crm/ai` rỗng, contact-view.ts:89 gợi ý wait; không coi các phần này đã xong vì có DTO.

## APPLICABLE STANDARDS
- actions/action-registry; api/response-envelope; authz/rbac-permissions; database/tenant-db và indexing; events/outbox.
- ai/agent-gateway, ai/eval; domain/concurrency, money-time-numbering, validation-defaults; code/testing, file-size-module-layout.
- ui/frontend-structure, prototype-parity, interaction-patterns; i18n/i18n; ops/observability-security; workflow/git-flow-ci. Luật COMMERCE giữ nguyên, không tự định nghĩa lại công nợ/LTV/điểm.

## Rà trước khi làm
1. Kiểm CONTEXT với code sau023b/023c/030b/032b, chốt shape ActionPreview/360 và hook mở assistant hiện hữu. Không tạo luồng assistant thứ hai chỉ cho nút Giao AI.
2. Kiểm tên event thực và registration CrmModule/CrmJobsModule/AI jobs; module memory không import ngược AiModule gây vòng DI. Inject gateway/runtime adapter qua factory, mọi model call qua packages/ai; mọi ghi memory qua Executor.
3. Migration thêm updated_at/provenance, contact memory revision và summary cache scoped; backfill updated_at=created_at, provenance không biết để null, không bịa agent nguồn. Không thêm workspace_id vào tenant tables. Kê index trong migration, không sửa schema đã có ở TIP DONE.
4. Truy vấn contract/order/invoice/appointment/ticket/task phải kiểm quyền module và scope từng bản ghi, không dùng quyền crm.view để mở toàn bộ chứng từ. Rà hiện trạng field-level045b để interface không làm lộ tiền cho CS.
5. tools/ai-live chưa có tại thời điểm viết. Fixture JSON mới thuộc015b;023b phải cung cấp runner có `--cases <path>` trước khi build015b,044 nhận fixture vào harness release sau. Không tự ghi report model thật nếu thiếu key.

## SPECIFICATIONS — hợp đồng dữ liệu và wiring
- Action `contact.remember`/`contact.memory_forget`: crm.edit + writable contact scope; watcher chỉ đọc. Agent chỉ được nhớ nếu tool được cấp/published và contact đúng conversation đang phục vụ; không thêm meta-tool ghi bypass registry. Không tự bật tool cho agent đã cấu hình. Copilot không commit memory chỉ vì model đề xuất. Forget là xoá fact, không privacy.erase; undo không vượt scope/cap50.
- Validate UUID, fact trim1–1000 ký tự, confidence hữu hạn0..1, nguồn từ server. Cấm credential/thẻ/CCCD trong fact kể cả governance PII tắt; message prompt injection không thành quyền viết. Foreign/forbidden trả lỗi trước đọc fact; VALIDATION_FAILED422, NOT_FOUND404 hoặc FORBIDDEN403 theo quy ước tránh leak; stale edit409, undo quá hạn theo kernel. Dùng undo window24h cho memory_forget, giữ snapshot đã redacted/audit đúng policy.
- `memory.module.ts` đăng ký handlers/read/summary/repository; CrmModule import và public export cho controller/AI. `crm.jobs.module.ts` nạp summary-consumer, AI jobs nạp CrmModule để có handler khi resume. Helper memory độc lập, không nhét vào contact360 hoặc reply-context.
- `crm.jobs.module.ts` đăng ký periodic purge receipt merge đã hết7 ngày; implementation ở memory/merge.ts, bounded batch IDs-first `(expires_at,id)` partial no-hold, transaction kiểm lại expiry/hold trước xoá snapshot. Không purge receipt đang undo, không xoá memory active; replay purge idempotent. contact-memory.test.ts phải có expiry boundary, active hold, race undo/purge và duplicate job.
- **Merge/undo cũng phải giữ cap:** contact-merge.handler.ts:71/:100 hiện chuyển memory bằng updateMany. Thay phần memory bằng helper memory/merge.ts trong cùng transaction; khoá mọi contact liên quan theo UUID tăng dần trước đọc/move để tránh deadlock. Preview hiện số fact sau dedupe, số sẽ ra khỏi active set; nếu>50 giữ50 theo confidence/time/id, lưu snapshot lossless của hai phía và provenance/IDs trong bảng receipt riêng (migration crm.prisma), không nhét facts vào log public. Snapshot chỉ phục vụ undo7 ngày hiện có của contact.merge, không đọc vào model; purge sau hết cửa sổ và không hold. Undo khôi phục đúng phía dưới cùng lock và kiểm receipt/revision: nếu fact đã bị người sửa/xoá sau merge hoặc khôi phục làm vượt50 thì trả STALE_VERSION, không ghi đè fact mới hoặc hồi sinh fact đã forget; giữ snapshot cho tới hết hạn để xử lý conflict. Test merge50+50, merge đồng thời remember, inverse pair merge tránh deadlock, undo sau thay đổi và retry receipt. `memory_forget` undo khi cap đầy cũng trả conflict, không tự xoá fact khác.
- `crm/insights/read.ts` thay hard-code `/crm/ai`: scoped run counts và bounded peek thật từ ai_run/step, không gọi model theo mỗi GET/list row. next-action trả suggestion/provenance/status, model chỉ chạy theo action yêu cầu với credit quota; fallback rule phải ghi rõ là rule, không giả model.
- KPI công nợ gồm phải thu còn lại/quá hạn không cộng double invoice partial pay; thống nhất customer-debt helper cho contact360, contracts-read và invoice list meta. LTV là thu ròng confirmed (refund âm đúng một lần); đơn huỷ không tự xoá tiền đã thu nếu chưa có refund, không cộng draft quote/order làm doanh thu. Contract giá trị hiệu lực/expiry theo signed status, không cộng phụ lục hai lần; booking/ticket/SLA/CSAT/task lấy dữ liệu hiện có, unavailable khác0.
- `customer-links.ts` cung cấp bounded links tới quote/order/appointment/ticket/task và tình trạng SLA/CSAT cho Blocks360; shared DTO mở rộng tương thích, mock/http cùng schema. MemoryPanel nằm shared để customer/inbox dùng cùng API/hook, không import chéo feature component.
- Snapshot summary chỉ chứa trường user được xem. `revision.ts` đọc snapshot có thứ tự ổn định gồm memory/timeline/linked entities và aggregate KPI, hash snapshot+scope+prompt/locale để kiểm cache. Event revision chỉ là hint invalidation, không là bằng chứng cache còn đúng khi event chậm/thiếu. Trước publish model result đọc lại fingerprint; lệch thì bỏ cache result và trả retry state, không vòng gọi model vô hạn. Tối đa một regeneration/request, lỗi provider hiện retry/fallback và không xoá summary hợp lệ của revision khác.
- SQL: memory(contact_id,updated_at DESC,id) INCLUDE(confidence,source_run_id); deferred IDs-first lấy tối đa20 fact trước text. Normalized fact biểu thức/trigram index khớp câu lọc; khóa contact rồi tìm tương tự trên tối đa50 dòng. Đọc recent chứng từ equality contact/status trước sort_time/id, INCLUDE payload nhỏ; partial deleted/status indexes theo query. Aggregates không bị giới hạn bởi LIMIT recent; count queries cố định theo domain, không N+1 mỗi contact. Thêm EXPLAIN ANALYZE BUFFERS với seed lớn, so sánh own/all; không thêm index trùng sẵn có.
- tools/parity/parity.manifest.ts đã vượt trần: chỉ1–2 dòng facade đăng ký module contact-memory.ts mới. Tất cả logic/screens/memory test tách riêng theo manifest; file backend≥500 phải tách trước bổ sung.

## TASK
1. **`contact.remember { contact_id, fact, confidence? }`** (risk write, agentGrantable, không skill): ghi `contact_memory` với provenance run/step/actor từ context tin cậy, không tin provenance do model gửi. skill chỉ dành cho action read theo D51. Bảng hiện tại chưa có updated_at/step/actor, phải có migration trong manifest hoàn thiện. Chống trùng **văn bản** sau chuẩn hoá: trigram≥0.9, không tuyên bố đây là hiểu gần nghĩa. Trong transaction khoá contact trước đọc/ghi memory; tương đồng thì cập nhật timestamp/provenance, không thêm dòng. Cap50 áp cả khi51 request đồng thời; eviction chọn confidence thấp nhất, rồi updated_at cũ nhất, rồi id để thứ tự tất định. `contact.memory_forget { memory_id }` (xoá, có undo); undo cũng kiểm scope hiện tại và cap50, không lặng lẽ hồi sinh thành51 fact.
2. **Agent trực kênh tự ghi:** tool `remember` cho agent (sau mỗi lượt, model đề xuất fact mới từ tin khách; chỉ fact về khách, không ghi PII nhạy cảm theo bộ lọc PII sẵn có của TIP-022). Lắp ngữ cảnh đọc ≤ 20 fact mới nhất.
3. **Tóm tắt 360°:** `contact.summarize { contact_id }` (read, skill) → 3–5 dòng từ timeline + memory + chứng từ, hiện ở khối AI tóm tắt và contact.get023b. Cache theo tenant/contact/actor-scope-revision/data-revision/prompt-version/locale; không dùng riêng contact.updated_at. Data revision tăng qua event idempotent khi memory/timeline/quote/order/contract/payment/appointment/ticket/task đổi; đối chiếu revision trước lưu kết quả model để không publish summary cũ khi dữ liệu vừa đổi. Recheck quyền khi đọc cache; không dùng summary Owner cho sales bị ẩn công nợ. Cache miss/error có fallback dữ liệu thật, không giả summary.
4. **KPI 360° thật:** công nợ (đề nghị thanh toán chưa thu, quá hạn), hợp đồng hiệu lực + giá trị, đơn gần nhất, khoản thu gần nhất; đủ liên kết quote/appointment/ticket/task theo REQ-F02c. Sửa debt ở contracts-read.service cùng công thức nguồn, không chỉ sửa contact360 rồi để endpoint hợp đồng trả0. Điền kpis/recent_order/recent_payment theo shared schema; phân biệt0 thật với unavailable. **Không phụ thuộc ngược036:**015b giữ interface điểm hiện có và không nghiệm thu điểm mới;036 nhận tích hợp loyalty cùng retest KPI/consumer015b.
5. **Cột / khối AI gợi ý và nút Giao AI:** gợi ý bước tiếp theo từ memory + giai đoạn, cache theo revision như summary (TTL tối đa ngày), không tự gửi. Bấm Giao AI mở assistant với contact id đã kiểm scope và prompt đề xuất; chỉ tạo draft/run theo luồng hiện hữu, mọi ghi/gửi tiếp vẫn preview/confirm/policy. Nút phải nối cả danh sách khách và ngữ cảnh360 theo prototype; không toast giả, không cấp agent quyền mới.
6. FE: khối "AI ghi nhớ" trong Hồ sơ 360° (xem / xoá fact), i18n.

## ACCEPTANCE CRITERIA
1. Integration: agent (model giả) gặp "em dị ứng tinh dầu sả" → contact_memory có fact; lượt sau ngữ cảnh chứa fact; fixture normalized trigram≥0.9 không thêm dòng, fixture ngay dưới0.9 không bị gộp chỉ vì model nói gần nghĩa; sales chỉ thấy memory khách trong scope.
2. Integration: 360° có công nợ / HĐ / đơn / thu đúng số với dữ liệu seed; EXPLAIN các truy vấn KPI dùng index.
3. Unit: chuẩn hoá fact, chọn fact bị thay khi đầy.
4. Model thật: bộ `pnpm ai:live` thêm 3 ca ghi nhớ / dùng lại trí nhớ.
5. Cổng D59; parity Hồ sơ 360° < 5%.

### AC bổ sung bắt buộc sau review độc lập
- Given51 request nhớ đồng thời cùng contact, When transaction hoàn tất, Then cap≤50, không duplicate chuẩn hoá, eviction tất định; malformed confidence/fact/foreign memory ID bị chặn trước ghi.
- Given memory hoặc payment đổi khi model đang tóm tắt, When response trở về hoặc cache được đọc bởi user scope thấp hơn, Then không trả dữ liệu stale/vượt quyền; forget/undo tăng revision đúng một lần kể cả event replay.
- Given legacy Contact.aiSummary chứa công nợ do Owner tạo, When CS mở360 lúc scoped cache miss/provider error, Then tuyệt đối không fallback sang aiSummary dùng chung tại contact360.ts:42; trả summary unavailable/dữ liệu đã lọc. Migration chỉ invalidate cache legacy, không tái xuất nội dung cũ sang scoped cache.
- Given cùng khách có quote/appointment/ticket/task/contract/order/payment trong fixture, When mở360 và endpoint hợp đồng, Then số liệu/công nợ cùng nguồn, links đúng entity và scope; không lấy điểm036 làm điều kiện chốt015b.
- Given nút Giao AI, When bấm rồi huỷ xác nhận, Then mở đúng contact context nhưng không phát sinh ghi/gửi; đổi quyền sau mở panel phải bị server từ chối.
- Live3 ca cố định: ghi fact dị ứng không nhạy cảm → lượt sau dùng đúng fact; diễn đạt lại không tạo fact mâu thuẫn tự suy đoán; yêu cầu nhớ CCCD/thẻ/mật khẩu bị chặn và không xuất hiện ở DB/context/log. Ghi expected facts và trace/assertions vào bộ ca, không chỉ chấm câu trả lời nghe hợp lý.

## CONSTRAINTS
- Không lưu số CCCD / thẻ / mật khẩu vào memory (bộ lọc PII).
- Không tự gửi khách dựa trên gợi ý.
- LTV trong TIP này là **tổng thu ròng đã xác nhận của khách** (payment/deposit confirmed + refund âm), không đồng nhất doanh thu đơn với tiền đã thu. Ghi nhãn/tooltip nguồn và dùng cùng định nghĩa sales.collected của038 khi tích hợp sau; không đợi038 để build015b. Đơn huỷ không tự làm biến mất khoản thu confirmed nếu chưa có refund, không trừ refund hai lần.
- Chỉ thêm summary/cache projection, không ghi lại giá/tiền/công nợ ledger. Mọi mutation fact/undo qua ActionExecutor; không nới quyền của agent, collaborator hoặc watcher.

## Lệnh nghiệm thu builder (chưa chạy trong pha tài liệu)
```powershell
pnpm --filter @appchat/core exec vitest run test/contact-memory.test.ts test/contact-insights.test.ts
pnpm --filter @appchat/api exec vitest run --config vitest.integration.config.ts test/integration/contact-memory.test.ts
pnpm --filter @appchat/web exec vitest run src/shared/contact-memory/MemoryPanel.test.tsx
pnpm --filter @appchat/web exec playwright test e2e/contact-memory.spec.ts
pnpm e2e:http contact-memory
pnpm ai:live --cases fixtures/ai-eval/contact-memory.json
pnpm i18n:check
pnpm parity contact-memory
pnpm parity --done
```
`ai:live --cases` là hợp đồng runner023b cần bổ sung trước implementation, không khẳng định script đã tồn tại. Fixture chỉ dùng ephemeral workspace, không tenant demo. Tests DB thật cho cap/concurrency/undo/scope, không mock Prisma thay bằng chứng. Ghi kết quả từng ca live và model/prompt/hash/tokens; safety100%, không dùng mock làm nghiệm thu live. Cổng D59 theo BUILDER-HANDOFF trước commit và chốt TIP; không chạy full suite trong pha docs.

## BUILDER-CHECKLIST
- [ ] Đối chiếu73 đường dẫn manifest; M hiện có, C chưa có; cập nhật theo prerequisite đã merge trước khi code.
- [ ] Action-first, tenant isolation và writable/read scope của memory/summary/KPI qua API/agent đều có negative tests.
- [ ] Migration/backfill/provenance/cap50/undo và EXPLAIN/query count được chứng minh bằng Postgres thật.
- [ ] Summary không stale/leak, CRM AI endpoint/nút Giao AI không fake; bộ ca live3 case có evidence.
- [ ] Không buộc015b chờ036/038/044, không sửa monolith parity ngoài facade; UI mock/http/vi/en/mobile/parity được kiểm.
- [ ] Report ghi rõ runtime chưa chạy hoặc fail nếu có; D59, commit SHA sạch và PR chỉ vào dev khi thi công.

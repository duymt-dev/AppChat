# TIP-038b — Nhập/xuất CRM và commerce AI-first, file thật

## HEADER
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 038b before014c.
- **Parallel-safe with TIP-033d (coverage-closure manifest):** sequential, shares `packages/core/src/data-transfer/adapters/orders.ts`; integrate 038b before033d.
- **Parallel-safe with TIP-046 (release gate manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 038b before046.
- **Parallel-safe with TIP-003e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 038b before003e.
- **Parallel-safe with TIP-003f (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 038b before003f.
- **Parallel-safe with TIP-003h (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 038b before003h.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 038b before004b.
- **Parallel-safe with TIP-011b (coverage-closure manifest):** sequential, shares `coding-packs/docs/06-prototype/DEVIATIONS.md`; integrate 038b before011b.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 038b before013b.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 038b before013c.
- **Parallel-safe with TIP-031b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 038b before031b.
- **Parallel-safe with TIP-020e (RAG model lifecycle manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate 038b before020e.
- **Parallel-safe with TIP-045 (Native infrastructure manifest):** sequential, shares `coding-packs/plans/BLUEPRINT.md`, `packages/core/src/index.ts`; integrate 038b before045.
- **Parallel-safe with TIP-034d (Ticket stock manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before034d.
- **Parallel-safe with TIP-034c (Ticket bulk manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/data-transfer.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/data-transfer.json`, `packages/actions/src/index.ts`, `packages/core/src/data-transfer/data-transfer.module.ts`, `packages/core/src/data-transfer/data-transfer.providers.ts`, `packages/core/src/data-transfer/services/planner.ts`, `packages/core/src/data-transfer/types.ts`, `packages/shared/src/api/data-transfer.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/data-transfer/registry.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before034c.
- **Parallel-safe with TIP-034b (Support categories manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/data-transfer.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/data-transfer.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/data-transfer/data-transfer.module.ts`, `packages/core/src/data-transfer/data-transfer.providers.ts`, `packages/core/src/data-transfer/jobs/transfer.runner.ts`, `packages/core/src/data-transfer/services/planner.ts`, `packages/core/src/data-transfer/services/validation.ts`, `packages/core/src/data-transfer/types.ts`, `packages/shared/src/api/data-transfer.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/data-transfer/registry.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before034b.
- **Parallel-safe with TIP-027b (Product media manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/data-transfer.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/data-transfer.json`, `apps/web/src/features/data-transfer/components/MappingEditor.tsx`, `apps/web/src/features/data-transfer/components/PreviewTable.tsx`, `packages/actions/src/index.ts`, `packages/core/src/data-transfer/adapters/catalog.ts`, `packages/core/src/data-transfer/services/mapping.ts`, `packages/core/src/data-transfer/services/validation.ts`, `packages/shared/src/api/data-transfer.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/data-transfer/registry.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before027b.
- **Parallel-safe with TIP-032d (Commerce files manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before032d.
- **Parallel-safe with TIP-033c (Appointment order manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before033c.
- **Parallel-safe with TIP-020d (RAG citations manifest):** sequential, shares `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before020d.
- **Parallel-safe with TIP-023g (Record AI manifest):** sequential, shares `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before023g.
- **Parallel-safe with TIP-030c (Parent signing manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 038b before030c.
- **Parallel-safe with TIP-006b (Event delivery manifest):** sequential, shares `apps/worker/src/roles/jobs.module.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`; integrate 038b before006b.
- **Parallel-safe with TIP-003c (System actions manifest):** sequential, shares `apps/api/src/app.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`; integrate 038b before003c.
- **Parallel-safe with TIP-003b (Event protocol manifest):** sequential, shares `apps/worker/src/roles/jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/index.ts`; integrate 038b before003b.
- **Parallel-safe with TIP-023f (Assistant input manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/features/assistant/components/ChatThread.tsx`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before023f.
- **Parallel-safe with TIP-023e (Action discovery manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 038b before023e.
- **Parallel-safe with TIP-023d (Assistant plans manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/features/assistant/components/ChatThread.tsx`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before023d.
- **Parallel-safe with TIP-015c (Privacy manifest):** sequential, shares `apps/api/src/app.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/app/(app)/layout.tsx`, `apps/web/src/features/data-transfer/components/TransferPanel.tsx`, `apps/web/src/features/data-transfer/hooks/useTransfer.ts`, `apps/web/src/features/data-transfer/types.ts`, `apps/web/src/shared/assistant/data-transfer-command.ts`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/data-transfer.ts`, `packages/actions/src/index.ts`, `packages/core/src/crm/actions/contact-io.handlers.ts`, `packages/core/src/data-transfer/adapters/contacts.ts`, `packages/core/src/data-transfer/adapters/document-files.ts`, `packages/core/src/data-transfer/data-transfer.module.ts`, `packages/core/src/data-transfer/data-transfer.providers.ts`, `packages/core/src/data-transfer/jobs/transfer.runner.ts`, `packages/core/src/data-transfer/services/ai-planner.ts`, `packages/core/src/data-transfer/services/artifacts.ts`, `packages/core/src/data-transfer/services/planner.ts`, `packages/core/src/data-transfer/services/validation.ts`, `packages/core/src/data-transfer/types.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/data-transfer.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/data-transfer/registry.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before015c.
- **Parallel-safe with TIP-019c (AI utilities manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before019c.
- **Parallel-safe with TIP-033b (Booking operations manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/data-transfer.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/data-transfer.json`, `apps/web/src/shared/assistant/data-transfer-command.ts`, `packages/actions/src/data-transfer.ts`, `packages/actions/src/index.ts`, `packages/core/src/data-transfer/data-transfer.module.ts`, `packages/core/src/data-transfer/data-transfer.providers.ts`, `packages/core/src/data-transfer/jobs/data-transfer.jobs.module.ts`, `packages/core/src/data-transfer/jobs/transfer.runner.ts`, `packages/core/src/data-transfer/services/ai-planner.ts`, `packages/core/src/data-transfer/services/planner.ts`, `packages/core/src/data-transfer/services/validation.ts`, `packages/core/src/data-transfer/types.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/data-transfer.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/data-transfer/registry.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before033b.
- **Parallel-safe with TIP-012c (Tenant mail manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before012c.
- **Parallel-safe with TIP-015e (Contact merge manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/data-transfer/adapters/contacts.ts`, `packages/core/src/data-transfer/adapters/contracts.ts`, `packages/core/src/data-transfer/adapters/invoices.ts`, `packages/core/src/data-transfer/adapters/orders.ts`, `packages/core/src/data-transfer/adapters/quotes.ts`, `packages/core/src/data-transfer/services/artifacts.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before015e.
- **Parallel-safe with TIP-015f (Contact lifecycle manifest):** sequential, shares `apps/api/src/app.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/crm/actions/contact-io.handlers.ts`, `packages/core/src/data-transfer/adapters/contacts.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before015f.
- **Parallel-safe with TIP-032c (Commerce edit manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/data-transfer/adapters/contracts.ts`, `packages/core/src/data-transfer/adapters/orders.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before032c.
- **Parallel-safe with TIP-015d (CRM ownership manifest):** sequential, shares `apps/api/src/app.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/data-transfer/adapters/quotes.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before015d.
- **Parallel-safe with TIP-026b (CRM activity manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/data-transfer.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/data-transfer.json`, `apps/web/src/features/data-transfer/components/TransferPanel.tsx`, `apps/web/src/features/data-transfer/hooks/useTransfer.ts`, `apps/web/src/features/data-transfer/types.ts`, `apps/web/src/shared/assistant/data-transfer-command.ts`, `packages/actions/src/data-transfer.ts`, `packages/actions/src/index.ts`, `packages/core/src/data-transfer/actions/plan.handlers.ts`, `packages/core/src/data-transfer/data-transfer.providers.ts`, `packages/core/src/data-transfer/jobs/transfer.runner.ts`, `packages/core/src/data-transfer/services/ai-planner.ts`, `packages/core/src/data-transfer/services/artifacts.ts`, `packages/core/src/data-transfer/services/planner.ts`, `packages/core/src/data-transfer/services/validation.ts`, `packages/core/src/data-transfer/types.ts`, `packages/core/src/index.ts`, `packages/db/prisma/tenant/data-transfer.prisma`, `packages/shared/src/api/data-transfer.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/data-transfer/registry.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before026b.
- **Parallel-safe with TIP-012b (Bank integration manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before012b.
- **Parallel-safe with TIP-019b (Runtime integration manifest):** sequential, shares `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before019b.
- **Parallel-safe with TIP-025b (Inbox integration manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/data-transfer/data-transfer.providers.ts`, `packages/core/src/data-transfer/jobs/transfer.runner.ts`, `packages/core/src/data-transfer/services/planner.ts`, `packages/core/src/data-transfer/services/validation.ts`, `packages/core/src/data-transfer/types.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/data-transfer.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/data-transfer/registry.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before025b.
- **Parallel-safe with TIP-022b (agent behavior manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 022b before038b.
- **Parallel-safe with TIP-014b (Zalo lifecycle manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 014b before038b.
- **Parallel-safe with TIP-032b (accepted foundation manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032b before038b.
- **Parallel-safe with TIP-045b (hardening manifest):** sequential, shares `apps/api/src/app.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/roles/jobs.module.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/crm/actions/contact-io.handlers.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 045b before038b. Recompute for later TIPs.
- **Parallel-safe with TIP-030b (contract files manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 030b before038b. Recompute when incomplete manifests expand.
- **Parallel-safe with TIP-023c (genui revised manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/features/assistant/components/ChatThread.tsx`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023c before038b. Recompute when remaining manifests expand.
- **Parallel-safe with TIP-023c (genui exact manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/features/assistant/components/ChatThread.tsx`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-023c before TIP-038b. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-023b (complete manifest intersection):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/features/assistant/components/ChatThread.tsx`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/crm/actions/contact-io.handlers.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-023b before TIP-038b.
- **Parallel-safe with TIP-023b (public API wiring):** sequential, shares `packages/core/src/index.ts`, `packages/shared/src/index.ts`, `packages/shared/src/api/index.ts`; integrate TIP-023b before TIP-038b.
- **Parallel-safe with TIP-023b (exact manifest audit):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/features/assistant/components/ChatThread.tsx`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/crm/actions/contact-io.handlers.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-023b before TIP-038b. Recompute on later manifest expansion; this is not whole-graph parallel clearance.
- **Parallel-safe with TIP-032b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-032b before TIP-038b. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-015b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-015b before TIP-038b. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-041:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate this TIP before 041. Recheck incomplete manifests.
- TIP-ID: TIP-038b; Project: AppChat V2; Module: data-transfer; Priority: P0; Estimated: XL.
- **Yêu cầu Chủ nhà:** nhập/xuất dữ liệu các bảng CRM, commerce; cả AI và không AI; xuất file thật. **AI là ưu tiên**, không làm nút AI trang trí hoặc chỉ bàn giao wizard thủ công.
- **Parallel-safe with TIP-039 (bilateral audit 2026-11-02):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 039 before038b.
- Depends on:023b action discovery,023c attachment/GenUI,030b document parsing,032b product.import,038 list exports,042c scopes,045b asyncjobs/fieldmask/file security; integration sau040 và cácpending sharedTIP, trước044/046.
- **Dòng COVERAGE nhận:** IO-CRM, IO-CATALOG, IO-QUOTE, IO-ORDER, IO-CONTRACT, IO-INVOICE, IO-AI-FIRST, IO-MANUAL, IO-FILES, IO-SAFETY, IO-RETRY. Ma trận/task/AC bên dưới là ownership cụ thể, không chỉ giao “mọi bảng”.
- **Parallel-safe with:** sequential, shares actions/core/shared indexes và Blueprint với015b/020b/023b/023c/030b/032b/036–040/042/042b/042c/043/045b; ai.jobs.module với023b/023c/036/037/038/043/045b; ChatThread với023c. Hai chiều tính trước tạo; pendingmanifest mởrộng phải tínhlại.
- **Files touched:** C=create/M=modify. Chỉ tài liệu ởcâuA; code sau completeplanning.

| Op | File |
|---|---|
| M | `apps/web/messages/vi/actions.json` |
| M | `apps/web/messages/en/actions.json` |
| M | `tools/parity/parity.manifest.ts` |
| M | `apps/web/src/app/(app)/layout.tsx` |
| C | `apps/web/src/app/(app)/_data-transfer/TransferHost.tsx` |
| M | `packages/actions/src/index.ts` |
| M | `packages/core/src/index.ts` |
| M | `packages/shared/src/api/index.ts` |
| M | `packages/shared/src/index.ts` |
| M | `apps/api/src/app.module.ts` |
| M | `apps/worker/src/roles/jobs.module.ts` |
| M | `packages/core/src/ai/jobs/ai.jobs.module.ts` |
| M | `packages/core/src/crm/actions/contact-io.handlers.ts` |
| M | `apps/web/src/features/customers/components/ImportModal.tsx` |
| M | `apps/web/src/features/customers/hooks/useExportContacts.ts` |
| M | `coding-packs/plans/BLUEPRINT.md` |
| M | `coding-packs/docs/06-prototype/DEVIATIONS.md` |
| M | `apps/web/src/features/assistant/components/ChatThread.tsx` |
| C | `packages/actions/src/data-transfer.ts` |
| C | `packages/shared/src/api/data-transfer.ts` |
| C | `packages/shared/src/data-transfer/registry.ts` |
| C | `packages/db/prisma/tenant/data-transfer.prisma` |
| C | `packages/db/prisma/tenant/migrations/20261102003810_data_transfer/migration.sql` |
| C | `packages/core/src/data-transfer/data-transfer.module.ts` |
| C | `packages/core/src/data-transfer/data-transfer.providers.ts` |
| C | `packages/core/src/data-transfer/public.ts` |
| C | `packages/core/src/data-transfer/types.ts` |
| C | `packages/core/src/data-transfer/actions/plan.handlers.ts` |
| C | `packages/core/src/data-transfer/actions/commit.handlers.ts` |
| C | `packages/core/src/data-transfer/services/planner.ts` |
| C | `packages/core/src/data-transfer/services/file-parser.ts` |
| C | `packages/core/src/data-transfer/services/validation.ts` |
| C | `packages/core/src/data-transfer/services/mapping.ts` |
| C | `packages/core/src/data-transfer/services/artifacts.ts` |
| C | `packages/core/src/data-transfer/services/ai-planner.ts` |
| C | `packages/core/src/data-transfer/adapters/contacts.ts` |
| C | `packages/core/src/data-transfer/adapters/catalog.ts` |
| C | `packages/core/src/data-transfer/adapters/quotes.ts` |
| C | `packages/core/src/data-transfer/adapters/orders.ts` |
| C | `packages/core/src/data-transfer/adapters/contracts.ts` |
| C | `packages/core/src/data-transfer/adapters/invoices.ts` |
| C | `packages/core/src/data-transfer/adapters/document-files.ts` |
| C | `packages/core/src/data-transfer/jobs/data-transfer.jobs.module.ts` |
| C | `packages/core/src/data-transfer/jobs/transfer.runner.ts` |
| C | `packages/core/src/data-transfer/jobs/transfer-recovery.ts` |
| C | `apps/api/src/http/data-transfer/data-transfer.http.module.ts` |
| C | `apps/api/src/http/data-transfer/data-transfer.controller.ts` |
| C | `apps/web/src/features/data-transfer/types.ts` |
| C | `apps/web/src/features/data-transfer/api.ts` |
| C | `apps/web/src/features/data-transfer/components/TransferPanel.tsx` |
| C | `apps/web/src/features/data-transfer/components/MappingEditor.tsx` |
| C | `apps/web/src/features/data-transfer/components/PreviewTable.tsx` |
| C | `apps/web/src/features/data-transfer/components/TransferResult.tsx` |
| C | `apps/web/src/features/data-transfer/hooks/useTransfer.ts` |
| C | `apps/web/src/shared/assistant/data-transfer-command.ts` |
| C | `apps/web/messages/vi/data-transfer.json` |
| C | `apps/web/messages/en/data-transfer.json` |
| C | `packages/core/test/data-transfer.test.ts` |
| C | `packages/core/test/data-transfer-ai.test.ts` |
| C | `apps/api/test/integration/data-transfer.test.ts` |
| C | `apps/web/e2e/http/data-transfer.spec.ts` |
| C | `tools/parity/modules/data-transfer.ts` |
| C | `coding-packs/reports/TIP-038b-completion.md` |
| C | `packages/core/src/data-transfer/ai/live-cases.ts` |

## CONTEXT
- Workspace D:/CODING/AppChat_Ver2; stack theoCLAUDE: NestJS/Prisma nativePostgres, BullMQ, Next.js/AntD, exceljs, document renderer/parser qua ports hiện hữu.
- `actions/crm.ts:315–365`: contact.import nhận rows đãmap≤500, crm.import, bulk, agentGrantablefalse; contact.export CSV read/crm.export/agentGrantablefalse. **AI-first không có nghĩa tự bật grantchoagent**.
- `core/crm/actions/contact-io.handlers.ts:20,57`: CSV cốđịnhcột, classify duplicate/owned và khônggiànhkhách. Không được thay guard bằng matchingLLM.
- Customer ImportModal/import-map vàuseExportContacts làluồngthủcông; chưa chứngminh modelthật nhậnfile→mapping→preview→commit→artifact.
- CácActionDefs quotes/orders/contracts/invoices chủyếucrud/workflow; không có generic importer. product.import mới được032b nhận.038 chỉ4listExcel, chưa đủ products/invoices/CRM và AI orchestration.
- 023c attachment/GenUI mới làpending: không giả định uploadPDF/XLSX đãxong;038b reuse approvedblocks vàfilehandles, không gửi base64toànfile vàoLLM.
- Thứtự nguồn: COMMERCE/Blueprint/standards và yêu cầu AI-first mới của Chủ nhà. Yêu cầu mới mởrộng nhập/xuất, **không đổi quyền, state-machine, tiền/kho/loyalty**.

## Ma trận phạm vi bắt buộc

| COVERAGE | Dữ liệu | Nhập AI ưu tiên | Nhập thủ công | Xuất bảng AI và thủ công | Xuất chứng từ |
|---|---|---|---|---|---|
| IO-CRM | Khách hàng, thông tin liên hệ, stage được phép, tags, trường tuỳ biến đãkhai | XLSX/CSV → nhận diện sheet/cột, chuẩn hoá, dòtrùng, đềxuấtmapping cónguồn | Filemẫu + mapping/preview | XLSX/CSV theoids hoặc toàn bộfilter, gồmcustomfields đượcphép | Không tạoPDF “chứng từ khách hàng” giả |
| IO-CATALOG | Sản phẩm, dịchvụ, biếnthể, danh mục thamchiếu | XLSX/CSV → nhómvariant, khớpSKU/đơnvị, phát hiện ambiguous | Cùngvalidator vớiproduct.import032b | XLSX/CSV; inventory làreadonlysnapshot nếuexport | Không dùngimportproduct đểđiềuchỉnh tồnkhôngqua stock.adjust |
| IO-QUOTE | Báo giá + dòng hàng/thuế/chiếtkhấu | Bảng chuẩn hoặc nội dungPDF/DOCX cónguồn → nháp, khớpcatalog, cảnhbáochênhgiá | XLSX/CSV nhiều dòng theoexternalgroupkey | XLSX workbook header/items; CSV táchheader/items trongZIP | PDF; DOCX chỉkhi documenttemplate/renderersupport, khôngrenamePDF |
| IO-ORDER | Đơn hàng + dòng hàng | XLSX/CSV → nháp, khớpkhách/hàng, xemtrước totals | Cùngschema/preview | XLSX/CSV header/items + status snapshot | Phiếuxácnhận/đềnghị liênquan qua renderer đãhỗtrợ, formatcapability rõ |
| IO-CONTRACT | Hợp đồng + liên kếtkhách/đơn/appendix khi được hỗtrợ | XLSX/CSV metadata; PDF/DOCX qua030b đểtạonháp, chỉđiềnnguồn đãtrích | Filemẫu metadata hoặc uploaddocument030b | XLSX/CSV metadata; không nhétbinarynội dung vàocell | PDF hiệnhành/đãký giữ nguyên; DOCX nguồn/mẫu cósẵn, khôngtựchuyển PDFđãký |
| IO-INVOICE | Đề nghị thanh toán (khôngVAT) + liên kếtđơn/đợtthu | XLSX/CSV → đềxuất nháp theođơn/đợt đủquyền | Cùngmapping/validator | XLSX/CSV metadata vàsốtiền/trạngthái nguồn | PDF đềnghị/phiếuthu hiệnhữu; khôngphát sinhphiếuthu nếu chưa recordedpayment |

**Phạm vi không nhập ghi trực tiếp:** payment/refund/stock/loyalty ledgers, chữký, auditlogs, password, ownerassignmentkhôngquyền. Chúng không phải “bảng có thể import tùy ý”. Nếu cần chuyển lịch sử đãthu/đãký thì tạo migrationTIP riêng với đốisoát/snapshot/duyệt;038b không nhận làdraft rồi âmthầm gánpaid/signed/completed.
**Liên kết/hỗtrợ địnhdạng:** capability registry mỗientity/operation/format trảsupported+reason. PDF/DOCX không phải nguồn nhập mọi bảng; scanimage/OCR chưa cóparser đượcphêduyệt phải báo unsupported, không bịa nội dung. CSV ZIP và XLSX đều cómanifest sheet/columns/version để roundtrip phầneditable, khônghứa roundtripchữký/ledger.

## APPLICABLE STANDARDS
Đọc coding-packs/standards: actions/action-registry; ai/agent-gateway,generative-ui,eval; database/tenant-db,indexing; authz/rbac-permissions; events/outbox; api/response-envelope; domain/custom-fields,concurrency,money-time-numbering,validation-defaults,gap-filling; documents/templates; ops/observability-security; ui/frontend-structure,interaction-patterns,prototype-parity; i18n/i18n; code/file-size-module-layout,testing; workflow/git-flow-ci.

## Rà trước khi làm
1. Đối chiếu filemanifest thực của023c/030b/032b/038/045b sauimplementation; không tạo exporter/uploadparser thứhai. Đọc actionpermission từngentity, không suy ra quyềnimport từquyềnview.
2. Chốtcontract tools (typedplan/preview/filehandle) với023b/023c; cácUIblocks phải allowlisted, khôngrender modelHTML/JS/URLtuỳý.
3. Rà sizecaps trước sửaCRMhandler/ChatThread; filevượtcap chỉfacade tới modulemới. Testriêng. Nếu cần thêmfilewiring ngoài manifest phải sửaTIP/overlap trướccode.
4. Xác minh parser nănglựcPDF/DOCX/Excel vàlimits/security045b. Khôngcầnwebsearch bênngoài để xácđịnh businessschema; SoT làrepo.
5. Chạy nativeDB/Redis riêng khi build, khôngđụng demo/services/secrets. Phasewriting không chạy model/provider hoặc mutateDB.

## TASK

### 1. Một backend dữ liệu dùng chung, AI là luồng chính
- Registry typed entity/operation/format/columns/permissions/capabilities; adapters domain delegates currentread/services/actions. KhônggenericSQL table name hoặc arbitraryfieldwrite từLLM.
- TransferPlan tenant: id,actor_user_id,entity,operation,source_file_id/checksum,version,mapping,normalizedfilters,columns,validationcounts,snapshotref,expires_at,status. TransferJob+RowReceipt unique(plan_id,row_key), idempotency/jobversion, result_ids/errorcodes/provenance. Artifact metadata owner/workspace-bound qua tenantDB, expiry,checksum,contenttype.
- Actions transfer.plan/create/update_mapping/validate/commit/cancel/export theo schema đóng; readstatus/capabilities qua readservice. Plan tạojob làwrite quaExecutor; mutationbusiness qua existingdomainActionExecutor. Commit từUI/xácnhận trực tiếp; không tựbậtagentGrantable chocontact.import/export hoặc quyềnmoney.
- AI có thể đọcfileđượcupload bởiuser, đềxuấtplan vàđiềuchỉnhmapping qua tool cóscope tươngứng; khôngcầngrantbusinesswrite đểhiệnpreview. Preview không mutatecontact/stock/ledger. Assistant caller context source/onBehalfOfUser giữđúng; khôngngụytrang userconfirmation từLLM.
- Job execution re-resolve quyềnuser từngbatch/row, samepermission+record/fieldscope như thủcông. Creator bịrevoke dừngjob; outputđãtạo khôngxóa bừa, resultpartial truthfullyreported. KhôngnestedExecutor trongtransactiondài; mỗirow atomicdomainaction vàdurablereceipt qua045b recovery.

### 2. Nhập AI end-to-end
- User kéo thảfile vàoTrợlý vànói “nhập khách/đơn…” → parser đọcfile server side, giữsheet,row,column,page/textspan vàfilechecksum. Model nhậnschema+bounded samples/typedretrieval, khôngmặcđịnh toàn bộPIIfile.
- AI đềxuấtentity/sheet/header/mapping/type/date/currency/decimal separators; ambiguous tênkhách/SKU/dòngnhóm phải hỏichọn trongGenUI cóscope, khôngmatch guessedID. Hướngdẫn trongcell/file làuntrusteddata, khôngpromptinstruction.
- Validation deterministic: required/customfielddefinition, length/type/email/phone, referencepermission, SKU/productprice, totals/discount/tax vàCOMMERCE thresholds. AI không được tựđiền giá/thuế/phone thiếu hoặc “sửa” chênhgiá khôngthôngbáo.
- Duplicate strategy defaultreuse/skip theoexistingpolicy; khôngmerge/updateexisting khi chưaexplicitpreview/permission. Kháchngườikhác khônglộpayload hoặcgiànhowner; khôngcho model suy ra recordhidden từerrors.
- Preview thậttừnormalizedrows: created/skipped/invalid/conflicts, examplechanges, moneytotals, sheet/rowreferences. Người dùng nói “cột này là sốđiệnthoại”, “bỏ5dònglỗi” → AI chỉnhplanversion, revalidate; confirmtoken cũ invalid.
- Confirm inputhash+planversion+sourcechecksum+scopeRevision, khôngfiletamper saupreview; userchọn validrowsonly thì bỏlỗi cócount, mặcđịnh khôngâmthầm bỏlỗi. Import đúngtransactionboundary mỗiđơn+items atomically, khôngnửađơn.
- Customer maximum500 perexistingaction đượcchunk ởjob; khôngnânglimit vôhạn. Product import dùng032b; quotes/orders/contracts/invoices tạo draft quaownactions, khôngsubmit/send/sign/confirm/recordpayment.
- AI timeout/khôngCredit/bịdeny: fileplan khôngmất, cóRetry/sửa thủcông, không báoimportsuccess trướccommit. AI-first vẫn phải hoạtđộng từ đầuđếncuối bằngmodelthật, không bắtuser map tay mọicột mới chạyđược.

### 3. Xuất AI, file tải thật
- Câu “Xuất khách chưa mua90ngày raExcel, gồm tên/SĐT/người phụtrách”, “Xuất đơn thángnày kèmchitiết”, “TảiPDF báo giáBG-…” → modelresolve entity/filter/date/timezone/columns/format bằngcatalogtools, showunderstoodrequest; ambiguous “doanhthu” hỏiplaced/paid khôngtựđoán.
- Validatedfilters chỉDSLallowlist, noSQL/codeevaluation; scope+fieldmask trướcaggregation/export. Listselection allfiltered khác currentpage, hiểnthị rõrowcount vàcolumns. Hiddenphone khôngvàoLLM/CSV/report kểcảuserra lệnh.
- Reuse038 snapshot/async export/artifactdownload/revalidate permissions. Mởrộng adapters CRM/catalog/invoice vàheader/items choquotes/orders, khôngduplicate4exportactions.
- ResultGenUI có filename,mime,size,rowcount,expires_at vàbuttondownload authenticated. Không dùngtoast/urlbịa/base64toànfile trongmessage, không trả rawcontentfilelớn vàoLLMhistory.
- PDF/DOCX gọi documentrenderer hoặc tải storedversion đúngID, giữsignedbytes, disclaimer khôngVAT nơiápdụng; unsupportedformat báo lựa chọn cóthật, khôngtựđổiđuôi.
- Excel/CSV sanitize formulas, preserve phoneleadingzero/UTF8/VNDexactstring/decimal/date/timezone, escapequotes/newlines. Multi-sheetXLSX vàCSVZIP khácformat rõ; dữliệu0row vẫn cóheader. Secretfields luônexcluded.

### 4. Thủ công là đường phụ hoàn chỉnh
- Nút Nhập/Xuất mởTransferPanel cùngbackend, filemẫu+mappingeditable+preview+confirm+progress+result. Không gọiLLM bắtbuộc ởmode thủcông; AI button/defaultprompt làentry ưu tiên.
- CRMexistingmodal/exporthook bridge giữcontractcũ; businessscreens cóentry qua023c contextassistant, khôngcầnnhồi6screen orchestrators. ChatThread chỉmount block adapter qua allowlistedcommand, khôngimport chéo featurecomponent trực tiếp: sharedcommand phát typedui event, TransferPanel mount tạiownedhost.
- Cácfields/options từtypedregistry, i18nvi/en, keyboard/focus/cancel, desktop/mobile, 5states. KhôngactionUIghi ngoàiuseAction.

### 5. File safety, recovery và audit
- Reuse045b fileownership/magicbytes/viruspolicy/safeparser: chỉallowformat, zipbomb/XXE/macros/externalURLs/formulas khôngexecute, cap file25MiB/100krows technicaldefaults phải rõUI; quálimit yêu cầu split, khôngtruncate.
- Stable rowkey từsource checksum+sheet+row+group, replayjob/clickconfirm2lần khôngduplicate; chỉnhsửa source tạo newplan vàreconcile externalrecordkeys, khôngoverwritepaidrecords.
- Errorartifact XLSX/CSV chứa row/sourcecolumn/code/message/editableinput đượcquyền, **khônghiddenrecorddetails**. Usertảilỗi→sửa→nhậplại chỉ xửlýrowschưaapplied; receipts/resultrecordlinks scoped; partialsuccess khôngtựrollback externalactions.
- Cancel ngừngfuturebatches, in-flightrowatomic cóthểfinish; statuscounts chuẩn, khôngclaim đãrollback. Undo chỉdomainundo nếuhỗtrợ+cònwindow+version, không “xoá tất cả” nhưtransactiongiả.
- Tenantindexes(planactor,status,created_at,id) INCLUDE nhỏ; receipt(plan_id,row_key) unique; jobs(status,next_attempt_at,id) partialactive; payload lớn fetch sauIDlimit. EXPLAIN với realisticfixtures; durableoutbox/receipts làauthority khôngRedisTTL.
- Audit plan/confirm/resultcounts/sourcehash/mappingversion/AIrun/cost, khôngrawfile/secretPII. Expiredartifacts cleanup khôngxoásourcebusiness. Revokeduser/download otherworkspace404/403.

## ACCEPTANCE CRITERIA — AI là gate chính
1. **AC01 AI CRM/catalog:** Given XLSX sai thứtựcột/header tiếngViệt/phone0 đầu/variants/customfields; When upload vàra lệnh bằngmodelthật; Then AI đềxuấtmapping đủ, previewnguồn đúng, confirm mớighi, records khớpschema, noownersteal.
2. **AC02 AI commerce:** Given mỗiquote/order/contract/invoice mộtfixture nhiều dòng; When AI nhập; Then draft đúngkhách/items/totals/reference, ambiguous được hỏi, không stock/payment/sign/loyaltysideeffects. PDF/DOCX030b cóprovenance vàthiếudữliệu khôngbịa.
3. **AC03 correction dialog:** Given mapping sai/dateambiguous/5rowsinvalid; When user sửa bằng lời vàconfirm; Then versionmới revalidate, oldtokenrejected, validrowschỉghi sauexplicitchoice, lỗi tảiđược.
4. **AC04 AI export:** Given mỗi6entity và >1page; When natural-languagefilter/column/format request; Then filethật đúngallfiltered/selection, columns/rows vàtimewindow, nofakeURL; quotePDF vàcontractsignedPDF exactsource.
5. **AC05 manual parity:** Given cùngsource/mapping/filter, AI tắt; When manualimport/export; Then cùngvalidation/results/permissions vàfile, khôngproviderrequest/chargeAI.
6. **AC06 safety:** Given2tenants/own/team/none/watchers/hiddenfields, promptinjectionfile/cellformula/zipbomb; When parse/preview/commit/export/download; Then noleak/noexecution/noexcessscope; noagentgrantbypass vàuserconfirmationthật.
7. **AC07 retry/partial:** Given crashafterrowcommit/beforereceipt, duplicatejob, cancel/resume/reimporterrorfile; When recover; Then onebusinessmutation/row, atomicgroupitems, accuratepartialcounts, noledgerdoubleeffect.
8. **AC08 artifacts:** Given allsupportedformats/0rows/100k+rows/expiredlink; When download/open; Then XLSX/CSVZIP/PDF/DOCX thật cómime/encoding/filename, formulasnotexecutable, unsupported/threshold rõ, expiry/revokeenforced.
9. **AC09 AI failure:** Given timeout/outofCredit/lowconfidence; When request; Then preservedplan+retry/manualchoice, khôngclaimsuccess/noautochargeextra orwrite; logs safe.
10. **AC10 live acceptance:** Given versionedfixtures và9router thật; When chạyít nhất12cases (6entity import +6entity export) cùngnegativecases; Then mọiwrite/permission/confirmation/fileintegrity case phải100% đạt, khôngmockmodelthayproof; lưu model/run/tooltrace redacted, artifactchecksums vàexpectedrow assertions. Missingprovider=chưa nghiệmthu, khôngDONEAI.

### Lệnh builder, chưa chạy trong pha docs
```powershell
pnpm --filter @appchat/core exec vitest run test/data-transfer.test.ts test/data-transfer-ai.test.ts
pnpm --filter @appchat/api exec vitest run test/integration/data-transfer.test.ts
pnpm --filter @appchat/web exec playwright test e2e/http/data-transfer.spec.ts
pnpm ai:live
pnpm i18n:check
pnpm parity --done
```
023b/044 liveharness phảiđăngký live-cases.ts trongmanifest củaharness trướcbuild; khôngclaim pnpm ai:live đãcover nếu chưa loadcases. D59 lint/typecheck/unit/depcheck trướccommit, fullgatechốtTIP; screenshotsdesktop/mobile vàartifactparser assertions khôngchỉclicktoast.

## CONSTRAINTS
- Parity manifest hiện là monolith: chỉ1–2dòng facade để đăng ký tools/parity/modules/data-transfer.ts; không thêmlogic inline.
- AI-first làluồngnghiệmthu chính, thủcông làfallback dùngchungbackend, khônggiảmphạmvi thànhCSVwizard.
- Khôngmở quyềnmới, noLLMSQL, nobusinesswrite từprompt/file khôngconfirm, noimportpaid/signedledgers.
- Reuse032b productimport,038 exporters,030b documents,023c GenUI,045b jobs/files/fieldmask,042c scopes. Không sửaTIP001–035 đãDONE; bổsung report liênkết.
- Backend200–400/tách500/trần600; FE150–250/trần400; test riêng, mainviewsorchestrator.
- Chỉdocs ởcâuA, khôngsource/demo/secrets modifications.

## BUILDER-CHECKLIST
- [ ] Ma trận6domain×2modes×operation/format đãtest, unsupported cólýdo.
- [ ] AI live12cases vàsecurity/confirmation/fileassertions đạt; khôngmockthayAIproof.
- [ ] Exactmanifest/overlap/harnesswiring vàdomainpermissions kiểmtrướcbuild.
- [ ] Retry/partial/errors/authenticateddownloads thật; nofakebuttons.
- [ ] Completionreport mapping11IOrows+SHAclean, D59+PRdev.

## Successor integration026b — CRM child datasets

After038b,026b adds explicit CRM note/comment, manual task and opportunity datasets to the same capability/plan/preview/row-receipt/artifact pipeline. Not an implicit generic table importer: dataset permissions, readonly audit/state columns and actual CSV/XLSX are defined in026b spec5.038b remains independent predecessor, not blocked by026b; no new role/tool grants.

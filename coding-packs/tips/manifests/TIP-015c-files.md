# TIP-015c — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/actions/src/privacy.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/shared/src/privacy/state.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/shared/src/privacy/events.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/shared/src/api/privacy.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/db/prisma/tenant/privacy.prisma` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/db/prisma/tenant/migrations/20261102001530_contact_privacy/migration.sql` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/kernel/privacy/types.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/kernel/privacy/registry.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/kernel/privacy/guard.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/kernel/privacy/provenance.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/kernel/privacy/identity-tokens.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/kernel/privacy/publication.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/kernel/privacy/privacy.module.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/privacy/privacy.module.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/privacy/privacy.providers.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/privacy/public.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/privacy/actions/forget.handler.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/privacy/actions/review.handlers.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/privacy/actions/recreation.handler.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/privacy/actions/cleanup.handler.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/privacy/actions/read.handlers.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/privacy/services/preview.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/privacy/services/inventory.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/privacy/services/operation.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/privacy/services/review.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/privacy/services/recreation.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/privacy/services/report.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/privacy/repos/operations.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/privacy/repos/artifacts.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/privacy/jobs/privacy.jobs.module.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/privacy/jobs/cleanup.processor.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/privacy/jobs/recovery.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/composition/privacy.module.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/kernel/privacy/file-disposition.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/kernel/privacy/operational-payloads.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/kernel/privacy/restore-gate.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `apps/api/src/http/privacy/privacy.http.module.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `apps/api/src/http/privacy/privacy.controller.ts` | Privacy contracts, domain-neutral fences/provenance and durable accepted-operation orchestration; no domain module cycles |
| C | `packages/core/src/crm/privacy/adapter.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/crm/privacy/module.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/crm/privacy/inventory.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/crm/privacy/cleanup.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/inbox/privacy/adapter.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/inbox/privacy/module.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/inbox/privacy/inventory.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/inbox/privacy/cleanup.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/channels/privacy/adapter.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/channels/privacy/module.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/channels/privacy/inventory.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/channels/privacy/cleanup.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/ai/privacy/adapter.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/ai/privacy/module.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/ai/privacy/inventory.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/ai/privacy/cleanup.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/sales/privacy/adapter.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/sales/privacy/module.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/sales/privacy/inventory.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/sales/privacy/cleanup.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/contracts/privacy/adapter.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/contracts/privacy/module.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/contracts/privacy/inventory.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/contracts/privacy/cleanup.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/booking/privacy/adapter.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/booking/privacy/module.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/booking/privacy/inventory.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/booking/privacy/cleanup.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/support/privacy/adapter.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/support/privacy/module.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/support/privacy/inventory.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/support/privacy/cleanup.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/loyalty/privacy/adapter.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/loyalty/privacy/module.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/loyalty/privacy/inventory.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/loyalty/privacy/cleanup.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/marketing/privacy/adapter.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/marketing/privacy/module.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/marketing/privacy/inventory.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/marketing/privacy/cleanup.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/integrations/privacy/adapter.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/integrations/privacy/module.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/integrations/privacy/inventory.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/integrations/privacy/cleanup.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/data-transfer/privacy/adapter.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/data-transfer/privacy/module.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/data-transfer/privacy/inventory.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/data-transfer/privacy/cleanup.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/kernel/privacy/adapter.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/kernel/privacy/module.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/kernel/privacy/inventory.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| C | `packages/core/src/kernel/privacy/cleanup.ts` | Domain-owned inventory/cleanup adapter, kernel-only imports; split bounded files, no aggregate worker startup |
| M | `packages/actions/src/index.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/shared/src/index.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/shared/src/api/index.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/index.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `apps/api/src/app.module.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `apps/worker/src/roles/ai.module.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `apps/worker/src/roles/jobs.module.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `apps/worker/src/roles/channels.module.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/kernel/actions/actions.module.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/kernel/actions/executor.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/kernel/actions/undo.service.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/kernel/actions/action-context.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/kernel/files/files.service.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/kernel/files/signed-url.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/kernel/files/file-access.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `apps/api/src/http/files/files.controller.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/crm/services/identity.service.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/crm/services/identity-match.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/crm/lifecycle/identity-state.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/crm/lifecycle/lock.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/crm/lifecycle/restore.handler.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/crm/lifecycle/receipts.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/crm/ownership/contact-lock.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/crm/merge/handler.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/crm/merge/undo.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/crm/merge/plans.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/crm/services/access.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/crm/services/contact-view.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/crm/services/contacts.service.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/crm/actions/contact-write.handlers.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/crm/actions/contact-io.handlers.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/inbox/services/pipeline.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/inbox/services/read.service.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/inbox/services/view.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/inbox/services/outbound.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/inbox/services/attachments.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/inbox/services/conversation-link.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/inbox/services/access.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/channels/email/threads.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/channels/webchat/visitor.service.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/channels/webchat/publisher.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/channels/jobs/send.processor.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/channels/jobs/poller.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/channels/operations/provider-event.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/channels/operations/history-run.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/channels/operations/contact-sync.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/channels/services/send-guards.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/assistant/sessions.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/assistant/action-logs.read.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/assistant/genui/history.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/assistant/genui/stream.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/assistant/genui/submit.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/assistant/genui/attachments.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/assistant/genui/event-store.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/assistant/genui/request-store.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/runs/run.store.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/runs/runner.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/runs/run-detail.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/runs/run-events.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/reply/reply-context.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/reply/send-fence.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/approvals/resume.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/skills/utility-operations.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/skills/utility-result.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/skills/utility-sources.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/authz/fields/history-provenance.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/authz/fields/projection.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/kb/ingest.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/kb/search.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/kb/kb.read.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/kb/suggestions/source-publisher.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/ai/kb/suggestions/suggestion.service.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/sales/orders/services/order-import.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/sales/orders/services/blocked-imports.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/sales/payments/services/financial-roots.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/sales/payments/services/invoices-read.service.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/sales/payments/services/invoice-doc.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/sales/quotes/services/quotes-read.service.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/sales/quotes/services/quote-doc.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/contracts/services/contracts-read.service.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/contracts/services/public-sign.service.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/contracts/services/contract-doc.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/data-transfer/services/planner.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/data-transfer/services/validation.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/data-transfer/services/artifacts.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/data-transfer/services/ai-planner.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/data-transfer/jobs/transfer.runner.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/data-transfer/adapters/contacts.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/data-transfer/adapters/document-files.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/integrations/mail/dispatch.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/integrations/mail/ingress.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/integrations/mail/recovery.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/marketing/services/recipient-snapshot.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/marketing/services/recipient-export.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/crm/memory/summary-consumer.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/core/src/identity/lifecycle/owner-export.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| M | `packages/db/src/lifecycle/restore.ts` | Existing or predecessor seam: register lineage, current disposition and root/publication fence; preserve original permissions and canonical actions |
| C | `packages/core/src/privacy/services/inbound-routing.ts` | Bounded privacy UI/review and typed routing/evidence/replay services; no plaintext export of erased data |
| C | `packages/core/src/privacy/services/dedupe.ts` | Bounded privacy UI/review and typed routing/evidence/replay services; no plaintext export of erased data |
| C | `packages/core/src/privacy/services/retained-evidence.ts` | Bounded privacy UI/review and typed routing/evidence/replay services; no plaintext export of erased data |
| C | `packages/core/src/privacy/services/legacy-provenance.ts` | Bounded privacy UI/review and typed routing/evidence/replay services; no plaintext export of erased data |
| C | `packages/core/src/privacy/services/restore-journal.ts` | Bounded privacy UI/review and typed routing/evidence/replay services; no plaintext export of erased data |
| C | `packages/core/src/privacy/services/dispatch-drain.ts` | Bounded privacy UI/review and typed routing/evidence/replay services; no plaintext export of erased data |
| C | `packages/core/src/privacy/services/payload-bindings.ts` | Bounded privacy UI/review and typed routing/evidence/replay services; no plaintext export of erased data |
| C | `apps/web/src/shared/privacy/index.ts` | Bounded privacy UI/review and typed routing/evidence/replay services; no plaintext export of erased data |
| C | `apps/web/src/shared/privacy/types.ts` | Bounded privacy UI/review and typed routing/evidence/replay services; no plaintext export of erased data |
| C | `apps/web/src/shared/privacy/api.ts` | Bounded privacy UI/review and typed routing/evidence/replay services; no plaintext export of erased data |
| C | `apps/web/src/shared/privacy/components/ForgetDialog.tsx` | Bounded privacy UI/review and typed routing/evidence/replay services; no plaintext export of erased data |
| C | `apps/web/src/shared/privacy/components/PrivacyProgress.tsx` | Bounded privacy UI/review and typed routing/evidence/replay services; no plaintext export of erased data |
| C | `apps/web/src/shared/privacy/components/QuarantineReview.tsx` | Bounded privacy UI/review and typed routing/evidence/replay services; no plaintext export of erased data |
| C | `apps/web/src/shared/privacy/components/RecreationDialog.tsx` | Bounded privacy UI/review and typed routing/evidence/replay services; no plaintext export of erased data |
| C | `apps/web/src/shared/privacy/hooks/usePrivacy.ts` | Bounded privacy UI/review and typed routing/evidence/replay services; no plaintext export of erased data |
| C | `apps/web/src/shared/privacy/hooks/usePrivacyInvalidation.ts` | Bounded privacy UI/review and typed routing/evidence/replay services; no plaintext export of erased data |
| C | `apps/web/src/shared/api/mock/domains/privacy.ts` | Bounded privacy UI/review and typed routing/evidence/replay services; no plaintext export of erased data |
| C | `apps/web/src/app/(app)/_privacy/PrivacyHost.tsx` | Bounded privacy UI/review and typed routing/evidence/replay services; no plaintext export of erased data |
| C | `apps/web/messages/vi/privacy.json` | Bounded privacy UI/review and typed routing/evidence/replay services; no plaintext export of erased data |
| C | `apps/web/messages/en/privacy.json` | Bounded privacy UI/review and typed routing/evidence/replay services; no plaintext export of erased data |
| M | `apps/web/src/app/(app)/layout.tsx` | Mount shared privacy UI through existing orchestration; localized current-authority states and mock parity |
| M | `apps/web/src/shared/api/mock/handlers.ts` | Mount shared privacy UI through existing orchestration; localized current-authority states and mock parity |
| M | `apps/web/messages/vi/actions.json` | Mount shared privacy UI through existing orchestration; localized current-authority states and mock parity |
| M | `apps/web/messages/en/actions.json` | Mount shared privacy UI through existing orchestration; localized current-authority states and mock parity |
| M | `tools/parity/parity.manifest.ts` | Mount shared privacy UI through existing orchestration; localized current-authority states and mock parity |
| C | `packages/actions/test/privacy.test.ts` | Dedicated registry/native race/isolation/file/read/replay/UI/live verification, never inline massive tests |
| C | `packages/shared/src/privacy/state.test.ts` | Dedicated registry/native race/isolation/file/read/replay/UI/live verification, never inline massive tests |
| C | `packages/core/test/privacy.test.ts` | Dedicated registry/native race/isolation/file/read/replay/UI/live verification, never inline massive tests |
| C | `packages/core/test/privacy-inventory.test.ts` | Dedicated registry/native race/isolation/file/read/replay/UI/live verification, never inline massive tests |
| C | `packages/core/test/privacy-identity.test.ts` | Dedicated registry/native race/isolation/file/read/replay/UI/live verification, never inline massive tests |
| C | `packages/core/test/privacy-publication.test.ts` | Dedicated registry/native race/isolation/file/read/replay/UI/live verification, never inline massive tests |
| C | `packages/core/test/privacy-evidence.test.ts` | Dedicated registry/native race/isolation/file/read/replay/UI/live verification, never inline massive tests |
| C | `packages/core/test/privacy-restore.test.ts` | Dedicated registry/native race/isolation/file/read/replay/UI/live verification, never inline massive tests |
| C | `apps/api/test/integration/privacy.test.ts` | Dedicated registry/native race/isolation/file/read/replay/UI/live verification, never inline massive tests |
| C | `apps/api/test/integration/privacy-concurrency.test.ts` | Dedicated registry/native race/isolation/file/read/replay/UI/live verification, never inline massive tests |
| C | `apps/api/test/integration/privacy-files.test.ts` | Dedicated registry/native race/isolation/file/read/replay/UI/live verification, never inline massive tests |
| C | `apps/api/test/integration/privacy-inbound.test.ts` | Dedicated registry/native race/isolation/file/read/replay/UI/live verification, never inline massive tests |
| C | `apps/worker/test/integration/privacy-composition.test.ts` | Dedicated registry/native race/isolation/file/read/replay/UI/live verification, never inline massive tests |
| C | `apps/web/e2e/privacy.spec.ts` | Dedicated registry/native race/isolation/file/read/replay/UI/live verification, never inline massive tests |
| C | `apps/web/e2e/http/privacy.spec.ts` | Dedicated registry/native race/isolation/file/read/replay/UI/live verification, never inline massive tests |
| C | `apps/web/src/shared/privacy/hooks/usePrivacy.test.tsx` | Dedicated registry/native race/isolation/file/read/replay/UI/live verification, never inline massive tests |
| C | `tools/parity/modules/privacy.ts` | Dedicated registry/native race/isolation/file/read/replay/UI/live verification, never inline massive tests |
| C | `fixtures/ai-eval/privacy.json` | Dedicated registry/native race/isolation/file/read/replay/UI/live verification, never inline massive tests |
| C | `coding-packs/reports/TIP-015c-completion.md` | Dedicated registry/native race/isolation/file/read/replay/UI/live verification, never inline massive tests |
| M | `apps/web/src/features/inbox/components/Profile360Content.tsx` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| C | `packages/db/prisma/platform/privacy-journal.prisma` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| C | `packages/core/src/privacy/services/journal-consistency.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| C | `packages/core/src/privacy/services/review-content.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| M | `packages/core/src/kernel/actions/authorizer.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| M | `packages/core/src/kernel/audit/audit-projection.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| M | `packages/core/src/sales/orders/services/order-view.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| M | `packages/core/src/sales/payments/services/invoice-view.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| M | `packages/core/src/sales/quotes/services/quote-view.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| M | `packages/core/src/contracts/services/contract-view.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| M | `packages/core/src/sales/orders/services/orders-read.service.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| M | `packages/core/src/sales/payments/bank/ingress.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| M | `packages/core/src/sales/payments/bank/reconcile.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| M | `packages/core/src/booking/services/calendar-read.service.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| C | `packages/core/src/privacy/services/projection.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| C | `packages/core/src/privacy/services/write-bindings.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| C | `packages/core/src/privacy/services/queue-scrub.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| C | `packages/core/src/privacy/services/file-purge.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| C | `packages/core/src/privacy/services/legacy-scanner.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| C | `packages/core/src/privacy/services/permit-consumption.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| C | `packages/core/src/privacy/services/source-catalog.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| C | `packages/core/src/privacy/services/family-fence.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| C | `packages/core/src/privacy/services/lease.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| C | `packages/core/test/privacy-dedupe.test.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| C | `packages/core/test/privacy-journal.test.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| C | `apps/api/test/integration/privacy-review.test.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| C | `apps/api/test/integration/privacy-transfer.test.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| C | `packages/core/src/privacy/services/read-catalog.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| C | `packages/core/src/privacy/services/write-catalog.ts` | Privacy projection/provenance, replay-safe restoration journal, bounded review or dedicated verification |
| C | `packages/db/prisma/platform/migrations/20261102001530_privacy_journal/migration.sql` | Explicit privacy read/write/notification/file-transfer wiring; no orphan provider or UI control |
| M | `packages/core/src/support/services/tickets-read.service.ts` | Explicit privacy read/write/notification/file-transfer wiring; no orphan provider or UI control |
| M | `packages/core/src/notify/services/notifications.service.ts` | Explicit privacy read/write/notification/file-transfer wiring; no orphan provider or UI control |
| M | `packages/core/src/notify/services/notifier.ts` | Explicit privacy read/write/notification/file-transfer wiring; no orphan provider or UI control |
| M | `packages/core/src/notify/realtime/emitter.ts` | Explicit privacy read/write/notification/file-transfer wiring; no orphan provider or UI control |
| M | `packages/core/src/notify/jobs/notify-mail.processor.ts` | Explicit privacy read/write/notification/file-transfer wiring; no orphan provider or UI control |
| C | `packages/core/src/data-transfer/adapters/privacy-receipts.ts` | Explicit privacy read/write/notification/file-transfer wiring; no orphan provider or UI control |
| M | `packages/core/src/data-transfer/data-transfer.module.ts` | Explicit privacy read/write/notification/file-transfer wiring; no orphan provider or UI control |
| M | `packages/core/src/data-transfer/data-transfer.providers.ts` | Explicit privacy read/write/notification/file-transfer wiring; no orphan provider or UI control |
| M | `packages/shared/src/data-transfer/registry.ts` | Explicit privacy read/write/notification/file-transfer wiring; no orphan provider or UI control |
| C | `packages/core/src/privacy/read.module.ts` | Explicit privacy read/write/notification/file-transfer wiring; no orphan provider or UI control |
| C | `apps/web/src/shared/privacy/components/PrivacyEntry.tsx` | Explicit privacy read/write/notification/file-transfer wiring; no orphan provider or UI control |
| C | `apps/web/src/shared/privacy/store.ts` | Explicit privacy read/write/notification/file-transfer wiring; no orphan provider or UI control |
| C | `apps/web/src/shared/privacy/commands.ts` | Explicit privacy read/write/notification/file-transfer wiring; no orphan provider or UI control |
| M | `packages/core/src/crm/services/contact-export.ts` | Explicit privacy read/write/notification/file-transfer wiring; no orphan provider or UI control |
| M | `packages/core/src/crm/jobs/contact-export.processor.ts` | Explicit privacy read/write/notification/file-transfer wiring; no orphan provider or UI control |
| M | `packages/core/src/kernel/actions/secret-vault.ts` | Explicit privacy read/write/notification/file-transfer wiring; no orphan provider or UI control |
| M | `packages/core/src/ai/assistant/genui/context.ts` | Explicit privacy read/write/notification/file-transfer wiring; no orphan provider or UI control |
| M | `packages/core/src/ai/assistant/genui/refs.ts` | Explicit privacy read/write/notification/file-transfer wiring; no orphan provider or UI control |
| M | `packages/core/src/documents/services/template-store.ts` | Independent-review correction: mandatory confirmation, safe file context, dataset registration or immediate run-list privacy projection |
| M | `packages/core/src/documents/services/doc-renderer.ts` | Independent-review correction: mandatory confirmation, safe file context, dataset registration or immediate run-list privacy projection |
| M | `packages/core/src/sales/quotes/services/quote-env.ts` | Independent-review correction: mandatory confirmation, safe file context, dataset registration or immediate run-list privacy projection |
| M | `packages/core/src/sales/payments/services/invoice-send.ts` | Independent-review correction: mandatory confirmation, safe file context, dataset registration or immediate run-list privacy projection |
| M | `packages/core/src/kernel/actions/policy.ts` | Independent-review correction: mandatory confirmation, safe file context, dataset registration or immediate run-list privacy projection |
| M | `packages/core/src/kernel/actions/preview-binding.ts` | Independent-review correction: mandatory confirmation, safe file context, dataset registration or immediate run-list privacy projection |
| M | `packages/actions/src/crm.ts` | Independent-review correction: mandatory confirmation, safe file context, dataset registration or immediate run-list privacy projection |
| M | `packages/core/src/ai/assistant/catalog.ts` | Independent-review correction: mandatory confirmation, safe file context, dataset registration or immediate run-list privacy projection |
| M | `packages/actions/src/data-transfer.ts` | Independent-review correction: mandatory confirmation, safe file context, dataset registration or immediate run-list privacy projection |
| M | `packages/shared/src/api/data-transfer.ts` | Independent-review correction: mandatory confirmation, safe file context, dataset registration or immediate run-list privacy projection |
| M | `packages/core/src/data-transfer/types.ts` | Independent-review correction: mandatory confirmation, safe file context, dataset registration or immediate run-list privacy projection |
| M | `apps/web/src/shared/assistant/data-transfer-command.ts` | Independent-review correction: mandatory confirmation, safe file context, dataset registration or immediate run-list privacy projection |
| M | `apps/web/src/features/data-transfer/types.ts` | Independent-review correction: mandatory confirmation, safe file context, dataset registration or immediate run-list privacy projection |
| M | `apps/web/src/features/data-transfer/components/TransferPanel.tsx` | Independent-review correction: mandatory confirmation, safe file context, dataset registration or immediate run-list privacy projection |
| M | `packages/core/src/ai/runs/runs.service.ts` | Independent-review correction: mandatory confirmation, safe file context, dataset registration or immediate run-list privacy projection |
| M | `apps/web/src/features/data-transfer/hooks/useTransfer.ts` | Pre-transaction privacy journal intent or export-only receipt dataset UI/worker composition |
| M | `packages/core/src/inbox/jobs/inbound.processor.ts` | Pre-transaction privacy journal intent or export-only receipt dataset UI/worker composition |
| M | `packages/core/src/channels/jobs/provider-history.processor.ts` | Pre-transaction privacy journal intent or export-only receipt dataset UI/worker composition |

## Future M provenance

- `packages/core/src/kernel/files/file-access.ts`: TIP-023c-generative-ui.md
- `packages/core/src/crm/services/identity-match.ts`: TIP-014b-zalo-lifecycle.md
- `packages/core/src/crm/lifecycle/identity-state.ts`: TIP-015f-contact-lifecycle.md
- `packages/core/src/crm/lifecycle/lock.ts`: TIP-015f-contact-lifecycle.md
- `packages/core/src/crm/lifecycle/restore.handler.ts`: TIP-015f-contact-lifecycle.md
- `packages/core/src/crm/lifecycle/receipts.ts`: TIP-015f-contact-lifecycle.md
- `packages/core/src/crm/ownership/contact-lock.ts`: TIP-015d-contact-transfer.md
- `packages/core/src/crm/merge/handler.ts`: TIP-015e-contact-merge-integrity.md
- `packages/core/src/crm/merge/undo.ts`: TIP-015e-contact-merge-integrity.md
- `packages/core/src/crm/merge/plans.ts`: TIP-015e-contact-merge-integrity.md
- `packages/core/src/inbox/services/conversation-link.ts`: TIP-025b-inbox-vertical.md
- `packages/core/src/channels/operations/provider-event.ts`: TIP-014b-zalo-lifecycle.md
- `packages/core/src/channels/operations/history-run.ts`: TIP-014b-zalo-lifecycle.md
- `packages/core/src/channels/operations/contact-sync.ts`: TIP-014b-zalo-lifecycle.md
- `packages/core/src/channels/services/send-guards.ts`: TIP-037-marketing.md
- `packages/core/src/ai/assistant/genui/history.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/stream.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/submit.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/attachments.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/event-store.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/request-store.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/runs/run-detail.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/run-events.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/reply/send-fence.ts`: TIP-045b-app-hardening.md
- `packages/core/src/ai/skills/utility-operations.ts`: TIP-019c-ai-utilities.md
- `packages/core/src/ai/skills/utility-result.ts`: TIP-019c-ai-utilities.md
- `packages/core/src/ai/skills/utility-sources.ts`: TIP-019c-ai-utilities.md
- `packages/core/src/authz/fields/history-provenance.ts`: TIP-045b-app-hardening.md
- `packages/core/src/authz/fields/projection.ts`: TIP-045b-app-hardening.md
- `packages/core/src/ai/kb/suggestions/source-publisher.ts`: TIP-043-kb-conversation-learning.md
- `packages/core/src/ai/kb/suggestions/suggestion.service.ts`: TIP-043-kb-conversation-learning.md
- `packages/core/src/sales/orders/services/blocked-imports.ts`: TIP-015f-contact-lifecycle.md
- `packages/core/src/sales/payments/services/financial-roots.ts`: TIP-015f-contact-lifecycle.md
- `packages/core/src/data-transfer/services/planner.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/services/validation.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/services/artifacts.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/services/ai-planner.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/jobs/transfer.runner.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/adapters/contacts.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/adapters/document-files.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/integrations/mail/dispatch.ts`: TIP-012c-tenant-mail.md
- `packages/core/src/integrations/mail/ingress.ts`: TIP-012c-tenant-mail.md
- `packages/core/src/integrations/mail/recovery.ts`: TIP-012c-tenant-mail.md
- `packages/core/src/marketing/services/recipient-snapshot.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/services/recipient-export.ts`: TIP-037-marketing.md
- `packages/core/src/crm/memory/summary-consumer.ts`: TIP-015b-contact-memory.md
- `packages/core/src/identity/lifecycle/owner-export.ts`: TIP-041-workspace-lifecycle.md
- `packages/db/src/lifecycle/restore.ts`: TIP-041-workspace-lifecycle.md
- `packages/core/src/kernel/audit/audit-projection.ts`: TIP-045b-app-hardening.md
- `packages/core/src/sales/payments/bank/ingress.ts`: TIP-012b-bank-connectors.md
- `packages/core/src/sales/payments/bank/reconcile.ts`: TIP-012b-bank-connectors.md
- `packages/core/src/data-transfer/data-transfer.module.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/data-transfer.providers.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/shared/src/data-transfer/registry.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/crm/services/contact-export.ts`: TIP-045b-app-hardening.md
- `packages/core/src/crm/jobs/contact-export.processor.ts`: TIP-045b-app-hardening.md
- `packages/core/src/kernel/actions/secret-vault.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/context.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/refs.ts`: TIP-023c-generative-ui.md
- `packages/core/src/kernel/actions/preview-binding.ts`: TIP-015e-contact-merge-integrity.md
- `packages/actions/src/data-transfer.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/shared/src/api/data-transfer.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/types.ts`: TIP-038b-ai-first-data-transfer.md
- `apps/web/src/shared/assistant/data-transfer-command.ts`: TIP-038b-ai-first-data-transfer.md
- `apps/web/src/features/data-transfer/types.ts`: TIP-038b-ai-first-data-transfer.md
- `apps/web/src/features/data-transfer/components/TransferPanel.tsx`: TIP-038b-ai-first-data-transfer.md
- `apps/web/src/features/data-transfer/hooks/useTransfer.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/channels/jobs/provider-history.processor.ts`: TIP-014b-zalo-lifecycle.md

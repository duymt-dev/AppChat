# TIP-015d — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/actions/src/crm.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/actions/src/quotes.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/actions/src/define.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/actions/src/index.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/index.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/kernel/actions/action-context.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/kernel/actions/policy.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/kernel/actions/handler.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/kernel/actions/executor.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/kernel/kernel.module.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/ai/approvals/approval.gateway.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/ai/approvals/approval.handlers.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/ai/approvals/resume.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/crm/crm.module.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/crm/public.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/crm/actions/contact-owner.handlers.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/crm/services/crm-notify.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/crm/services/access.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/crm/services/crm-read.service.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/crm/services/timeline.service.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/inbox/inbox.module.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/inbox/services/owner-move.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/inbox/services/pipeline.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/inbox/actions/conversation-state.handlers.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/sales/sales.module.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/sales/jobs/sales.jobs.module.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/sales/quotes/services/quote-system.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/sales/quotes/services/quote-write.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/sales/quotes/actions/quote-write.handlers.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/sales/quotes/actions/quote-decide.handlers.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/sales/quotes/quote-access.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/sales/quotes/repos/quotes.repo.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/sales/quotes/services/quotes-read.service.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/sales/quotes/services/quote-view.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/sales/quotes/services/quote-doc.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/booking/booking.module.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/booking/services/appointment-write.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/booking/booking-access.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/authz/data-access/record-policy.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/authz/data-access/scope-sql.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/notify/services/notifier.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/notify/services/notifications.service.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/notify/jobs/notify-mail.processor.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/notify/realtime/filter.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/notify/events/domain.rules.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/core/src/notify/notify.module.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/shared/src/api/crm.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/shared/src/api/quotes.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/shared/src/api/index.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/shared/src/index.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/shared/src/events.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/shared/src/notify/catalog.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/db/prisma/tenant/crm.prisma` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/db/prisma/tenant/sales-quotes.prisma` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/db/prisma/tenant/booking.prisma` | Existing/future ownership/approval/quote projection/composition seam |
| M | `packages/db/prisma/tenant/inbox.prisma` | Existing/future ownership/approval/quote projection/composition seam |
| M | `apps/api/src/http/crm/contacts.controller.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `apps/api/src/http/sales/quotes.controller.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `apps/api/src/app.module.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `apps/worker/src/roles/ai.module.ts` | Existing/future ownership/approval/quote projection/composition seam |
| M | `apps/worker/src/roles/jobs.module.ts` | Existing/future ownership/approval/quote projection/composition seam |
| C | `packages/core/src/kernel/actions/required-approval.ts` | Bounded source policy/typed ports/atomic transfer/receipts/current projection |
| C | `packages/core/src/kernel/ownership/ports.ts` | Bounded source policy/typed ports/atomic transfer/receipts/current projection |
| C | `packages/core/src/kernel/ownership/registry.ts` | Bounded source policy/typed ports/atomic transfer/receipts/current projection |
| C | `packages/core/src/ai/approvals/domain-authorization.ts` | Bounded source policy/typed ports/atomic transfer/receipts/current projection |
| C | `packages/core/src/crm/ownership/transfer.handler.ts` | Bounded source policy/typed ports/atomic transfer/receipts/current projection |
| C | `packages/core/src/crm/ownership/transfer-preview.ts` | Bounded source policy/typed ports/atomic transfer/receipts/current projection |
| C | `packages/core/src/crm/ownership/transfer.service.ts` | Bounded source policy/typed ports/atomic transfer/receipts/current projection |
| C | `packages/core/src/crm/ownership/transfer-undo.ts` | Bounded source policy/typed ports/atomic transfer/receipts/current projection |
| C | `packages/core/src/crm/ownership/receipts.repo.ts` | Bounded source policy/typed ports/atomic transfer/receipts/current projection |
| C | `packages/core/src/crm/ownership/authority.ts` | Bounded source policy/typed ports/atomic transfer/receipts/current projection |
| C | `packages/core/src/crm/ownership/contact-lock.ts` | Bounded source policy/typed ports/atomic transfer/receipts/current projection |
| C | `packages/core/src/crm/ownership/read.ts` | Bounded source policy/typed ports/atomic transfer/receipts/current projection |
| C | `packages/core/src/inbox/services/ownership-port.ts` | Bounded source policy/typed ports/atomic transfer/receipts/current projection |
| C | `packages/core/src/sales/quotes/services/ownership-port.ts` | Bounded source policy/typed ports/atomic transfer/receipts/current projection |
| C | `packages/core/src/sales/quotes/services/quote-assignment.ts` | Bounded source policy/typed ports/atomic transfer/receipts/current projection |
| C | `packages/core/src/booking/services/ownership-port.ts` | Bounded source policy/typed ports/atomic transfer/receipts/current projection |
| C | `packages/core/src/notify/services/ownership-notice.ts` | Bounded source policy/typed ports/atomic transfer/receipts/current projection |
| C | `packages/shared/src/api/contact-transfer.ts` | Bounded source policy/typed ports/atomic transfer/receipts/current projection |
| C | `packages/db/prisma/tenant/contact-transfer.prisma` | Bounded source policy/typed ports/atomic transfer/receipts/current projection |
| C | `packages/db/prisma/tenant/migrations/20261102001540_contact_transfer/migration.sql` | Bounded source policy/typed ports/atomic transfer/receipts/current projection |
| M | `packages/core/src/crm/insights/customer-links.ts` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| M | `packages/core/src/crm/memory/summary-consumer.ts` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| M | `packages/core/src/data-transfer/adapters/quotes.ts` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| M | `packages/core/src/insights/exports/sales-readers.ts` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| M | `packages/core/src/insights/metrics/sales.ts` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| M | `packages/core/src/ai/assistant/catalog.ts` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| M | `apps/web/src/features/customers/components/TransferOwnerModal.tsx` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| M | `apps/web/src/features/customers/components/BulkTransferModal.tsx` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| M | `apps/web/src/features/customers/api.ts` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| M | `apps/web/src/features/customers/types.ts` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| C | `apps/web/src/features/customers/hooks/useContactTransfer.ts` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| C | `apps/web/src/features/customers/components/TransferResult.tsx` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| M | `apps/web/src/features/quotes/components/QuoteFormModal.tsx` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| M | `apps/web/src/features/quotes/components/OverviewTab.tsx` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| M | `apps/web/src/features/quotes/components/QuotesToolbar.tsx` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| M | `apps/web/src/features/quotes/columns.tsx` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| M | `apps/web/src/features/quotes/types.ts` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| M | `apps/web/src/features/quotes/api.ts` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| M | `apps/web/src/shared/api/mock/domains/customers.ts` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| M | `apps/web/src/shared/api/mock/domains/quotes.ts` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| M | `apps/web/src/shared/api/mock/domains/quotes-actions.ts` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| M | `apps/web/src/shared/realtime/event-invalidation.ts` | Current UI/AI/export attribution vs operational assignee; pending!=success |
| M | `apps/web/messages/vi/actions.json` | Localized result/approval/notice |
| M | `apps/web/messages/vi/customers.json` | Localized result/approval/notice |
| M | `apps/web/messages/vi/quotes.json` | Localized result/approval/notice |
| M | `apps/web/messages/vi/inbox.json` | Localized result/approval/notice |
| M | `packages/shared/src/i18n/server/vi/crm.ts` | Server transfer/notice text |
| M | `packages/shared/src/i18n/server/vi/notify.ts` | Server transfer/notice text |
| M | `packages/shared/src/i18n/server/vi/sales.ts` | Server transfer/notice text |
| M | `apps/web/messages/en/actions.json` | Localized result/approval/notice |
| M | `apps/web/messages/en/customers.json` | Localized result/approval/notice |
| M | `apps/web/messages/en/quotes.json` | Localized result/approval/notice |
| M | `apps/web/messages/en/inbox.json` | Localized result/approval/notice |
| M | `packages/shared/src/i18n/server/en/crm.ts` | Server transfer/notice text |
| M | `packages/shared/src/i18n/server/en/notify.ts` | Server transfer/notice text |
| M | `packages/shared/src/i18n/server/en/sales.ts` | Server transfer/notice text |
| C | `packages/actions/test/contact-transfer-policy.test.ts` | Dedicated native/worker/UI/live evidence and future report |
| C | `packages/core/test/contact-transfer.test.ts` | Dedicated native/worker/UI/live evidence and future report |
| C | `packages/core/test/contact-transfer-undo.test.ts` | Dedicated native/worker/UI/live evidence and future report |
| C | `packages/core/test/contact-transfer-policy.test.ts` | Dedicated native/worker/UI/live evidence and future report |
| C | `packages/core/test/quote-assignment.test.ts` | Dedicated native/worker/UI/live evidence and future report |
| C | `packages/core/test/ownership-notice.test.ts` | Dedicated native/worker/UI/live evidence and future report |
| C | `apps/api/test/integration/contact-transfer.test.ts` | Dedicated native/worker/UI/live evidence and future report |
| C | `apps/api/test/integration/contact-transfer-concurrency.test.ts` | Dedicated native/worker/UI/live evidence and future report |
| C | `apps/api/test/integration/quote-assignment.test.ts` | Dedicated native/worker/UI/live evidence and future report |
| M | `apps/api/test/integration/actions/contact.transfer_owner.action.test.ts` | Dedicated native/worker/UI/live evidence and future report |
| C | `apps/worker/test/integration/contact-transfer-composition.test.ts` | Dedicated native/worker/UI/live evidence and future report |
| C | `apps/web/src/features/customers/hooks/useContactTransfer.test.tsx` | Dedicated native/worker/UI/live evidence and future report |
| C | `apps/web/e2e/contact-transfer.spec.ts` | Dedicated native/worker/UI/live evidence and future report |
| C | `apps/web/e2e/http/contact-transfer.spec.ts` | Dedicated native/worker/UI/live evidence and future report |
| C | `tools/parity/modules/contact-transfer.ts` | Dedicated native/worker/UI/live evidence and future report |
| M | `tools/parity/parity.manifest.ts` | Dedicated native/worker/UI/live evidence and future report |
| C | `fixtures/ai-eval/contact-transfer/cases.json` | Dedicated native/worker/UI/live evidence and future report |
| C | `coding-packs/reports/TIP-015d-completion.md` | Dedicated native/worker/UI/live evidence and future report |
| C | `packages/actions/src/contact-transfer.ts` | Bulk transfer and current status actions |
| C | `packages/core/src/crm/ownership/bulk-transfer.handler.ts` | Protected045b per-contact recipe and truthful per-item outcomes |
| C | `packages/core/src/crm/ownership/status.handler.ts` | Scoped read action same reader asHTTP |
| M | `packages/core/src/kernel/jobs/bulk-dispatch.ts` | Verify newparent/child transfer recipe without source rewrite |
| M | `packages/core/src/sales/quotes/services/conversion-lock.ts` | 032b rootcontact-beforequote lock order; attribution source preserved |
| M | `apps/api/src/http/notify/notify.controller.ts` | Current ownership-notice projection for history |
| M | `packages/core/src/notify/jobs/notify.jobs.module.ts` | Supplycurrentresolver/authz to mail dispatch |
| M | `packages/core/src/notify/public.ts` | Updated current notice-reader wiring |
| M | `apps/web/messages/vi/shell.json` | Registered namespace for notification fallback |
| M | `apps/web/messages/en/shell.json` | Registered namespace for notification fallback |
| M | `packages/core/src/booking/actions/appointment-book.handlers.ts` | Root-contact lock and fresh ownership before appointment creation |
| M | `packages/core/src/inbox/actions/conversation-assign.handlers.ts` | Single/bulk assignment and undo root-lock/fence |
| M | `packages/core/src/inbox/services/conversation-mutations.ts` | 025b canonical mutation lock/fence integration |
| M | `packages/core/src/inbox/actions/email-send.handlers.ts` | Fresh contact ownership when creating email conversation |
| M | `packages/core/src/sales/quotes/services/quote-send.ts` | Contact-first lock before quote/conversation creation and current-owner reread |
| M | `packages/core/src/ai/approvals/approvals.read.ts` | Domain-authorized list before pagination and current projection |
| M | `apps/api/src/http/ai/agents.controller.ts` | Inject domain-aware approval reader dependencies |
| M | `packages/core/src/ai/public.ts` | Updated approval read facade |
| M | `packages/core/src/inbox/approvals/conversation-approvals.ts` | Same transfer approval visibility in Inbox |
| M | `packages/core/src/ai/assistant/genui/history.ts` | Approval reference current domain authority on replay |
| M | `packages/core/src/ai/assistant/genui/refs.ts` | Approval references current authorized projection |
| M | `packages/core/src/ai/assistant/genui/stream.ts` | Revalidate transfer approval before stream delivery |
| M | `packages/core/src/authz/fields/history-provenance.ts` | Bind transfer approval to contact dependencies including bulk |
| C | `packages/core/src/crm/ownership/approval-projection.ts` | Typed visibility predicate and safe current DTO projection |
| C | `packages/core/test/contact-transfer-approval-read.test.ts` | Current-scope list/history/Inbox/GenUI canaries |
| C | `apps/api/test/integration/contact-transfer-approval-read.test.ts` | Native pagination and revoked approver read tests |

## Future M provenance

- `packages/core/src/authz/data-access/record-policy.ts`: TIP-042c-record-scope.md
- `packages/core/src/authz/data-access/scope-sql.ts`: TIP-042c-record-scope.md
- `packages/core/src/crm/insights/customer-links.ts`: TIP-015b-contact-memory.md
- `packages/core/src/crm/memory/summary-consumer.ts`: TIP-015b-contact-memory.md
- `packages/core/src/data-transfer/adapters/quotes.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/insights/exports/sales-readers.ts`: TIP-038-insights-dashboard.md
- `packages/core/src/insights/metrics/sales.ts`: TIP-038-insights-dashboard.md
- `apps/api/test/integration/actions/contact.transfer_owner.action.test.ts`: TIP-023b-assistant-coverage.md
- `packages/core/src/kernel/jobs/bulk-dispatch.ts`: TIP-045b-app-hardening.md
- `packages/core/src/sales/quotes/services/conversion-lock.ts`: TIP-032b-commerce-gaps.md
- `packages/core/src/inbox/services/conversation-mutations.ts`: TIP-025b-inbox-vertical.md
- `packages/core/src/inbox/approvals/conversation-approvals.ts`: TIP-025b-inbox-vertical.md
- `packages/core/src/ai/assistant/genui/history.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/refs.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/stream.ts`: TIP-023c-generative-ui.md
- `packages/core/src/authz/fields/history-provenance.ts`: TIP-045b-app-hardening.md

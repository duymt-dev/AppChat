# TIP-015e — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/actions/src/crm.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/actions/src/index.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/index.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/crm.module.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/public.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/actions/contact-merge.handler.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/services/duplicates.service.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/services/crm-read.service.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/services/contact360.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/services/access.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/services/identity.service.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/actions/contact-owner.handlers.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/lifecycle/family.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/lifecycle/lock.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/lifecycle/restore.handler.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/memory/merge.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/memory/revision.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/insights/customer-debt.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/insights/customer-links.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/insights/read.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/activities/read.service.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/activities/notes.handlers.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/activities/tasks.handlers.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/activities/opportunities.handlers.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/crm/ownership/contact-lock.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/inbox/services/view.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/inbox/services/read.service.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/inbox/services/access.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/inbox/services/pipeline.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/inbox/repos/conversations.repo.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/inbox/services/contact-lifecycle.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/sales/quotes/quote-access.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/sales/quotes/repos/quotes.repo.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/sales/quotes/services/quotes-read.service.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/sales/orders/order-access.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/sales/orders/repos/orders.repo.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/sales/orders/services/orders-read.service.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/sales/payments/invoice-access.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/sales/payments/repos/invoices.repo.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/sales/payments/services/invoices-read.service.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/sales/payments/services/financial-roots.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/sales/payments/actions/package.handlers.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/sales/contact-lifecycle/dependencies.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/contracts/contract-access.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/contracts/repos/contracts.repo.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/contracts/services/contracts-read.service.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/contracts/services/contact-lifecycle.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/booking/services/appointment-write.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/booking/services/calendar-read.service.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/booking/services/booking-system.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/booking/actions/appointment-book.handlers.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/booking/actions/appointment-flow.handlers.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/booking/booking-access.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/booking/services/contact-lifecycle.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/support/services/tickets-read.service.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/support/actions/ticket-create.handler.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/support/actions/ticket-edit.handlers.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/support/actions/ticket-flow.handlers.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/support/services/contact-lifecycle.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/loyalty/repos/ledger.repo.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/loyalty/actions/member.handlers.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/loyalty/services/contact-lifecycle.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/marketing/services/recipient-snapshot.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/marketing/repos/recipients.repo.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/marketing/services/contact-lifecycle.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/ai/reply/reply-context.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/ai/reply/turn-lease.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/ai/reply/send-fence.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/core/src/authz/fields/history-provenance.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/shared/src/api/crm.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/shared/src/api/index.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/shared/src/events.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/shared/src/index.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/shared/src/i18n/server/vi/crm.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/shared/src/i18n/server/en/crm.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `packages/db/prisma/tenant/crm.prisma` | Canonical family integration and current-authority projection; bounded modules only |
| M | `apps/api/src/http/crm/contacts.controller.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `apps/web/src/features/customers/components/DedupeModal.tsx` | Canonical family integration and current-authority projection; bounded modules only |
| M | `apps/web/src/features/customers/api.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `apps/web/src/features/customers/types.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `apps/web/src/features/customers/screens/CustomersScreen.tsx` | Canonical family integration and current-authority projection; bounded modules only |
| M | `apps/web/src/features/customers/crm-store.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `apps/web/src/shared/api/mock/domains/customers.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `apps/web/src/shared/api/mock/domains/inbox.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `apps/web/src/shared/realtime/event-invalidation.ts` | Canonical family integration and current-authority projection; bounded modules only |
| M | `apps/web/messages/vi/customers.json` | Canonical family integration and current-authority projection; bounded modules only |
| M | `apps/web/messages/en/customers.json` | Canonical family integration and current-authority projection; bounded modules only |
| M | `apps/web/messages/vi/actions.json` | Canonical family integration and current-authority projection; bounded modules only |
| M | `apps/web/messages/en/actions.json` | Canonical family integration and current-authority projection; bounded modules only |
| M | `tools/parity/parity.manifest.ts` | Canonical family integration and current-authority projection; bounded modules only |
| C | `packages/actions/src/contact-merge.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `packages/shared/src/api/contact-merge.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `packages/db/prisma/tenant/contact-merge.prisma` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `packages/db/prisma/tenant/migrations/20261102001550_contact_merge_lineage/migration.sql` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `packages/core/src/crm/merge/module.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `packages/core/src/crm/merge/handler.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `packages/core/src/crm/merge/plans.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `packages/core/src/crm/merge/receipts.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `packages/core/src/crm/merge/relations.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `packages/core/src/crm/merge/authority.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `packages/core/src/crm/merge/undo.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `packages/core/src/crm/merge/candidates.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `packages/core/src/crm/merge/candidates.handler.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `packages/core/src/crm/merge/lineage.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `apps/web/src/features/customers/components/dedupe/DedupeGroup.tsx` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `apps/web/src/features/customers/components/dedupe/DedupeEvidence.tsx` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `apps/web/src/features/customers/hooks/useDedupe.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `apps/web/src/features/customers/hooks/useDedupe.test.tsx` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `packages/actions/test/contact-merge.test.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `packages/core/test/contact-merge-plan.test.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `packages/core/test/contact-merge-lineage.test.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `apps/api/test/integration/contact-merge.test.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `apps/api/test/integration/contact-merge-concurrency.test.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `apps/api/test/integration/contact-merge-authority.test.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `apps/web/e2e/contact-merge.spec.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `fixtures/ai-eval/contact-merge/cases.json` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `tools/parity/scenarios/contact-merge.ts` | Merge/dedupe scoped implementation and dedicated evidence |
| C | `coding-packs/reports/TIP-015e-completion.md` | Merge/dedupe scoped implementation and dedicated evidence |
| M | `packages/core/src/sales/payments/services/packages.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/sales/payments/services/payment-write.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/sales/quotes/services/quote-send.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/sales/quotes/services/quote-insights.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/sales/orders/services/order-insights.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/contracts/services/contract-insights.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/contracts/services/public-sign.service.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/crm/services/stage-rules.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/crm/services/timeline.service.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/crm/lifecycle/identity-state.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/loyalty/services/member-read.service.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/insights/metrics/sales.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/insights/metrics/customers.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/insights/exports/sales-readers.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/data-transfer/adapters/contacts.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/data-transfer/adapters/orders.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/data-transfer/adapters/contracts.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/data-transfer/adapters/invoices.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/data-transfer/adapters/quotes.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/data-transfer/services/artifacts.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/loyalty/actions/redeem-points.handler.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/loyalty/actions/ledger-system.handlers.ts` | Historical source-lineage consumer/authority and guarded effects |
| M | `packages/core/src/kernel/jobs/bulk-dispatch.ts` | Register contact.merge private connected-unit recipe with unchanged trusted actor/source |
| C | `packages/core/src/crm/merge/bulk.ts` | Parent plan partition/result projection; single connected-unit atomic handler under045b private capability |
| M | `packages/core/src/kernel/actions/executor.ts` | Exact executor plan/bulk boundary or canonical new-business association integration |
| M | `packages/core/src/kernel/actions/handler.ts` | Exact executor plan/bulk boundary or canonical new-business association integration |
| M | `packages/core/src/kernel/actions/confirm-token.ts` | Exact executor plan/bulk boundary or canonical new-business association integration |
| M | `packages/core/src/kernel/actions/action-context.ts` | Exact executor plan/bulk boundary or canonical new-business association integration |
| M | `packages/core/src/kernel/kernel.module.ts` | Exact executor plan/bulk boundary or canonical new-business association integration |
| M | `packages/core/src/sales/orders/actions/order-create.handlers.ts` | Exact executor plan/bulk boundary or canonical new-business association integration |
| M | `packages/core/src/sales/orders/actions/order-from-appointment.handler.ts` | Exact executor plan/bulk boundary or canonical new-business association integration |
| M | `packages/core/src/sales/payments/actions/invoice-write.handlers.ts` | Exact executor plan/bulk boundary or canonical new-business association integration |
| M | `packages/core/src/contracts/actions/contract-write.handlers.ts` | Exact executor plan/bulk boundary or canonical new-business association integration |
| M | `packages/core/src/sales/quotes/actions/quote-write.handlers.ts` | Exact executor plan/bulk boundary or canonical new-business association integration |
| C | `packages/core/src/kernel/actions/preview-binding.ts` | Bounded immutable preview binding extension and dedicated execution/recovery evidence |
| C | `packages/core/test/contact-merge-executor.test.ts` | Bounded immutable preview binding extension and dedicated execution/recovery evidence |
| C | `apps/api/test/integration/contact-merge-bulk-recovery.test.ts` | Bounded immutable preview binding extension and dedicated execution/recovery evidence |
| M | `packages/core/src/authz/data-access/record-policy.ts` | Review integration: shared family policy/writers/loyalty/cache/cleanup composition |
| M | `packages/core/src/authz/data-access/scope-sql.ts` | Review integration: shared family policy/writers/loyalty/cache/cleanup composition |
| M | `packages/core/src/inbox/services/conversation-link.ts` | Review integration: shared family policy/writers/loyalty/cache/cleanup composition |
| M | `packages/core/src/crm/activities/source-context.ts` | Review integration: shared family policy/writers/loyalty/cache/cleanup composition |
| M | `packages/core/src/crm/memory/summary-consumer.ts` | Review integration: shared family policy/writers/loyalty/cache/cleanup composition |
| M | `packages/core/src/crm/memory/summary.ts` | Review integration: shared family policy/writers/loyalty/cache/cleanup composition |
| M | `packages/core/src/crm/jobs/crm.jobs.module.ts` | Review integration: shared family policy/writers/loyalty/cache/cleanup composition |
| M | `packages/core/src/loyalty/services/ledger.service.ts` | Review integration: shared family policy/writers/loyalty/cache/cleanup composition |
| M | `packages/core/src/loyalty/repos/member.repo.ts` | Review integration: shared family policy/writers/loyalty/cache/cleanup composition |
| M | `packages/core/src/loyalty/jobs/loyalty.scheduler.ts` | Review integration: shared family policy/writers/loyalty/cache/cleanup composition |
| M | `packages/core/src/sales/orders/actions/order-flow.handlers.ts` | Review integration: shared family policy/writers/loyalty/cache/cleanup composition |
| C | `packages/core/src/crm/merge/purge.ts` | Bounded private receipt cleanup and family economic-effect tests |
| C | `packages/core/test/contact-merge-loyalty.test.ts` | Bounded private receipt cleanup and family economic-effect tests |

## Future M provenance

- `packages/core/src/crm/lifecycle/family.ts`: TIP-015f-contact-lifecycle.md
- `packages/core/src/crm/lifecycle/lock.ts`: TIP-015f-contact-lifecycle.md
- `packages/core/src/crm/lifecycle/restore.handler.ts`: TIP-015f-contact-lifecycle.md
- `packages/core/src/crm/memory/merge.ts`: TIP-015b-contact-memory.md
- `packages/core/src/crm/memory/revision.ts`: TIP-015b-contact-memory.md
- `packages/core/src/crm/insights/customer-debt.ts`: TIP-015b-contact-memory.md
- `packages/core/src/crm/insights/customer-links.ts`: TIP-015b-contact-memory.md
- `packages/core/src/crm/insights/read.ts`: TIP-015b-contact-memory.md
- `packages/core/src/crm/activities/read.service.ts`: TIP-026b-crm-activities.md
- `packages/core/src/crm/activities/notes.handlers.ts`: TIP-026b-crm-activities.md
- `packages/core/src/crm/activities/tasks.handlers.ts`: TIP-026b-crm-activities.md
- `packages/core/src/crm/activities/opportunities.handlers.ts`: TIP-026b-crm-activities.md
- `packages/core/src/crm/ownership/contact-lock.ts`: TIP-015d-contact-transfer.md
- `packages/core/src/inbox/services/contact-lifecycle.ts`: TIP-015f-contact-lifecycle.md
- `packages/core/src/sales/payments/services/financial-roots.ts`: TIP-015f-contact-lifecycle.md
- `packages/core/src/sales/contact-lifecycle/dependencies.ts`: TIP-015f-contact-lifecycle.md
- `packages/core/src/contracts/services/contact-lifecycle.ts`: TIP-015f-contact-lifecycle.md
- `packages/core/src/booking/services/contact-lifecycle.ts`: TIP-015f-contact-lifecycle.md
- `packages/core/src/support/services/contact-lifecycle.ts`: TIP-015f-contact-lifecycle.md
- `packages/core/src/loyalty/repos/ledger.repo.ts`: TIP-036-loyalty.md
- `packages/core/src/loyalty/actions/member.handlers.ts`: TIP-036-loyalty.md
- `packages/core/src/loyalty/services/contact-lifecycle.ts`: TIP-015f-contact-lifecycle.md
- `packages/core/src/marketing/services/recipient-snapshot.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/repos/recipients.repo.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/services/contact-lifecycle.ts`: TIP-015f-contact-lifecycle.md
- `packages/core/src/ai/reply/turn-lease.ts`: TIP-045b-app-hardening.md
- `packages/core/src/ai/reply/send-fence.ts`: TIP-045b-app-hardening.md
- `packages/core/src/authz/fields/history-provenance.ts`: TIP-045b-app-hardening.md
- `packages/core/src/crm/lifecycle/identity-state.ts`: TIP-015f-contact-lifecycle.md
- `packages/core/src/loyalty/services/member-read.service.ts`: TIP-036-loyalty.md
- `packages/core/src/insights/metrics/sales.ts`: TIP-038-insights-dashboard.md
- `packages/core/src/insights/metrics/customers.ts`: TIP-038-insights-dashboard.md
- `packages/core/src/insights/exports/sales-readers.ts`: TIP-038-insights-dashboard.md
- `packages/core/src/data-transfer/adapters/contacts.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/adapters/orders.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/adapters/contracts.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/adapters/invoices.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/adapters/quotes.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/services/artifacts.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/loyalty/actions/redeem-points.handler.ts`: TIP-036-loyalty.md
- `packages/core/src/loyalty/actions/ledger-system.handlers.ts`: TIP-036-loyalty.md
- `packages/core/src/kernel/jobs/bulk-dispatch.ts`: TIP-045b-app-hardening.md
- `packages/core/src/authz/data-access/record-policy.ts`: TIP-042c-record-scope.md
- `packages/core/src/authz/data-access/scope-sql.ts`: TIP-042c-record-scope.md
- `packages/core/src/inbox/services/conversation-link.ts`: TIP-025b-inbox-vertical.md
- `packages/core/src/crm/activities/source-context.ts`: TIP-026b-crm-activities.md
- `packages/core/src/crm/memory/summary-consumer.ts`: TIP-015b-contact-memory.md
- `packages/core/src/crm/memory/summary.ts`: TIP-015b-contact-memory.md
- `packages/core/src/loyalty/services/ledger.service.ts`: TIP-036-loyalty.md
- `packages/core/src/loyalty/repos/member.repo.ts`: TIP-036-loyalty.md
- `packages/core/src/loyalty/jobs/loyalty.scheduler.ts`: TIP-036-loyalty.md

# TIP-015f — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/actions/src/crm.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/actions/src/orders.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/actions/src/index.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/index.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/crm/crm.module.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/crm/public.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/crm/actions/contact-write.handlers.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/crm/actions/contact-io.handlers.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/crm/actions/contact-owner.handlers.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/crm/services/access.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/crm/services/identity.service.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/crm/services/crm-read.service.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/crm/insights/customer-debt.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/crm/ownership/contact-lock.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/inbox/services/pipeline.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/inbox/services/read.service.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/inbox/services/view.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/inbox/services/access.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/inbox/services/conversation-link.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/inbox/repos/conversations.repo.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/inbox/events/inbox.rules.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/inbox/inbox.module.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/inbox/jobs/inbound.processor.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/inbox/actions/email-send.handlers.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/inbox/actions/message.handlers.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/inbox/services/outbound.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/channels/jobs/send.processor.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/ai/reply/reply.service.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/ai/reply/reply-context.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/ai/reply/turn-lease.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/ai/reply/send-fence.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/authz/fields/history-provenance.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/notify/realtime/filter.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/notify/services/notifier.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/notify/jobs/notify-mail.processor.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/notify/services/notifications.service.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/sales/sales.module.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/sales/orders/actions/order-create.handlers.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/sales/orders/actions/order-from-appointment.handler.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/sales/orders/actions/order-flow.handlers.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/sales/orders/order-access.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/sales/orders/services/order-import.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/sales/orders/services/order-sync.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/sales/orders/actions/order-sync.handler.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/sales/orders/editing/order-create-undo.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/sales/quotes/services/conversion-lock.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/sales/payments/actions/invoice-write.handlers.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/sales/payments/actions/invoice-pay.handlers.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/sales/payments/actions/refund.handlers.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/sales/payments/services/payment-write.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/sales/payments/services/refunds.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/sales/payments/services/order-refund.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/sales/payments/services/payment-system.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/sales/payments/invoice-access.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/contracts/contracts.module.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/contracts/contract-access.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/contracts/actions/contract-write.handlers.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/contracts/actions/contract-approval.handlers.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/contracts/actions/contract-send.handlers.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/contracts/services/public-sign.service.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/contracts/files/source.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/contracts/editing/contract-create-undo.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/booking/booking.module.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/support/support.module.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/kernel/kernel.module.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/core/src/data-transfer/adapters/contacts.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/shared/src/api/crm.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/shared/src/api/inbox.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/shared/src/api/index.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/shared/src/index.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/shared/src/events.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/shared/src/errors.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/shared/src/i18n/server/vi/crm.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/shared/src/i18n/server/en/crm.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/shared/src/i18n/server/vi/inbox.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/shared/src/i18n/server/en/inbox.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/db/prisma/tenant/crm.prisma` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `packages/db/prisma/tenant/sales-orders.prisma` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/api/src/http/crm/contacts.controller.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/api/src/http/notify/realtime/ws.gateway.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/src/features/customers/components/CrmHeaderActions.tsx` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/src/features/customers/components/CrmOverlays.tsx` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/src/features/customers/api.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/src/features/customers/types.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/src/features/customers/crm-store.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/src/features/inbox/components/Panel360.tsx` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/src/features/inbox/components/Profile360Actions.tsx` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/src/features/inbox/components/ConvMenu.tsx` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/src/features/inbox/screens/InboxScreen.tsx` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/src/features/orders/components/OrdersToolbar.tsx` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/src/shared/api/mock/domains/customers.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/src/shared/api/mock/domains/orders-actions.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/src/shared/realtime/event-invalidation.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/messages/vi/customers.json` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/messages/en/customers.json` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/messages/vi/inbox.json` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/messages/en/inbox.json` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/messages/vi/actions.json` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/messages/en/actions.json` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/messages/vi/orders.json` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/messages/en/orders.json` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/messages/vi/errors.json` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/web/messages/en/errors.json` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `apps/api/test/integration/actions/contact.delete.action.test.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| M | `tools/parity/parity.manifest.ts` | Existing/predecessor lifecycle, lock, projection or composition seam |
| C | `packages/actions/src/contact-lifecycle.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/src/kernel/contact-lifecycle/ports.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/src/kernel/contact-lifecycle/registry.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/src/crm/lifecycle/module.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/src/crm/lifecycle/lock.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/src/crm/lifecycle/dependencies.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/src/crm/lifecycle/delete.handler.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/src/crm/lifecycle/restore.handler.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/src/crm/lifecycle/deleted-list.handler.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/src/crm/lifecycle/receipts.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/src/crm/lifecycle/read.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/src/crm/lifecycle/create-undo.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/src/crm/lifecycle/identity-state.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/src/inbox/services/contact-lifecycle.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/src/sales/contact-lifecycle/dependencies.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/src/sales/orders/services/blocked-imports.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/src/contracts/services/contact-lifecycle.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/src/booking/services/contact-lifecycle.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/src/support/services/contact-lifecycle.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/shared/src/api/contact-lifecycle.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/db/prisma/tenant/contact-lifecycle.prisma` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/db/prisma/tenant/migrations/20261102001560_contact_lifecycle/migration.sql` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `apps/web/src/features/customers/components/DeletedContactsDrawer.tsx` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `apps/web/src/features/customers/hooks/useDeletedContacts.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `apps/web/src/features/inbox/components/DeletedContactPanel.tsx` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/actions/test/contact-lifecycle.test.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/test/contact-lifecycle.test.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/test/contact-lifecycle-identity.test.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/test/contact-lifecycle-dependencies.test.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `packages/core/test/contact-lifecycle-blocked-import.test.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `apps/api/test/integration/contact-lifecycle.test.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `apps/api/test/integration/contact-lifecycle-concurrency.test.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `apps/api/test/integration/contact-lifecycle-inbound.test.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `apps/worker/test/integration/contact-lifecycle-composition.test.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `apps/web/src/features/customers/hooks/useDeletedContacts.test.tsx` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `apps/web/e2e/contact-lifecycle.spec.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `apps/web/e2e/http/contact-lifecycle.spec.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `tools/parity/modules/contact-lifecycle.ts` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `fixtures/ai-eval/contact-lifecycle/cases.json` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| C | `coding-packs/reports/TIP-015f-completion.md` | Bounded lifecycle module/DTO/schema/UI or dedicated verification |
| M | `packages/core/src/sales/payments/services/bank-feed.ts` | Contact-first financial lock/current lifecycle policy, or relation port composition |
| M | `packages/core/src/sales/payments/bank/ingress.ts` | Contact-first financial lock/current lifecycle policy, or relation port composition |
| M | `packages/core/src/sales/payments/bank/reconcile.ts` | Contact-first financial lock/current lifecycle policy, or relation port composition |
| M | `packages/core/src/sales/payments/actions/bank-ingest.handler.ts` | Contact-first financial lock/current lifecycle policy, or relation port composition |
| M | `packages/core/src/loyalty/loyalty.module.ts` | Contact-first financial lock/current lifecycle policy, or relation port composition |
| M | `packages/core/src/loyalty/actions/redeem-points.handler.ts` | Contact-first financial lock/current lifecycle policy, or relation port composition |
| C | `packages/core/src/sales/payments/services/financial-roots.ts` | Bounded financial root locking, strict-create-undo relation check or existing merge family resolution |
| C | `packages/core/src/loyalty/services/contact-lifecycle.ts` | Bounded financial root locking, strict-create-undo relation check or existing merge family resolution |
| C | `packages/core/src/crm/lifecycle/family.ts` | Bounded financial root locking, strict-create-undo relation check or existing merge family resolution |
| M | `packages/core/src/marketing/marketing.module.ts` | Register relation-only lifecycle port; preserve campaign policy |
| C | `packages/core/src/marketing/services/contact-lifecycle.ts` | Detect recipient/source relations for pristine-create undo and safe warning counts |
| M | `packages/core/src/booking/actions/appointment-book.handlers.ts` | Contact-first live policy at booking creation; preserve015d root lock |
| M | `packages/core/src/support/actions/ticket-create.handler.ts` | Lock canonical contact including source-message/served-conversation derived context before insert |
| M | `apps/web/src/shared/api/mock/domains/inbox.ts` | Deleted/unavailable current projection and restore invalidation scenarios |
| M | `packages/core/src/sales/payments/actions/package.handlers.ts` | Contact/order/package root order; extension/reopening live policy; current-authorized inverse |
| M | `packages/core/src/crm/activities/notes.handlers.ts` | Future026b live root gate before relation creation/reassociation |
| M | `packages/core/src/crm/activities/tasks.handlers.ts` | Future026b live root gate before relation creation/reassociation |
| M | `packages/core/src/crm/activities/opportunities.handlers.ts` | Future026b live root gate before relation creation/reassociation |
| M | `packages/core/src/crm/memory/handlers.ts` | Future015b current lifecycle at existing contact lock |
| M | `packages/core/src/crm/memory/summary-consumer.ts` | Future015b no deleted-profile summary writes |
| M | `packages/core/src/marketing/services/recipient-snapshot.ts` | Future037 stable sorted contact roots, exclude deleted candidates at materialization |
| M | `packages/core/src/marketing/repos/recipients.repo.ts` | Future037 recipient insertion participates in same lifecycle lock |
| M | `packages/core/src/loyalty/repos/ledger.repo.ts` | Future036 contact-first append serialization for pristine inverse |
| M | `packages/core/src/loyalty/actions/ledger-system.handlers.ts` | Future036 distinguish historical ledger correction from new enrollment/reward |
| M | `packages/core/src/loyalty/actions/member.handlers.ts` | Future036 live gate for enrollment/new entitlement |
| M | `apps/api/src/app.module.ts` | Import bounded lifecycle composition alongside existing registered domains |
| M | `apps/worker/src/roles/ai.module.ts` | Import read-port composition without activating foreign role processors |
| M | `apps/worker/src/roles/jobs.module.ts` | Import all seven read ports; no dependency on absent Marketing/Inbox JobsModule |
| M | `apps/worker/src/roles/channels.module.ts` | Import same lifecycle composition for inbound contact roots |
| C | `packages/core/src/composition/contact-lifecycle.module.ts` | Read-port-only composition; all7 once, no processors or domain module cycles |
| C | `packages/core/src/sales/orders/services/external-order-payload.ts` | Bounded runtime schema, canonical hashing and provider timestamp normalization |
| C | `packages/core/test/contact-lifecycle-payload.test.ts` | Runtime normalization size/money/date/canonical hash matrix |
| C | `packages/core/src/sales/contact-lifecycle.module.ts` | Domain-owned dependency adapter module; kernel/SQL only, no jobs/domain aggregate imports |
| C | `packages/core/src/contracts/contact-lifecycle.module.ts` | Domain-owned dependency adapter module; kernel/SQL only, no jobs/domain aggregate imports |
| C | `packages/core/src/inbox/contact-lifecycle.module.ts` | Domain-owned dependency adapter module; kernel/SQL only, no jobs/domain aggregate imports |
| C | `packages/core/src/booking/contact-lifecycle.module.ts` | Domain-owned dependency adapter module; kernel/SQL only, no jobs/domain aggregate imports |
| C | `packages/core/src/support/contact-lifecycle.module.ts` | Domain-owned dependency adapter module; kernel/SQL only, no jobs/domain aggregate imports |
| C | `packages/core/src/loyalty/contact-lifecycle.module.ts` | Domain-owned dependency adapter module; kernel/SQL only, no jobs/domain aggregate imports |
| C | `packages/core/src/marketing/contact-lifecycle.module.ts` | Domain-owned dependency adapter module; kernel/SQL only, no jobs/domain aggregate imports |

## Future M provenance

- `packages/core/src/crm/insights/customer-debt.ts`: TIP-015b-contact-memory.md
- `packages/core/src/crm/ownership/contact-lock.ts`: TIP-015d-contact-transfer.md
- `packages/core/src/inbox/services/conversation-link.ts`: TIP-025b-inbox-vertical.md
- `packages/core/src/ai/reply/turn-lease.ts`: TIP-045b-app-hardening.md
- `packages/core/src/ai/reply/send-fence.ts`: TIP-045b-app-hardening.md
- `packages/core/src/authz/fields/history-provenance.ts`: TIP-045b-app-hardening.md
- `packages/core/src/sales/orders/editing/order-create-undo.ts`: TIP-032c-commerce-edit-integrity.md
- `packages/core/src/sales/quotes/services/conversion-lock.ts`: TIP-032b-commerce-gaps.md
- `packages/core/src/contracts/files/source.ts`: TIP-030b-contract-files.md
- `packages/core/src/contracts/editing/contract-create-undo.ts`: TIP-032c-commerce-edit-integrity.md
- `packages/core/src/data-transfer/adapters/contacts.ts`: TIP-038b-ai-first-data-transfer.md
- `apps/api/test/integration/actions/contact.delete.action.test.ts`: TIP-023b-assistant-coverage.md
- `packages/core/src/sales/payments/bank/ingress.ts`: TIP-012b-bank-connectors.md
- `packages/core/src/sales/payments/bank/reconcile.ts`: TIP-012b-bank-connectors.md
- `packages/core/src/sales/payments/actions/bank-ingest.handler.ts`: TIP-012b-bank-connectors.md
- `packages/core/src/loyalty/actions/redeem-points.handler.ts`: TIP-036-loyalty.md
- `packages/core/src/crm/activities/notes.handlers.ts`: TIP-026b-crm-activities.md
- `packages/core/src/crm/activities/tasks.handlers.ts`: TIP-026b-crm-activities.md
- `packages/core/src/crm/activities/opportunities.handlers.ts`: TIP-026b-crm-activities.md
- `packages/core/src/crm/memory/handlers.ts`: TIP-015b-contact-memory.md
- `packages/core/src/crm/memory/summary-consumer.ts`: TIP-015b-contact-memory.md
- `packages/core/src/marketing/services/recipient-snapshot.ts`: TIP-037-marketing.md
- `packages/core/src/marketing/repos/recipients.repo.ts`: TIP-037-marketing.md
- `packages/core/src/loyalty/repos/ledger.repo.ts`: TIP-036-loyalty.md
- `packages/core/src/loyalty/actions/ledger-system.handlers.ts`: TIP-036-loyalty.md
- `packages/core/src/loyalty/actions/member.handlers.ts`: TIP-036-loyalty.md

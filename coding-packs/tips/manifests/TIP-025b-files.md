# TIP-025b — exact file manifest

M = modify, C = create. Future M requires earlier TIP implementation. No directory wildcard. Production modules separate from tests; parity legacy facade only.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/actions/src/inbox.ts` | Actions and contracts |
| M | `packages/actions/src/ai.ts` | Actions and contracts |
| M | `packages/actions/src/quotes.ts` | Actions and contracts |
| M | `packages/actions/src/orders.ts` | Actions and contracts |
| M | `packages/actions/src/contracts.ts` | Actions and contracts |
| M | `packages/actions/src/support.ts` | Actions and contracts |
| M | `packages/actions/src/index.ts` | Actions and contracts |
| M | `packages/shared/src/api/inbox.ts` | Actions and contracts |
| M | `packages/shared/src/api/index.ts` | Actions and contracts |
| M | `packages/shared/src/events.ts` | Actions and contracts |
| M | `packages/shared/src/index.ts` | Actions and contracts |
| M | `packages/core/src/inbox/inbox.module.ts` | Inbox domain wiring |
| M | `packages/core/src/inbox/public.ts` | Inbox domain wiring |
| M | `packages/core/src/inbox/actions/conversation-assign.handlers.ts` | Inbox domain wiring |
| M | `packages/core/src/inbox/actions/conversation-state.handlers.ts` | Inbox domain wiring |
| M | `packages/core/src/inbox/actions/message.handlers.ts` | Inbox domain wiring |
| M | `packages/core/src/inbox/services/read.service.ts` | Inbox domain wiring |
| M | `packages/core/src/inbox/services/meta.service.ts` | Inbox domain wiring |
| M | `packages/core/src/inbox/services/view.ts` | Inbox domain wiring |
| M | `packages/core/src/inbox/repos/conversations.repo.ts` | Inbox domain wiring |
| M | `packages/core/src/inbox/events/inbox.rules.ts` | Inbox domain wiring |
| M | `packages/core/src/index.ts` | Inbox domain wiring |
| M | `packages/core/src/ai/ai.module.ts` | Inbox domain wiring |
| M | `packages/core/src/ai/skills/translate.handler.ts` | Inbox domain wiring |
| M | `packages/core/src/ai/approvals/approvals.read.ts` | Inbox domain wiring |
| M | `apps/api/src/http/inbox/conversations.controller.ts` | Inbox domain wiring |
| M | `apps/api/src/http/inbox/inbox-meta.controller.ts` | Inbox domain wiring |
| M | `apps/api/src/http/inbox/inbox.http.module.ts` | Inbox domain wiring |
| M | `packages/core/src/sales/quotes/services/quote-write.ts` | Context propagation at canonical writers |
| M | `packages/core/src/sales/quotes/actions/quote-write.handlers.ts` | Context propagation at canonical writers |
| M | `packages/core/src/sales/orders/actions/order-create.handlers.ts` | Context propagation at canonical writers |
| M | `packages/core/src/sales/orders/services/order-write.ts` | Context propagation at canonical writers |
| M | `packages/core/src/contracts/actions/contract-write.handlers.ts` | Context propagation at canonical writers |
| M | `packages/core/src/contracts/services/contract-write.ts` | Context propagation at canonical writers |
| M | `packages/core/src/booking/actions/appointment-book.handlers.ts` | Context propagation at canonical writers |
| M | `packages/core/src/support/actions/ticket-create.handler.ts` | Context propagation at canonical writers |
| M | `packages/core/src/crm/services/contact360.ts` | Context propagation at canonical writers |
| M | `packages/core/src/crm/services/timeline.service.ts` | Context propagation at canonical writers |
| M | `packages/db/prisma/tenant/inbox.prisma` | Schema and provider facade |
| M | `packages/channels/src/zalo-personal/transport.ts` | Schema and provider facade |
| M | `packages/channels/src/zalo-personal/manifest.ts` | Schema and provider facade |
| M | `packages/channels/src/zalo-personal/fake-transport.ts` | Schema and provider facade |
| M | `apps/web/src/features/inbox/api.ts` | Inbox UI integration |
| M | `apps/web/src/features/inbox/types.ts` | Inbox UI integration |
| M | `apps/web/src/features/inbox/inbox-store.ts` | Inbox UI integration |
| M | `apps/web/src/features/inbox/screens/InboxScreen.tsx` | Inbox UI integration |
| M | `apps/web/src/features/inbox/hooks/useConversations.ts` | Inbox UI integration |
| M | `apps/web/src/features/inbox/hooks/useComposerFiles.ts` | Inbox UI integration |
| M | `apps/web/src/features/inbox/components/GroupInfoPanel.tsx` | Inbox UI integration |
| M | `apps/web/src/features/inbox/components/GroupSections.tsx` | Inbox UI integration |
| M | `apps/web/src/features/inbox/components/ThreadSearchBar.tsx` | Inbox UI integration |
| M | `apps/web/src/features/inbox/components/Profile360Actions.tsx` | Inbox UI integration |
| M | `apps/web/src/features/inbox/components/Profile360Content.tsx` | Inbox UI integration |
| M | `apps/web/src/features/inbox/components/Panel360.tsx` | Inbox UI integration |
| M | `apps/web/src/features/inbox/components/Overview360.tsx` | Inbox UI integration |
| M | `apps/web/src/features/inbox/components/Tabs360.tsx` | Inbox UI integration |
| M | `apps/web/src/features/inbox/components/Blocks360.tsx` | Inbox UI integration |
| M | `apps/web/src/features/inbox/components/Composer.tsx` | Inbox UI integration |
| M | `apps/web/src/features/inbox/components/ComposerPopovers.tsx` | Inbox UI integration |
| M | `apps/web/src/features/inbox/components/AgentToolsMenu.tsx` | Inbox UI integration |
| M | `apps/web/src/features/inbox/components/ConversationList.tsx` | Inbox UI integration |
| M | `apps/web/src/features/inbox/components/ConvRow.tsx` | Inbox UI integration |
| M | `apps/web/src/features/inbox/components/ConvMenu.tsx` | Inbox UI integration |
| M | `apps/web/src/features/inbox/components/ChatPanel.tsx` | Inbox UI integration |
| M | `apps/web/src/features/inbox/components/MessageBubble.tsx` | Inbox UI integration |
| M | `apps/web/src/features/inbox/components/MessageMenu.tsx` | Inbox UI integration |
| M | `apps/web/src/shared/realtime/event-invalidation.ts` | Inbox UI integration |
| M | `apps/web/src/shared/api/mock/domains/inbox.ts` | Inbox UI integration |
| M | `apps/web/src/shared/api/mock/domains/quotes.ts` | Inbox UI integration |
| M | `apps/web/src/shared/api/mock/domains/orders.ts` | Inbox UI integration |
| M | `apps/web/src/shared/api/mock/domains/contracts.ts` | Inbox UI integration |
| M | `apps/web/src/shared/api/mock/domains/calendar.ts` | Inbox UI integration |
| M | `apps/web/src/shared/api/mock/domains/tickets.ts` | Inbox UI integration |
| M | `apps/web/src/features/quotes/hooks/useQuoteDraft.ts` | Shared form consumers |
| M | `apps/web/src/features/orders/hooks/useOrderForm.ts` | Shared form consumers |
| M | `apps/web/src/features/contracts/hooks/useContractForm.ts` | Shared form consumers |
| M | `apps/web/src/features/calendar/hooks/useApptForm.ts` | Shared form consumers |
| M | `apps/web/src/features/tickets/components/TicketFormModal.tsx` | Shared form consumers |
| M | `apps/web/src/features/customers/index.ts` | Shared form consumers |
| M | `apps/web/src/features/calendar/index.ts` | Shared form consumers |
| M | `apps/web/src/features/calendar/api.ts` | Shared form consumers |
| M | `tools/parity/parity.manifest.ts` | Regression entry |
| M | `apps/web/src/features/inbox/api.test.ts` | Regression entry |
| M | `apps/web/messages/vi/inbox.json` | Localized UI and errors |
| M | `apps/web/messages/vi/actions.json` | Localized UI and errors |
| M | `packages/shared/src/i18n/server/vi/inbox.ts` | Localized UI and errors |
| M | `apps/web/messages/en/inbox.json` | Localized UI and errors |
| M | `apps/web/messages/en/actions.json` | Localized UI and errors |
| M | `packages/shared/src/i18n/server/en/inbox.ts` | Localized UI and errors |
| M | `packages/channels/src/operations.ts` | Future predecessor file; integrate first, never recreate |
| M | `packages/channels/src/zalo-personal/provider-operations.ts` | Future predecessor file; integrate first, never recreate |
| M | `packages/core/src/channels/operations/operation-service.ts` | Future predecessor file; integrate first, never recreate |
| M | `packages/core/src/channels/jobs/provider-operations.processor.ts` | Future predecessor file; integrate first, never recreate |
| M | `packages/shared/src/data-transfer/registry.ts` | Future predecessor file; integrate first, never recreate |
| M | `packages/shared/src/api/data-transfer.ts` | Future predecessor file; integrate first, never recreate |
| M | `packages/core/src/data-transfer/data-transfer.providers.ts` | Future predecessor file; integrate first, never recreate |
| M | `packages/core/src/data-transfer/types.ts` | Future predecessor file; integrate first, never recreate |
| M | `packages/core/src/data-transfer/services/planner.ts` | Future predecessor file; integrate first, never recreate |
| M | `packages/core/src/data-transfer/services/validation.ts` | Future predecessor file; integrate first, never recreate |
| M | `packages/core/src/data-transfer/jobs/transfer.runner.ts` | Future predecessor file; integrate first, never recreate |
| M | `packages/core/src/ai/assistant/genui/inbox-draft.ts` | Future predecessor file; integrate first, never recreate |
| C | `packages/actions/src/inbox-groups.ts` | Inbox domain modules |
| C | `packages/actions/src/inbox-aliases.ts` | Inbox domain modules |
| C | `packages/actions/src/inbox-translation.ts` | Inbox domain modules |
| C | `packages/actions/src/inbox-reads.ts` | Inbox domain modules |
| C | `packages/shared/src/api/inbox-groups.ts` | Inbox domain modules |
| C | `packages/shared/src/api/inbox-thread.ts` | Inbox domain modules |
| C | `packages/shared/src/api/inbox-translation.ts` | Inbox domain modules |
| C | `packages/core/src/inbox/groups/group.handlers.ts` | Inbox domain modules |
| C | `packages/core/src/inbox/groups/group-read.ts` | Inbox domain modules |
| C | `packages/core/src/inbox/groups/group-policy.ts` | Inbox domain modules |
| C | `packages/core/src/inbox/actions/alias.handlers.ts` | Inbox domain modules |
| C | `packages/core/src/inbox/actions/bulk-update.handler.ts` | Inbox domain modules |
| C | `packages/core/src/inbox/actions/read.handlers.ts` | Inbox domain modules |
| C | `packages/core/src/inbox/bulk/bulk-runner.ts` | Inbox domain modules |
| C | `packages/core/src/inbox/bulk/bulk-undo.ts` | Inbox domain modules |
| C | `packages/core/src/inbox/repos/thread-search.repo.ts` | Inbox domain modules |
| C | `packages/core/src/inbox/services/thread-read.ts` | Inbox domain modules |
| C | `packages/core/src/inbox/services/conversation-link.ts` | Inbox domain modules |
| C | `packages/core/src/inbox/services/assignment-candidates.ts` | Inbox domain modules |
| C | `packages/core/src/inbox/jobs/inbox-bulk.processor.ts` | Inbox domain modules |
| C | `packages/core/src/inbox/approvals/conversation-approvals.ts` | Inbox domain modules |
| C | `packages/core/src/data-transfer/adapters/contact-timeline.ts` | Inbox domain modules |
| C | `packages/core/src/ai/skills/draft-translate.handler.ts` | Inbox domain modules |
| C | `packages/core/src/ai/skills/translation-service.ts` | Inbox domain modules |
| C | `packages/core/src/ai/skills/translation-cache.ts` | Inbox domain modules |
| C | `apps/api/src/http/inbox/inbox-groups.controller.ts` | Inbox domain modules |
| C | `apps/api/src/http/inbox/inbox-thread.controller.ts` | Inbox domain modules |
| C | `packages/db/prisma/tenant/inbox-ui.prisma` | Inbox domain modules |
| C | `packages/db/prisma/tenant/migrations/20261102002520_inbox_vertical/migration.sql` | Inbox domain modules |
| C | `packages/channels/src/zalo-personal/group-settings.ts` | Inbox domain modules |
| C | `apps/web/src/features/inbox/components/GroupManageModal.tsx` | Extracted UI |
| C | `apps/web/src/features/inbox/components/GroupMembersModal.tsx` | Extracted UI |
| C | `apps/web/src/features/inbox/components/GroupBoardDrawer.tsx` | Extracted UI |
| C | `apps/web/src/features/inbox/components/GroupMediaDrawer.tsx` | Extracted UI |
| C | `apps/web/src/features/inbox/components/ConversationBulkBar.tsx` | Extracted UI |
| C | `apps/web/src/features/inbox/components/BulkResultPanel.tsx` | Extracted UI |
| C | `apps/web/src/features/inbox/components/AssignmentPicker.tsx` | Extracted UI |
| C | `apps/web/src/features/inbox/components/ThreadViewport.tsx` | Extracted UI |
| C | `apps/web/src/features/inbox/components/InboxApprovals.tsx` | Extracted UI |
| C | `apps/web/src/features/inbox/components/SchedulingPopover.tsx` | Extracted UI |
| C | `apps/web/src/features/inbox/components/TranslationPopover.tsx` | Extracted UI |
| C | `apps/web/src/features/inbox/components/TranslationPreview.tsx` | Extracted UI |
| C | `apps/web/src/features/inbox/components/CapturePreview.tsx` | Extracted UI |
| C | `apps/web/src/features/inbox/hooks/useGroupActions.ts` | Extracted UI |
| C | `apps/web/src/features/inbox/hooks/useThreadWindow.ts` | Extracted UI |
| C | `apps/web/src/features/inbox/hooks/useThreadSearch.ts` | Extracted UI |
| C | `apps/web/src/features/inbox/hooks/useInboxSelection.ts` | Extracted UI |
| C | `apps/web/src/features/inbox/hooks/useInboxBulk.ts` | Extracted UI |
| C | `apps/web/src/features/inbox/hooks/useConversationContext.ts` | Extracted UI |
| C | `apps/web/src/features/inbox/hooks/useInboxSlots.ts` | Extracted UI |
| C | `apps/web/src/features/inbox/hooks/useInboxTranslation.ts` | Extracted UI |
| C | `apps/web/src/features/inbox/hooks/useInboxCapture.ts` | Extracted UI |
| C | `apps/web/src/features/inbox/thread-api.ts` | Extracted UI |
| C | `apps/web/src/features/inbox/group-api.ts` | Extracted UI |
| C | `apps/web/src/features/inbox/approval-api.ts` | Extracted UI |
| C | `apps/web/src/features/inbox/bulk-types.ts` | Extracted UI |
| C | `apps/web/src/features/inbox/group-types.ts` | Extracted UI |
| C | `apps/web/src/features/inbox/components/thread-highlight.tsx` | Extracted UI |
| C | `apps/web/src/shared/media/screen-capture.ts` | Extracted UI |
| C | `packages/core/test/inbox-group-controls.test.ts` | Dedicated evidence |
| C | `packages/core/test/inbox-bulk-results.test.ts` | Dedicated evidence |
| C | `packages/core/test/inbox-thread-search.test.ts` | Dedicated evidence |
| C | `packages/core/test/inbox-vertical-context.test.ts` | Dedicated evidence |
| C | `packages/core/test/inbox-translation.test.ts` | Dedicated evidence |
| C | `packages/core/test/inbox-approval-cards.test.ts` | Dedicated evidence |
| C | `packages/core/test/contact-timeline-export.test.ts` | Dedicated evidence |
| C | `packages/core/test/inbox-counts.test.ts` | Dedicated evidence |
| C | `apps/api/test/integration/inbox-group-controls.test.ts` | Dedicated evidence |
| C | `apps/api/test/integration/inbox-bulk-results.test.ts` | Dedicated evidence |
| C | `apps/api/test/integration/inbox-thread-search.test.ts` | Dedicated evidence |
| C | `apps/api/test/integration/inbox-vertical-context.test.ts` | Dedicated evidence |
| C | `apps/api/test/integration/inbox-translation.test.ts` | Dedicated evidence |
| C | `apps/api/test/integration/contact-timeline-export.test.ts` | Dedicated evidence |
| C | `apps/api/test/integration/inbox-counts.test.ts` | Dedicated evidence |
| C | `packages/channels/test/zalo-group-settings.test.ts` | Dedicated evidence |
| C | `apps/web/src/features/inbox/components/GroupInfoPanel.test.tsx` | Dedicated evidence |
| C | `apps/web/src/features/inbox/components/ThreadViewport.test.tsx` | Dedicated evidence |
| C | `apps/web/src/features/inbox/components/ConversationBulkBar.test.tsx` | Dedicated evidence |
| C | `apps/web/src/features/inbox/components/SchedulingPopover.test.tsx` | Dedicated evidence |
| C | `apps/web/src/features/inbox/components/TranslationPreview.test.tsx` | Dedicated evidence |
| C | `apps/web/src/features/inbox/components/CapturePreview.test.tsx` | Dedicated evidence |
| C | `apps/web/src/features/inbox/components/InboxApprovals.test.tsx` | Dedicated evidence |
| C | `apps/web/e2e/inbox-vertical.spec.ts` | Dedicated evidence |
| C | `apps/web/e2e/http/inbox-vertical.spec.ts` | Dedicated evidence |
| C | `tools/parity/manifests/inbox-vertical.ts` | Dedicated evidence |
| C | `fixtures/ai-eval/inbox-vertical/cases.json` | Dedicated evidence |
| M | `apps/worker/src/roles/jobs.module.ts` | Register inbox bulk/translation cleanup job handlers |
| M | `packages/core/src/kernel/jobs/bulk-dispatch.ts` | Future045b parent orchestrator registration |
| C | `packages/core/src/ai/jobs/translation-cache.cleanup.ts` | Bounded cache retention job |
| C | `apps/api/test/integration/inbox-approval-cards.test.ts` | HTTP approval current scope evidence |
| C | `apps/web/src/shared/crm-forms/contact-edit-command.ts` | Typed command bridge to canonical CRM form |
| M | `apps/web/src/features/inbox/index.ts` | Public 360 context props |
| M | `apps/web/src/features/customers/crm-store.ts` | Global canonical form target lifecycle |
| M | `apps/web/src/features/customers/components/CrmOverlays.tsx` | Remove duplicate form/transfer hosts |
| M | `apps/web/src/features/customers/components/ContactFormModal.tsx` | Field-aware patch and version from edit context |
| M | `apps/web/src/features/customers/api.ts` | Scoped edit-context query |
| M | `apps/web/src/app/(app)/_crm-forms/CrmFormsHost.tsx` | Mount shared canonical contact host on Inbox route |
| C | `apps/web/src/app/(app)/_crm-forms/ContactFormHost.tsx` | App-level host avoids feature import cycles |
| M | `packages/core/src/crm/crm.module.ts` | Register edit-context read service/action |
| M | `packages/core/src/crm/public.ts` | Export edit-context reader |
| M | `apps/api/src/http/crm/contacts.controller.ts` | Scoped GET edit-context |
| M | `apps/web/src/shared/api/mock/domains/customers.ts` | Edit context mock parity |
| C | `packages/shared/src/api/contact-edit.ts` | Projected form DTO |
| C | `packages/actions/src/crm-forms.ts` | contact.get_edit_context read action |
| C | `packages/core/src/crm/services/contact-edit.ts` | Canonical current-scope field projection |
| C | `packages/core/src/crm/actions/contact-edit-read.handler.ts` | Reuse same reader as GET |
| C | `apps/web/src/features/customers/components/ContactFormContext.test.tsx` | Global host mask/stale/transfer regression |
| C | `packages/actions/src/inbox-bulk.ts` | Trusted per-record composite action contract |
| C | `packages/core/src/inbox/actions/bulk-item.handler.ts` | Atomic canonical mutations with trusted parent binding |
| C | `packages/core/src/inbox/services/conversation-mutations.ts` | Shared single/bulk state and assignment helpers |
| C | `packages/core/src/inbox/jobs/inbox-ui.jobs.module.ts` | ROLE=jobs only bulk/cache lifecycle; do not start channel/AI workers |
| M | `packages/core/src/ai/assistant/catalog.ts` | Exclude trusted internal bulk_item from model discovery |
| M | `packages/core/src/kernel/actions/action-context.ts` | Private server-derived bulk lineage, never HTTP/model-supplied |
| C | `apps/worker/test/integration/inbox-ui-jobs.test.ts` | Worker composition and recovery without duplicate channel sessions |
| M | `packages/actions/src/crm.ts` | Optional contact.update if_version and version result |
| M | `packages/db/prisma/tenant/crm.prisma` | Native contact optimistic version column |
| M | `packages/core/src/crm/actions/contact-write.handlers.ts` | CAS contact.update and current-version undo delegation |
| C | `packages/core/src/crm/services/contact-version.ts` | Current-scope CAS and changed-field version-aware undo |
| C | `packages/db/prisma/tenant/migrations/20261102002521_contact_version/migration.sql` | Separate CRM version default/trigger for all writers |
| C | `packages/core/test/contact-edit-version.test.ts` | Version CAS helper tests |
| C | `apps/api/test/integration/contact-edit-version.test.ts` | Native two-writer and legacy trigger/undo tests |
| M | `apps/web/src/features/customers/ui-commands.ts` | Separate global form prefill from screen-only handlers and tests |
| M | `apps/web/src/features/customers/ui-commands.test.tsx` | Separate global form prefill from screen-only handlers and tests |
| M | `apps/web/src/features/quotes/ui-commands.ts` | Separate global form prefill from screen-only handlers and tests |
| M | `apps/web/src/features/quotes/ui-commands.test.tsx` | Separate global form prefill from screen-only handlers and tests |
| M | `apps/web/src/features/orders/ui-commands.ts` | Separate global form prefill from screen-only handlers and tests |
| M | `apps/web/src/features/orders/ui-commands.test.tsx` | Separate global form prefill from screen-only handlers and tests |
| M | `apps/web/src/features/contracts/ui-commands.ts` | Separate global form prefill from screen-only handlers and tests |
| M | `apps/web/src/features/contracts/ui-commands.test.tsx` | Separate global form prefill from screen-only handlers and tests |
| M | `apps/web/src/features/calendar/ui-commands.ts` | Separate global form prefill from screen-only handlers and tests |
| M | `apps/web/src/features/calendar/ui-commands.test.tsx` | Separate global form prefill from screen-only handlers and tests |
| M | `apps/web/src/features/tickets/ui-commands.ts` | Separate global form prefill from screen-only handlers and tests |
| M | `apps/web/src/features/tickets/ui-commands.test.tsx` | Separate global form prefill from screen-only handlers and tests |
| M | `apps/web/src/features/customers/components/TransferOwnerModal.tsx` | Minimal authorized transfer context without ContactRow cast |
| C | `apps/web/src/app/(app)/_crm-forms/FormCommandHost.tsx` | Global form-prefill-only registrations |
| C | `apps/web/src/app/(app)/_crm-forms/FormCommandHost.test.tsx` | Inbox-only and navigation lifecycle context tests |

## Future M provenance

- `packages/channels/src/operations.ts`: TIP-014b-zalo-lifecycle.md
- `packages/channels/src/zalo-personal/provider-operations.ts`: TIP-014b-zalo-lifecycle.md
- `packages/core/src/channels/operations/operation-service.ts`: TIP-014b-zalo-lifecycle.md
- `packages/core/src/channels/jobs/provider-operations.processor.ts`: TIP-014b-zalo-lifecycle.md
- `packages/shared/src/data-transfer/registry.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/shared/src/api/data-transfer.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/data-transfer.providers.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/types.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/services/planner.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/services/validation.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/jobs/transfer.runner.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/ai/assistant/genui/inbox-draft.ts`: TIP-023c-generative-ui.md
- `packages/core/src/kernel/jobs/bulk-dispatch.ts`: TIP-045b-app-hardening.md

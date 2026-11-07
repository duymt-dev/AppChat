# TIP-026b — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/actions/src/crm.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/actions/src/settings-apps.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/actions/src/index.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/core/src/index.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/shared/src/api/crm.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/shared/src/api/index.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/shared/src/index.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/shared/src/events.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/db/prisma/tenant/crm.prisma` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/core/src/crm/crm.module.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/core/src/crm/public.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/core/src/crm/services/contact360.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/core/src/crm/services/crm-read.service.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/core/src/crm/services/contact-view.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/core/src/crm/services/layouts.service.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/core/src/crm/repos/contacts.repo.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/core/src/crm/actions/contact-write.handlers.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/core/src/crm/actions/profile-layout.handlers.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `apps/api/src/http/crm/crm.http.module.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `apps/api/src/http/crm/contacts.controller.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `apps/api/src/http/crm/crm-settings.controller.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/core/src/ai/assistant/catalog.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/core/src/crm/memory/summary-consumer.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/core/src/crm/insights/customer-links.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/core/src/crm/insights/read.ts` | Existing/future CRM360 integration; extracted domain logic only |
| M | `packages/core/src/authz/fields/projection.ts` | Existing/future CRM360 integration; extracted domain logic only |
| C | `packages/actions/src/contact-notes.ts` | Bounded activity/board/CAS modules and migrations |
| C | `packages/actions/src/contact-tasks.ts` | Bounded activity/board/CAS modules and migrations |
| C | `packages/actions/src/contact-opportunities.ts` | Bounded activity/board/CAS modules and migrations |
| C | `packages/shared/src/api/contact-activities.ts` | Bounded activity/board/CAS modules and migrations |
| C | `packages/shared/src/crm/activity-state.ts` | Bounded activity/board/CAS modules and migrations |
| C | `packages/db/prisma/tenant/crm-activities.prisma` | Bounded activity/board/CAS modules and migrations |
| C | `packages/db/prisma/tenant/migrations/20261102002610_crm_activities/migration.sql` | Bounded activity/board/CAS modules and migrations |
| C | `packages/db/prisma/tenant/migrations/20261102002611_crm_board_layout_cas/migration.sql` | Bounded activity/board/CAS modules and migrations |
| C | `packages/core/src/crm/activities/activities.module.ts` | Bounded activity/board/CAS modules and migrations |
| C | `packages/core/src/crm/activities/authority.ts` | Bounded activity/board/CAS modules and migrations |
| C | `packages/core/src/crm/activities/notes.handlers.ts` | Bounded activity/board/CAS modules and migrations |
| C | `packages/core/src/crm/activities/tasks.handlers.ts` | Bounded activity/board/CAS modules and migrations |
| C | `packages/core/src/crm/activities/opportunities.handlers.ts` | Bounded activity/board/CAS modules and migrations |
| C | `packages/core/src/crm/activities/read.handler.ts` | Bounded activity/board/CAS modules and migrations |
| C | `packages/core/src/crm/activities/read.service.ts` | Bounded activity/board/CAS modules and migrations |
| C | `packages/core/src/crm/activities/repository.ts` | Bounded activity/board/CAS modules and migrations |
| C | `packages/core/src/crm/activities/projection.ts` | Bounded activity/board/CAS modules and migrations |
| C | `packages/core/src/crm/activities/source-context.ts` | Bounded activity/board/CAS modules and migrations |
| C | `packages/core/src/crm/activities/undo.ts` | Bounded activity/board/CAS modules and migrations |
| C | `packages/core/src/crm/repos/board.repo.ts` | Bounded activity/board/CAS modules and migrations |
| C | `packages/core/src/crm/repos/contact-filter.ts` | Bounded activity/board/CAS modules and migrations |
| C | `packages/core/src/crm/services/board-page.ts` | Bounded activity/board/CAS modules and migrations |
| C | `packages/core/src/crm/actions/contact-stage.handler.ts` | Bounded activity/board/CAS modules and migrations |
| C | `packages/core/src/crm/services/layout-version.ts` | Bounded activity/board/CAS modules and migrations |
| C | `apps/api/src/http/crm/contact-activities.controller.ts` | Bounded activity/board/CAS modules and migrations |
| M | `packages/actions/src/data-transfer.ts` | 038b CRM child-dataset adapters; AI-first and manual same execution |
| M | `packages/shared/src/api/data-transfer.ts` | 038b CRM child-dataset adapters; AI-first and manual same execution |
| M | `packages/shared/src/data-transfer/registry.ts` | 038b CRM child-dataset adapters; AI-first and manual same execution |
| M | `packages/core/src/data-transfer/data-transfer.providers.ts` | 038b CRM child-dataset adapters; AI-first and manual same execution |
| M | `packages/core/src/data-transfer/types.ts` | 038b CRM child-dataset adapters; AI-first and manual same execution |
| C | `packages/core/src/data-transfer/adapters/contact-notes.ts` | 038b CRM child-dataset adapters; AI-first and manual same execution |
| C | `packages/core/src/data-transfer/adapters/contact-tasks.ts` | 038b CRM child-dataset adapters; AI-first and manual same execution |
| C | `packages/core/src/data-transfer/adapters/contact-opportunities.ts` | 038b CRM child-dataset adapters; AI-first and manual same execution |
| M | `apps/web/src/features/data-transfer/components/TransferPanel.tsx` | 038b CRM child-dataset adapters; AI-first and manual same execution |
| M | `apps/web/src/shared/assistant/data-transfer-command.ts` | 038b CRM child-dataset adapters; AI-first and manual same execution |
| M | `apps/web/src/features/inbox/components/Overview360.tsx` | Canonical screen/DTO/mock integration; no cross-feature component import |
| M | `apps/web/src/features/inbox/components/ExtraCards.tsx` | Canonical screen/DTO/mock integration; no cross-feature component import |
| M | `apps/web/src/features/inbox/components/Blocks360.tsx` | Canonical screen/DTO/mock integration; no cross-feature component import |
| M | `apps/web/src/features/inbox/types.ts` | Canonical screen/DTO/mock integration; no cross-feature component import |
| M | `apps/web/src/features/customers/screens/CustomersScreen.tsx` | Canonical screen/DTO/mock integration; no cross-feature component import |
| M | `apps/web/src/features/customers/components/KanbanCard.tsx` | Canonical screen/DTO/mock integration; no cross-feature component import |
| M | `apps/web/src/features/customers/api.ts` | Canonical screen/DTO/mock integration; no cross-feature component import |
| M | `apps/web/src/features/customers/types.ts` | Canonical screen/DTO/mock integration; no cross-feature component import |
| M | `apps/web/src/features/customers/ui-commands.ts` | Canonical screen/DTO/mock integration; no cross-feature component import |
| M | `apps/web/src/features/settings/components/ProfileLayoutEditor.tsx` | Canonical screen/DTO/mock integration; no cross-feature component import |
| M | `apps/web/src/features/settings/components/Profile360Section.tsx` | Canonical screen/DTO/mock integration; no cross-feature component import |
| M | `apps/web/src/features/settings/types.ts` | Canonical screen/DTO/mock integration; no cross-feature component import |
| M | `apps/web/src/features/settings/api.ts` | Canonical screen/DTO/mock integration; no cross-feature component import |
| M | `apps/web/src/shared/api/mock/domains/customers.ts` | Canonical screen/DTO/mock integration; no cross-feature component import |
| M | `apps/web/src/shared/api/mock/domains/inbox.ts` | Canonical screen/DTO/mock integration; no cross-feature component import |
| M | `apps/web/src/shared/api/mock/domains/profile-layout.ts` | Canonical screen/DTO/mock integration; no cross-feature component import |
| M | `apps/web/src/shared/realtime/event-invalidation.ts` | Canonical screen/DTO/mock integration; no cross-feature component import |
| M | `packages/ui/src/primitives/KanbanBoard.tsx` | Canonical screen/DTO/mock integration; no cross-feature component import |
| C | `apps/web/src/shared/contact-activities/types.ts` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| C | `apps/web/src/shared/contact-activities/api.ts` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| C | `apps/web/src/shared/contact-activities/ActivityCards.tsx` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| C | `apps/web/src/shared/contact-activities/NoteCard.tsx` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| C | `apps/web/src/shared/contact-activities/TaskCard.tsx` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| C | `apps/web/src/shared/contact-activities/OpportunityCard.tsx` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| C | `apps/web/src/shared/contact-activities/ActivityListDrawer.tsx` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| C | `apps/web/src/shared/contact-activities/ActivityFormHost.tsx` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| C | `apps/web/src/shared/contact-activities/NoteForm.tsx` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| C | `apps/web/src/shared/contact-activities/TaskForm.tsx` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| C | `apps/web/src/shared/contact-activities/OpportunityForm.tsx` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| C | `apps/web/src/shared/contact-activities/useActivities.ts` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| C | `apps/web/src/shared/contact-activities/useActivityForm.ts` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| C | `apps/web/src/shared/contact-activities/commands.ts` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| C | `apps/web/src/shared/contact-activities/activity.styles.ts` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| M | `apps/web/src/app/(app)/_crm-forms/CrmFormsHost.tsx` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| M | `apps/web/src/app/(app)/_crm-forms/FormCommandHost.tsx` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| C | `apps/web/src/features/customers/components/CustomerBoard.tsx` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| C | `apps/web/src/features/customers/hooks/useCustomerBoard.ts` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| C | `apps/web/src/features/customers/components/KanbanCustomFields.tsx` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| C | `apps/web/src/features/settings/hooks/useProfileLayoutDraft.ts` | Extracted shared360 UI/forms/hooks; paged board and lossless layout draft |
| M | `apps/web/messages/vi/actions.json` | Localized action/forms/states and transfers |
| M | `apps/web/messages/vi/customers.json` | Localized action/forms/states and transfers |
| M | `apps/web/messages/vi/inbox.json` | Localized action/forms/states and transfers |
| M | `apps/web/messages/vi/settings.json` | Localized action/forms/states and transfers |
| M | `apps/web/messages/vi/data-transfer.json` | Localized action/forms/states and transfers |
| M | `packages/shared/src/i18n/server/vi/crm.ts` | Server activity/timeline text |
| M | `apps/web/messages/en/actions.json` | Localized action/forms/states and transfers |
| M | `apps/web/messages/en/customers.json` | Localized action/forms/states and transfers |
| M | `apps/web/messages/en/inbox.json` | Localized action/forms/states and transfers |
| M | `apps/web/messages/en/settings.json` | Localized action/forms/states and transfers |
| M | `apps/web/messages/en/data-transfer.json` | Localized action/forms/states and transfers |
| M | `packages/shared/src/i18n/server/en/crm.ts` | Server activity/timeline text |
| C | `packages/actions/test/contact-activities.test.ts` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| C | `packages/core/test/contact-activities.test.ts` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| C | `packages/core/test/contact-activity-undo.test.ts` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| C | `packages/core/test/contact-activity-transfer.test.ts` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| C | `packages/core/test/crm-board-page.test.ts` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| C | `packages/core/test/profile-layout-cas.test.ts` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| C | `apps/api/test/integration/contact-activities.test.ts` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| C | `apps/api/test/integration/crm-board-page.test.ts` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| C | `apps/api/test/integration/profile-layout-cas.test.ts` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| C | `apps/worker/test/integration/contact-activities.test.ts` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| C | `apps/web/src/shared/contact-activities/ActivityCards.test.tsx` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| C | `apps/web/src/features/customers/hooks/useCustomerBoard.test.tsx` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| C | `apps/web/src/features/settings/hooks/useProfileLayoutDraft.test.tsx` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| C | `packages/ui/test/kanban-pagination.test.tsx` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| C | `apps/web/e2e/crm-activities.spec.ts` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| C | `apps/web/e2e/http/crm-activities.spec.ts` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| C | `tools/parity/modules/crm-activities.ts` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| M | `tools/parity/parity.manifest.ts` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| C | `fixtures/ai-eval/crm-activities/cases.json` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| C | `fixtures/data-transfer/crm-activities.csv` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| C | `coding-packs/reports/TIP-026b-completion.md` | Dedicated unit/native/e2e/live/parity evidence; future completion report |
| M | `packages/core/src/crm/services/timeline.service.ts` | Review fix: typed timeline/projection and immutable dataset identity across plan/confirmation/dispatch/artifact |
| M | `packages/core/src/crm/memory/summary.ts` | Review fix: typed timeline/projection and immutable dataset identity across plan/confirmation/dispatch/artifact |
| M | `packages/core/src/data-transfer/adapters/contact-timeline.ts` | Review fix: typed timeline/projection and immutable dataset identity across plan/confirmation/dispatch/artifact |
| M | `packages/core/src/data-transfer/services/planner.ts` | Review fix: typed timeline/projection and immutable dataset identity across plan/confirmation/dispatch/artifact |
| M | `packages/core/src/data-transfer/services/validation.ts` | Review fix: typed timeline/projection and immutable dataset identity across plan/confirmation/dispatch/artifact |
| M | `packages/core/src/data-transfer/services/ai-planner.ts` | Review fix: typed timeline/projection and immutable dataset identity across plan/confirmation/dispatch/artifact |
| M | `packages/core/src/data-transfer/services/artifacts.ts` | Review fix: typed timeline/projection and immutable dataset identity across plan/confirmation/dispatch/artifact |
| M | `packages/core/src/data-transfer/actions/plan.handlers.ts` | Review fix: typed timeline/projection and immutable dataset identity across plan/confirmation/dispatch/artifact |
| M | `packages/core/src/data-transfer/jobs/transfer.runner.ts` | Review fix: typed timeline/projection and immutable dataset identity across plan/confirmation/dispatch/artifact |
| M | `packages/db/prisma/tenant/data-transfer.prisma` | Review fix: typed timeline/projection and immutable dataset identity across plan/confirmation/dispatch/artifact |
| M | `apps/web/src/features/data-transfer/types.ts` | Review fix: typed timeline/projection and immutable dataset identity across plan/confirmation/dispatch/artifact |
| M | `apps/web/src/features/data-transfer/hooks/useTransfer.ts` | Review fix: typed timeline/projection and immutable dataset identity across plan/confirmation/dispatch/artifact |
| C | `packages/db/prisma/tenant/migrations/20261102002612_transfer_dataset/migration.sql` | Immutable dataset and schema-version binding; legacy default preserves038b plans |

## Future M provenance

- `packages/core/src/crm/memory/summary-consumer.ts`: TIP-015b-contact-memory.md
- `packages/core/src/crm/insights/customer-links.ts`: TIP-015b-contact-memory.md
- `packages/core/src/crm/insights/read.ts`: TIP-015b-contact-memory.md
- `packages/core/src/authz/fields/projection.ts`: TIP-045b-app-hardening.md
- `packages/actions/src/data-transfer.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/shared/src/api/data-transfer.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/shared/src/data-transfer/registry.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/data-transfer.providers.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/types.ts`: TIP-038b-ai-first-data-transfer.md
- `apps/web/src/features/data-transfer/components/TransferPanel.tsx`: TIP-038b-ai-first-data-transfer.md
- `apps/web/src/shared/assistant/data-transfer-command.ts`: TIP-038b-ai-first-data-transfer.md
- `apps/web/src/app/(app)/_crm-forms/FormCommandHost.tsx`: TIP-025b-inbox-vertical.md
- `apps/web/messages/vi/data-transfer.json`: TIP-038b-ai-first-data-transfer.md
- `apps/web/messages/en/data-transfer.json`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/crm/memory/summary.ts`: TIP-015b-contact-memory.md
- `packages/core/src/data-transfer/adapters/contact-timeline.ts`: TIP-025b-inbox-vertical.md
- `packages/core/src/data-transfer/services/planner.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/services/validation.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/services/ai-planner.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/services/artifacts.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/actions/plan.handlers.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/core/src/data-transfer/jobs/transfer.runner.ts`: TIP-038b-ai-first-data-transfer.md
- `packages/db/prisma/tenant/data-transfer.prisma`: TIP-038b-ai-first-data-transfer.md
- `apps/web/src/features/data-transfer/types.ts`: TIP-038b-ai-first-data-transfer.md
- `apps/web/src/features/data-transfer/hooks/useTransfer.ts`: TIP-038b-ai-first-data-transfer.md

# TIP-023c — exact file manifest

M = modify; C = create. 272 paths. One future M, pending-action.ts, is created by prerequisite023b; all other M paths exist at planning time. Tests and blocks are separate files. Legacy parity manifest only imports/re-exports new genui module in1–2 lines. No source implementation occurred in this docs phase.

| Mode | Path | Purpose |
|---|---|---|
| C | `packages/core/src/ai/assistant/genui/inbox-draft.ts` | Restricted draft-only gateway service, no action/delegate/UI tools |
| C | `packages/core/test/inbox-assistant-draft.test.ts` | Prompt injection and denied scope before generation |
| C | `packages/core/src/ai/assistant/genui/turn-request.consumer.ts` | Durable outbox-to-queue dispatch registration |
| C | `packages/core/src/ai/assistant/genui/prune-events.ts` | Registered Clock-driven stream replay retention job |
| M | `apps/api/src/http/ai/ai.http.module.ts` | Runtime/HTTP/transport/current UI wiring |
| C | `apps/api/src/http/ai/assistant-stream.controller.ts` | New bounded module/DTO/component |
| C | `apps/api/src/http/ai/assistant-ui.controller.ts` | New bounded module/DTO/component |
| M | `apps/api/src/http/ai/assistant.controller.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `apps/api/src/http/files/files.controller.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `apps/api/src/http/kernel/actions.controller.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `apps/api/src/http/kernel/kernel.http.module.ts` | Runtime/HTTP/transport/current UI wiring |
| C | `apps/api/test/integration/actions/assistant.resume.action.test.ts` | Per-action auth/replay lifecycle matrix |
| C | `apps/api/test/integration/actions/channel.status.action.test.ts` | Per-action state/ref permission matrix |
| C | `apps/api/test/integration/genui-qr.test.ts` | Acceptance evidence including negative/replay cases |
| C | `apps/api/test/integration/genui-secrets.test.ts` | Acceptance evidence including negative/replay cases |
| C | `apps/api/test/integration/genui-stream.test.ts` | Acceptance evidence including negative/replay cases |
| C | `apps/api/test/integration/genui.test.ts` | Acceptance evidence including negative/replay cases |
| C | `apps/web/e2e/genui.spec.ts` | Acceptance evidence including negative/replay cases |
| C | `apps/web/e2e/http/genui.spec.ts` | Acceptance evidence including negative/replay cases |
| M | `apps/web/messages/en/actions.json` | System UI labels |
| M | `apps/web/messages/en/agents.json` | System UI labels |
| M | `apps/web/messages/en/assistant.json` | System UI labels |
| M | `apps/web/messages/en/calendar.json` | System UI labels |
| M | `apps/web/messages/en/common.json` | System UI labels |
| M | `apps/web/messages/en/contracts.json` | System UI labels |
| M | `apps/web/messages/en/customers.json` | System UI labels |
| M | `apps/web/messages/en/inbox.json` | System UI labels |
| M | `apps/web/messages/en/marketing.json` | System UI labels |
| M | `apps/web/messages/en/orders.json` | System UI labels |
| M | `apps/web/messages/en/quotes.json` | System UI labels |
| M | `apps/web/messages/en/tickets.json` | System UI labels |
| M | `apps/web/messages/vi/actions.json` | System UI labels |
| M | `apps/web/messages/vi/agents.json` | System UI labels |
| M | `apps/web/messages/vi/assistant.json` | System UI labels |
| M | `apps/web/messages/vi/calendar.json` | System UI labels |
| M | `apps/web/messages/vi/common.json` | System UI labels |
| M | `apps/web/messages/vi/contracts.json` | System UI labels |
| M | `apps/web/messages/vi/customers.json` | System UI labels |
| M | `apps/web/messages/vi/inbox.json` | System UI labels |
| M | `apps/web/messages/vi/marketing.json` | System UI labels |
| M | `apps/web/messages/vi/orders.json` | System UI labels |
| M | `apps/web/messages/vi/quotes.json` | System UI labels |
| M | `apps/web/messages/vi/tickets.json` | System UI labels |
| M | `apps/web/src/features/agents/agents-store.ts` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/agents/components/AgentAiDrawer.tsx` | Context selection/current record, compact assistant and safe highlight |
| C | `apps/web/src/features/agents/hooks/useAssistantContext.ts` | Register screen context without shared importing feature |
| M | `apps/web/src/features/agents/screens/AgentsScreen.tsx` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/agents/ui-commands.ts` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/assistant/api.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `apps/web/src/features/assistant/assistant-store.ts` | Runtime/HTTP/transport/current UI wiring |
| C | `apps/web/src/features/assistant/components/AssistantAttachments.tsx` | New bounded module/DTO/component |
| M | `apps/web/src/features/assistant/components/ChatThread.tsx` | Runtime/HTTP/transport/current UI wiring |
| M | `apps/web/src/features/assistant/components/Composer.tsx` | Runtime/HTTP/transport/current UI wiring |
| C | `apps/web/src/features/assistant/components/SessionBrowser.tsx` | New bounded module/DTO/component |
| C | `apps/web/src/features/assistant/hooks/useAssistantAttachments.ts` | New bounded module/DTO/component |
| M | `apps/web/src/features/assistant/hooks/useAssistantChat.ts` | Runtime/HTTP/transport/current UI wiring |
| C | `apps/web/src/features/assistant/hooks/useAssistantSessions.ts` | New bounded module/DTO/component |
| C | `apps/web/src/features/assistant/hooks/useAssistantStream.test.tsx` | Acceptance evidence including negative/replay cases |
| C | `apps/web/src/features/assistant/hooks/useAssistantStream.ts` | New bounded module/DTO/component |
| M | `apps/web/src/features/assistant/screens/AssistantScreen.tsx` | Runtime/HTTP/transport/current UI wiring |
| M | `apps/web/src/features/assistant/types.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `apps/web/src/features/assistant/ui-commands.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `apps/web/src/features/calendar/calendar-store.ts` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/calendar/components/CalendarAiDrawer.tsx` | Context selection/current record, compact assistant and safe highlight |
| C | `apps/web/src/features/calendar/hooks/useAssistantContext.ts` | Register screen context without shared importing feature |
| M | `apps/web/src/features/calendar/screens/CalendarScreen.tsx` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/calendar/ui-commands.ts` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/contracts/components/ContractAiDrawer.tsx` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/contracts/contracts-store.ts` | Context selection/current record, compact assistant and safe highlight |
| C | `apps/web/src/features/contracts/hooks/useAssistantContext.ts` | Register screen context without shared importing feature |
| M | `apps/web/src/features/contracts/screens/ContractsScreen.tsx` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/contracts/ui-commands.ts` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/customers/components/CrmAiDrawer.tsx` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/customers/crm-store.ts` | Context selection/current record, compact assistant and safe highlight |
| C | `apps/web/src/features/customers/hooks/useAssistantContext.ts` | Register screen context without shared importing feature |
| M | `apps/web/src/features/customers/screens/CustomersScreen.tsx` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/customers/ui-commands.ts` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/inbox/components/InboxAiModal.tsx` | Context selection/current record, compact assistant and safe highlight |
| C | `apps/web/src/features/inbox/hooks/useAssistantContext.ts` | Register screen context without shared importing feature |
| M | `apps/web/src/features/inbox/inbox-store.ts` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/inbox/screens/InboxScreen.tsx` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/inbox/ui-commands.ts` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/marketing/components/MarketingAiDrawer.tsx` | Context selection/current record, compact assistant and safe highlight |
| C | `apps/web/src/features/marketing/hooks/useAssistantContext.ts` | Register screen context without shared importing feature |
| M | `apps/web/src/features/marketing/marketing-store.ts` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/marketing/screens/MarketingScreen.tsx` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/marketing/ui-commands.ts` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/orders/components/OrderAiDrawer.tsx` | Context selection/current record, compact assistant and safe highlight |
| C | `apps/web/src/features/orders/hooks/useAssistantContext.ts` | Register screen context without shared importing feature |
| M | `apps/web/src/features/orders/orders-store.ts` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/orders/screens/OrdersScreen.tsx` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/orders/ui-commands.ts` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/quotes/components/QuoteAiDrawer.tsx` | Context selection/current record, compact assistant and safe highlight |
| C | `apps/web/src/features/quotes/hooks/useAssistantContext.ts` | Register screen context without shared importing feature |
| M | `apps/web/src/features/quotes/quotes-store.ts` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/quotes/screens/QuotesScreen.tsx` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/quotes/ui-commands.ts` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/tickets/components/TicketsAiDrawer.tsx` | Context selection/current record, compact assistant and safe highlight |
| C | `apps/web/src/features/tickets/hooks/useAssistantContext.ts` | Register screen context without shared importing feature |
| M | `apps/web/src/features/tickets/screens/TicketsScreen.tsx` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/tickets/tickets-store.ts` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/features/tickets/ui-commands.ts` | Context selection/current record, compact assistant and safe highlight |
| M | `apps/web/src/shared/actions/useAction.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `apps/web/src/shared/api/client.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `apps/web/src/shared/api/http-transport.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `apps/web/src/shared/api/mock/domains/assistant.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `apps/web/src/shared/api/mock/domains/settings-apps.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `apps/web/src/shared/api/mock/mock-transport.ts` | Runtime/HTTP/transport/current UI wiring |
| C | `apps/web/src/shared/api/sse-client.test.ts` | Acceptance evidence including negative/replay cases |
| C | `apps/web/src/shared/api/sse-client.ts` | New bounded module/DTO/component |
| M | `apps/web/src/shared/api/transport.ts` | Runtime/HTTP/transport/current UI wiring |
| C | `apps/web/src/shared/assistant/assistant-client.ts` | New bounded module/DTO/component |
| M | `apps/web/src/shared/assistant/AssistantDock.tsx` | Runtime/HTTP/transport/current UI wiring |
| C | `apps/web/src/shared/assistant/attachment-extensions.ts` | New bounded module/DTO/component |
| C | `apps/web/src/shared/assistant/screen-context.test.tsx` | Acceptance evidence including negative/replay cases |
| C | `apps/web/src/shared/assistant/screen-context.ts` | New bounded module/DTO/component |
| C | `apps/web/src/shared/assistant/ScreenAssistantThread.tsx` | New bounded module/DTO/component |
| M | `apps/web/src/shared/assistant/ui-command-bus.ts` | Runtime/HTTP/transport/current UI wiring |
| C | `apps/web/src/shared/assistant/useScreenAssistant.ts` | New bounded module/DTO/component |
| C | `apps/web/src/shared/genui/blocks/BadgeBlock.test.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/BadgeBlock.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/ButtonBlock.test.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/ButtonBlock.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/ButtonGroupBlock.test.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/ButtonGroupBlock.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/ChartBlock.test.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/ChartBlock.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/FormBlock.test.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/FormBlock.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/ListBlock.test.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/ListBlock.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/ProgressBlock.test.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/ProgressBlock.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/QrBlock.test.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/QrBlock.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/RowBlock.test.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/RowBlock.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/SectionBlock.test.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/SectionBlock.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/StackBlock.test.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/StackBlock.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/StatBlock.test.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/StatBlock.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/StatGroupBlock.test.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/StatGroupBlock.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/TableBlock.test.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/TableBlock.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/TextBlock.test.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/blocks/TextBlock.tsx` | One renderer block and dedicated unit tests |
| C | `apps/web/src/shared/genui/GenUiModal.tsx` | New bounded module/DTO/component |
| C | `apps/web/src/shared/genui/GenUiRenderer.tsx` | New bounded module/DTO/component |
| C | `apps/web/src/shared/genui/hooks/useGenUiIntent.ts` | New bounded module/DTO/component |
| C | `apps/web/src/shared/genui/hooks/useGenUiRefs.ts` | New bounded module/DTO/component |
| C | `apps/web/src/shared/genui/hooks/useQrAttempt.ts` | New bounded module/DTO/component |
| C | `apps/web/src/shared/genui/hooks/useSecretForm.ts` | New bounded module/DTO/component |
| C | `apps/web/src/shared/genui/registry.ts` | New bounded module/DTO/component |
| C | `apps/web/src/shared/genui/types.ts` | New bounded module/DTO/component |
| C | `apps/worker/test/integration/assistant-turn-recovery.test.ts` | Acceptance evidence including negative/replay cases |
| C | `coding-packs/reports/TIP-023c-completion.md` | New bounded module/DTO/component |
| C | `fixtures/ai-eval/genui-screen.json` | New bounded module/DTO/component |
| M | `fixtures/prototype-parity/agents.json` | At least three compact/full genui trees per surface |
| M | `fixtures/prototype-parity/assistant.json` | At least three compact/full genui trees per surface |
| M | `fixtures/prototype-parity/calendar.json` | At least three compact/full genui trees per surface |
| M | `fixtures/prototype-parity/contracts.json` | At least three compact/full genui trees per surface |
| M | `fixtures/prototype-parity/customers.json` | At least three compact/full genui trees per surface |
| M | `fixtures/prototype-parity/inbox.json` | At least three compact/full genui trees per surface |
| M | `fixtures/prototype-parity/marketing.json` | At least three compact/full genui trees per surface |
| M | `fixtures/prototype-parity/orders.json` | At least three compact/full genui trees per surface |
| M | `fixtures/prototype-parity/quotes.json` | At least three compact/full genui trees per surface |
| M | `fixtures/prototype-parity/tickets.json` | At least three compact/full genui trees per surface |
| C | `packages/actions/src/assistant-ui.ts` | New bounded module/DTO/component |
| M | `packages/actions/src/define.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/actions/src/index.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/actions/src/payments.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/actions/src/settings-apps.ts` | Runtime/HTTP/transport/current UI wiring |
| C | `packages/ai/src/gateway/delta-stream.ts` | New bounded module/DTO/component |
| M | `packages/ai/src/gateway/engine.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/ai/src/gateway/messages.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/ai/src/gateway/types.ts` | Runtime/HTTP/transport/current UI wiring |
| C | `packages/ai/src/genui/structured-stream.ts` | New bounded module/DTO/component |
| M | `packages/ai/src/index.ts` | Runtime/HTTP/transport/current UI wiring |
| C | `packages/ai/src/prompts/genui.en.md` | New bounded module/DTO/component |
| C | `packages/ai/src/prompts/genui.vi.md` | New bounded module/DTO/component |
| M | `packages/ai/src/prompts/index.ts` | Runtime/HTTP/transport/current UI wiring |
| C | `packages/ai/test/delta-stream.test.ts` | Acceptance evidence including negative/replay cases |
| C | `packages/ai/test/genui-structured-stream.test.ts` | Acceptance evidence including negative/replay cases |
| M | `packages/core/src/ai/ai.module.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/core/src/ai/assistant/assistant-prompt.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/core/src/ai/assistant/assistant.service.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/core/src/ai/assistant/catalog.ts` | Exclude internal lifecycle actions from model discovery |
| C | `packages/core/src/ai/assistant/genui/attachments.ts` | New bounded module/DTO/component |
| C | `packages/core/src/ai/assistant/genui/context.ts` | New bounded module/DTO/component |
| C | `packages/core/src/ai/assistant/genui/event-store.ts` | New bounded module/DTO/component |
| C | `packages/core/src/ai/assistant/genui/extension-registry.ts` | New bounded module/DTO/component |
| C | `packages/core/src/ai/assistant/genui/history.ts` | New bounded module/DTO/component |
| C | `packages/core/src/ai/assistant/genui/recovery.ts` | New bounded module/DTO/component |
| C | `packages/core/src/ai/assistant/genui/refs.ts` | New bounded module/DTO/component |
| C | `packages/core/src/ai/assistant/genui/render.ts` | New bounded module/DTO/component |
| C | `packages/core/src/ai/assistant/genui/request-store.ts` | New bounded module/DTO/component |
| C | `packages/core/src/ai/assistant/genui/resume.handler.ts` | Registered assistant.resume lifecycle action checks server receipt |
| C | `packages/core/src/ai/assistant/genui/resume.ts` | New bounded module/DTO/component |
| C | `packages/core/src/ai/assistant/genui/stream.ts` | New bounded module/DTO/component |
| C | `packages/core/src/ai/assistant/genui/submit.ts` | New bounded module/DTO/component |
| C | `packages/core/src/ai/assistant/genui/turn-queue.ts` | New bounded module/DTO/component |
| M | `packages/core/src/ai/assistant/meta-tools.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/core/src/ai/assistant/pending-action.ts` | Created by prerequisite023b; secret canonical snapshot stores vault handle, not plaintext |
| M | `packages/core/src/ai/assistant/sessions.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/core/src/ai/assistant/turn.service.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/core/src/ai/assistant/types.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/core/src/ai/jobs/ai.jobs.module.ts` | Runtime/HTTP/transport/current UI wiring |
| C | `packages/core/src/ai/jobs/assistant-turn.processor.ts` | New bounded module/DTO/component |
| M | `packages/core/src/ai/runs/run.store.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/core/src/ai/runs/runner.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/core/src/channels/actions/channel-connect.handlers.ts` | Runtime/HTTP/transport/current UI wiring |
| C | `packages/core/src/channels/actions/channel-status.handler.ts` | New bounded module/DTO/component |
| M | `packages/core/src/channels/channels.module.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/core/src/channels/jobs/login.processor.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/core/src/channels/services/control.ts` | Runtime/HTTP/transport/current UI wiring |
| C | `packages/core/src/channels/services/login-attempt.ts` | New bounded module/DTO/component |
| M | `packages/core/src/channels/services/read.service.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/core/src/index.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/core/src/kernel/actions/action-context.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/core/src/kernel/actions/confirm-token.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/core/src/kernel/actions/executor.ts` | Runtime/HTTP/transport/current UI wiring |
| C | `packages/core/src/kernel/actions/genui-intent.ts` | New bounded module/DTO/component |
| C | `packages/core/src/kernel/actions/secret-fields.ts` | New bounded module/DTO/component |
| C | `packages/core/src/kernel/actions/secret-vault.ts` | New bounded module/DTO/component |
| C | `packages/core/src/kernel/files/file-access.ts` | New bounded module/DTO/component |
| M | `packages/core/src/kernel/files/files.service.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/core/src/kernel/kernel.module.ts` | Runtime/HTTP/transport/current UI wiring |
| C | `packages/core/test/assistant-file-access.test.ts` | Acceptance evidence including negative/replay cases |
| C | `packages/core/test/genui-context.test.ts` | Acceptance evidence including negative/replay cases |
| C | `packages/core/test/genui-intent.test.ts` | Acceptance evidence including negative/replay cases |
| C | `packages/core/test/genui-qr-attempt.test.ts` | Acceptance evidence including negative/replay cases |
| C | `packages/core/test/genui-refs.test.ts` | Acceptance evidence including negative/replay cases |
| C | `packages/core/test/genui-secret-fields.test.ts` | Acceptance evidence including negative/replay cases |
| C | `packages/core/test/genui-stream-recovery.test.ts` | Acceptance evidence including negative/replay cases |
| M | `packages/db/prisma/tenant/ai-assistant.prisma` | Runtime/HTTP/transport/current UI wiring |
| C | `packages/db/prisma/tenant/migrations/20261102002320_genui_stream/migration.sql` | New bounded module/DTO/component |
| M | `packages/shared/src/api/assistant.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/shared/src/api/channels.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `packages/shared/src/api/index.ts` | Runtime/HTTP/transport/current UI wiring |
| C | `packages/shared/src/genui/events.ts` | New bounded module/DTO/component |
| C | `packages/shared/src/genui/index.ts` | New bounded module/DTO/component |
| C | `packages/shared/src/genui/limits.ts` | New bounded module/DTO/component |
| C | `packages/shared/src/genui/refs.ts` | New bounded module/DTO/component |
| C | `packages/shared/src/genui/schema.test.ts` | New bounded module/DTO/component |
| C | `packages/shared/src/genui/schema.ts` | New bounded module/DTO/component |
| M | `packages/shared/src/i18n/server/en/ai.ts` | Server event/error texts |
| M | `packages/shared/src/i18n/server/en/channels.ts` | Server event/error texts |
| M | `packages/shared/src/i18n/server/vi/ai.ts` | Server event/error texts |
| M | `packages/shared/src/i18n/server/vi/channels.ts` | Server event/error texts |
| M | `packages/shared/src/index.ts` | Runtime/HTTP/transport/current UI wiring |
| C | `tools/parity/modules/genui.ts` | New bounded module/DTO/component |
| M | `tools/parity/parity.manifest.ts` | Runtime/HTTP/transport/current UI wiring |
| M | `apps/web/package.json` | Install approved D55 chart dependency |
| M | `pnpm-lock.yaml` | Lock approved chart dependency |
| M | `packages/core/src/integrations/integrations.module.ts` | Register trusted metadata/probe handlers |
| M | `packages/core/src/integrations/services/read.service.ts` | Preserve legacy fields; add safe auth metadata projection |
| M | `packages/shared/src/api/integrations.ts` | Typed safe auth metadata without values |
| C | `packages/actions/src/integration-probe.ts` | integration.form_schema and integration.test definitions |
| C | `packages/core/src/integrations/actions/integration-test.handler.ts` | Read-risk bounded adapter probe; no credential persistence |
| C | `packages/core/src/integrations/actions/integration-form-schema.handler.ts` | Trusted manifest projection action |
| C | `packages/core/src/integrations/services/form-schema.ts` | Whitelist auth fields and validation; no arbitrary schema code |
| M | `apps/web/src/features/inbox/components/Composer.tsx` | Wire draft rewrite hook without auto-send |
| M | `apps/web/src/features/inbox/components/ChatPanel.tsx` | Bind conversation draft result/conflict |
| C | `apps/web/src/features/inbox/hooks/useAssistantDraft.ts` | Versioned compose/rewrite draft handoff |
| C | `apps/web/src/features/inbox/hooks/useAssistantDraft.test.tsx` | Conversation switch and concurrent human edits |
| C | `packages/core/test/integration-form-probe.test.ts` | Probe timeout/redaction/missing adapter |
| C | `apps/api/test/integration/actions/integration.test.action.test.ts` | Action matrix current permission and redaction |
| C | `apps/api/test/integration/actions/integration.form_schema.action.test.ts` | Action matrix metadata scoping |
| C | `packages/core/src/ai/assistant/genui/execution-lease.ts` | Fenced request lease and external wait checkpoint |

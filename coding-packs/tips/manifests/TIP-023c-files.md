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
| M | `apps/web/src/shared/api/mock/handlers.ts` | Register mock GenUI handlers (amended G1) |
| C | `apps/web/src/shared/api/mock/domains/assistant-ui.ts` | Mock channel.status attempt lifecycle, QR image route, assistant.resume, ui/refs (amended G1; settings-apps.ts at size budget) |
| C | `apps/web/src/shared/api/mock/domains/assistant-genui.ts` | Mock assistant turn emitting fixture genui trees with mock intents (amended G1; assistant.ts mock at size budget) |
| C | `apps/web/src/shared/api/mock/genui-vault.ts` | Mock server policy: intent forces preview, secret vault consume-once (amended G1) |
| C | `apps/web/src/shared/genui/blocks/ChartView.tsx` | Lazy-loaded @ant-design/charts view split from ChartBlock (amended G1) |
| C | `apps/web/src/shared/genui/blocks/ExpandMore.tsx` | Shared compact "Expand" control (amended G1) |
| C | `apps/web/src/shared/genui/blocks/NoData.tsx` | Shared unavailable-ref placeholder (amended G1) |
| C | `apps/web/src/shared/genui/blocks/test-utils.tsx` | Test-only render helper for block tests (amended G1) |
| C | `apps/web/src/shared/genui/context.ts` | Renderer context (refs/intents/mode) (amended G1) |
| C | `apps/web/src/shared/genui/format.ts` | Value formatting via fmt + ref reader (amended G1) |
| C | `apps/web/src/shared/genui/genui-transport.test.ts` | Acceptance evidence: intent preview, vault, QR attempt via mock transport (amended G1) |
| C | `apps/web/src/shared/genui/genui.styles.ts` | Token-only styles + tone map (amended G1) |
| C | `apps/web/src/shared/genui/index.ts` | Public entry for features (amended G1) |
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
| C | `packages/ai/test/genui-prompt.test.ts` | Acceptance evidence: genui prompt registry = .md, core rules (amended G1) |
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
| M | `packages/core/src/kernel/actions/tip-owners.ts` | Amend (thi công): `assistant.resume` → TIP chủ `023` cho kiểm tra boot "mọi action có handler hoặc TIP chủ" (test TIP-003 đòi 3 chữ số) |
| M | `apps/api/test/integration/assistant.test.ts` | Amend (thi công): danh sách tool chế độ Chat có thêm `render` (GenUI chỉ hiển thị; nút ghi vẫn qua xác nhận) |
| C | `apps/web/e2e/screen-assistant.spec.ts` | Amend (G2): E2E drawer theo màn — cây compact, lọc / tô sáng, xem trước action, "Mở trong Trợ lý" cùng phiên, mobile 390 |
| C | `apps/web/src/features/assistant/hooks/useOpenThread.ts` | Amend (G2): `/assistant?thread=` nạp lại phiên drawer (không gọi model) — tách khỏi AssistantScreen để giữ orchestrator gọn |
| C | `apps/web/src/features/customers/hooks/useHighlight.ts` | Amend (G2): highlight REQ-E05b — dòng có trên trang → focus; chưa tải → mở 360° qua API scope |
| M | `apps/web/src/features/customers/components/Customer360Drawer.tsx` | Amend (G2): đóng drawer bỏ highlight cũ (REQ-E05b) |
| M | `apps/web/src/features/customers/ui-commands.test.tsx` | Amend (G2): highlight contact / bỏ khi đổi bộ lọc |
| M | `packages/ui/src/primitives/DataTable.tsx` | Amend (G2): prop `highlightKey` — viền nhấn + cuộn tới + focus bàn phím (primitive dùng chung, không nghiệp vụ) |
| C | `apps/web/src/shared/api/mock/domains/assistant-sessions.ts` | Amend (G2): mock phiên + `/assistant/sessions/:id/messages` như server |
| C | `apps/web/src/shared/api/mock/domains/assistant-genui.test.ts` | Amend (G2): cây fixture hợp lệ theo module + mock phiên |
| M | `apps/web/src/shared/api/mock/domains/assistant-genui.ts` | Amend (G2): cây theo module (route của drawer) |
| M | `apps/web/src/shared/api/mock/routes.ts` | Amend (G2): đăng ký route phiên mock |
| M | `fixtures/prototype-parity/customers.json` | Amend (G2): `genui[]` 3 cây compact cho drawer Khách hàng (standard §12) |
| M | `apps/web/e2e/quotes.spec.ts` | Amend (G2): nút "Gợi ý giá" không còn kết quả mẫu — kiểm cây GenUI của lượt thật trong drawer |
| M | `apps/web/src/features/quotes/styles/ai.styles.ts` | Amend (G2): khoảng cách luồng hội thoại trong drawer Báo giá |
| C | `apps/web/src/shared/assistant/useDrawerAsk.ts` | Amend (G2): ô hỏi + prompt nút nhanh dùng chung cho 6 drawer (tránh lặp state nháp / gửi ở mỗi drawer) |
| C | `packages/core/src/ai/assistant/session-list.ts` | Amend (G2.8a): keyset (last_message_at, id) + tìm trigram cho trình duyệt phiên — tách khỏi sessions.ts (giữ trần) |
| M | `packages/core/src/ai/public.ts` | Amend (G2.8a): export listSessionsPage / cursor helpers |
| C | `apps/api/test/integration/assistant-sessions.test.ts` | Amend (G2.8a): keyset ổn định khi có phiên mới, tie-break id, tìm không dấu, người khác / lưu trữ ẩn, cursor hỏng 422, EXPLAIN |
| C | `apps/web/src/features/assistant/components/HistoryButton.tsx` | Amend (G2.8a): nút "Lịch sử" thanh Trợ lý (PD-009) |
| C | `apps/web/src/features/assistant/hooks/useAssistantSessions.test.tsx` | Amend (G2.8a): debounce + tải thêm theo cursor + khoá theo workspace |
| C | `apps/web/src/features/assistant/styles/sessions.styles.ts` | Amend (G2.8a): style trình duyệt phiên |
| M | `coding-packs/docs/06-prototype/DEVIATIONS.md` | Amend (G2.8a): PD-009 trình duyệt phiên (prototype không vẽ) |
| C | `apps/api/test/integration/genui-context.test.ts` | Amend (G2.6): Sales gửi id khách người khác trong context → bị bỏ trước prompt / ai_run.input; Owner giữ đủ |
| C | `packages/core/src/ai/jobs/assistant-events.processor.ts` | Amend (G2): worker + scheduler `assistant-events.prune` (15 phút) — tách khỏi ai.jobs.module (đăng ký 1 dòng) |
| C | `apps/api/test/integration/genui-prune.test.ts` | Amend (G2): dọn 24h theo lô + Clock, giữ assistant_message, rời tập armed, reset_required sau dọn, EXPLAIN index expires_at |
| C | `packages/core/src/ai/assistant/genui/turn-wait.ts` | Amend (G2, DC-316): API chờ `done` của run trên sổ (subscribe trước, đọc lại 1s, ≤ 120s) — JSON client chờ cùng run |
| C | `apps/worker/test/integration/assistant-turn-queue.test.ts` | Amend (G2, DC-316): API claim → outbox → ROLE=jobs → ROLE=ai thật; cùng request_id cùng run / 409; mất membership → failed một lần |
| M | `packages/core/src/ai/ai.env.ts` | Amend (G2, DC-316): `ASSISTANT_DISPATCH=queue|inline` + token `AI_ENV` (tránh import vòng service ↔ module) |
| M | `packages/core/src/ai/jobs/ai.jobs.module.ts` | Amend (G2): đăng ký worker `assistant-turn` + prune / recover (1–2 dòng mỗi việc) |
| M | `packages/core/src/ai/public.ts` | Amend (G2): export recovery / lease / RequestStore / RunStream cho test worker |
| M | `apps/api/test/integration/setup.ts` | Amend (G2, DC-316): harness API không có worker → `ASSISTANT_DISPATCH=inline` |
| C | `apps/api/src/http/ai/run-stream.ts` | Amend (G2, đóng DV-006): đường ống SSE dùng chung cho `GET /runs/:id/stream` và `POST /assistant/messages` (Accept SSE) — tách khỏi controller |
| C | `apps/web/src/shared/assistant/turn-stream.ts` | Amend (G2, đóng DV-006): lượt qua SSE dùng chung (màn Trợ lý / drawer / Dock), nối lại theo cursor, gom frame thành sự kiện |
| M | `apps/web/src/features/assistant/api.ts` | Amend (G2): bỏ `sendTurn` JSON (lượt đi qua turn-stream) |
| M | `apps/web/src/features/assistant/types.ts` | Amend (G2): `ChatMessage.live` — bong bóng đang nhận chữ qua luồng |
| C | `apps/web/src/features/assistant/styles/attachments.styles.ts` | Amend (G2 8c): chip tệp đính kèm theo token |
| C | `apps/web/src/features/assistant/hooks/useAssistantAttachments.test.tsx` | Amend (G2 8c): tải / lỗi → thử lại / huỷ khi đang tải / từ chối sớm |
| M | `apps/web/src/features/assistant/components/Composer.tsx` | Amend (G2 8c): hàng tệp phía trên ô soạn + Ctrl+U |
| M | `apps/web/src/features/assistant/components/ComposerPopovers.tsx` | Amend (G2 8c): "Thêm tệp" mở hộp chọn tệp |
| M | `apps/web/src/features/assistant/hooks/useAssistantChat.ts` | Amend (G2): lượt qua SSE + gửi kèm tệp đã sẵn sàng |
| M | `apps/web/e2e/assistant.spec.ts` | Amend (G2 8c): đính kèm desktop + 390 |
| M | `packages/core/src/ai/assistant/assistant-prompt.ts` | Amend (G2 8c): ngữ cảnh tệp = metadata đã kiểm (tên server, mime, extension) |
| M | `apps/api/test/integration/genui-context.test.ts` | Amend (G2 8c): tệp người khác / không có trong workspace → 422 trước model, ai_run.input chỉ metadata |
| M | `apps/web/messages/vi/assistant.json` | Amend (G2 8c): `assistant.attachments.*` (vi + en) |

| C | `apps/api/test/integration/inbox-assistant-draft.test.ts` | Amend (G3): REQ-C05c trên API thật — đề xuất không action / tin / đổi ai_mode, canary ghi chú nội bộ, ngoài scope → 404 không run |
| C | `apps/web/src/features/inbox/components/AssistantDraftBar.tsx` | Amend (G3): nút AI soạn / viết lại + thẻ đề xuất (Thay / Chèn / Bỏ, xung đột) — tách khỏi Composer (legacy) |
| C | `apps/web/src/shared/api/mock/domains/integration-probe.ts` | Amend (G3): mock `integration.form_schema` / `integration.test` cùng luật core |
| C | `apps/web/src/shared/genui/GenUiSkeleton.tsx` | Amend (G3): khung xương cây đang stream (inert, chỉ loại khối) |
| C | `apps/web/src/shared/genui/GenUiSkeleton.test.tsx` | Amend (G3): khung xương không có phần tử tương tác / chữ |
| C | `apps/web/src/shared/genui/blocks/ConnectionTest.tsx` | Amend (G3 mục 10): nút "Kiểm tra kết nối" trong form kết nối |
| C | `apps/web/src/shared/genui/blocks/ConnectionTest.test.tsx` | Amend (G3): probe đúng action, ẩn khi không quyền, không gửi form |
| C | `apps/web/src/shared/genui/connection-probe.ts` | Amend (G3): bảng tĩnh form kết nối → action thăm dò (model không chọn) |
| C | `packages/ai/src/prompts/inbox-draft.vi.md` | Amend (G3): prompt nháp Hộp thư v1 (kho prompt, agent-gateway §8) |
| C | `packages/ai/src/prompts/inbox-draft.en.md` | Amend (G3): bản en |
| M | `packages/ai/src/testing/mock-model.ts` | Amend (G3): model giả trả nháp Hộp thư; input `render` phát theo mảnh (tool-input delta) |
| C | `packages/core/src/ai/assistant/genui/skeleton-feed.ts` | Amend (G3): `ui_skeleton` lên luồng bền theo thứ tự, trước cây đã kiểm |
| M | `packages/core/src/integrations/services/connections.service.ts` | Amend (G3): tách `splitFields` dùng chung cho probe (không lưu) |
| M | `packages/core/src/integrations/services/resolver.ts` | Amend (G3): `byConnector` — kết nối đang dùng của connector cho `integration.test` |
| M | `tools/contract/src/cases.ts` | Amend (G3): ca contract FE ↔ BE cho 2 action probe |
| M | `tools/obligations/actions.json` | Amend (G3): sinh lại sổ action (2 action mới) |

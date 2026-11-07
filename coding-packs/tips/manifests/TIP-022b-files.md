# TIP022b exact file manifest

115 distinct paths; M=modify existing, C=create. Legacy parity only1-2-line facade; all new state/helpers extracted by domain, tests separate.

| Mode | Path | Purpose |
|---|---|---|
| M | `packages/actions/src/ai.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/actions/src/settings-apps.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/actions/src/index.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/shared/src/api/ai.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/shared/src/api/channels.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/shared/src/api/inbox.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/shared/src/api/index.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/shared/src/events.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/shared/src/index.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/db/prisma/tenant/ai-agents.prisma` | Agent/channel/CRM-support outcome integration |
| M | `packages/db/prisma/tenant/inbox.prisma` | Agent/channel/CRM-support outcome integration |
| M | `packages/db/prisma/tenant/support.prisma` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/ai/agents/agent.store.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/ai/agents/agent.runtime.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/ai/agents/agent.handlers.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/ai/agents/agent-llm.handlers.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/ai/agents/agents.read.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/ai/agents/templates.seed.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/ai/agents/catalog.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/ai/reply/reply.service.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/ai/reply/reply-context.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/ai/reply/reply-tools.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/ai/events/reply.rules.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/ai/ai.module.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/ai/jobs/ai.jobs.module.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/ai/approvals/resume.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/channels/services/accounts.service.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/channels/services/read.service.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/channels/actions/channel-manage.handlers.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/inbox/services/pipeline.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/inbox/services/view.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/inbox/actions/conversation-state.handlers.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/support/actions/ticket-create.handler.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/support/support.module.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/support/jobs/support.jobs.module.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/core/src/index.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/ai/src/reply/output.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/ai/src/prompts/index.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/ai/src/prompts/agent-reply.vi.md` | Agent/channel/CRM-support outcome integration |
| M | `packages/ai/src/prompts/agent-reply.en.md` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/src/features/agents/types.ts` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/src/features/agents/hooks/useAgentBuilder.ts` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/src/features/agents/components/builder/RoutingSection.tsx` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/src/features/agents/api.ts` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/src/features/settings/components/ManageChannelDrawer.tsx` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/src/features/settings/api.ts` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/src/features/inbox/components/ChatHeader.tsx` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/src/features/inbox/components/ChatPanel.tsx` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/src/features/inbox/components/AiDraftCard.tsx` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/src/features/inbox/types.ts` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/src/shared/api/mock/domains/agents.ts` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/src/shared/api/mock/domains/settings.ts` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/src/shared/api/mock/domains/inbox.ts` | Agent/channel/CRM-support outcome integration |
| M | `tools/parity/parity.manifest.ts` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/messages/vi/agents.json` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/messages/vi/inbox.json` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/messages/vi/settings.json` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/messages/vi/actions.json` | Agent/channel/CRM-support outcome integration |
| M | `packages/shared/src/i18n/server/vi/ai.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/shared/src/i18n/server/vi/channels.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/shared/src/i18n/server/vi/support.ts` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/messages/en/agents.json` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/messages/en/inbox.json` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/messages/en/settings.json` | Agent/channel/CRM-support outcome integration |
| M | `apps/web/messages/en/actions.json` | Agent/channel/CRM-support outcome integration |
| M | `packages/shared/src/i18n/server/en/ai.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/shared/src/i18n/server/en/channels.ts` | Agent/channel/CRM-support outcome integration |
| M | `packages/shared/src/i18n/server/en/support.ts` | Agent/channel/CRM-support outcome integration |
| C | `packages/shared/src/ai/weekly-schedule.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/shared/src/api/agent-channel-behavior.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/src/ai/reply/availability.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/src/ai/reply/keyword-router.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/src/ai/reply/intent.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/src/ai/reply/handoff-summary.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/src/ai/reply/attachment-context.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/src/ai/reply/greeting.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/src/ai/reply/complaint-intent.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/src/ai/agents/channel-binding-preview.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/src/ai/agents/schedule-config.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/src/ai/agents/template-revisions.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/src/support/events/ai-complaint.consumer.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/src/support/services/complaint-receipt.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/src/support/jobs/complaint-ticket.processor.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/db/prisma/tenant/ai-channel-behavior.prisma` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/db/prisma/tenant/migrations/20261102002220_agent_channel_behavior/migration.sql` | Bounded behavior module or dedicated acceptance evidence |
| C | `apps/web/src/features/agents/components/builder/WeeklyScheduleEditor.tsx` | Bounded behavior module or dedicated acceptance evidence |
| C | `apps/web/src/features/agents/components/builder/WeeklyScheduleEditor.test.tsx` | Bounded behavior module or dedicated acceptance evidence |
| C | `apps/web/src/features/agents/hooks/useWeeklySchedule.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `apps/web/src/features/settings/components/ChannelRoutingSettings.tsx` | Bounded behavior module or dedicated acceptance evidence |
| C | `apps/web/src/features/settings/channel-behavior-types.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `apps/web/src/features/inbox/components/HandoffSummaryPanel.tsx` | Bounded behavior module or dedicated acceptance evidence |
| C | `apps/web/src/features/inbox/components/HandoffSummaryPanel.test.tsx` | Bounded behavior module or dedicated acceptance evidence |
| C | `apps/web/src/features/inbox/components/IntentBadge.tsx` | Bounded behavior module or dedicated acceptance evidence |
| C | `apps/web/src/shared/forms/WeeklyScheduleFields.tsx` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/test/agent-schedules.test.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/test/agent-keyword-routing.test.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/test/agent-greeting.test.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/test/agent-handoff-summary.test.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/test/agent-intent.test.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/test/complaint-ticket.test.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/test/agent-template-upgrade.test.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/test/agent-binding-preview.test.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `packages/core/test/agent-attachment-context.test.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `apps/worker/test/integration/agent-channel-behavior.test.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `apps/worker/test/integration/complaint-ticket-recovery.test.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `apps/api/test/integration/agent-channel-config.test.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `apps/web/e2e/agent-channel-behavior.spec.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `apps/web/e2e/http/agent-channel-behavior.spec.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `tools/parity/manifests/agent-channel-behavior.ts` | Bounded behavior module or dedicated acceptance evidence |
| C | `fixtures/ai-eval/agent-channel-vertical.json` | Bounded behavior module or dedicated acceptance evidence |
| M | `apps/web/src/shared/api/mock/domains/settings-apps.ts` | Structured channel settings mock/DTO roundtrip |
| M | `apps/web/src/features/settings/channel-types.ts` | Structured channel settings mock/DTO roundtrip |
| M | `packages/core/src/kernel/actions/action-context.ts` | Internal greeting purpose preserves pending answer/FRT and shared writer |
| M | `packages/core/src/inbox/actions/message.handlers.ts` | Internal greeting purpose preserves pending answer/FRT and shared writer |
| M | `packages/core/src/inbox/services/outbound.ts` | Internal greeting purpose preserves pending answer/FRT and shared writer |

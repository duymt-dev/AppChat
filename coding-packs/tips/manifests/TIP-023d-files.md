# TIP-023d — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/actions/src/assistant-plans.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/shared/src/assistant/plan.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/shared/src/assistant/plan-events.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/shared/src/api/assistant-plans.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/db/prisma/tenant/assistant-plans.prisma` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/db/prisma/tenant/migrations/20261102002340_assistant_plans/migration.sql` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/core/src/ai/assistant/plans/providers.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/core/src/ai/assistant/plans/handlers.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/core/src/ai/assistant/plans/read.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/core/src/ai/assistant/plans/repo.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/core/src/ai/assistant/plans/validation.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/core/src/ai/assistant/plans/progress.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/core/src/ai/assistant/plans/bindings.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/core/src/ai/assistant/plans/pause.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/core/src/ai/assistant/plans/checkpoint.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/core/src/ai/assistant/plans/resume.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/core/src/ai/assistant/plans/reuse.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/core/src/ai/assistant/plans/recommendations.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/core/src/ai/assistant/plans/driver.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/core/src/ai/assistant/plans/recovery.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/core/src/ai/assistant/plans/selected-agent.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/core/src/ai/assistant/plans/agent-choices.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/core/src/ai/assistant/plans/pending-action.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `packages/ai/src/gateway/plan-checkpoint.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `apps/api/src/http/ai/assistant-plans.controller.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `apps/web/src/features/assistant/plans/types.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `apps/web/src/features/assistant/plans/api.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `apps/web/src/features/assistant/plans/components/PlanCard.tsx` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `apps/web/src/features/assistant/plans/components/PlanEditor.tsx` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `apps/web/src/features/assistant/plans/components/PlanStep.tsx` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `apps/web/src/features/assistant/plans/components/ReusePlans.tsx` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `apps/web/src/features/assistant/plans/components/SelectedAgentPicker.tsx` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `apps/web/src/features/assistant/plans/hooks/usePlan.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `apps/web/src/features/assistant/plans/hooks/usePlanEvents.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `apps/web/src/features/assistant/plans/hooks/useSelectedAgent.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| C | `apps/web/src/shared/api/mock/domains/assistant-plans.ts` | Bounded versioned plan, authoritative receipt projection, pause/checkpoint/reuse/selected-agent service or extracted UI |
| M | `packages/actions/src/index.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/shared/src/index.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/shared/src/api/index.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/shared/src/api/assistant.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/index.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/ai.module.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/jobs/ai.jobs.module.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/assistant/meta-tools.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/assistant/delegate.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/assistant/turn.service.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/assistant/types.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/assistant/assistant-prompt.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/assistant/assistant.service.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/assistant/sessions.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/assistant/home.read.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/assistant/catalog.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/assistant/genui/request-store.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/assistant/genui/event-store.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/assistant/genui/history.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/assistant/genui/stream.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/assistant/genui/recovery.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/assistant/genui/resume.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/assistant/genui/resume.handler.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/assistant/genui/execution-lease.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/assistant/genui/submit.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/runs/runner.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/runs/run.store.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/runs/run-detail.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/runs/run-events.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/runs/run-lineage.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/runs/runtime.providers.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/runs/run-cancel.handler.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/approvals/resume.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/jobs/ai-resume.processor.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/ai/src/gateway/engine.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/ai/src/gateway/types.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/ai/src/gateway/messages.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/ai/src/index.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/privacy/inventory.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/ai/privacy/cleanup.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/privacy/services/source-catalog.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/privacy/services/read-catalog.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `packages/core/src/privacy/services/write-catalog.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `apps/api/src/http/ai/assistant.controller.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `apps/api/src/http/ai/ai.http.module.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `apps/web/src/features/assistant/components/Composer.tsx` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `apps/web/src/features/assistant/components/ComposerPopovers.tsx` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `apps/web/src/features/assistant/components/ChatThread.tsx` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `apps/web/src/features/assistant/assistant-store.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `apps/web/src/features/assistant/api.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `apps/web/src/features/assistant/types.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `apps/web/src/features/assistant/hooks/useAssistantChat.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `apps/web/src/shared/api/mock/handlers.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `apps/web/messages/vi/assistant.json` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `apps/web/messages/en/assistant.json` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `apps/web/messages/vi/actions.json` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `apps/web/messages/en/actions.json` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| M | `tools/parity/parity.manifest.ts` | Wire existing and predecessor authoritative runtime/transport/current privacy/UI seams; legacy files facade only |
| C | `packages/actions/test/assistant-plans.test.ts` | Dedicated state/authority/native batch/pause/reuse/selected-agent/UI/live verification |
| C | `packages/shared/src/assistant/plan.test.ts` | Dedicated state/authority/native batch/pause/reuse/selected-agent/UI/live verification |
| C | `packages/ai/test/plan-checkpoint.test.ts` | Dedicated state/authority/native batch/pause/reuse/selected-agent/UI/live verification |
| C | `packages/core/test/assistant-plans.test.ts` | Dedicated state/authority/native batch/pause/reuse/selected-agent/UI/live verification |
| C | `packages/core/test/assistant-plan-progress.test.ts` | Dedicated state/authority/native batch/pause/reuse/selected-agent/UI/live verification |
| C | `packages/core/test/assistant-plan-pause.test.ts` | Dedicated state/authority/native batch/pause/reuse/selected-agent/UI/live verification |
| C | `packages/core/test/assistant-plan-reuse.test.ts` | Dedicated state/authority/native batch/pause/reuse/selected-agent/UI/live verification |
| C | `packages/core/test/assistant-selected-agent.test.ts` | Dedicated state/authority/native batch/pause/reuse/selected-agent/UI/live verification |
| C | `packages/core/test/assistant-plan-privacy.test.ts` | Dedicated state/authority/native batch/pause/reuse/selected-agent/UI/live verification |
| C | `apps/api/test/integration/assistant-plans.test.ts` | Dedicated state/authority/native batch/pause/reuse/selected-agent/UI/live verification |
| C | `apps/api/test/integration/assistant-plan-concurrency.test.ts` | Dedicated state/authority/native batch/pause/reuse/selected-agent/UI/live verification |
| C | `apps/worker/test/integration/assistant-plans-composition.test.ts` | Dedicated state/authority/native batch/pause/reuse/selected-agent/UI/live verification |
| C | `apps/web/src/features/assistant/plans/hooks/usePlan.test.tsx` | Dedicated state/authority/native batch/pause/reuse/selected-agent/UI/live verification |
| C | `apps/web/e2e/assistant-plans.spec.ts` | Dedicated state/authority/native batch/pause/reuse/selected-agent/UI/live verification |
| C | `apps/web/e2e/http/assistant-plans.spec.ts` | Dedicated state/authority/native batch/pause/reuse/selected-agent/UI/live verification |
| C | `tools/parity/modules/assistant-plans.ts` | Dedicated state/authority/native batch/pause/reuse/selected-agent/UI/live verification |
| C | `fixtures/ai-eval/assistant-plans.json` | Dedicated state/authority/native batch/pause/reuse/selected-agent/UI/live verification |
| C | `coding-packs/reports/TIP-023d-completion.md` | Dedicated state/authority/native batch/pause/reuse/selected-agent/UI/live verification |
| C | `packages/core/src/kernel/actions/execution-binding.ts` | Trusted canonical pending-action/plan effect binding and same-transaction receipt projection; kernel port avoids AI import |
| M | `packages/core/src/kernel/actions/executor.ts` | Trusted canonical pending-action/plan effect binding and same-transaction receipt projection; kernel port avoids AI import |
| M | `packages/core/src/kernel/actions/action-context.ts` | Trusted canonical pending-action/plan effect binding and same-transaction receipt projection; kernel port avoids AI import |
| M | `packages/core/src/kernel/actions/actions.module.ts` | Trusted canonical pending-action/plan effect binding and same-transaction receipt projection; kernel port avoids AI import |
| C | `packages/core/test/assistant-plan-confirmation.test.ts` | Trusted canonical pending-action/plan effect binding and same-transaction receipt projection; kernel port avoids AI import |
| M | `apps/web/src/features/assistant/components/WelcomeView.tsx` | Stable-ID home-card selection and paused state |
| M | `packages/core/src/ai/agents/agent.runtime.ts` | Trusted child mode/selected-version/primary-claim context and resume propagation |

## Future M provenance

- `packages/core/src/ai/assistant/genui/request-store.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/event-store.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/history.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/stream.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/recovery.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/resume.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/resume.handler.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/execution-lease.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/submit.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/runs/run-detail.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/run-events.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/run-lineage.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/runtime.providers.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/privacy/inventory.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/ai/privacy/cleanup.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/privacy/services/source-catalog.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/privacy/services/read-catalog.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/privacy/services/write-catalog.ts`: TIP-015c-contact-privacy.md

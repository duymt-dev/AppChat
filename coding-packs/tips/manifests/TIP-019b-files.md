# TIP-019b — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/ai/src/gateway/engine.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/ai/src/gateway/types.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/ai/src/gateway/messages.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/ai/src/embed/embedder.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/ai/src/index.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/runs/runner.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/runs/run.store.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/runs/runs.service.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/runs/run-cancel.handler.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/runs/tools.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/assistant/delegate.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/assistant/turn.service.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/assistant/meta-tools.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/reply/reply-tools.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/reply/reply.service.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/reply/reply-context.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/approvals/resume.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/approvals/approval.gateway.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/events/agents.rules.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/ai.module.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/jobs/ai.jobs.module.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/agents/agent-llm.handlers.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/agents/agent.runtime.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/skills/translate.handler.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/kb/search.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/kb/kb-search.handler.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/kb/ingest.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/tasks/task.runner.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/documents/actions/doc-template.handlers.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/sales/quotes/actions/quote-draft.handler.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/billing/services/credit-meter.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/billing/services/wallet.service.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/billing/public.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/index.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/db/prisma/tenant/ai-runs.prisma` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/shared/src/events.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/shared/src/index.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/shared/src/api/ai.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/shared/src/api/index.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `apps/api/src/http/ai/ai.controller.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `apps/api/src/http/ai/ai.http.module.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `apps/worker/src/roles/ai.module.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `apps/web/src/features/assistant/api.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `apps/web/src/features/assistant/types.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `apps/web/src/features/assistant/components/RunsOrchestrationBar.tsx` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `apps/web/src/features/assistant/styles/runs.styles.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `apps/web/src/shared/realtime/event-invalidation.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `apps/web/src/shared/api/mock/domains/assistant.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `apps/web/src/shared/api/mock/domains/ai-tasks.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `apps/web/src/shared/api/mock/assistant-shape.test.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `apps/web/messages/vi/assistant.json` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `apps/web/messages/en/assistant.json` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/shared/src/i18n/server/vi/ai.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/shared/src/i18n/server/en/ai.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `tools/parity/parity.manifest.ts` | Existing runtime/transport integration; extract rather than expand over-cap modules |
| M | `packages/core/src/ai/assistant/genui/inbox-draft.ts` | Future predecessor integration; preserve restricted toolset and current authority |
| M | `packages/core/src/contracts/actions/contract-draft-prepare.handler.ts` | Future predecessor integration; preserve restricted toolset and current authority |
| M | `packages/core/src/ai/skills/translation-service.ts` | Future predecessor integration; preserve restricted toolset and current authority |
| M | `packages/core/src/ai/approvals/operation-continuation.ts` | Future predecessor integration; preserve restricted toolset and current authority |
| C | `packages/ai/src/gateway/attempts.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/ai/src/gateway/usage.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/ai/src/gateway/limits.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/ai/src/embed/attempts.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/core/src/ai/runs/root-budget.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/core/src/ai/runs/usage-receipts.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/core/src/ai/runs/usage-settlement.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/core/src/ai/runs/usage-recovery.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/core/src/ai/runs/run-lineage.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/core/src/ai/runs/run-detail.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/core/src/ai/runs/run-events.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/core/src/ai/runs/run-status.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/core/src/ai/runs/metered-embedding.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/core/src/ai/runs/child-continuation.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/core/src/ai/runs/runtime.providers.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/core/src/ai/events/run.rules.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/core/src/ai/approvals/expiry-notification.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/core/src/billing/services/usage-receipt.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/shared/src/api/ai-runs.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/db/prisma/tenant/ai-usage.prisma` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/db/prisma/tenant/migrations/20261102001920_ai_runtime_integrity/migration.sql` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `apps/api/src/http/ai/runs.controller.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `apps/web/src/features/assistant/components/RunDetailDrawer.tsx` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `apps/web/src/features/assistant/components/RunStepList.tsx` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `apps/web/src/features/assistant/components/RunStatusBadge.tsx` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `apps/web/src/features/assistant/hooks/useRunDetail.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `apps/web/src/features/assistant/run-api.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `apps/web/src/features/assistant/run-types.ts` | Bounded runtime integrity module; one responsibility, tests separate |
| C | `packages/ai/test/attempt-usage.test.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `packages/ai/test/embedding-usage.test.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `packages/ai/test/budget-tools-gate.test.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `packages/core/test/ai-root-budget.test.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `packages/core/test/ai-usage-recovery.test.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `packages/core/test/ai-run-lineage.test.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `packages/core/test/ai-run-events.test.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `packages/core/test/ai-run-detail.test.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `packages/core/test/ai-expiry-notification.test.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `packages/core/test/ai-metered-embedding.test.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `packages/core/test/ai-child-continuation.test.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `packages/core/test/ai-utility-lineage.test.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `apps/api/test/integration/ai-root-budget.test.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `apps/api/test/integration/ai-usage-recovery.test.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `apps/api/test/integration/ai-run-detail.test.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `apps/api/test/integration/ai-run-events.test.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `apps/worker/test/integration/ai-runtime-recovery.test.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `apps/worker/test/integration/ai-runtime-domain-handlers.test.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `apps/web/src/features/assistant/components/RunDetailDrawer.test.tsx` | Dedicated future test/evidence; not claimed run in planning |
| C | `apps/web/src/features/assistant/components/RunStatusBadge.test.tsx` | Dedicated future test/evidence; not claimed run in planning |
| C | `apps/web/e2e/ai-runtime.spec.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `apps/web/e2e/http/ai-runtime.spec.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `tools/parity/manifests/ai-runtime.ts` | Dedicated future test/evidence; not claimed run in planning |
| C | `fixtures/ai-eval/runtime-integrity/cases.json` | Dedicated future test/evidence; not claimed run in planning |
| M | `packages/core/src/notify/realtime/envelope.ts` | Typed current run requirement for private invalidation |
| M | `packages/core/src/notify/realtime/filter.ts` | Current run authority seam without cached scope widening |
| M | `apps/api/src/http/notify/realtime/ws.gateway.ts` | Current membership/run authority before private delivery |
| M | `packages/core/src/kernel/consistency/consistency.jobs.module.ts` | Future045b recovery registration, no duplicate coordinator |
| M | `packages/core/src/kernel/consistency/operation-recovery.ts` | Future045b AI receipt recovery adapter contract |
| M | `packages/core/src/notify/rules.ts` | Typed ownerOnly notification target; retain synchronous pure rules |
| M | `packages/core/src/notify/services/recipients.ts` | Resolve ownerOnly target from current workspace owner |
| M | `packages/core/src/notify/services/notifier.ts` | Durable single expiry notification recipient and current authority fence |
| M | `packages/core/src/crm/memory/handlers.ts` | Future015b trusted action-run lineage for summary utilities |
| M | `packages/core/src/crm/memory/summary.ts` | Future015b metered summary shares run root on cache miss |
| M | `packages/core/src/crm/memory/summary-consumer.ts` | Future predecessor parent/wait/finalizer integration; no duplicate runtime |
| M | `packages/core/src/ai/assistant/genui/request-store.ts` | Future predecessor parent/wait/finalizer integration; no duplicate runtime |
| M | `packages/core/src/ai/assistant/genui/execution-lease.ts` | Future predecessor parent/wait/finalizer integration; no duplicate runtime |
| M | `packages/core/src/ai/assistant/genui/recovery.ts` | Future predecessor parent/wait/finalizer integration; no duplicate runtime |
| M | `packages/core/src/ai/assistant/genui/resume.ts` | Future predecessor parent/wait/finalizer integration; no duplicate runtime |
| M | `packages/core/src/ai/assistant/genui/event-store.ts` | Future predecessor parent/wait/finalizer integration; no duplicate runtime |

## Future M provenance

- `packages/core/src/ai/assistant/genui/inbox-draft.ts`: TIP-023c-generative-ui.md
- `packages/core/src/contracts/actions/contract-draft-prepare.handler.ts`: TIP-030b-contract-files.md
- `packages/core/src/ai/skills/translation-service.ts`: TIP-025b-inbox-vertical.md
- `packages/core/src/ai/approvals/operation-continuation.ts`: TIP-045b-app-hardening.md
- `packages/core/src/kernel/consistency/consistency.jobs.module.ts`: TIP-045b-app-hardening.md
- `packages/core/src/kernel/consistency/operation-recovery.ts`: TIP-045b-app-hardening.md
- `packages/core/src/crm/memory/handlers.ts`: TIP-015b-contact-memory.md
- `packages/core/src/crm/memory/summary.ts`: TIP-015b-contact-memory.md
- `packages/core/src/crm/memory/summary-consumer.ts`: TIP-015b-contact-memory.md
- `packages/core/src/ai/assistant/genui/request-store.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/execution-lease.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/recovery.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/resume.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/event-store.ts`: TIP-023c-generative-ui.md

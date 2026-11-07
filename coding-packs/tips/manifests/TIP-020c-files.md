# TIP-020c — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/core/src/kernel/actions/action-context.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/kb/search.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/kb/kb-search.handler.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/agents/agent.runtime.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/agents/agent-llm.handlers.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/assistant/delegate.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/assistant/turn.service.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/assistant/plans/selected-agent.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/assistant/plans/resume.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/assistant/plans/recovery.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/tasks/task.runner.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/approvals/resume.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/reply/reply-context.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/reply/reply-tools.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/reply/reply.service.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/runs/run.store.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/runs/runner.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/runs/runtime.providers.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/runs/run-detail.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/runs/run-events.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/assistant/genui/history.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/assistant/genui/stream.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/authz/fields/history-provenance.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/privacy/inventory.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/privacy/cleanup.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/ai.module.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/kb/kb.handlers.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/core/src/ai/kb/ingest.ts` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/db/prisma/tenant/ai-kb.prisma` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| M | `packages/db/prisma/tenant/ai-runs.prisma` | Trusted scope propagation, current retrieval/publication/replay authority; facade only for oversized files |
| C | `packages/core/src/ai/kb/scope/types.ts` | Isolated effective-scope policy/query/recovery or dedicated native/live verification |
| C | `packages/core/src/ai/kb/scope/context.ts` | Isolated effective-scope policy/query/recovery or dedicated native/live verification |
| C | `packages/core/src/ai/kb/scope/authority.ts` | Isolated effective-scope policy/query/recovery or dedicated native/live verification |
| C | `packages/core/src/ai/kb/scope/query.ts` | Isolated effective-scope policy/query/recovery or dedicated native/live verification |
| C | `packages/core/src/ai/kb/scope/provenance.ts` | Isolated effective-scope policy/query/recovery or dedicated native/live verification |
| C | `packages/core/src/ai/kb/scope/recovery.ts` | Isolated effective-scope policy/query/recovery or dedicated native/live verification |
| C | `packages/db/prisma/tenant/migrations/20261102002030_kb_effective_scope/migration.sql` | Isolated effective-scope policy/query/recovery or dedicated native/live verification |
| C | `packages/core/test/kb-effective-scope.test.ts` | Isolated effective-scope policy/query/recovery or dedicated native/live verification |
| C | `packages/core/test/kb-scope-resume.test.ts` | Isolated effective-scope policy/query/recovery or dedicated native/live verification |
| C | `packages/core/test/kb-scope-projection.test.ts` | Isolated effective-scope policy/query/recovery or dedicated native/live verification |
| C | `apps/api/test/integration/kb-effective-scope.test.ts` | Isolated effective-scope policy/query/recovery or dedicated native/live verification |
| C | `apps/worker/test/integration/kb-scope-composition.test.ts` | Isolated effective-scope policy/query/recovery or dedicated native/live verification |
| C | `fixtures/ai-eval/kb-effective-scope.json` | Isolated effective-scope policy/query/recovery or dedicated native/live verification |
| M | `packages/core/src/inbox/services/view.ts` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| M | `packages/core/src/inbox/services/read.service.ts` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| M | `packages/core/src/ai/reply/send-fence.ts` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| M | `packages/core/src/catalog/events/catalog-sync.ts` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| M | `packages/core/src/ai/agents/agent.handlers.ts` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| M | `packages/core/src/ai/agents/agent.store.ts` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| M | `packages/db/prisma/tenant/inbox.prisma` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| M | `packages/core/src/inbox/actions/message.handlers.ts` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| M | `packages/core/src/inbox/services/outbound.ts` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| M | `packages/core/src/channels/jobs/send.processor.ts` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| M | `packages/actions/src/inbox.ts` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| M | `packages/shared/src/api/inbox.ts` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| M | `apps/web/src/features/inbox/types.ts` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| M | `apps/web/src/features/inbox/components/ChatPanel.tsx` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| M | `apps/web/src/features/inbox/components/Composer.tsx` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| M | `apps/web/src/features/inbox/inbox-store.ts` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| M | `apps/web/messages/vi/inbox.json` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| M | `apps/web/messages/en/inbox.json` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| M | `apps/web/src/shared/api/mock/domains/inbox.ts` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| M | `packages/core/src/ai/runs/runs.service.ts` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| M | `packages/core/src/ai/assistant/sessions.ts` | Current writer-side scope/source fence or derived draft read/send authorization binding |
| C | `apps/web/src/features/inbox/hooks/useAiDraftBinding.ts` | Isolated draft provenance transport across send/edit, no citation UI |
| C | `apps/web/e2e/kb-scope.mock.spec.ts` | Derived draft scope revoke/edit/send and manual fallback |
| C | `apps/web/e2e/http/kb-scope.spec.ts` | Native scope writer→draft read/send fence |

## Future M provenance

- `packages/core/src/ai/assistant/plans/selected-agent.ts`: TIP-023d-assistant-plans.md
- `packages/core/src/ai/assistant/plans/resume.ts`: TIP-023d-assistant-plans.md
- `packages/core/src/ai/assistant/plans/recovery.ts`: TIP-023d-assistant-plans.md
- `packages/core/src/ai/runs/runtime.providers.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/run-detail.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/run-events.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/assistant/genui/history.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/stream.ts`: TIP-023c-generative-ui.md
- `packages/core/src/authz/fields/history-provenance.ts`: TIP-045b-app-hardening.md
- `packages/core/src/ai/privacy/inventory.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/ai/privacy/cleanup.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/ai/reply/send-fence.ts`: TIP-045b-app-hardening.md

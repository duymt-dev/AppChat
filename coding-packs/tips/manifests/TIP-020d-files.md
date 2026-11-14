# TIP-020d — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/ai/src/reply/output.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/ai/src/gateway/types.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/ai/src/gateway/engine.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/ai.module.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/kb/kb-search.handler.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/kb/scope/provenance.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/kb/scope/authority.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/reply/reply-context.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/reply/reply.service.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/reply/send-fence.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/runs/runner.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/runs/run.store.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/runs/run-detail.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/runs/run-events.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/runs/runs.service.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/runs/runtime.providers.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/assistant/turn.service.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/assistant/genui/history.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/assistant/genui/stream.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/assistant/sessions.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/approvals/resume.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/reply/reply-tools.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/tasks/task.runner.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/assistant/delegate.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/privacy/inventory.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/ai/privacy/cleanup.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/authz/fields/history-provenance.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/inbox/services/read.service.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/inbox/services/view.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/kernel/audit/audit-read.service.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/core/src/kernel/audit/audit-projection.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/shared/src/api/inbox.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/shared/src/api/ai-runs.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/shared/src/api/audit.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/shared/src/api/index.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/db/prisma/tenant/inbox.prisma` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `packages/db/prisma/tenant/ai-runs.prisma` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `apps/web/src/features/inbox/types.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `apps/web/src/features/inbox/inbox-store.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `apps/web/src/features/inbox/components/ChatPanel.tsx` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `apps/web/src/features/inbox/components/AiDraftCard.tsx` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `apps/web/src/features/inbox/components/Composer.tsx` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `apps/web/src/features/inbox/hooks/useAiDraftBinding.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `apps/web/src/features/assistant/components/RunDetailDrawer.tsx` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `apps/web/src/features/assistant/hooks/useRunDetail.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `apps/web/src/features/settings/components/audit/AiAuditTable.tsx` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `apps/web/src/shared/api/mock/domains/inbox.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `apps/web/src/shared/api/mock/domains/assistant.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `apps/web/src/shared/api/mock/domains/settings-ops.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `apps/web/messages/vi/inbox.json` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `apps/web/messages/en/inbox.json` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `apps/web/messages/vi/assistant.json` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `apps/web/messages/en/assistant.json` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `apps/web/messages/vi/settings.json` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `apps/web/messages/en/settings.json` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| M | `tools/parity/parity.manifest.ts` | Wire validated answer citation binding/current projection into existing runtime and actual UI hosts |
| C | `packages/core/src/ai/citations/binding.ts` | Bounded citation presentation/validation module or separate evidence suite |
| C | `packages/core/src/ai/citations/validation.ts` | Bounded citation presentation/validation module or separate evidence suite |
| C | `packages/core/src/ai/citations/projection.ts` | Bounded citation presentation/validation module or separate evidence suite |
| C | `packages/core/src/ai/citations/publication.ts` | Bounded citation presentation/validation module or separate evidence suite |
| C | `packages/core/src/ai/citations/recovery.ts` | Bounded citation presentation/validation module or separate evidence suite |
| C | `packages/core/src/ai/citations/prompt.ts` | Bounded citation presentation/validation module or separate evidence suite |
| C | `packages/shared/src/api/ai-citations.ts` | Bounded citation presentation/validation module or separate evidence suite |
| C | `packages/db/prisma/tenant/migrations/20261102002040_answer_citations/migration.sql` | Bounded citation presentation/validation module or separate evidence suite |
| C | `apps/web/src/shared/ai-citations/CitationList.tsx` | Bounded citation presentation/validation module or separate evidence suite |
| C | `apps/web/src/shared/ai-citations/types.ts` | Bounded citation presentation/validation module or separate evidence suite |
| C | `apps/web/src/shared/ai-citations/CitationList.test.tsx` | Bounded citation presentation/validation module or separate evidence suite |
| C | `packages/core/test/rag-citation-binding.test.ts` | Bounded citation presentation/validation module or separate evidence suite |
| C | `packages/core/test/rag-citation-publication.test.ts` | Bounded citation presentation/validation module or separate evidence suite |
| C | `packages/core/test/rag-citation-privacy.test.ts` | Bounded citation presentation/validation module or separate evidence suite |
| C | `packages/ai/test/reply-citations.test.ts` | Bounded citation presentation/validation module or separate evidence suite |
| C | `apps/api/test/integration/rag-citations.test.ts` | Bounded citation presentation/validation module or separate evidence suite |
| C | `apps/worker/test/integration/rag-citations-composition.test.ts` | Bounded citation presentation/validation module or separate evidence suite |
| C | `apps/web/e2e/rag-citations.mock.spec.ts` | Bounded citation presentation/validation module or separate evidence suite |
| C | `apps/web/e2e/http/rag-citations.spec.ts` | Bounded citation presentation/validation module or separate evidence suite |
| C | `fixtures/ai-eval/rag-citations.json` | Bounded citation presentation/validation module or separate evidence suite |
| M | `apps/web/src/features/assistant/screens/AssistantScreen.tsx` | Mount extracted run-detail route host regardless live rows |
| C | `apps/web/src/features/assistant/components/RunDetailRouteHost.tsx` | Cold /assistant?run_id= UUID host, no model send |
| C | `apps/web/src/features/assistant/hooks/useRunDetailRoute.ts` | Validate query, workspace lifecycle and focus/close navigation |
| C | `packages/core/src/ai/citations/text-revision.ts` | Deterministic text normalization/unmask offset mapping and digest |

## Future M provenance

- `packages/core/src/ai/kb/scope/provenance.ts`: TIP-020c-kb-effective-scope.md
- `packages/core/src/ai/kb/scope/authority.ts`: TIP-020c-kb-effective-scope.md
- `packages/core/src/ai/reply/send-fence.ts`: TIP-045b-app-hardening.md
- `packages/core/src/ai/runs/run-detail.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/run-events.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/runtime.providers.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/assistant/genui/history.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/stream.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/privacy/inventory.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/ai/privacy/cleanup.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/authz/fields/history-provenance.ts`: TIP-045b-app-hardening.md
- `packages/core/src/kernel/audit/audit-read.service.ts`: TIP-045b-app-hardening.md
- `packages/core/src/kernel/audit/audit-projection.ts`: TIP-045b-app-hardening.md
- `packages/shared/src/api/ai-runs.ts`: TIP-019b-runtime-integrity.md
- `packages/shared/src/api/audit.ts`: TIP-045b-app-hardening.md
- `apps/web/src/features/inbox/hooks/useAiDraftBinding.ts`: TIP-020c-kb-effective-scope.md
- `apps/web/src/features/assistant/components/RunDetailDrawer.tsx`: TIP-019b-runtime-integrity.md
- `apps/web/src/features/assistant/hooks/useRunDetail.ts`: TIP-019b-runtime-integrity.md
- `apps/web/src/features/settings/components/audit/AiAuditTable.tsx`: TIP-045b-app-hardening.md

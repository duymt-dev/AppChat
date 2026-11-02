# TIP-021b — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/actions/src/ai.ts` | Bounded agent drafting facade, schema-bound generation/current authority through existing runtime |
| M | `packages/core/src/ai/agents/agent-llm.handlers.ts` | Bounded agent drafting facade, schema-bound generation/current authority through existing runtime |
| M | `packages/core/src/ai/agents/agent-draft.ts` | Bounded agent drafting facade, schema-bound generation/current authority through existing runtime |
| M | `packages/core/src/ai/agents/agent.store.ts` | Bounded agent drafting facade, schema-bound generation/current authority through existing runtime |
| M | `packages/core/src/ai/agents/agent-tools.ts` | Bounded agent drafting facade, schema-bound generation/current authority through existing runtime |
| M | `packages/core/src/ai/agents/agent.handlers.ts` | Bounded agent drafting facade, schema-bound generation/current authority through existing runtime |
| M | `packages/core/src/ai/ai.module.ts` | Bounded agent drafting facade, schema-bound generation/current authority through existing runtime |
| M | `packages/core/src/ai/runs/runtime.providers.ts` | Bounded agent drafting facade, schema-bound generation/current authority through existing runtime |
| M | `packages/core/src/ai/public.ts` | Bounded agent drafting facade, schema-bound generation/current authority through existing runtime |
| M | `packages/core/src/ai/runs/runner.ts` | Bounded agent drafting facade, schema-bound generation/current authority through existing runtime |
| M | `packages/core/src/ai/runs/run.store.ts` | Bounded agent drafting facade, schema-bound generation/current authority through existing runtime |
| M | `packages/ai/src/gateway/types.ts` | Bounded agent drafting facade, schema-bound generation/current authority through existing runtime |
| M | `packages/ai/src/gateway/engine.ts` | Bounded agent drafting facade, schema-bound generation/current authority through existing runtime |
| M | `packages/core/src/ai/assistant/discovery/service.ts` | Reuse predecessor discovery/root/current-source service; no new charged corpus or permission path |
| M | `packages/core/src/ai/assistant/discovery/authority.ts` | Reuse predecessor discovery/root/current-source service; no new charged corpus or permission path |
| M | `packages/core/src/ai/assistant/discovery/cache.ts` | Reuse predecessor discovery/root/current-source service; no new charged corpus or permission path |
| M | `packages/core/src/kernel/privacy/inventory.ts` | Reuse predecessor discovery/root/current-source service; no new charged corpus or permission path |
| M | `packages/core/src/kernel/privacy/cleanup.ts` | Reuse predecessor discovery/root/current-source service; no new charged corpus or permission path |
| M | `packages/core/src/authz/fields/history-provenance.ts` | Reuse predecessor discovery/root/current-source service; no new charged corpus or permission path |
| M | `apps/web/src/features/agents/components/AgentAiDrawer.tsx` | AI-first draft evidence/status and truthful manual fallback; preserve two existing confirmation routes |
| M | `apps/web/src/features/agents/types.ts` | AI-first draft evidence/status and truthful manual fallback; preserve two existing confirmation routes |
| M | `apps/web/src/features/agents/agents-store.ts` | AI-first draft evidence/status and truthful manual fallback; preserve two existing confirmation routes |
| M | `apps/web/src/shared/api/mock/domains/agents.ts` | AI-first draft evidence/status and truthful manual fallback; preserve two existing confirmation routes |
| M | `apps/web/messages/vi/agents.json` | AI-first draft evidence/status and truthful manual fallback; preserve two existing confirmation routes |
| M | `apps/web/messages/en/agents.json` | AI-first draft evidence/status and truthful manual fallback; preserve two existing confirmation routes |
| C | `packages/actions/src/agent-config.ts` | Extract canonical config schema and bounded drafting action contract without circular imports |
| C | `packages/actions/src/agent-drafting.ts` | Extract canonical config schema and bounded drafting action contract without circular imports |
| C | `packages/core/src/ai/agents/drafting/admission.ts` | Single-responsibility source-bound draft generation and safe proposal projection |
| C | `packages/core/src/ai/agents/drafting/discovery.ts` | Single-responsibility source-bound draft generation and safe proposal projection |
| C | `packages/core/src/ai/agents/drafting/generation.ts` | Single-responsibility source-bound draft generation and safe proposal projection |
| C | `packages/core/src/ai/agents/drafting/validation.ts` | Single-responsibility source-bound draft generation and safe proposal projection |
| C | `packages/core/src/ai/agents/drafting/result.ts` | Single-responsibility source-bound draft generation and safe proposal projection |
| C | `packages/core/src/ai/agents/drafting/providers.ts` | Single-responsibility source-bound draft generation and safe proposal projection |
| C | `packages/ai/src/gateway/structured.ts` | Optional schema-bound engine mode through same provider attempt/metering boundary |
| C | `packages/ai/test/structured-generation.test.ts` | Optional schema-bound engine mode through same provider attempt/metering boundary |
| C | `apps/web/src/features/agents/hooks/useAgentDrafting.ts` | Extract proposal/hooks and mock/http error/fallback/confirmation tests |
| C | `apps/web/src/features/agents/components/AgentDraftProposal.tsx` | Extract proposal/hooks and mock/http error/fallback/confirmation tests |
| C | `apps/web/src/features/agents/agent-drafting.test.tsx` | Extract proposal/hooks and mock/http error/fallback/confirmation tests |
| C | `packages/core/test/agent-draft-discovery.test.ts` | Dedicated discovery order/current-authority/usage and explicit publication tests |
| C | `packages/core/test/agent-draft-authority.test.ts` | Dedicated discovery order/current-authority/usage and explicit publication tests |
| C | `packages/core/test/agent-draft-metering.test.ts` | Dedicated discovery order/current-authority/usage and explicit publication tests |
| C | `packages/core/test/agent-draft-publish.test.ts` | Dedicated discovery order/current-authority/usage and explicit publication tests |
| C | `packages/actions/test/agent-drafting.test.ts` | Canonical action/API/worker/native and real-model acceptance fixtures |
| C | `apps/api/test/integration/agent-drafting.test.ts` | Canonical action/API/worker/native and real-model acceptance fixtures |
| C | `apps/worker/test/integration/agent-drafting-composition.test.ts` | Canonical action/API/worker/native and real-model acceptance fixtures |
| C | `fixtures/ai-eval/agent-drafting.json` | Canonical action/API/worker/native and real-model acceptance fixtures |
| M | `apps/api/test/integration/agents.test.ts` | Update existing required request_id draft call and truthful fallback assertions |
| M | `packages/core/src/ai/runs/run-detail.ts` | Protected unpublished generation cannot leak through generic run detail |
| M | `packages/core/src/ai/runs/run-events.ts` | Protected publication fence covers SSE/history/replay |
| M | `packages/core/src/ai/privacy/inventory.ts` | Register draft binding/private generation and candidate lineage |
| M | `packages/core/src/ai/privacy/cleanup.ts` | Purge or quarantine draft generation and stale publication state |
| C | `packages/core/src/ai/agents/drafting/publication.ts` | Lease/fence validation and current-safe result publication |
| C | `packages/db/prisma/tenant/agent-drafting.prisma` | Validation binding to existing019b operation/run; not another billing ledger |
| C | `packages/db/prisma/tenant/migrations/20261102002120_agent_drafting_publication/migration.sql` | Unique draft invocation and protected publication recovery indexes |

## Future M provenance

- `packages/core/src/ai/runs/runtime.providers.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/assistant/discovery/service.ts`: TIP-023e-action-discovery.md
- `packages/core/src/ai/assistant/discovery/authority.ts`: TIP-023e-action-discovery.md
- `packages/core/src/ai/assistant/discovery/cache.ts`: TIP-023e-action-discovery.md
- `packages/core/src/kernel/privacy/inventory.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/kernel/privacy/cleanup.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/authz/fields/history-provenance.ts`: TIP-045b-app-hardening.md
- `packages/core/src/ai/runs/run-detail.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/run-events.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/privacy/inventory.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/ai/privacy/cleanup.ts`: TIP-015c-contact-privacy.md

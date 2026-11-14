# TIP-023e — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/core/src/ai/assistant/discovery/service.ts` | Bounded semantic discovery responsibility; no business effect |
| C | `packages/core/src/ai/assistant/discovery/corpus.ts` | Bounded semantic discovery responsibility; no business effect |
| C | `packages/core/src/ai/assistant/discovery/ranking.ts` | Bounded semantic discovery responsibility; no business effect |
| C | `packages/core/src/ai/assistant/discovery/cache.ts` | Bounded semantic discovery responsibility; no business effect |
| C | `packages/core/src/ai/assistant/discovery/authority.ts` | Bounded semantic discovery responsibility; no business effect |
| C | `packages/core/src/ai/assistant/discovery/types.ts` | Bounded semantic discovery responsibility; no business effect |
| C | `packages/core/src/ai/assistant/discovery/providers.ts` | Bounded semantic discovery responsibility; no business effect |
| C | `packages/db/prisma/tenant/action-discovery.prisma` | Versioned tenant catalog vectors and durable build-claim metadata |
| C | `packages/db/prisma/tenant/migrations/20261102002350_action_discovery/migration.sql` | Versioned tenant catalog vectors and durable build-claim metadata |
| C | `packages/core/test/assistant-discovery.test.ts` | Dedicated deterministic discovery evidence |
| C | `packages/core/test/assistant-discovery-authority.test.ts` | Dedicated deterministic discovery evidence |
| C | `packages/core/test/assistant-discovery-cache.test.ts` | Dedicated deterministic discovery evidence |
| C | `packages/core/test/assistant-discovery-metering.test.ts` | Dedicated deterministic discovery evidence |
| C | `packages/core/test/assistant-discovery-privacy.test.ts` | Dedicated deterministic discovery evidence |
| C | `apps/api/test/integration/assistant-discovery.test.ts` | Native tenant/concurrency/query/index/current authority checks |
| C | `apps/worker/test/integration/assistant-discovery-composition.test.ts` | Actual worker confirmation/resume dependency wiring |
| C | `fixtures/ai-eval/assistant-discovery.json` | VI/EN paraphrases, adversarial discovery and real file selection live cases |
| M | `packages/core/src/ai/assistant/catalog.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/core/src/ai/assistant/meta-tools.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/core/src/ai/assistant/types.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/core/src/ai/assistant/assistant.service.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/core/src/ai/assistant/turn.service.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/core/src/ai/assistant/assistant-prompt.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/core/src/ai/approvals/resume.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/core/src/ai/ai.module.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/core/src/ai/jobs/ai.jobs.module.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/core/src/ai/runs/runtime.providers.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/core/src/ai/runs/metered-embedding.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/core/src/ai/assistant/genui/resume.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/core/src/ai/assistant/genui/submit.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/core/src/ai/assistant/genui/history.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/core/src/ai/privacy/inventory.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/core/src/ai/privacy/cleanup.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/core/src/privacy/services/source-catalog.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/core/src/privacy/services/read-catalog.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/core/src/privacy/services/write-catalog.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/core/src/index.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/shared/src/api/assistant.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/shared/src/api/index.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/shared/src/index.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/ai/src/embed/attempts.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/ai/src/embed/embedder.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| M | `packages/ai/src/index.ts` | Existing/predecessor discovery composition, metered pinned embedding or privacy/read contract seam |
| C | `packages/ai/test/embedding-pinned-corpus.test.ts` | No silent model fallback/mixed vectors or missing usage receipts |
| C | `packages/actions/src/assistant-discovery.ts` | Human-confirmed bounded corpus preparation action |
| M | `packages/actions/src/index.ts` | Register canonical discovery preparation |
| C | `packages/actions/test/assistant-discovery.test.ts` | Preparation input/output/permission/agent-grant contract |
| C | `packages/core/src/ai/assistant/discovery/prepare.handler.ts` | Mandatory version-bound preview/confirmation and canonical operation creation |
| C | `packages/core/src/ai/assistant/discovery/build.processor.ts` | Bounded ROLEai metered build, same-root callback and recovery |
| C | `packages/core/src/ai/assistant/discovery/build.queue.ts` | Durable outbox operation enqueue identity |
| M | `packages/core/src/ai/public.ts` | Explicit async service versus legacy keyword-only export |
| M | `apps/web/messages/vi/actions.json` | Localized preparation action and preview labels |
| M | `apps/web/messages/en/actions.json` | Localized preparation action and preview labels |
| M | `packages/core/src/ai/runs/runner.ts` | Sensitive query history/replay projection and compatibility tests |
| M | `packages/core/src/ai/runs/run.store.ts` | Sensitive query history/replay projection and compatibility tests |
| M | `packages/core/src/ai/runs/run-detail.ts` | Sensitive query history/replay projection and compatibility tests |
| M | `packages/core/src/ai/runs/run-events.ts` | Sensitive query history/replay projection and compatibility tests |
| M | `packages/core/src/authz/fields/history-provenance.ts` | Sensitive query history/replay projection and compatibility tests |
| M | `packages/core/src/ai/assistant/sessions.ts` | Sensitive query history/replay projection and compatibility tests |
| M | `packages/core/test/assistant-unit.test.ts` | Sensitive query history/replay projection and compatibility tests |
| M | `packages/ai/src/gateway/types.ts` | Trusted candidate configuration revision propagated to pinning |
| M | `packages/ai/src/router/router.ts` | Revision-keyed bounded model handles instead of key length |
| M | `packages/ai/src/router/providers.ts` | Opaque trusted provider revision contract |
| M | `packages/core/src/ai/router/provider.store.ts` | Fresh canonical configuration fingerprint and invalidation race protection |
| C | `packages/core/src/ai/router/config-revision.ts` | Keyed canonical revision without exposing secrets |
| M | `packages/ai/test/router.test.ts` | Same-ID/equal-key-length configuration regression |
| C | `packages/core/test/ai-provider-revision.test.ts` | Fresh pinned config and stale snapshot invalidation tests |
| C | `packages/shared/src/events/action-discovery.ts` | Typed bounded preparation event |
| M | `packages/shared/src/events.ts` | Register preparation event via facade |

## Future M provenance

- `packages/core/src/ai/runs/runtime.providers.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/metered-embedding.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/assistant/genui/resume.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/submit.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/assistant/genui/history.ts`: TIP-023c-generative-ui.md
- `packages/core/src/ai/privacy/inventory.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/ai/privacy/cleanup.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/privacy/services/source-catalog.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/privacy/services/read-catalog.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/privacy/services/write-catalog.ts`: TIP-015c-contact-privacy.md
- `packages/ai/src/embed/attempts.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/run-detail.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/ai/runs/run-events.ts`: TIP-019b-runtime-integrity.md
- `packages/core/src/authz/fields/history-provenance.ts`: TIP-045b-app-hardening.md

# TIP-020e — exact file manifest

M modify, C create. Future M requires its creator integrated first (`config-revision.ts`←023e, `metered-embedding.ts`←019b, `provider-probe.ts`←040, `ai/privacy/*`←015c). No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/ai/src/gateway/types.ts` | Typed rerank purpose/capability, RerankPort and distinct outcomes; no LanguageModel cast |
| M | `packages/ai/src/router/providers.ts` | Capability `rerank` and buildModel dispatch to SDK rerankingModel; unsupported provider throws typed RERANK_UNSUPPORTED |
| M | `packages/ai/src/router/router.ts` | Filter purpose=rerank by capability; candidates pinned to explicit embedding space when requested |
| C | `packages/ai/src/rerank/reranker.ts` | AiSdkReranker over installed `ai` rerank(): bounded ≤40 docs, index-only result, timeout/abort, no retries hidden |
| C | `packages/ai/src/rerank/compatible-reranker.ts` | RerankingModelV4 over Cohere/Jina-compatible `POST /rerank` for `openai_compatible` routers (no new dependency); spike-gated |
| C | `packages/ai/src/rerank/types.ts` | Rerank outcome union ok/unsupported/timeout/invalid_result/budget/unknown_usage |
| M | `packages/ai/src/embed/embedder.ts` | Reuse023e pinned candidate; KB space key; no silent fallback across spaces |
| M | `packages/ai/src/index.ts` | Export reranker/space types |
| C | `packages/ai/test/reranker.test.ts` | Recorded reranker mechanics: forged index, duplicate, out-of-range, timeout, unsupported |
| C | `packages/ai/test/embed-space.test.ts` | Pinned space, dimension/nonfinite rejection, fallback forbidden across spaces |
| M | `packages/ai/test/router.test.ts` | Rerank capability filtering and pinned candidates |
| M | `packages/db/prisma/tenant/ai-kb.prisma` | kb_chunk second vector slot + slot model/source generation; kb_embed_generation; kb_setting active slot |
| C | `packages/db/prisma/tenant/migrations/20261102002050_kb_vector_generations/migration.sql` | Add slot columns, generation table, HNSW on slot B, partial pending-generation index |
| M | `packages/core/src/ai/kb/search.ts` | Active slot + pinned query space, bounded 40 candidates → optional rerank → top6; truthful degraded reasons |
| C | `packages/core/src/ai/kb/rerank-stage.ts` | Apply validated rerank order over exact candidate IDs; never add/expand IDs |
| M | `packages/core/src/ai/kb/ingest.ts` | Write active slot with active space; mark target slot stale during building generation |
| M | `packages/core/src/ai/kb/kb.queue.ts` | Enqueue kb-reindex batch jobs with deterministic job IDs |
| M | `packages/core/src/ai/kb/kb-search.handler.ts` | Inject KB_RERANKER and space resolver |
| M | `packages/core/src/ai/kb/kb.read.ts` | Project index generation status into settings/kb read |
| C | `packages/core/src/ai/kb/reindex/space.ts` | Embedding-space key provider:model:1536:route revision |
| C | `packages/core/src/ai/kb/reindex/generation.store.ts` | Claim/lease/CAS phases building→ready→active/failed/cancelled/superseded |
| C | `packages/core/src/ai/kb/reindex/reindex.service.ts` | IDs-first cursor batches outside tx, catch-up delta, current-source guard before write |
| C | `packages/core/src/ai/kb/reindex/publish.ts` | Completeness check + atomic active-slot flip; late-result rejection |
| C | `packages/core/src/ai/kb/reindex/kb-reindex.handler.ts` | kb.reindex / kb.reindex_cancel handlers with preview estimate |
| C | `packages/core/src/ai/jobs/kb-reindex.processor.ts` | ROLE=ai processor; restart from durable cursor; drain-aware |
| M | `packages/core/src/ai/jobs/ai.jobs.module.ts` | Register kb-reindex queue/processor in actual ROLE=ai composition |
| M | `packages/core/src/ai/ai.module.ts` | Provide KB_RERANKER, reindex service and handlers |
| M | `packages/core/src/ai/router/provider.store.ts` | Parse rerank capability; expose embed route revision |
| M | `packages/core/src/ai/router/config-revision.ts` | Embed route revision change marks active generation stale (no auto paid job) |
| M | `packages/core/src/ai/runs/metered-embedding.ts` | Pinned-space metered embedding and reindex logical billing group |
| C | `packages/core/src/ai/runs/metered-rerank.ts` | Rerank through019b attempt receipts; unknown usage/price is hard stop not free |
| M | `packages/core/src/platform/services/provider-probe.ts` | Exact rerank capability probe; route rejected without supported adapter and price unit |
| M | `packages/core/src/ai/privacy/inventory.ts` | Inventory slot-B vectors, generation cursors |
| M | `packages/core/src/ai/privacy/cleanup.ts` | Purge staged vectors of forgotten/deleted sources; reject late batch writes |
| M | `packages/core/src/kernel/actions/tip-owners.ts` | kb.reindex/kb.reindex_cancel owner 020e until handlers exist |
| M | `packages/actions/src/settings-ai.ts` | kb.reindex (config, kb.manage, agentGrantable=false, preview estimate) and kb.reindex_cancel |
| M | `packages/shared/src/api/ai.ts` | KbIndexStatus DTO (phase, progress, space label, degraded reason) |
| C | `packages/core/test/kb-vector-slot.test.ts` | Slot flip, mixed-model exclusion, citation chunk identity preserved |
| C | `packages/core/test/kb-reindex.test.ts` | Batches, restart, duplicate job, cancel, route change A→B→C supersede, source races |
| C | `packages/core/test/kb-rerank-stage.test.ts` | Bounded candidates, ID validation, outcomes, RRF fallback |
| C | `apps/api/test/integration/kb-reindex.test.ts` | Native tenant DB: reindex action preview/confirm, publish, forget/revoke race, billing receipts |
| C | `apps/worker/test/integration/kb-reindex-composition.test.ts` | ROLE=ai registers processor; drain stops claiming |
| M | `apps/web/src/features/settings/components/RagSection.tsx` | Mount index status card only (orchestrator) |
| C | `apps/web/src/features/settings/components/KbIndexStatus.tsx` | Status/progress/degraded banner + reindex/cancel via useAction |
| C | `apps/web/src/features/settings/components/KbIndexStatus.test.tsx` | Render states vi/en, no fake progress |
| C | `apps/web/src/features/settings/hooks/useKbIndexStatus.ts` | Poll/realtime status; discard on workspace switch |
| M | `apps/web/src/features/settings/api.ts` | kbIndexStatus query |
| M | `apps/web/src/shared/api/mock/domains/settings-ai.ts` | Mock generation phases |
| M | `apps/web/messages/vi/settings.json` | Index status strings |
| M | `apps/web/messages/en/settings.json` | Index status strings |
| M | `apps/web/messages/vi/actions.json` | kb.reindex labels |
| M | `apps/web/messages/en/actions.json` | kb.reindex labels |
| C | `apps/web/e2e/kb-reindex.spec.ts` | Mock flow |
| C | `apps/web/e2e/http/kb-reindex.spec.ts` | HTTP flow on native backend |
| C | `fixtures/ai-eval/rag-model-lifecycle.json` | Live cases: embed space switch, rerank configured/unconfigured, abstention |
| M | `packages/core/src/ai/ai.env.ts` | EMBED_SEED_* (DC-305) |
| M | `.env.example` | Tên biến EMBED_SEED_* |

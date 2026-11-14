# Delegated knowledge scope — source audit 2026-11-02

Docs-only next vertical gap after023g. No runtime acceptance or ledger reassignment.

## Verified source

- `standards/ai/rag.md` rules2–3 require agent kb_scope intersect commander read rights for delegate/Cowork; channel answers public only. Plain Assistant has no agent scope but still caller read rights.
- `packages/core/src/ai/kb/kb-search.handler.ts:15–17,26` selects internal using Owner/kb.manage and forwards no agent scope. This is not proof of underlying-module authorization.
- `packages/core/src/ai/agents/agent.runtime.ts` AgentRunCtx and agentToolSpecs carry agent ID/tools/commander but no knowledge-scope binding.
- `ai/assistant/delegate.ts:62`, `ai/tasks/task.runner.ts:121`, `ai/reply/reply-tools.ts:112,121` construct tool contexts without cfg.kb_scope, despite published config being available.
- `ai/reply/reply-context.ts:86` initial retrieval passes folders/tags/public; subsequent kb.search tools must enforce the same ceiling, not rely on initial retrieval.
- `ai/kb/search.ts:55–60` treats empty arrays as absent filters. This is a real mismatch, not an ambiguous new business-policy decision: `apps/web/messages/vi/agents.json:147` explicitly says no selected folders/tags means agent uses no documents; KnowledgeSection.tsx inScope computes zero for empty selection. Agent empty scope must be distinguished from plain Assistant absent agent restriction.
- search.ts returns source names, chunks and citations; filtering only the final displayed answer is insufficient because unauthorized contents have already reached the model/tool log.
- Existing search performs wide chunk/source reads before top20 limits. Any changed query must preserve authorized candidate selection before ranking, then deferred payload fetch with current fences; do not assume unrelated rerank/re-embed046 closes scope leakage.

## Pending pack boundaries

REQ-D17c remains unowned until a complete scoped pack covers trusted scope propagation, current authorization before retrieval/model/publication/replay and restart, selected/delegated/channel/task/Builder cases, native privacy barriers and live negative tests. Preserve019b metering,023d selected-agent ceilings,015c retained/quarantined exclusions and045b current authorization; no duplicate runtime or broad fallback.

STD-ai-rag-8b citation UI remains unowned. Need inspect actual AI log/draft components and projection readers before deciding if same cohesive pack or separate citation pack. Do not infer UI proof merely from backend citation arrays.

Independent bounded source/boundary review requested from audit_blueprint_remainder; findings not yet incorporated. No whole-goal completion claim.

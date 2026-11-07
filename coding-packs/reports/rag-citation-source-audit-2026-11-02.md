# RAG citation presentation — independent source inventory 2026-11-02

Read-only review by audit_remaining_requirements. STD-ai-rag-8b remains unowned; no runtime acceptance. Separate from020c effective-source authorization and draft send provenance.

## Broken source chain

- kb/search.ts122 returns retrieved citation IDs, not proof model used them. reply-context exposes name/path/content in prompt without answer revision linkage.
- runs/runner.ts112 LLM step has no output citations;140 run output only text/stop. packages/ai/src/reply/output.ts6–12 has no answer citation references.
- reply.service.ts178 suggestion stores text/confidence/run_id;76 handoff stores aiDraft string. inbox.prisma122–124 currently lacks revision/source binding (020c adds authorization binding; reuse rather than duplicate).
- inbox/services/read.service.ts22–24 strips run_id; view.ts71 returns plain draft. shared/api/inbox.ts45,96 and web inbox/types.ts44,95 lack citation metadata.
- ChatPanel43–82 mounts copilot/handoff AiDraftCard; card has no sources. Copy/edit/send currently loses linkage;020c will preserve source dependency for authorization, not claim citations verify edited text.
- Actual AI audit host settings/components/AuditSection.tsx71; future045b audit/AiAuditTable.tsx. Detail must mount019b assistant/components/RunDetailDrawer.tsx and hooks/useRunDetail.ts, not a disconnected renderer.

## Proposed separate pack, not assigned yet

One citation presentation unit: server validates model-selected citation refs against actual admitted retrieved chunks; bind to run+answer/draft revision+source generation. Do not mark every retrieved hit as cited. Add core ai/citations binding/projection modules, shared DTO and reusable shared/ai-citations/CitationList, exact transport/UI seams and dedicated tests.

Future M creators:019b shared/api/ai-runs.ts, run-detail/run-events and RunDetailDrawer/useRunDetail;045b kernel/audit/audit-read.service.ts/audit-projection.ts, shared/api/audit.ts and AiAuditTable;023c genui history/stream;020c scope provenance/projectors and draft authorization binding/hook. Existing M includes reply context/service, runner/store, reply/output schema, Inbox read/view/DTO/types, ChatPanel/AiDraftCard/Composer/store and applicable mocks/vi/en. Must compute exact manifest and bilateral intersections before writing pack.

## Acceptance requirements from review

1. Automatic retrieval and kb.search tool both support validated citation selection; invented/out-of-retrieval refs cannot claim grounding.
2. Exact answer/draft revision binding survives consult/resume/restart and rejects stale callback overwrites.
3. Both copilot/handoff show sources; AI audit opens actual run detail with same projected binding.
4. Manual edits remove any claim sources validate current answer; optionally label original AI draft sources separately. No automatic model revalidation. Keep020c conservative authorization dependency independently.
5. Current020c source guards apply on every read; delete/reindex/revoke can suppress dependent content, not only source labels.
6. Citation metadata stays internal; no file/path appended to outgoing auto/suggestion/edit-send. Filename canaries must cover model output too because prompts already contain source names.
7. Missing citation is truthful; keyboard/mobile/mock+HTTP/native authority and live grounded-source evidence required.

# TIP023b — vertical-flow planning audit

Docs only. No source/runtime/provider changes and no runtime test claims. User prioritizes Zalo ↔ CRM ↔ Commerce ↔ Agents/Assistant, without narrowing the overall coverage goal.

## Evidence and remediation ownership

| Code evidence | Finding | Planning remedy |
|---|---|---|
| assistant/meta-tools.ts:56–58; turn.service.ts:153,163 | Preview resolves human codes, confirm reuses raw input | Canonical server-side pending input/digest/version; edit invalidation; engine pause/replay + API tests |
| agents/agent.runtime.ts:82; executor.ts:114 | Agent create/send lacks required idempotency key | Stable agent run/step key and replay tests, not a fresh UUID per retry |
| kernel/actions/handler-registry.ts:37–42 | get/has sees stub handlers too | hasImplemented capability; unavailable actions hidden and direct invocation denied |
| ai/jobs/ai.jobs.module.ts:119 | API composition differs from ROLE=ai; commerce/booking/support absent | ai-domain-handlers composition, real child-process restart/resume test, no HTTP module import |
| assistant/code-refs.ts:16–23 | Tenant lookup is not scoped lookup | Shared UI/domain query and served-conversation/contact boundary |
| approvals/resume.ts:42–48,66–70 | Missing commander/agent can become broader fallback | Current-authority each call; required actor missing fails closed |
| assistant/card.ts:62–86; runs/tools.ts:33 | Structured preview dropped; unknown202 treated as approval | Shared changes/checklist DTO; exhaustive accepted handling;032b later adds typed job acknowledgement |
| channels/types.ts and zalo-personal/transport.ts | group support is not create-group support | Explicit createGroup capability, durable request, lease-owning worker, unknown outcome, DC247 |

## Manifest and scope

- Exact578 M/C paths in `tips/manifests/TIP-023b-files.md`: includes190 existing per-action integration matrices and26 new action/read/system-result matrices; preview helpers separated per handler. Large scope is deliberate action-wide coverage, not a single source monolith.
-184 owned ledger IDs enumerated in `tips/manifests/TIP-023b-coverage.md`. Added ownership for action test matrix, workspace custom AI schema, and approval_required UI feedback; no runtime status upgraded.
-17 bilateral shared-file declarations computed against explicit manifests; legacy023c/030b/045b lack complete manifests, so their intersections remain conservative and require recomputation.
- Only existing source over350 lines in the current manifest scan is parity.manifest.ts (1405); restricted to1–2-line facade to new assistant parity module. Recheck caps during implementation.
- DV018 records direct YAML parser/tooling dependency for live runner; no install occurred. Root/workspace/lockfile paths explicitly owned.

## Independent review round2

Reviewer confirmed571 initial M/C paths existed/absent as declared, no duplicate. Four blockers were found and patched:

1. Public barrels missing → core/index.ts + shared/index.ts + shared/api/index.ts, export group read facade/DTO.
2. Runtime prompt source differs from Markdown → prompts/index.ts plus runtime prompt test.
3. run.search scope did not cover HTTP /runs → ai.controller.ts and shared viewer-required query, negative HTTP/action AC.
4. Old tasks contradicted new specs → canonical changes only; create-group UI gated by implemented capability, not DONE014.

Patched manifest578 paths validated locally. Re-review of these patches still required before local planning PASS. Whole-graph review and full coverage goal are not complete.

## Validation actually run

- Python path check:578 unique M/C paths, every M exists and every C absent.
- Bilateral intersection check:17 pairs; partial legacy manifests explicitly not declared parallel-safe.
- `python -X utf8 tools/obligations/merge.py`:1480 rows,218 gaps without owner; no code-status promotion.
- `git diff --check`:passed.

Runtime commands in TIP are builder obligations, not tests run in this documentation phase. Next priority: re-review023b fixes, complete023c/030b manifests, then supplemental channels/inbox/runtime integration and remaining ledger obligations. No checkpoint is a completion claim.

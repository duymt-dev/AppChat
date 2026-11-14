# Eval harness source audit — 2026-11-02

Read-only independent bounded inventory by review_insights_billing, for missing TIP044. No provider/native execution, no owner reassignment. Root must verify exact future paths before writing the full manifest.

## Current reality

packages/ai/eval, tools/ai-live and fixtures/ai-eval directories are absent. Root package.json has no ai:live/eval script. packages/ai/package.json/tsconfig.json/vitest.config.ts include only src/test; eval tooling needs explicit inclusion. pnpm-workspace.yaml has no tools/ai-live package.023b plans that CLI; do not create a competing runner.

.github/workflows/ci.yml runs affected tests, not mandatory replay. full/e2e workflows use mock frontend without native Postgres/Redis eval composition. Graph044 is a placeholder; no TIP044 file. REQ-N11b and STD-ai-eval-1/2/3/4/6/7 correctly not implemented.

## Mandatory release contract

Exactly ten required suite families: assistant-actions, assistant-ui, genui, agent-create, rag, doc-draft, agent-reply, agent-handoff, agent-governance, delegate-consult.

Replay every PR, zero provider calls; missing recording or prompt hash mismatch fails, never auto-records/live fallback. Live explicit AI_EVAL_LIVE=1. Safety100% across attempts; action/parameter accuracy>=95%, each case>=2/3 attempts; rubric>=90%, fixed judge/rubric plus10% human review. Missing suite/zero cases/missing live resource/human review cannot produce release PASS.023b27/30 smoke is not release threshold.

## Full044 pack responsibilities

- Reuse future023b tools/ai-live package/tsconfig/src cli,cases,runner,report,safety files, root scripts/workspace/lockfile. Keep supplemental --cases fixtures/ai-eval/*.json compatible; normalize to one validated contract and add explicit release-suite mode.
- Canonical YAML cases under packages/ai/eval/cases for all ten suites; exact filenames required, no wildcard manifest. Case schema/loader, deterministic assertions, fixed rubric judge, scoring, sanitized recording/replay/report modules in bounded files.
- Dedicated fixtures/seed and recording manifests; zero/duplicate case, missing suite, threshold arithmetic, hash mismatch, network prohibition and CLI compatibility tests.
- Report actual suite scores, expected/actual diffs, model/prompt versions, usage; stable machine-readable result plus reports/ai-eval-date.md without secrets/customer content.
- Exercise actual core/API/canonical Executor with controlled model responses, not a handler-only fake. packages/ai must not import core/db (dependency-cruiser direction); tools/app adapter owns native composition/seed. Existing apps/api integration setup contains test-specific handlers/environment loading, not production-faithful eval bootstrap.
- Unconditional PR replay plus explicitly authorized live/release workflow. Isolated native Postgres/Redis, template/tenant fixtures and per-run namespaces; preflight failure not skip when required. No customer tenant, outbound real messaging, live secrets on fork PR, Docker or hidden model calls in replay.
- Exact cleanup roots verified within isolated eval workspace; never stop native demo workers or purge default Redis during this docs-only goal.

This is source preparation, not full044 TIP/acceptance. Continue full exact manifest/AC/integration/independent review before assigning owners.

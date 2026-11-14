# TIP-044 — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `package.json` | Register release/replay scripts, compile/lint/dependency boundaries and unconditional PR gate; preserve approved thresholds |
| M | `pnpm-workspace.yaml` | Register release/replay scripts, compile/lint/dependency boundaries and unconditional PR gate; preserve approved thresholds |
| M | `pnpm-lock.yaml` | Register release/replay scripts, compile/lint/dependency boundaries and unconditional PR gate; preserve approved thresholds |
| M | `.dependency-cruiser.cjs` | Register release/replay scripts, compile/lint/dependency boundaries and unconditional PR gate; preserve approved thresholds |
| M | `packages/ai/package.json` | Register release/replay scripts, compile/lint/dependency boundaries and unconditional PR gate; preserve approved thresholds |
| M | `packages/ai/tsconfig.json` | Register release/replay scripts, compile/lint/dependency boundaries and unconditional PR gate; preserve approved thresholds |
| M | `packages/ai/vitest.config.ts` | Register release/replay scripts, compile/lint/dependency boundaries and unconditional PR gate; preserve approved thresholds |
| M | `apps/api/package.json` | Register release/replay scripts, compile/lint/dependency boundaries and unconditional PR gate; preserve approved thresholds |
| M | `apps/worker/package.json` | Register release/replay scripts, compile/lint/dependency boundaries and unconditional PR gate; preserve approved thresholds |
| M | `.github/workflows/ci.yml` | Register release/replay scripts, compile/lint/dependency boundaries and unconditional PR gate; preserve approved thresholds |
| M | `coding-packs/standards/code/testing.md` | Register release/replay scripts, compile/lint/dependency boundaries and unconditional PR gate; preserve approved thresholds |
| M | `coding-packs/standards/ai/eval.md` | Register release/replay scripts, compile/lint/dependency boundaries and unconditional PR gate; preserve approved thresholds |
| M | `tools/ai-live/package.json` | Future023b CLI/supplemental compatibility; release mode is not a competing engine |
| M | `tools/ai-live/tsconfig.json` | Future023b CLI/supplemental compatibility; release mode is not a competing engine |
| M | `tools/ai-live/src/cli.ts` | Future023b CLI/supplemental compatibility; release mode is not a competing engine |
| M | `tools/ai-live/src/cases.ts` | Future023b CLI/supplemental compatibility; release mode is not a competing engine |
| M | `tools/ai-live/src/runner.ts` | Future023b CLI/supplemental compatibility; release mode is not a competing engine |
| M | `tools/ai-live/src/report.ts` | Future023b CLI/supplemental compatibility; release mode is not a competing engine |
| M | `tools/ai-live/src/safety.ts` | Future023b CLI/supplemental compatibility; release mode is not a competing engine |
| M | `tools/ai-live/test/cases-cli.test.ts` | Future023b CLI/supplemental compatibility; release mode is not a competing engine |
| M | `tools/ai-live/test/safety.test.ts` | Future023b CLI/supplemental compatibility; release mode is not a competing engine |
| M | `fixtures/ai-eval/live-seed.mjs` | Future023b CLI/supplemental compatibility; release mode is not a competing engine |
| C | `packages/ai/eval/index.ts` | Pure eval contracts/scoring/assertions/recording validation; no core/db/app imports |
| C | `packages/ai/eval/types.ts` | Pure eval contracts/scoring/assertions/recording validation; no core/db/app imports |
| C | `packages/ai/eval/case-schema.ts` | Pure eval contracts/scoring/assertions/recording validation; no core/db/app imports |
| C | `packages/ai/eval/load.ts` | Pure eval contracts/scoring/assertions/recording validation; no core/db/app imports |
| C | `packages/ai/eval/manifest.ts` | Pure eval contracts/scoring/assertions/recording validation; no core/db/app imports |
| C | `packages/ai/eval/scoring.ts` | Pure eval contracts/scoring/assertions/recording validation; no core/db/app imports |
| C | `packages/ai/eval/judge.ts` | Pure eval contracts/scoring/assertions/recording validation; no core/db/app imports |
| C | `packages/ai/eval/review.ts` | Pure eval contracts/scoring/assertions/recording validation; no core/db/app imports |
| C | `packages/ai/eval/assertions/actions.ts` | Pure eval contracts/scoring/assertions/recording validation; no core/db/app imports |
| C | `packages/ai/eval/assertions/authority.ts` | Pure eval contracts/scoring/assertions/recording validation; no core/db/app imports |
| C | `packages/ai/eval/assertions/genui.ts` | Pure eval contracts/scoring/assertions/recording validation; no core/db/app imports |
| C | `packages/ai/eval/assertions/files.ts` | Pure eval contracts/scoring/assertions/recording validation; no core/db/app imports |
| C | `packages/ai/eval/assertions/grounding.ts` | Pure eval contracts/scoring/assertions/recording validation; no core/db/app imports |
| C | `packages/ai/eval/assertions/handoff.ts` | Pure eval contracts/scoring/assertions/recording validation; no core/db/app imports |
| C | `packages/ai/eval/recordings/schema.ts` | Pure eval contracts/scoring/assertions/recording validation; no core/db/app imports |
| C | `packages/ai/eval/recordings/hash.ts` | Pure eval contracts/scoring/assertions/recording validation; no core/db/app imports |
| C | `packages/ai/eval/recordings/normalize.ts` | Pure eval contracts/scoring/assertions/recording validation; no core/db/app imports |
| C | `packages/ai/eval/report.ts` | Pure eval contracts/scoring/assertions/recording validation; no core/db/app imports |
| C | `tools/ai-live/src/release/options.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/release/orchestrator.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/release/attempts.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/release/evidence.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/release/report.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/release/gate.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/release/review.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/release/coverage.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/release/budget.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/provider/server.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/provider/chat.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/provider/embedding.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/provider/match.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/provider/sanitize.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/provider/record-store.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/native/config.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/native/preflight.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/native/provision.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/native/resources.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/native/cleanup.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/native/seed.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/native/auth.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/native/readback.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/native/processes.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/native/network.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/native/clock.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/native/receipts.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/native/inbound.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/native/ui.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `tools/ai-live/src/native/files.ts` | Bounded orchestration/native fixture evidence and guarded HTTP record/replay transport; never replace canonical business handlers |
| C | `apps/api/test/eval/bootstrap.ts` | Production module composition with explicit fixture env and only Clock/external transport seams; isolated native PR replay and authorized live workflow |
| C | `apps/api/test/eval/entry.ts` | Production module composition with explicit fixture env and only Clock/external transport seams; isolated native PR replay and authorized live workflow |
| C | `apps/api/test/eval/bootstrap.test.ts` | Production module composition with explicit fixture env and only Clock/external transport seams; isolated native PR replay and authorized live workflow |
| C | `apps/worker/test/eval/bootstrap.ts` | Production module composition with explicit fixture env and only Clock/external transport seams; isolated native PR replay and authorized live workflow |
| C | `apps/worker/test/eval/entry.ts` | Production module composition with explicit fixture env and only Clock/external transport seams; isolated native PR replay and authorized live workflow |
| C | `apps/worker/test/eval/bootstrap.test.ts` | Production module composition with explicit fixture env and only Clock/external transport seams; isolated native PR replay and authorized live workflow |
| C | `tools/ai-live/tsup.eval.config.ts` | Production module composition with explicit fixture env and only Clock/external transport seams; isolated native PR replay and authorized live workflow |
| C | `tools/ai-live/vitest.config.ts` | Production module composition with explicit fixture env and only Clock/external transport seams; isolated native PR replay and authorized live workflow |
| C | `tools/ai-live/scripts/ci-native.sh` | Production module composition with explicit fixture env and only Clock/external transport seams; isolated native PR replay and authorized live workflow |
| C | `tools/ai-live/scripts/network-namespace.sh` | Production module composition with explicit fixture env and only Clock/external transport seams; isolated native PR replay and authorized live workflow |
| C | `.github/workflows/ai-eval-live.yml` | Production module composition with explicit fixture env and only Clock/external transport seams; isolated native PR replay and authorized live workflow |
| C | `packages/ai/test/eval-schema.test.ts` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `packages/ai/test/eval-scoring.test.ts` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `packages/ai/test/eval-assertions.test.ts` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `packages/ai/test/eval-recordings.test.ts` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `packages/ai/test/eval-review.test.ts` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `tools/ai-live/test/release-cli.test.ts` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `tools/ai-live/test/release-coverage.test.ts` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `tools/ai-live/test/release-network.test.ts` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `tools/ai-live/test/release-isolation.test.ts` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `tools/ai-live/test/release-proxy.test.ts` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `tools/ai-live/test/release-native.test.ts` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `tools/ai-live/test/release-report.test.ts` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `packages/ai/eval/release-manifest.yaml` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `packages/ai/eval/recordings/manifest.json` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `packages/ai/eval/rubrics/release.yaml` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `fixtures/ai-eval/release/seed.json` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `fixtures/ai-eval/release/actors.json` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `fixtures/ai-eval/release/catalog.json` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `fixtures/ai-eval/release/knowledge.json` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `fixtures/ai-eval/release/commerce.json` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `fixtures/ai-eval/release/doc-template.json` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `fixtures/ai-eval/release/import.csv` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `fixtures/ai-eval/release/supplemental-manifest.json` | Dedicated deterministic evidence/immutable fixture metadata and explicit required release inventory |
| C | `packages/ai/eval/cases/assistant-actions/release.yaml` | Eight or more immutable release cases with actor/seed/input/expect/locale and required scenario matrix |
| C | `packages/ai/eval/recordings/data/assistant-actions.jsonl` | Sanitized actual provider recordings with per-case/attempt/request hashes; no invented recordings or credentials |
| C | `packages/ai/eval/cases/assistant-ui/release.yaml` | Eight or more immutable release cases with actor/seed/input/expect/locale and required scenario matrix |
| C | `packages/ai/eval/recordings/data/assistant-ui.jsonl` | Sanitized actual provider recordings with per-case/attempt/request hashes; no invented recordings or credentials |
| C | `packages/ai/eval/cases/genui/release.yaml` | Eight or more immutable release cases with actor/seed/input/expect/locale and required scenario matrix |
| C | `packages/ai/eval/recordings/data/genui.jsonl` | Sanitized actual provider recordings with per-case/attempt/request hashes; no invented recordings or credentials |
| C | `packages/ai/eval/cases/agent-create/release.yaml` | Eight or more immutable release cases with actor/seed/input/expect/locale and required scenario matrix |
| C | `packages/ai/eval/recordings/data/agent-create.jsonl` | Sanitized actual provider recordings with per-case/attempt/request hashes; no invented recordings or credentials |
| C | `packages/ai/eval/cases/rag/release.yaml` | Eight or more immutable release cases with actor/seed/input/expect/locale and required scenario matrix |
| C | `packages/ai/eval/recordings/data/rag.jsonl` | Sanitized actual provider recordings with per-case/attempt/request hashes; no invented recordings or credentials |
| C | `packages/ai/eval/cases/doc-draft/release.yaml` | Eight or more immutable release cases with actor/seed/input/expect/locale and required scenario matrix |
| C | `packages/ai/eval/recordings/data/doc-draft.jsonl` | Sanitized actual provider recordings with per-case/attempt/request hashes; no invented recordings or credentials |
| C | `packages/ai/eval/cases/agent-reply/release.yaml` | Eight or more immutable release cases with actor/seed/input/expect/locale and required scenario matrix |
| C | `packages/ai/eval/recordings/data/agent-reply.jsonl` | Sanitized actual provider recordings with per-case/attempt/request hashes; no invented recordings or credentials |
| C | `packages/ai/eval/cases/agent-handoff/release.yaml` | Eight or more immutable release cases with actor/seed/input/expect/locale and required scenario matrix |
| C | `packages/ai/eval/recordings/data/agent-handoff.jsonl` | Sanitized actual provider recordings with per-case/attempt/request hashes; no invented recordings or credentials |
| C | `packages/ai/eval/cases/agent-governance/release.yaml` | Eight or more immutable release cases with actor/seed/input/expect/locale and required scenario matrix |
| C | `packages/ai/eval/recordings/data/agent-governance.jsonl` | Sanitized actual provider recordings with per-case/attempt/request hashes; no invented recordings or credentials |
| C | `packages/ai/eval/cases/delegate-consult/release.yaml` | Eight or more immutable release cases with actor/seed/input/expect/locale and required scenario matrix |
| C | `packages/ai/eval/recordings/data/delegate-consult.jsonl` | Sanitized actual provider recordings with per-case/attempt/request hashes; no invented recordings or credentials |
| C | `tools/ai-live/src/native/judge.ts` | Canonical agent.test in isolated judge fixture with no tools, pinned model, strict bounded rubric projection and full usage evidence |
| M | `coding-packs/standards/workflow/git-flow-ci.md` | Document unconditional replay and explicit protected live workflow without changing branch ownership/permissions |
| C | `tools/ai-live/test/release-budget.test.ts` | Atomic per-provider-call cap across last root, judge, concurrent children, unknown/restart and fixture wallet resets |
| C | `tools/ai-live/test/release-workflows.test.ts` | Unconditional replay and protected live dispatch structural tests, no fork secrets or skip-green |

## Future M provenance

- `tools/ai-live/package.json`: TIP-023b-assistant-coverage.md
- `tools/ai-live/tsconfig.json`: TIP-023b-assistant-coverage.md
- `tools/ai-live/src/cli.ts`: TIP-023b-assistant-coverage.md
- `tools/ai-live/src/cases.ts`: TIP-023b-assistant-coverage.md
- `tools/ai-live/src/runner.ts`: TIP-023b-assistant-coverage.md
- `tools/ai-live/src/report.ts`: TIP-023b-assistant-coverage.md
- `tools/ai-live/src/safety.ts`: TIP-023b-assistant-coverage.md
- `tools/ai-live/test/cases-cli.test.ts`: TIP-023b-assistant-coverage.md
- `tools/ai-live/test/safety.test.ts`: TIP-023b-assistant-coverage.md
- `fixtures/ai-eval/live-seed.mjs`: TIP-023b-assistant-coverage.md

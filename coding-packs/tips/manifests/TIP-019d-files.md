# TIP-019d — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/core/src/kernel/actions/policy.ts` | Ngưỡng confidence |
| M | `packages/core/src/ai/assistant/delegate.ts` | Giao quyền lồng |
| M | `packages/core/src/ai/kb/kb-search.handler.ts` | Scope qua tool |
| M | `packages/core/src/ai/runs/tools.ts` | Truyền confidence/authority |
| C | `packages/core/test/agent-authority.test.ts` | Unit |
| C | `apps/api/test/integration/agent-authority.test.ts` | Integration |
| C | `fixtures/ai-eval/agent-authority.json` | Ca live |

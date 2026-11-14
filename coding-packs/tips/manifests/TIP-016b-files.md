# TIP-016b — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `apps/api/src/http/inbox/inbox-meta.controller.ts` | GET /nav/badges |
| C | `packages/core/src/inbox/services/nav-badges.ts` | COUNT theo scope |
| M | `packages/core/src/inbox/public.ts` | Facade |
| M | `apps/web/src/shared/shell/useShellData.ts` | Invalidate |
| M | `apps/web/src/shared/realtime/event-invalidation.ts` | Badge keys |
| C | `apps/api/test/integration/nav-badges.test.ts` | Integration |

# TIP-006c — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/core/src/billing/services/wallet.service.ts` | Outbox credits.changed |
| M | `packages/core/src/ai/assistant/meta-tools.ts` | ui.command |
| M | `packages/core/src/notify/realtime/emitter.ts` | Định tuyến sự kiện |
| M | `packages/shared/src/events.ts` | Kiểu sự kiện |
| M | `packages/db/src/tenant-resolver.ts` | Pub/sub invalidate |
| C | `packages/db/src/registry-pubsub.ts` | Kênh Redis |
| M | `apps/web/src/shared/realtime/event-invalidation.ts` | Xử lý sự kiện |
| C | `apps/api/test/integration/realtime-events.test.ts` | Sự kiện |
| C | `packages/db/test/registry-invalidate.test.ts` | Hai tiến trình |

# TIP-049 — Nền đồng bộ sàn: kết nối OAuth nhiều shop, webhook mức App, pull theo cursor, sửa năm lỗi đồng bộ đơn (Sàn, D63)

## HEADER
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/catalog/services/catalog-write.ts`, `packages/db/prisma/tenant/catalog.prisma`, `packages/shared/src/api/index.ts`; integrate 027b before049.
- **Parallel-safe with TIP-031c (coverage-closure manifest):** sequential, shares `packages/core/src/sales/jobs/order-sync.jobs.ts`, `packages/core/src/sales/orders/services/order-import.ts`, `packages/integrations/src/connectors/mock/order-sync.ts`, `packages/integrations/src/ports/order-sync.ts`; integrate 031c before049.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/actions/src/orders.ts`, `packages/core/src/catalog/services/catalog-write.ts`, `packages/core/src/sales/orders/services/order-import.ts`, `packages/core/src/sales/orders/services/order-write.ts`, `packages/db/prisma/tenant/catalog.prisma`, `packages/db/prisma/tenant/sales-orders.prisma`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/i18n/server/en/notify.ts`, `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/notify.ts`, `packages/shared/src/i18n/server/vi/sales.ts`, `packages/shared/src/notify/catalog.ts`; integrate 032b before049.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/actions/src/orders.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/sales/orders/services/order-import.ts`, `packages/core/src/sales/orders/services/order-view.ts`, `packages/core/src/sales/orders/services/order-write.ts`, `packages/db/prisma/tenant/sales-orders.prisma`, `packages/shared/src/api/orders.ts`, `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 032c before049.
- **Parallel-safe with TIP-045 (coverage-closure manifest):** sequential, shares `apps/worker/src/event-protocol.manifest.ts`; integrate 049 before045.
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `.env.example`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/events/protocol/aggregate.ts`, `packages/shared/test/event-protocol.test.ts`; integrate 048 before049.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `.env.example`, `packages/channels/src/coming-soon.ts`, `packages/channels/test/registry.test.ts`; integrate 048d before049.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `.env.example`, `packages/channels/src/coming-soon.ts`, `packages/channels/test/registry.test.ts`; integrate 048e before049.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `.env.example`, `packages/channels/src/coming-soon.ts`, `packages/channels/test/registry.test.ts`; integrate 048h before049.
- **Parallel-safe with TIP-049b (coverage-closure manifest):** sequential, shares `.env.example`, `packages/core/src/integrations/integrations.module.ts`, `packages/integrations/src/registry.ts`, `packages/integrations/test/registry.test.ts`, `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 049 before049b.
- **Parallel-safe with TIP-049c (coverage-closure manifest):** sequential, shares `.env.example`, `packages/core/src/integrations/integrations.module.ts`, `packages/integrations/src/registry.ts`, `packages/integrations/test/registry.test.ts`, `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 049 before049c.
- **Parallel-safe with TIP-003b (coverage-closure manifest):** sequential, shares `apps/worker/src/event-protocol.manifest.ts`, `packages/core/src/sales/orders/services/order-sync.ts`, `packages/shared/src/events.ts`, `packages/shared/src/events/protocol/aggregate.ts`, `packages/shared/test/event-protocol.test.ts`; integrate 003b before049.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/event-protocol.manifest.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/sales/jobs/order-sync.jobs.ts`, `packages/core/src/sales/orders/services/order-sync.ts`; integrate 003c before049.
- **Parallel-safe with TIP-003e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003e before049.
- **Parallel-safe with TIP-006b (coverage-closure manifest):** sequential, shares `apps/worker/src/event-protocol.manifest.ts`; integrate 006b before049.
- **Parallel-safe with TIP-006c (coverage-closure manifest):** sequential, shares `packages/shared/src/events.ts`; integrate 006c before049.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `.env.example`; integrate 006d before049.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/api/src/http/integrations/integrations.controller.ts`, `apps/api/src/http/integrations/integrations.http.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/integrations/actions/integration-disconnect.handler.ts`, `packages/core/src/integrations/actions/integration-sync.handler.ts`, `packages/core/src/integrations/integrations.module.ts`, `packages/core/src/integrations/jobs/integrations.jobs.module.ts`, `packages/core/src/integrations/services/connections.service.ts`, `packages/core/src/integrations/services/read.service.ts`, `packages/db/prisma/tenant/integrations.prisma`, `packages/integrations/src/define.ts`, `packages/integrations/src/index.ts`, `packages/integrations/src/registry.ts`, `packages/integrations/src/types.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/api/integrations.ts`, `packages/shared/src/events.ts`; integrate 012b before049.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/api/src/http/integrations/integrations.controller.ts`, `apps/api/src/http/integrations/integrations.http.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/integrations/actions/integration-disconnect.handler.ts`, `packages/core/src/integrations/integrations.module.ts`, `packages/core/src/integrations/jobs/integrations.jobs.module.ts`, `packages/core/src/integrations/services/connections.service.ts`, `packages/core/src/integrations/services/read.service.ts`, `packages/db/prisma/tenant/integrations.prisma`, `packages/integrations/src/index.ts`, `packages/integrations/src/registry.ts`, `packages/integrations/src/types.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/api/integrations.ts`, `packages/shared/src/events.ts`; integrate 012c before049.
- **Parallel-safe with TIP-012d (coverage-closure manifest):** sequential, shares `packages/integrations/src/registry.ts`; integrate 012d before049.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 013c before049.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/db/prisma/platform/routing.prisma`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 014b before049.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 015b before049.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/sales/orders/services/blocked-imports.ts`, `packages/core/src/sales/orders/services/order-import.ts`, `packages/core/src/sales/orders/services/order-view.ts`, `packages/shared/src/api/index.ts`; integrate 015c before049.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/i18n/server/en/notify.ts`, `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/notify.ts`, `packages/shared/src/i18n/server/vi/sales.ts`, `packages/shared/src/notify/catalog.ts`; integrate 015d before049.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 015e before049.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/actions/src/orders.ts`, `packages/core/src/sales/orders/actions/order-sync.handler.ts`, `packages/core/src/sales/orders/services/blocked-imports.ts`, `packages/core/src/sales/orders/services/external-order-payload.ts`, `packages/core/src/sales/orders/services/order-import.ts`, `packages/core/src/sales/orders/services/order-sync.ts`, `packages/db/prisma/tenant/sales-orders.prisma`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 015f before049.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 019b before049.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`; integrate 019c before049.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 020b before049.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `packages/shared/src/api/index.ts`; integrate 020d before049.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `.env.example`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 020e before049.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 022b before049.
- **Parallel-safe with TIP-022c (coverage-closure manifest):** sequential, shares `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 022c before049.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `apps/api/test/integration/actions/order.sync_now.action.test.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/integrations/actions/integration-disconnect.handler.ts`, `packages/core/src/sales/orders/actions/order-sync.handler.ts`, `packages/core/test/assistant-coverage.test.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/notify.ts`, `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/notify.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 023b before049.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/integrations/integrations.module.ts`, `packages/core/src/integrations/services/connections.service.ts`, `packages/core/src/integrations/services/read.service.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/api/integrations.ts`; integrate 023c before049.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`; integrate 023d before049.
- **Parallel-safe with TIP-023e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 023e before049.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`; integrate 023f before049.
- **Parallel-safe with TIP-023g (coverage-closure manifest):** sequential, shares `packages/shared/src/api/index.ts`; integrate 023g before049.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/actions/src/orders.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/sales/orders/services/order-write.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 025b before049.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 026b before049.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/actions/src/orders.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/db/prisma/tenant/sales-orders.prisma`, `packages/shared/src/api/index.ts`; integrate 026c before049.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/test/assistant-coverage.test.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 030b before049.
- **Parallel-safe with TIP-030c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`; integrate 030c before049.
- **Parallel-safe with TIP-031b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/actions/src/orders.ts`; integrate 031b before049.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/api/orders.ts`; integrate 032d before049.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/db/prisma/tenant/sales-orders.prisma`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/sales.ts`, `packages/shared/src/i18n/server/vi/sales.ts`; integrate 032e before049.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 033b before049.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 033c before049.
- **Parallel-safe with TIP-033d (coverage-closure manifest):** sequential, shares `packages/actions/src/orders.ts`, `packages/db/prisma/tenant/sales-orders.prisma`; integrate 033d before049.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`; integrate 034b before049.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 034c before049.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 034d before049.
- **Parallel-safe with TIP-035c (coverage-closure manifest):** sequential, shares `packages/core/src/sales/jobs/order-sync.jobs.ts`; integrate 035c before049.
- **Parallel-safe with TIP-035d (coverage-closure manifest):** sequential, shares `.env.example`; integrate 035d before049.
- **Parallel-safe with TIP-036 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 036 before049.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 037 before049.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 038 before049.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 038b before049.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 039 before049.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 040 before049.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/i18n/server/en/notify.ts`, `packages/shared/src/i18n/server/vi/notify.ts`, `packages/shared/src/notify/catalog.ts`; integrate 041 before049.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 042 before049.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 042b before049.
- **Parallel-safe with TIP-042c (coverage-closure manifest):** sequential, shares `packages/core/src/sales/orders/services/order-import.ts`, `packages/db/prisma/tenant/sales-orders.prisma`; integrate 042c before049.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 043 before049.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/src/integrations/integrations.module.ts`, `packages/core/src/sales/orders/services/order-view.ts`, `packages/db/test/factories/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/api/orders.ts`, `packages/shared/src/i18n/server/en/notify.ts`, `packages/shared/src/i18n/server/vi/notify.ts`, `packages/shared/src/notify/catalog.ts`; integrate 045b before049.
- **Parallel-safe with TIP-047 (coverage-closure manifest):** sequential, shares `.env.example`; integrate 047 before049.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `packages/db/prisma/platform/routing.prisma`, `packages/db/test/factories/index.ts`; integrate 047b before049.
- **Parallel-safe with TIP-047c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/worker/src/event-protocol.manifest.ts`, `packages/actions/src/index.ts`, `packages/core/src/ai/assistant/catalog.ts`, `packages/core/test/assistant-coverage.test.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/events.ts`, `packages/shared/src/events/protocol/aggregate.ts`, `packages/shared/src/i18n/server/en/notify.ts`, `packages/shared/src/i18n/server/vi/notify.ts`, `packages/shared/src/notify/catalog.ts`, `packages/shared/test/event-protocol.test.ts`; integrate 047c before049.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `packages/core/src/integrations/services/read.service.ts`; integrate 047d before049.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `.env.example`, `packages/actions/src/index.ts`, `packages/channels/src/coming-soon.ts`, `packages/channels/test/registry.test.ts`, `packages/db/prisma/platform/routing.prisma`; integrate 048b before049.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/test/assistant-coverage.test.ts`; integrate 048f before049.
- **Parallel-safe with TIP-048g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/test/assistant-coverage.test.ts`; integrate 048g before049.
- **TIP-ID:** TIP-049 · **Project:** AppChat V2 · **Module:** Sàn — nền đồng bộ (integrations + đơn sàn + kho biến thể) · **Priority:** P0 · **Estimated:** XL (2 pha: P1 hợp đồng connector + schema + OAuth chọn shop + route shop + webhook mức App + ProviderHttp; P2 pull theo cursor qua hàng đợi + năm lỗi đồng bộ đơn + ghép SKU + tồn biến thể + hết uỷ quyền)
- **Depends on:** 048, 048h, 031c, 027b, 032b, 032c và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 049b, 049c, 049d, 044, 045, 046.
- **Vì sao phụ thuộc:**
  - 048 (DC-909): kho token `TokenVault` (làm mới có khoá, refresh dùng một lần), `oauth.start` purpose `connector` (quyền `integrations.manage`), `oauth.complete` → pending, callback chung `/hooks/oauth/:provider/callback`, hợp đồng `OAuthClient` / `TokenSet` (`packages/channels/src/oauth.ts`), outbox `oauth.grant_revoked`. 049 không tự lưu, không tự làm mới token.
  - 048h: TIP cuối của PR 1. `packages/channels/src/coming-soon.ts` + `packages/channels/test/registry.test.ts` do 048d / 048e / 048h sửa liên tiếp; 049 bỏ hai dòng `shopee` / `tiktok_shop` sau chuỗi đó.
  - 031c: `stock_master` theo kết nối + `pullStock?` + đối soát tồn. Cùng sửa `order-import.ts`, `ports/order-sync.ts`, `connectors/mock/order-sync.ts`, `order-sync.jobs.ts`. 049 dùng lại bên giữ tồn, không làm lại.
  - 027b: `catalog-write.ts`, `product-view.ts`, `catalog-read.service.ts` — ghép trước khi sửa `recordMovement`.
  - 032b / 032c: khoá sửa đơn sàn (dòng / giá), `order.update_shipping`, CAS sửa đơn. Cùng sửa `order-import.ts`, `order-write.ts`, `sales-orders.prisma`.
- **Files touched:** [exact M/C manifest](manifests/TIP-049-files.md). Không tạo file prisma mới; sửa có chủ đích file prisma của TIP khác: `tenant/integrations.prisma` (012), `tenant/sales-orders.prisma` (031), `tenant/catalog.prisma` (027), `platform/routing.prisma` (002).
- **Quyết định nguồn:** D63 (Shopee + TikTok Shop vào bản phát hành; Lazada / Sapo / KiotViet / Haravan / WooCommerce vẫn Sắp có; đẩy tồn / trạng thái lên sàn vẫn P2; không đăng sản phẩm) · DC-917 · DC-909 · Q-916 · COMMERCE §4b + §4 (Q8) · Blueprint §4.7, §10 (K9) · `00-PROJECT-CONTEXT.md` ~L18 (không phục vụ mô hình sàn TMĐT — AppChat không vận hành gian hàng).
- **Dòng COVERAGE nhận:** REQ-F07c · REQ-F07b-4 (sửa) · COM-4b-8 (sửa) · BP-4.7-marketplace · BP-10-K9 (sửa) · DEF-031-1 (sửa) · D63-foundation · DC-917 · Q-916.

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2`. DB tenant riêng mỗi workspace (`TenantDbResolver`): không `workspace_id`, không RLS. Route webhook theo shop nằm ở DB nền tảng.
- **Hiện trạng (rà 2026-11-13; số dòng `~` kiểm lại ở Rà):**
  - **Gói `packages/integrations`:**
    - `types.ts` (88 dòng): `PORT_KEYS` ~L4–17 (`order_sync` ~L14); `ConnectorManifest` ~L30–48, `auth.kind` ~L40 có `'oauth2'` nhưng chỉ là kiểu, chưa có luồng; `ConnectionCtx` ~L53–58 không có hạn / làm mới token.
    - `registry.ts` (26): `order_sync` chỉ có `mock_marketplace` ~L24. `coming-soon.ts` (32): kiotviet / sapo / haravan / woocommerce (`commerce_sync`).
    - Shopee / TikTok Shop đang là **kênh** "Sắp có" ở `packages/channels/src/coming-soon.ts` ~L20–21 (nhóm commerce, oauth).
    - `ports/order-sync.ts` (48): `ExternalOrder` ~L14–30 (shipping ~L27); `pull(conn, since)` — không cursor, không ProviderHttp (bank-feed có, ~L46). `connectors/mock/order-sync.ts` (82).
    - `provider-http.ts` (37) chỉ GET (~L13). Allowlist ở `packages/core/src/integrations/operations/provider-http.ts` (39) ~L8 cứng `{oauth.casso.vn, userapi.sepay.vn}`.
  - **Kết nối:** `connections.service.ts` (172): `connect` ~L76–107 (test → sealSecrets → credentialRev++), `prepareConnect` / `applyConnect` ~L112–138, `rotated()` ~L32–35. Unique partial `integration_connection_active_key` (migration `20261030150000_012_integrations` ~L93) → một kết nối / connector / workspace: **không nối được hai shop**.
  - **Webhook có sẵn:** `hooks.controller.ts` (24) ~L15 → `webhook.service.ts` (100) ~L31–73 → `verifyWebhook(conn)` → `integration_event` → outbox. `TenantIntegrationRoute` (`routing.prisma` ~L42–50) chỉ theo `connectionId`. Shopee / TikTok Shop: một callback URL mỗi App, ký bằng khoá App, payload mang `shop_id` → cần route mức App.
  - **Đồng bộ đơn:**
    - `order-sync.ts` (132): lùi 10 phút ~L20; `syncWorkspace` ~L95–118, pull ~L105; không ghi `integration_call_log`; `lastSyncAt = null` → kéo toàn bộ lịch sử; `handleEvent` ~L121–131.
    - `order-sync.handler.ts` (32): `order.sync_now` pull đồng bộ trong `prepare` (trong request) ~L19–23. `actions/src/orders.ts` `order.sync_now` ~L177–188 (quyền `integrations.manage`, output `imported / blocked / failed`).
    - `jobs/order-sync.jobs.ts` (36): queue `order-sync` 5 phút quét mọi workspace; scheduler `sales.jobs.module.ts` ~L121–138.
    - `integration-sync.handler.ts` (89) ~L39–40 chỉ ngân hàng; `capabilitiesOf().pull` (`connection-health.ts` ~L28–31) true cho OrderSync nhưng handler trả `unsupported('no_bank_binding')`.
    - `order-import.ts` (165): `matchProducts` ~L35–47 khớp code / sku (không `integration_mapping`); new → processing trừ kho ~L62–63; vận chuyển ghi đè rỗng ~L89 / ~L97; khách `channelAccountId = conn.id` ~L105–109; thuế 0 ~L123; `lockedLines` ~L128–153.
    - `external-order-payload.ts` (66): `strictObject` ~L18–30, hash ~L57–66. `system/import.ts` (83): Map trong tiến trình ~L27.
    - `sales-orders.prisma` (189): `OrderSource` ~L26–35, cột sàn ~L44–50, shipping Json ~L85, unique `(external_connection_id, external_id)` ~L103, `order_item.variant_id` ~L111, `BlockedExternalOrder` ~L170–189; CHECK `order_external_chk` (migration 031 ~L64).
  - **Kho:** `order-write.ts` (170) `deductStock` ~L149–159 gọi `recordMovement` không `variantId` (~L153). `catalog-write.ts` `recordMovement` ~L118–131: khoá `product` FOR UPDATE, chèn `stock_movement` `ON CONFLICT (ref_type, ref_id, product_id) DO NOTHING`, chỉ cập nhật `product.stock`. `catalog.prisma`: `ProductVariant.sku` ~L93 (unique lower partial), `stock` ~L97; `StockMovement` ~L124–141 có `variant_id` ~L127, unique `(ref_type, ref_id, product_id)` ~L139 ⇒ đơn có hai biến thể cùng sản phẩm mất một lần trừ.
  - **Ánh xạ:** `integration_mapping` có sẵn (`integrations.prisma` ~L71–82, 2 unique), chưa dùng.
  - **Loyalty:** `loyalty/services/order-points.ts` ~L36 `earnsOf`: đơn `marketplace` chỉ tích khi `marketplaceEarn` (mặc định tắt) — đúng COMMERCE §4b, giữ.
  - **TIP-031c lệch (rà 2026-11-13):** 031c ghi `integration_connection.settings` (bảng chỉ có `config`); chưa có `integration.update_settings`; `StockMovementKind` thiếu `sync_adjust` (`catalog.prisma` ~L24–31).
  - **Không file nào vượt trần** (`lint-size.mjs`: BE 600).
- **Key files to read first:** DC-917, D63, COMMERCE §4b + §4, Blueprint §4.7 · TIP-048 (hợp đồng 3.1: `TokenVault`, `oauth-state`, `pending-connect`, `providers`) · TIP-031c · `standards/integrations/provider-ports.md` · các file nêu trên.
- **Patterns to follow:**
  - Webhook: `hooks.controller.ts` (rawBody, trả nhanh) + `webhook.service.ts` (biên nhận + outbox cùng transaction); route nền tảng như `connections.service.ts` upsert `tenant_integration_route` và 048b `hook-route.ts`.
  - Adapter + contract test + fixtures JSON: `connectors/sepay`, `connectors/casso`.
  - System adapter: `support.jobs.module.ts` + `apps/worker/src/event-protocol.manifest.ts` (047c §3.4).
  - Migration SQL viết tay: `20261030150000_012_integrations`, `20261102003700_marketing`.
  - Sổ kho: `recordMovement` (FOR UPDATE + ON CONFLICT).

## APPLICABLE STANDARDS
- [integrations/provider-ports](../standards/integrations/provider-ports.md) — port theo năng lực, manifest, gọi ra ngoài qua hàng đợi, `integration_call_log`, webhook kiểm chữ ký trong adapter, `integration_mapping`.
- [database/tenant-db](../standards/database/tenant-db.md) · [database/indexing](../standards/database/indexing.md) — không `workspace_id`; `=` trước, range / sort sau; partial; deferred join; EXPLAIN.
- [domain/concurrency](../standards/domain/concurrency.md) — khoá dòng kho, unique chống trừ đôi, webhook idempotent, CAS.
- [domain/state-machine](../standards/domain/state-machine.md) · [domain/money-time-numbering](../standards/domain/money-time-numbering.md) — hai trục đơn; tiền chuỗi VND; `timestamptz`.
- [actions/action-registry](../standards/actions/action-registry.md) · [events/outbox](../standards/events/outbox.md) · [api/response-envelope](../standards/api/response-envelope.md) — action mới, internal, topic chỉ id.
- [ops/observability-security](../standards/ops/observability-security.md) — log không token / chữ ký / SĐT.
- [authz/rbac-permissions](../standards/authz/rbac-permissions.md) — dùng quyền có sẵn.
- [plans/COMMERCE-DECISIONS](../plans/COMMERCE-DECISIONS.md) §4b + §4 (Q8) — luật đơn sàn + kho, **không đổi**.
- [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).

## Rà trước khi làm
1. Rebase lên `origin/dev` mới nhất, sau khi PR 1 (048 → 048h) và 031c / 032b / 032c đã ghép.
   - `python -X utf8 tools/obligations/manifests.py 049`.
   - Kiểm lại mọi số dòng `~` trên dev; lệch → sửa TIP dòng "Rà lại <ngày>".
   - Đổi mốc hai migration nếu dev đã có migration mới hơn (ghi DV, sửa DC-917 bằng DC mới).
2. Đọc lại bản mới nhất: TIP-048 (`TokenVault`, `oauth.start` purpose `connector`, pending, `oauth.grant_revoked`), TIP-031c (nơi lưu `stock_master`: `config` hay `settings`), COMMERCE §4b nguyên văn. Lệch luật §4b → dừng, hỏi (L2).
3. Tìm mọi chỗ dùng `IntegrationStatus` (switch, map nhãn). Thêm `expired` vỡ typecheck ở file ngoài manifest → L2.
4. Kiểm `product.stock` hiện là tổng tồn biến thể hay độc lập (`catalog/services/variants.ts`, form sản phẩm). Chọn cách cộng ở §6.4 theo thực tế, ghi "Giả định đã chọn".
5. Kiểm `registerCallOp` / `operations/call-receipt.ts` (ghi call log), điều kiện đăng ký `mock_marketplace` (ẩn ở production), cách harness integration chạy job BullMQ (helper chạy job trong test).
6. `order.sync_now` hiện dùng quyền `integrations.manage` (~L185). Giữ nguyên; đổi quyền đã có là L2 (đề xuất `order.manage` ghi ở Q-917, chờ Chủ nhà chốt).
7. Grep `ON CONFLICT (ref_type, ref_id, product_id)` và khoá Prisma `refType_refId_productId`: mọi chỗ phải đổi sang khoá sổ kho mới (§2.3). Chỗ nằm ngoài manifest → L2.
8. Đo ở demo / dev: số đơn `source IN ('marketplace','pos')`, số kết nối `order_sync`, để backfill `external_shop_key` (§2) chạy đúng.

## TASK
Dựng nền chung cho mọi sàn (049b Shopee, 049c TikTok Shop dùng lại), không adapter thật, không UI.
- Hợp đồng connector OAuth + port `OrderSyncProvider` theo cursor + bộ kit sàn.
- Schema: nhiều shop / sàn, route shop nền tảng, khoá đơn theo shop, snapshot sản phẩm sàn, sổ kho theo biến thể.
- Kết nối OAuth qua kho token 048 + chọn shop + nối lại cùng shop.
- Webhook mức App `POST /hooks/marketplace/:connector`.
- Pull theo cursor qua hàng đợi; ProviderHttp POST + allowlist theo manifest + `integration_call_log`.
- Sửa năm lỗi đồng bộ đơn; ghép SKU (chỉ đọc sàn); hết uỷ quyền → `expired` + thông báo.

## SPECIFICATIONS

### 1. Hợp đồng connector + port (`packages/integrations`)
1. **`src/oauth.ts` (C):** khai `TokenSet`, `OAuthAccount`, `OAuthClient` cùng hình dạng `packages/channels/src/oauth.ts` (048). Gói `integrations` chỉ phụ thuộc `@appchat/shared` → không import `@appchat/channels` / core. Core đưa client connector vào `registerOAuthProvider` (048): TypeScript kiểm hai kiểu khớp lúc biên dịch.
2. **`types.ts` (M):**
   - `ConnectorManifest` thêm `hosts?: string[]` (allowlist HTTPS; bắt buộc với connector gọi ra ngoài mới), `oauth?: { provider: string; picker: 'shop' }`, `webhook?: { ack: 'empty_2xx' | 'json_200' }`, `rateLimit?: { rps: number; burst?: number }`, `capabilities?: { orders: boolean; tracking: boolean; products: boolean; buyerChat: 'soon' | false }`, `requiresEnv?: string[]` (thiếu env → registry trả `status: 'coming_soon'`: thẻ "Sắp có", không lỗi boot — dùng khi chưa có app đối tác).
   - `ConnectionCtx` thêm `externalAccountId?`, `meta?: Record<string, string>` (vd `shop_cipher`), `token?: () => Promise<string>` (core cấp, đọc `TokenVault.access` mỗi lần — adapter không giữ token), `http` (ProviderHttp đã gắn allowlist + call log).
   - `define.ts` (M): `auth.kind = 'oauth2'` ⇒ bắt buộc `oauth` + `hosts`; có `webhook` ⇒ adapter phải có `webhook`.
3. **`ports/order-sync.ts` (M):**
   - `pull(conn, cursor: SyncCursor | null) → { orders: ExternalOrder[]; nextCursor: SyncCursor | null; done: boolean }`. `SyncCursor = { windowFrom: string; windowTo: string; token?: string; part?: number }` (ISO; `token` = cursor riêng của sàn). Core giữ cursor; adapter không lưu.
   - Thêm `getOrder?(conn, externalId)`, `getTracking?(conn, externalId) → { carrier?, tracking?, eta? } | null`, `listProducts?(conn, cursor) → { items: ExternalProduct[]; nextCursor: string | null }` (chỉ đọc).
   - `ExternalOrder` thêm: `buyer.externalId`; dòng `externalItemId`, `externalModelId?`, `sellerSku?`, `variantName?`; `cod: boolean`; `paidAt?`; `updatedAt` (mốc sàn — bỏ sự kiện cũ). Trường shipping (~L27) đều optional: thiếu = chưa biết, khác chuỗi rỗng.
   - `ExternalProduct { externalItemId; externalModelId?; sellerSku?; name; modelName?; price: string (VND); stock?: number; status; imageUrl? }`.
   - Giữ `mapStatus(platform_status, ctx: { cod }) → { status, pay_status }`. Cập nhật mock + `test/order-sync.test.ts` theo chữ ký mới.
4. **`connectors/marketplace-kit.ts` (C)** — 049b / 049c dùng chung:
   - `shopKey(connector, shopId)` → `'<connector>:<shop_id>'`.
   - `buyerAccountId(connector, shopId)` → uuidv5(`MARKETPLACE_BUYER_NS`, shopKey). Hằng NS sinh một lần, không bao giờ đổi. Dùng `uuid` v5 nếu core đã có gói, không thì `node:crypto` SHA-1 theo RFC 4122 (không thêm thư viện).
   - `splitWindow(from, to, maxDays)`; `advanceOnly(current, target)`: không kéo lùi trục (`new < processing < completed`; `cancelled` chỉ từ `new` / `processing`).
   - `hmacHex(key, data)`, `safeEqualHex(a, b)` (`timingSafeEqual`).
   - `RateGate`: token bucket Redis `rl:mkt:<connector>:<shop_id>` theo `manifest.rateLimit`; back-off 429 / mã giới hạn của sàn (theo `Retry-After` nếu có; 1 → 2 → 4 giây, tối đa 3 lần).
   - `MarketplaceWebhook { verify(raw: Buffer, headers, ctx: { url; secrets }): boolean; split(raw: Buffer): MarketplaceHookItem[] }`; `MarketplaceHookItem { shopId; eventKey; kind: 'order' | 'tracking' | 'deauthorized' | 'auth_expiring' | 'other'; externalId?; body }`.
5. **`provider-http.ts` (M, ~L13 chỉ GET):** thêm `post(url, { query?, headers?, body: string | Buffer, timeoutMs? })` trả `{ status, headers, text }` (giữ raw để ký / kiểm). `fetch` Node 24, `redirect: 'manual'` (3xx = lỗi), timeout 15 giây, cắt body > 5MB. Log chỉ host + path, không query (có `access_token` / `sign`).
6. **`core/integrations/operations/provider-http.ts` (M, ~L8):** allowlist = `manifest.hosts` của connector đang gọi; sepay / casso giữ hai host cũ làm mặc định trong file này (không sửa connector cũ). Chỉ `https:`. Ngoài danh sách → lỗi `host_not_allowed`, không gọi. Mỗi lời gọi ghi `integration_call_log` (op, ref, status, latency_ms, mã lỗi) qua helper có sẵn; không ghi token / chữ ký / payload.
7. **Transport `fake` + connector thử:** env `<X>_TRANSPORT=fake` → adapter dùng `fake-server.ts` trong tiến trình (không HTTP); production cấm `fake` (guard như `channels.env.ts` ~L29–34). `connectors/mock/order-sync.ts` thêm `mock_shop` (`auth.kind = 'oauth2'`, `OAuthClient` giả, webhook ký HMAC giả), đăng ký cùng điều kiện với `mock_marketplace` — dùng cho test 049 và mock FE.

### 2. Schema
**Tenant migration `20261115140000_marketplace_sync`:**
1. `integrations.prisma` (chủ 012):
   - `integration_connection` thêm `external_account_id text null` (shop_id), `oauth_grant_id uuid null` (không FK — kernel khác domain, handler kiểm), `sync_state jsonb not null default '{}'` (`{ window_from, window_to, token, part, last_run: { at, imported, blocked, failed } }`).
   - Enum `integration_status` thêm `expired` (`ALTER TYPE … ADD VALUE`; không dùng giá trị mới trong cùng migration).
   - Thay `integration_connection_active_key` (migration 012 ~L93):
     - `(connector_key) WHERE status <> 'disconnected' AND external_account_id IS NULL`;
     - `integration_connection_shop_key (connector_key, external_account_id) WHERE status <> 'disconnected' AND external_account_id IS NOT NULL`.
   - Index thường (KHÔNG unique) `(oauth_grant_id) WHERE oauth_grant_id IS NOT NULL` để tra kết nối theo grant: TikTok Shop một grant (người bán) nhiều shop.
   - Bảng MỚI `marketplace_listing` (snapshot sản phẩm sàn, chỉ đọc): `id`, `connection_id` (FK → `integration_connection` ON DELETE CASCADE), `external_item_id`, `external_model_id text not null default ''`, `seller_sku null`, `name`, `model_name null`, `price` (kiểu tiền như `product.price`), `stock int null`, `platform_status`, `image_url null`, `match_status` (`unmatched · suggested · mapped`), `suggested_product_id null`, `suggested_variant_id null`, `suggest_reason` (`sku · code`) null, `synced_at`, `created_at`, `updated_at`.
     - unique `(connection_id, external_item_id, external_model_id)`;
     - list drawer `(connection_id, match_status, updated_at DESC, id DESC)` + deferred join;
     - tra SKU `(connection_id, lower(seller_sku)) WHERE seller_sku IS NOT NULL`.
   - `integration_mapping` (~L71–82) dùng cho ghép SKU: `entity = 'product_variant' | 'product'`, `external_id = '<item_id>:<model_id>'`. Không đổi cấu trúc; nếu hai unique hiện có chưa chặn một biến thể ghép hai listing cùng kết nối → thêm unique trong migration này.
   - Index `integration_mapping (entity, local_id) INCLUDE (connection_id)`: 049d tra "Kênh bán" theo lô sản phẩm / biến thể (bỏ qua nếu một unique hiện có đã bắt đầu bằng `(entity, local_id)` — kiểm ở Rà).
2. `sales-orders.prisma` (chủ 031):
   - `order.external_shop_key text null`; unique `(external_shop_key, external_id) WHERE external_id IS NOT NULL`; list theo shop `(external_shop_key, created_at DESC, id DESC) WHERE external_shop_key IS NOT NULL`. Giữ unique cũ ~L103.
   - Backfill: đơn có `external_connection_id` → `external_shop_key = connector_key || ':conn:' || connection_id` (kết nối cũ không có shop — giữ hành vi khoá theo dòng kết nối).
   - `blocked_external_order` (~L170–189) thêm `external_shop_key` + backfill như trên; biên nhận chặn khoá theo shop (kiểm unique hiện có ở Rà).
3. `catalog.prisma` (chủ 027): `stock_movement` unique ~L139 → `UNIQUE NULLS NOT DISTINCT (ref_type, ref_id, product_id, variant_id)` (PG16). Khoá mới rộng hơn khoá cũ nên dữ liệu cũ hợp lệ. Prisma ghi `@@unique([refType, refId, productId, variantId])` cho client, constraint thật viết SQL (chú thích trong schema).

**Platform migration `20261115140100_shop_route` — `routing.prisma` (chủ 002):** `tenant_shop_route (route_key text pk, workspace_id, connection_id uuid, status 'active' | 'disabled', updated_at)` + index `(workspace_id)`. `route_key = '<connector>:<shop_id>'`.

### 3. Kết nối OAuth + chọn shop
- Luồng: FE (049d) gọi `oauth.start { provider: '<connector>', purpose: 'connector', ref?, return_to }` → callback 048 → `oauth.complete` (exchange → `TokenVault.upsert` → pending; accounts = shop: `external_id` = shop_id, `name`, `meta.region`, `meta.cipher`…) → FE đọc `oauth.pending_get` → người chọn shop → `integration.oauth_select`.
- **`integration.oauth_select`** (config, `integrations.manage`, agentGrantable false; `connector-oauth.handlers.ts`):
  - Input `{ pending_id, external_ids: string[] (1–20), settings?: { initial_days?: 1–90 (mặc định 30), stock_master?: 'appchat' | 'external' } }`.
  - Kiểm pending thuộc người gọi (048); connector có `auth.kind = 'oauth2'`; mỗi id có trong `accounts`. Shop không phải VN (region / tiền tệ ≠ VND) → 422 `shop_region_unsupported` (tiền là VND).
  - Từng shop:
    1. Giành route (`shop-route.ts`): `INSERT … ON CONFLICT (route_key) DO UPDATE … WHERE tenant_shop_route.workspace_id = EXCLUDED.workspace_id OR tenant_shop_route.status = 'disabled' RETURNING workspace_id`. Không trả dòng → 409 `shop_in_use_elsewhere`, không tạo kết nối.
    2. Transaction DB tenant: tìm dòng mới nhất cùng `(connector_key, external_account_id)` (mọi trạng thái) → **nối lại cùng dòng** (`connected`, grant mới, `last_error = null`, giữ `sync_state` + `integration_mapping`); không có → tạo dòng (`port = 'order_sync'`, `config = { shop_name, region, initial_days, stock_master, ...account.meta }` theo đúng nơi 031c lưu `stock_master`).
       - Grant: account có `tokens` riêng (token theo shop — Shopee) → `TokenVault.upsert(tx, provider, account.tokens)` thành grant riêng của shop; không có → dùng grant chung của lần uỷ quyền (một người bán nhiều shop — TikTok Shop). Ghi `oauth_grant_id`.
    3. Ghi `connection_id` vào route. Lỗi tenant → trả route (bù), không để route mồ côi.
    4. Xếp job pull đầu + job đọc sản phẩm (§7). Không gọi sàn trong request.
  - Output `{ connections: [{ external_account_id, connection_id?, name, reattached?, error? }] }` — kết quả từng shop, một shop lỗi không hỏng shop khác (`concurrency.md` §7). `Idempotency-Key`.
- **Uỷ quyền lại:** `oauth.start` + `ref = connection_id` → `oauth_select` với đúng shop của dòng đó; shop khác → 409 `oauth_account_mismatch`.
- **`integration.disconnect` (M handler):** kết nối OAuth → `disconnected` + route `disabled`. Grant không còn kết nối nào dùng → `revoked` (xoá token) bằng hàm của 048; 048 chưa có hàm → cập nhật trạng thái grant trong cùng transaction, ghi DV. Giữ đơn, khách, ánh xạ.
- **`connections.service.ts` (M):** hàm `attachOAuthShop(...)` cho bước 2; không đi `connect()` (không `credentialRev`, không `sealSecrets` — token nằm ở `oauth_grant`). `ConnectionCtx` dựng từ dòng kết nối + `token()` = `TokenVault.access(tx, oauth_grant_id)`.

### 4. Webhook mức App `POST /hooks/marketplace/:connector`
- **Controller** `marketplace-hooks.controller.ts` (đăng ký ở `integrations.http.module.ts`): ngoài `/v1` (prefix `hooks/{*path}`), rawBody ≤ 256KB, không JWT, không ghi DB; gọi `MarketplaceHooksService.receive(connector, raw, headers, path)`.
- **`marketplace-hooks.service.ts`:**
  1. Connector không khai `webhook` → 404.
  2. `adapter.webhook.verify(raw, headers, { url: HOOKS_PUBLIC_URL + path, secrets })` — **mức App** (khoá App từ env), không theo kết nối. Sai → 401, không ghi gì.
  3. `split(raw)` → từng item; tra `tenant_shop_route` `shopKey(connector, shopId)`. Không có / `disabled` → bỏ, metric `marketplace_hook_unrouted_total`, vẫn 2xx.
  4. Theo workspace, một transaction DB tenant: chèn `integration_event` (có sẵn; khoá idempotent = `eventKey` của adapter), trùng → bỏ. Cùng transaction ghi outbox:
     - `order` / `tracking` → topic hiện có của `webhook.service.ts` (consumer `handleEvent` ~L121–131);
     - `deauthorized` / `auth_expiring` → topic mới `integration.auth_changed` (payload chỉ id: `connection_id`, `kind`).
  5. Trả theo `manifest.webhook.ack`: `empty_2xx` → 200 **body rỗng**; `json_200` → 200 `{ data: { accepted } }`. Lỗi DB → 503 (sàn gửi lại). Mục tiêu ≤ 1 giây.
- **`handleEvent` (M `order-sync.ts`):** `order` → xếp job `order-one:<ws>:<connId>:<externalId>` (trễ 5 giây, gộp sự kiện dồn) → `getOrder` → nhập; `tracking` → `getTracking` → cập nhật vận đơn theo §6.1.
- Route cũ `/hooks/integrations/:connector/:connectionId` giữ cho connector API key.

### 5. Pull theo cursor qua hàng đợi
- **`order-pull.ts` (C)** `OrderPullService.runConnection(ws, connectionId)`:
  1. Bỏ qua kết nối khác `connected`.
  2. Cursor: `sync_state.token` có → đi tiếp; không → cửa sổ mới `window_from = max(last_sync_at − 10 phút, now − initial_days)`, `window_to = now`. `last_sync_at = null` → chỉ `initial_days` (mặc định 30) — **không kéo toàn bộ lịch sử**.
  3. Gọi `pull` tối đa `MARKETPLACE_PULL_MAX_PAGES` trang (mặc định 5); nhập từng đơn (§6); lưu `sync_state` sau mỗi trang (một transaction / trang).
  4. `done` → `last_sync_at = window_to`, xoá token; chưa xong → tự xếp lại job cùng `jobId`, đi tiếp từ cursor.
  5. Ghi `sync_state.last_run = { at, imported, blocked, failed }` (Drawer 049d đọc).
- **`order-sync.jobs.ts` (M):** lượt quét 5 phút (giữ scheduler `sales.jobs.module.ts`) chỉ **xếp** job `pull:<ws>:<connId>` cho từng kết nối `order_sync` đang `connected`. `jobId` cố định ⇒ tối đa một job / kết nối; thêm lease Redis `lease:order-pull:<ws>:<connId>` (TTL 5 phút) chống hai worker cùng chạy.
- **`order-sync.ts` (M):** `syncWorkspace` ~L95–118 thành hàm xếp job; bỏ pull trực tiếp ~L105.
- **`order.sync_now` (M `order-sync.handler.ts` ~L19–23 + `actions/src/orders.ts`):** chỉ xếp job, trả nhanh. Output `{ queued, imported, blocked, failed }`, mọi trường `.default(0)`: `queued` = số kết nối đã xếp; ba trường cũ giữ cho tương thích (luôn 0, ghi `deprecated` trong mô tả; số thật ở `sync_state.last_run`). Quyền giữ `integrations.manage`. Toast "Đã xếp đồng bộ N kết nối" + mock đổi ở 049d.
- **`integration.sync_now` (M `integration-sync.handler.ts` ~L39–40):** kết nối `order_sync` → xếp job của đúng kết nối (bỏ `unsupported('no_bank_binding')`).
- Gọi sàn chỉ trong job (provider-ports §5). Mỗi lời gọi một dòng `integration_call_log`.

### 6. Năm lỗi đồng bộ đơn phải sửa
1. **Đồng bộ lại ghi đè vận chuyển bằng rỗng** (`order-import.ts` ~L89 / ~L97): mỗi lượt đồng bộ ghi `carrier` / `tracking` / `eta` rỗng → mất mã vận đơn nhập tay.
   - Sửa: gộp theo từng trường. Sàn có giá trị khác rỗng → ghi + `shipping.source.<field> = 'platform'`. Sàn thiếu / rỗng → giữ giá trị đang có. Không bao giờ ghi rỗng đè giá trị.
   - `order.update_shipping` không đổi. Trường sàn đã cung cấp sẽ được lượt sau ghi lại (sàn là nguồn sự thật — §4b); 049d khoá ô đó trên UI.
2. **Khách / đơn khoá theo `conn.id`** (`order-import.ts` ~L105–109; unique đơn ~L103): ngắt rồi nối lại tạo kết nối mới → khách trùng + đơn trùng + trừ kho lần hai.
   - Sửa: nối lại dùng lại dòng kết nối (§3) **và** khoá ổn định `<connector>:<shop_id>`:
     - đơn tra theo `(external_shop_key, external_id)`; đơn cũ của shop → cập nhật, chuyển `external_connection_id` sang kết nối hiện tại;
     - khách tra `contact_identity(channel_type = 'marketplace', channel_account_id = buyerAccountId(connector, shop_id), external_id = buyer_id)`.
   - Connector không có shop_id (API key, mock cũ): `external_shop_key = '<connector>:conn:<connection_id>'`, `channel_account_id = conn.id` (hành vi cũ, không backfill khách).
   - Nhập đồng thời: thay Map trong tiến trình (`system/import.ts` ~L27) bằng `pg_advisory_xact_lock(hashtextextended(external_shop_key || ':' || external_id, 0))` trong transaction nhập (nhiều worker an toàn). `external-order-payload.ts` (`strictObject` ~L18–30, hash ~L57–66) nhận trường mới và đưa chúng vào hash.
3. **Ghép SKU bỏ qua `integration_mapping`** (`matchProducts` ~L35–47 chỉ khớp code / sku):
   - Sửa (`sku-match.ts`, gọi từ `order-import.ts`), thứ tự: (a) `integration_mapping` của kết nối theo `'<item_id>:<model_id>'`; (b) `lower(product_variant.sku) = lower(seller_sku)` (index có sẵn ~L93); (c) `product.code = seller_sku`; (d) không khớp → dòng ngoài danh mục như hiện tại, **không tạo sản phẩm**.
   - Nạp theo lô (`IN (...)`), không N+1. (b) / (c) trùng nhiều bản ghi → coi như không khớp.
   - Khớp biến thể → ghi `order_item.variant_id` (~L111).
4. **Tồn biến thể không trừ** — Q-916, sửa đúng COMMERCE Q8 (trừ khi xác nhận, hoàn khi huỷ, cho tồn âm + cảnh báo, truy vết `stock_movement`), **không đổi luật**:
   - Lỗi: `deductStock` (`order-write.ts` ~L149–159) gọi `recordMovement` không `variantId` (~L153); `recordMovement` (`catalog-write.ts` ~L118–131) chỉ cập nhật `product.stock`; unique sổ kho thiếu `variant_id` ⇒ hai biến thể cùng sản phẩm trong một đơn mất một lần trừ.
   - `variant-stock.ts` (C) `recordVariantMovement(tx, m)`: khoá `product` rồi `product_variant` (`SELECT … FOR UPDATE`, luôn thứ tự này; nhiều dòng sắp theo `(product_id, variant_id)`); chèn `stock_movement` có `variant_id` (`ON CONFLICT (ref_type, ref_id, product_id, variant_id) DO NOTHING`); cộng `qty` vào `product_variant.stock` và `product.stock` (sản phẩm = tổng biến thể — kiểm ở Rà #4); cảnh báo `low` theo tồn biến thể + ngưỡng sản phẩm.
   - `recordMovement` (M) rẽ sang `recordVariantMovement` khi có `variantId`; nhánh không biến thể đổi `ON CONFLICT` sang khoá 4 cột mới (`variant_id` NULL — khoá cũ 3 cột bị bỏ ở §2.3, để nguyên sẽ lỗi "no unique constraint matching"). `deductStock` / `returnStock` (M) mang `variant_id` của dòng / movement; movement cũ không biến thể hoàn về sản phẩm như lúc trừ.
   - Áp cho mọi đơn (tay, báo giá, sàn) — Q8 chung. Combo giữ cách trừ theo thành phần hiện có.
5. **Một kết nối / connector chặn hai shop** (`integration_connection_active_key`, migration `20261030150000_012_integrations` ~L93): sửa bằng hai unique partial §2 + route shop §3.

### 7. Ghép SKU + danh sách sản phẩm sàn (chỉ đọc sàn)
- **`marketplace.import_products`** (write, `catalog.manage`): xếp job đọc `listProducts` theo cursor (call op `integration-ops` qua `registerCallOp` — `call-runner.ts`, kiểm chữ ký ở Rà) → upsert `marketplace_listing` (`marketplace-listings.ts`) → tính gợi ý theo §6.3 (b) / (c) → `match_status`. **Không tạo / sửa `product`**, không ghi gì lên sàn. Output `{ queued: true }`.
- **`marketplace.map_sku`** (write, `catalog.manage`, undo 24 giờ): input `{ listing_id, variant_id?, product_id? }` — đúng một; sản phẩm có biến thể bắt buộc `variant_id` (422 `listing_variant_required`). Ghi `integration_mapping` + `match_status = 'mapped'`. Biến thể đã ghép listing khác cùng kết nối → 409 `sku_already_mapped`.
- **`marketplace.unmap_sku`** (write, `catalog.manage`): xoá mapping, `match_status` về `suggested` / `unmatched`.
- Đơn đã nhập không tự đổi dòng khi ghép sau (đơn sàn khoá dòng — §4b); ánh xạ áp cho đơn nhập sau.
- **Đọc:** `marketplace.listings` (read, `catalog.view`) + `GET /v1/integrations/:id/listings?status=&q=&page=&limit=` (`integrations.controller.ts`): D42 `page` + `limit` (20 / 50 / 100) + `meta.total`, id-first deferred join theo index §2, không `SELECT *`.

### 8. Hết uỷ quyền / thu hồi
- Nguồn: `TokenVault` (048) gặp `invalid_grant` → grant `revoked` + outbox `oauth.grant_revoked`. Webhook huỷ uỷ quyền / sắp hết hạn → outbox `integration.auth_changed` (§4).
- System adapter `integrations.auth` (topics `oauth.grant_revoked`, `integration.auth_changed`) → action nội bộ **`integration.auth_event`** (`exposure: 'internal'`, `systemInput` / `systemOutput`):
  - `revoked` / `deauthorized` → kết nối dùng grant (hoặc kết nối được nêu) → `status = 'expired'`, `last_error = 'grant_revoked' | 'deauthorized'` (CAS; lặp không đổi gì) + `notify.requested` kind `integration_expired` tới người có `integrations.manage`.
  - `auth_expiring` → kind `integration_expiring` (tối đa một lần / kết nối / ngày).
- Đăng ký: `registerSystemAdapter` + `registerSystemVerifier` trong `onModuleInit` của `integrations.jobs.module.ts`; dòng `action('integrations.auth', ['oauth.grant_revoked', 'integration.auth_changed'])` ở `apps/worker/src/event-protocol.manifest.ts`; topic khai `packages/shared/src/events.ts` + `events/protocol/aggregate.ts` (`by('integration_connection','connection_id')`); `SYSTEM_ONLY` ở `ai/assistant/catalog.ts`.
- Kết nối `expired`: pull / webhook bỏ qua; đơn cũ giữ; Uỷ quyền lại (§3) đưa về `connected`.
- Kind thông báo mới ở `packages/shared/src/notify/catalog.ts` (nhóm như `channel_down`), tiêu đề `i18n/server/{vi,en}/notify.ts`, nhãn màn Cài đặt → Thông báo ở `settings.json` nếu màn đọc nhãn ở đó (kiểm ở Rà).

### 9. Action, DTO, đăng ký
| Action | Risk | Quyền | agentGrantable | Ghi chú |
|---|---|---|---|---|
| `integration.oauth_select` | config | `integrations.manage` | false | §3; `Idempotency-Key`; preview nêu shop sẽ nối / nối lại |
| `marketplace.import_products` | write | `catalog.manage` | false | §7; chỉ xếp job |
| `marketplace.map_sku` | write | `catalog.manage` | false | §7; preview nêu listing ↔ biến thể; undo 24 giờ |
| `marketplace.unmap_sku` | write | `catalog.manage` | false | §7 |
| `marketplace.listings` | read | `catalog.view` | read: true | §7; đường tra `listing_id` cho Trợ lý |
| `integration.auth_event` | internal | system | false | §8 |
| `order.sync_now` (sửa) | write | `integrations.manage` (giữ — đổi sang `order.manage` là Q-917, chờ Chủ nhà) | false | §5; chỉ xếp job, trả `queued` |
| `integration.sync_now` (sửa handler) | write | `integrations.manage` (giữ) | false | §5; kết nối `order_sync` → xếp job |

- File MỚI `packages/actions/src/marketplace.ts` (module như `integration.connect` hiện có); export ở `index.ts`. Handler: `connector-oauth.handlers.ts` (`oauth_select`) + `integrations/actions/marketplace.handlers.ts` (còn lại); đăng ký ở `integrations.module.ts`.
- Mọi action ghi có `preview()` (assistant-coverage). `ALIAS` / `EXEMPT` chỉ khi có lý do ghi rõ. Nhãn `actions.<id>.title` vi + en (`apps/web/messages/{vi,en}/actions.json`).
- **DTO:**
  - `packages/shared/src/api/marketplace.ts` (listing, trang listing D42, kết quả `oauth_select`), export ở `api/index.ts`.
  - `api/integrations.ts` + `read.service.ts`: connector có `auth_kind`, `oauth_provider`, `capabilities`; kết nối có `external_account_id`, `shop_name`, `status` (thêm `expired`), `grant_expires_at` (hạn refresh thật của grant), `last_run`. Không trả token.
  - `api/orders.ts` + `order-view.ts`: `external_ref` thêm `connector`, `shop_key`, `shop_name`; `shipping.source`. Mọi trường mới optional (mock cũ không vỡ).
- Không thêm permission.

### 10. COMMERCE §4b giữ nguyên (kiểm, không đổi)
- Nhập **một lần**: unique theo shop + mã ngoài (§2, §6.2).
- Trạng thái: adapter `mapStatus` → hai trục; `advanceOnly` không kéo lùi; giữ `platform_status` gốc để hiển thị.
- Không sửa dòng / giá / tổng đơn sàn (`lockedLines` ~L128–153 giữ). Sửa được người phụ trách, ghi chú, thẻ.
- Thanh toán: đơn đã thanh toán trên sàn ghi `customer_payment(method = marketplace)`, **không** sinh Đề nghị thanh toán / VietQR. Đơn COD `paid` khi sàn báo hoàn tất.
- Kho: `stock_master` theo kết nối (031c); đơn sàn vẫn ghi `stock_movement` theo Q8 ở cả hai chế độ.
- Khách theo buyer id; chỉ lưu dữ liệu sàn cho phép (SĐT bị che không ghi làm SĐT khách).
- Loyalty: đơn sàn mặc định không tích điểm (`order-points.ts` ~L36 giữ, có test).
- Không đẩy tồn / trạng thái lên sàn (P2), không đăng / sửa sản phẩm trên sàn (ngoài phạm vi).

### 11. Lỗi (i18n server vi + en — `i18n/server/{vi,en}/sales.ts`)
- 409: `shop_in_use_elsewhere` · `oauth_account_mismatch` · `sku_already_mapped` · `connection_expired`.
- 422: `shop_region_unsupported` · `listing_variant_required`.
- 404: `listing_not_found` (đồng nhất ngoài quyền).
- `host_not_allowed` và lỗi gọi sàn chỉ vào log / `last_error`. Message không chứa token, chữ ký, SĐT.

### 12. Lệnh DB (CLAUDE.md §7 — đủ ba lệnh, đúng thứ tự)
`pnpm --filter @appchat/db run db:generate` → `db:migrate-tenants` → `db:setup`. Kiểm `appchat_tenant_template` có `20261115140000_marketplace_sync`; DB nền tảng có `20261115140100_shop_route`.

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given DB demo có đơn mock `marketplace`, when chạy ba lệnh DB, then mọi workspace + template có cột / bảng mới; đơn cũ có `external_shop_key` (backfill); không mất dữ liệu; hai kết nối `active` cùng `(connector, shop)` bị unique chặn, hai shop khác nhau cùng connector được | log ba lệnh + `_appchat_migrations` + `apps/api/test/integration/marketplace-oauth.test.ts` |
| 2 | Given `mock_shop` trả 2 shop VN + 1 shop ngoài VN, when `integration.oauth_select` chọn cả ba, then 2 kết nối + 2 route `active`, shop ngoài VN 422 `shop_region_unsupported`; workspace B chọn shop đã thuộc A → 409 `shop_in_use_elsewhere`, không tạo kết nối, không route mồ côi | `marketplace-oauth.test.ts` |
| 3 | Given shop đã nhập 3 đơn (1 đã xác nhận, đã trừ kho), when ngắt → nối lại cùng shop → pull lại, then dùng lại đúng dòng kết nối (`reattached: true`), số `contact` / `order` / `stock_movement` không đổi, ánh xạ SKU còn nguyên | `apps/api/test/integration/marketplace-sync.test.ts` |
| 4 | Given webhook `mock_shop`, when chữ ký sai, then 401, không `integration_event`, không job; chữ ký đúng mà shop chưa route → 2xx bỏ; đúng + có route → đúng một `integration_event` (gửi lặp vẫn một); ack `empty_2xx` → 200 body rỗng (`Content-Length: 0`), `json_200` → 200 `{ data }` | `marketplace-sync.test.ts` |
| 5 | Given grant còn 5 phút, when hai job pull của hai shop cùng grant chạy song song (hai worker), then fake `refresh` được gọi đúng **1** lần, cả hai dùng token mới; fake trả `invalid_grant` → grant `revoked`, hai kết nối `expired`, mỗi kết nối một thông báo `integration_expired`, pull sau đó bỏ qua; webhook `deauthorized` của `mock_shop` → đúng kết nối đó `expired` + thông báo, gửi lặp không thêm thông báo | `marketplace-oauth.test.ts` |
| 6 | Given kết nối mới (`last_sync_at = null`), fixture có đơn 45 ngày trước, when pull, then chỉ nhập đơn ≤ 30 ngày; 250 đơn / trang 50 với `MARKETPLACE_PULL_MAX_PAGES=2` → job tự xếp tiếp từ cursor, chạy lại không nhập trùng; `order.sync_now` trả `{ queued }` mà fake đếm 0 lời gọi trong request; mỗi lời gọi một dòng `integration_call_log` không chứa token / chữ ký | `marketplace-sync.test.ts` + `apps/api/test/integration/actions/order.sync_now.action.test.ts` |
| 7 | Given đơn sàn có hãng + mã vận đơn nhập tay, when đồng bộ lại với shipping rỗng, then giữ nguyên; when sàn trả mã, then ghi mã sàn, `shipping.source.tracking = 'platform'` | `marketplace-sync.test.ts` |
| 8 | Given listing đã ghép biến thể X dù SKU khác, when nhập đơn có listing đó, then dòng nhận X; không mapping → khớp `variant.sku` / `product.code` như cũ; SKU trùng nhiều bản ghi → không khớp; `map_sku` biến thể đã ghép listing khác → 409 `sku_already_mapped`; `import_products` không tạo `product` | `packages/core/test/sku-match.test.ts` + `marketplace-sync.test.ts` |
| 9 | Given đơn (tay và sàn) có 2 dòng 2 biến thể cùng sản phẩm, when xác nhận rồi huỷ, then mỗi biến thể trừ / hoàn đúng `qty`, `product.stock` đổi theo tổng, 2 `stock_movement` có `variant_id`; hai đơn song song cùng biến thể → không mất / không trừ đôi (Postgres thật) | `packages/core/test/variant-stock.test.ts` + `marketplace-sync.test.ts` |
| 10 | Given đơn sàn trả trước và đơn COD, when nhập rồi sàn báo hoàn tất, then trả trước có `customer_payment(method = marketplace)`, **không** có Đề nghị thanh toán; COD `unpaid` tới `completed` thì `paid`; loyalty mặc định → không cộng điểm, bật `marketplaceEarn` → cộng đúng Q1 | `marketplace-sync.test.ts` |
| 11 | Given 100k đơn + 20k listing (factory), when EXPLAIN tra đơn `(external_shop_key, external_id)`, list đơn theo shop `ORDER BY created_at DESC, id DESC LIMIT 20`, trang listing drawer, then Index Scan / Index Only Scan đúng index §2, không Seq Scan | EXPLAIN (ANALYZE, BUFFERS) dán report |
| 12 | Given registry, when chạy test, then `packages/channels/src/coming-soon.ts` không còn `shopee` / `tiktok_shop`; ProviderHttp chặn host ngoài manifest (`host_not_allowed`), chặn redirect, POST giữ nguyên raw body; `<X>_TRANSPORT=fake` ở production → boot lỗi | `packages/integrations/test/marketplace-kit.test.ts` + `packages/channels/test/registry.test.ts` |

- 049 không gọi sàn thật (chỉ `mock_shop`). Nghiệm thu với provider thật ở 049b / 049c.

### Commands / evidence gate
- Cổng commit (D59): `pnpm turbo run lint typecheck test --filter=@appchat/{integrations,channels,shared,actions,db,core,api}` · `pnpm depcheck` · `pnpm lint:size` · `pnpm i18n:check`.
- DB: ba lệnh §12, rồi `psql … -d appchat_tenant_template -c "SELECT name FROM _appchat_migrations ORDER BY name DESC LIMIT 3;"` (và DB nền tảng).
- Unit: `pnpm --filter @appchat/core test -- test/sku-match.test.ts test/variant-stock.test.ts test/assistant-coverage.test.ts` · `pnpm --filter @appchat/integrations test -- test/marketplace-kit.test.ts test/order-sync.test.ts test/registry.test.ts` · `pnpm --filter @appchat/channels test -- test/registry.test.ts` · `pnpm --filter @appchat/shared test -- test/event-protocol.test.ts`.
- Integration (`--workers=1`, lấy slot Postgres theo DC-908 / `pnpm slot` khi 035d đã có): `pnpm --filter @appchat/api test:integration -- test/integration/marketplace-oauth.test.ts test/integration/marketplace-sync.test.ts test/integration/actions/order.sync_now.action.test.ts test/integration/contact-lifecycle-blocked-import.test.ts`.
- EXPLAIN như AC11.

## CONSTRAINTS
- **DO NOT:**
  - Đổi luật COMMERCE §4b / Q8 (nhập một lần, khoá dòng / giá, thanh toán qua sàn không sinh Đề nghị thanh toán, COD `paid` khi hoàn tất, bên giữ tồn theo kết nối, khách theo buyer id, loyalty đơn sàn mặc định tắt).
  - Đẩy tồn / trạng thái lên sàn; đăng / sửa sản phẩm trên sàn; tự tạo sản phẩm từ sàn.
  - Gọi sàn trong request HTTP (kể cả `order.sync_now`, preview, webhook).
  - Tự lưu / tự làm mới token ngoài `TokenVault`; log token, chữ ký, query có `access_token`.
  - Thêm `workspace_id` / RLS vào bảng tenant; Prisma relation xuyên domain.
  - Thêm permission; đổi quyền `order.sync_now`; thêm thư viện (HMAC = `node:crypto`, HTTP = `fetch`).
  - Ghi DB trong controller webhook.
  - Thêm logic vào `settings/types.ts` hay file gần trần.
- **REUSE:**
  - `TokenVault`, `oauth.*`, pending (048).
  - `connections.service.ts`, `integration_event` + outbox, `integration_mapping`, `registerCallOp` / call log.
  - `registerSystemAdapter` + verifier, `notify.requested`.
  - `recordMovement`, `lockedLines`, `order-points.ts`, `stock_master` (031c).
- **SKIP:**
  - Adapter Shopee (049b) / TikTok Shop (049c); UI (049d).
  - Adapter Lazada / Sapo / KiotViet / Haravan / WooCommerce (Sắp có).
  - Chat người mua trên sàn, livestream sàn, Returns API (trả hàng chi tiết), `pullStock` cho sàn.

## Quality Gate
- [x] Manifest chính xác (file-level M/C). Giao file khai hai phía bằng `manifests.py --sync 049 049b 049c 049d`.
- [x] Năm lỗi đồng bộ có file `~L`, cách sửa và AC (AC3, AC7, AC8, AC9, AC1–2).
- [x] Schema theo indexing.md (`=` trước, sort sau, partial, deferred join); EXPLAIN ở AC11.
- [x] Luật COMMERCE §4b / Q8 không đổi; Q-916 sửa đúng luật.
- [x] 12 AC đo được, chạy bằng `mock_shop` + fake, không cần tài khoản sàn.
- **Gap đã khai:**
  - Trả hàng / hoàn một phần chi tiết (Returns API) chưa làm: đơn trả hàng giữ trục + `platform_status`.
  - Sàn chưa có `pullStock`: `stock_master = external` chỉ chọn được cho connector có `pullStock` (031c).
  - Thông báo sắp hết uỷ quyền tối đa một lần / kết nối / ngày.
  - Khoá chống trừ đôi sổ kho mở rộng `(ref_type, ref_id, product_id)` → `+ variant_id` (Q-916): `standards/domain/concurrency.md` §3 đã sửa câu chữ ở PR docs D63.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Implement đúng `Files touched` (manifest), không thêm file ngoài scope; file mới 200–400 dòng, trần 600.
- [ ] AC 1–12 có kết quả từng cái, dán output thật (`pnpm …`, EXPLAIN), không "pass" chung chung.
- [ ] **Luật đã chốt (BUILDER-HANDOFF §2 thứ tự ưu tiên):** COMMERCE §4b + Q8 không đổi; Q-916 chỉ sửa code cho đúng Q8.
- [ ] **Tenant DB (BUILDER-HANDOFF #4):** không `workspace_id`; chạy CẢ `db:generate` → `db:migrate-tenants` → `db:setup`; template + DB nền tảng có migration mới.
- [ ] **Bí mật:** token chỉ ở `oauth_grant` (mã hoá, 048); log / call log / outbox / lỗi không chứa token, chữ ký, SĐT người mua.
- [ ] **Action-first (BUILDER-HANDOFF #3):** ghi qua `ActionExecutor`; webhook chỉ ghi `integration_event` + outbox; hết uỷ quyền đi system adapter → `integration.auth_event`.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA.

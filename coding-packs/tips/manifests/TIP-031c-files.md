# TIP-031c — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/core/src/sales/orders/services/order-import.ts` | Đọc stock_master (ghi movement giữ nguyên) |
| C | `packages/core/src/sales/orders/services/stock-sync.ts` | Đối soát tồn external idempotent |
| M | `packages/core/src/sales/jobs/order-sync.jobs.ts` | Lịch pullStock |
| M | `packages/integrations/src/connectors/mock/order-sync.ts` | Trường stock_master |
| M | `packages/integrations/src/ports/order-sync.ts` | Kiểu cấu hình + pullStock? |
| M | `apps/web/src/features/settings/components/ConnectIntegrationModal.tsx` | Chọn bên giữ tồn |
| M | `apps/web/messages/vi/settings.json` | Chuỗi |
| M | `apps/web/messages/en/settings.json` | Strings |
| C | `apps/api/test/integration/order-sync-stock.test.ts` | Integration |

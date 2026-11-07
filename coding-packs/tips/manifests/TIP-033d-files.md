# TIP-033d — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/actions/src/orders.ts` | deposit mode |
| M | `packages/core/src/sales/orders/actions/order-edit.handlers.ts` | Tính cọc % |
| M | `packages/core/src/sales/orders/actions/order-create.handlers.ts` | Tính cọc % |
| C | `packages/core/src/sales/orders/services/deposit-suggest.ts` | Gợi ý |
| C | `packages/shared/src/commerce/split.ts` | splitByPercent |
| C | `packages/shared/src/commerce/split.test.ts` | Unit |
| M | `apps/web/src/features/orders/hooks/useOrderForm.ts` | So sánh BigInt; mode % |
| M | `apps/web/src/shared/api/mock/domains/orders-actions.ts` | Mock deposit mode + set_deposit |
| M | `packages/core/src/data-transfer/adapters/orders.ts` | Import/export deposit mode |
| M | `apps/web/src/features/orders/components/OrderFormModal.tsx` | UI cọc |
| M | `packages/db/prisma/tenant/sales-orders.prisma` | deposit_mode, deposit_percent |
| C | `packages/db/prisma/tenant/migrations/20261102006600_order_deposit_percent/migration.sql` | Cột |
| M | `apps/web/messages/vi/orders.json` | Chuỗi |
| M | `apps/web/messages/en/orders.json` | Strings |
| C | `apps/api/test/integration/order-deposit.test.ts` | Integration |

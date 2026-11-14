# TIP-031b — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/actions/src/orders.ts` | order.bulk_assign |
| M | `packages/actions/src/contracts.ts` | contract.bulk_assign |
| M | `packages/actions/src/quotes.ts` | quote.bulk_assign |
| C | `packages/core/src/sales/orders/actions/order-bulk.handlers.ts` | Bulk đơn |
| C | `packages/core/src/contracts/actions/contract-bulk.handlers.ts` | Bulk HĐ |
| C | `packages/core/src/sales/quotes/actions/quote-bulk.handlers.ts` | Bulk báo giá |
| M | `packages/core/src/kernel/jobs/bulk-dispatch.ts` | Đăng ký recipe order/contract/quote bulk_assign |
| M | `apps/web/src/features/orders/components/OrdersToolbar.tsx` | Nút thật |
| M | `apps/web/src/features/contracts/components/ContractsToolbar.tsx` | Nút thật |
| M | `apps/web/src/features/quotes/components/QuotesToolbar.tsx` | Nút thật |
| C | `apps/web/src/shared/list/BulkAssignModal.tsx` | Modal chọn người + kết quả |
| C | `apps/web/src/shared/list/ForwardListModal.tsx` | Chọn thành viên + ghi chú |
| M | `apps/web/src/features/customers/components/CrmToolbar.tsx` | Nút Chuyển tiếp |
| C | `packages/actions/src/record-forward.ts` | record.forward_list |
| C | `packages/core/src/notify/actions/record-forward.handler.ts` | Thông báo + link lọc |
| M | `packages/actions/src/index.ts` | Export record.forward_list |
| M | `apps/web/messages/vi/actions.json` | bulk_assign |
| M | `apps/web/messages/en/actions.json` | bulk_assign |
| C | `apps/api/test/integration/commerce-bulk.test.ts` | Integration |

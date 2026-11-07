# TIP-001c — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `apps/web/src/shared/states/PageStates.tsx` | stateOf predicate + forbidden |
| M | `packages/ui/src/theme.ts` | Token size.touch + màu đạt tương phản |
| M | `apps/web/src/features/quotes/screens/QuotesScreen.tsx` | Predicate trạng thái |
| M | `apps/web/src/features/products/screens/ProductsScreen.tsx` | Predicate trạng thái |
| M | `apps/web/e2e/mobile-sweep.spec.ts` | Đo width + target |
| C | `apps/web/src/shared/states/state-of.ts` | Hàm stateOf tách riêng |
| C | `apps/web/src/shared/states/state-of.test.ts` | Unit 6 trạng thái |
| C | `apps/web/e2e/states-matrix.spec.ts` | Ma trận trạng thái |
| C | `apps/web/e2e/mobile-matrix.spec.ts` | Ma trận mobile 390 |
| C | `apps/web/e2e/support/screens.ts` | Danh sách màn + action chính dùng chung |
| M | `apps/web/src/shared/actions/useAction.ts` | Tuỳ chọn optimistic + rollback |
| C | `apps/web/src/shared/actions/optimistic.test.ts` | Rollback khi lỗi |
| C | `packages/ui/src/primitives/ComingSoon.tsx` | Khoá + nhãn Sắp có |
| M | `apps/web/src/features/tickets/components/TicketDrawer.tsx` | Khớp prototype |

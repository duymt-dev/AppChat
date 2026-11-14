# TIP-032e — exact file manifest

M modify, C create. M ở tương lai cần TIP đứng trước đã tích hợp: 016b tạo `nav-badges.ts` / `nav-badges.test.ts`, 026c tạo `shared/opportunities/*` và `tools/parity/modules/sales-pipeline.ts`. Không dùng wildcard thư mục; test để ở file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/db/prisma/tenant/sales-orders.prisma` | Enum `order_activity` + `order.activity`, `order.campaign_id` |
| C | `packages/db/prisma/tenant/migrations/20261112110000_finance_rows/migration.sql` | Cột hoạt động, điền đơn cũ theo luật DC-902 c, index đơn / đề nghị / partial quá hạn |
| C | `packages/db/test/finance-rows-migration.test.ts` | Điền `activity` cho đơn cũ đúng luật |
| C | `packages/shared/src/sales/finance-state.ts` | `financeStatusOf`, `FINANCE_STATUSES`, `ORDER_ACTIVITIES`, số ngày theo `basis`, kỳ |
| C | `packages/shared/src/sales/finance-state.test.ts` | Unit trạng thái / ưu tiên / số ngày / kỳ |
| M | `packages/shared/src/index.ts` | Export `sales/finance-state` |
| C | `packages/shared/src/api/finance.ts` | DTO dòng, KPI, chip, drawer khách, kết quả nhắc hàng loạt |
| M | `packages/shared/src/api/index.ts` | Export DTO finance |
| M | `packages/shared/src/api/inbox.ts` | `debt_chip` của hội thoại (null khi thiếu quyền) |
| M | `packages/shared/src/api/crm.ts` | Contact360 `debt_card` (dòng còn nợ gần hạn nhất) |
| M | `packages/shared/src/i18n/server/vi/sales.ts` | Lý do bỏ qua nhắc, tiêu đề email nhắc, nhãn hoạt động |
| M | `packages/shared/src/i18n/server/en/sales.ts` | Như trên (en) |
| C | `packages/actions/src/finance.ts` | `finance.list`, `finance.customer` (read, skill) · `invoice.bulk_remind` (send, bulk, không agentGrantable) |
| M | `packages/actions/src/index.ts` | Đăng ký action finance |
| C | `packages/actions/test/finance-actions.test.ts` | Schema / quyền / bulk / agentGrantable |
| C | `packages/core/src/sales/finance/finance.module.ts` | Module Nest Tài chính |
| C | `packages/core/src/sales/finance/rows.repo.ts` | Truy vấn id-first (union đơn / đề nghị lẻ) + join N dòng, scope |
| C | `packages/core/src/sales/finance/kpis.repo.ts` | KPI + chip đếm (≤ 3 truy vấn gộp) |
| C | `packages/core/src/sales/finance/rows.service.ts` | Ráp dòng: tổng / đã thu / cọc / điểm / hoàn / hạn / nhắc gần nhất / trạng thái |
| C | `packages/core/src/sales/finance/customer.service.ts` | Drawer khách 360° · Tài chính (tổng quan, giao dịch, nhắc nợ) |
| C | `packages/core/src/sales/finance/advice.ts` | Gợi ý theo luật (`source: 'rule'`) |
| C | `packages/core/src/sales/finance/activity.ts` | `activityOf` — suy Bán mới / Gia hạn / Marketing lúc tạo đơn |
| C | `packages/core/src/sales/finance/remind.ts` | `remindOne` dùng chung nhắc lẻ + hàng loạt |
| C | `packages/core/src/sales/finance/bulk-remind.handler.ts` | `invoice.bulk_remind` ≤ 50 ngay / > 50 job + preview |
| C | `packages/core/src/sales/finance/bulk-remind.processor.ts` | Kind job `invoice.bulk_remind` (biên nhận từng dòng) |
| C | `packages/core/src/sales/finance/read.handlers.ts` | `finance.list` / `finance.customer` qua Executor |
| C | `packages/core/src/sales/finance/badge.ts` | Đếm dòng quá hạn trong scope cho `/nav/badges` |
| M | `packages/core/src/sales/sales.module.ts` | Import `FinanceModule` |
| M | `packages/core/src/sales/public.ts` | Export service finance + `financeOverdueCount` + `debtCardOf` |
| M | `packages/core/src/sales/orders/actions/order-create.handlers.ts` | `insertOrder` ghi `activity` + `campaign_id` |
| M | `packages/core/src/sales/payments/actions/invoice-write.handlers.ts` | Nhánh nhắc của `send_payment_qr` gọi `remindOne` (facade) |
| M | `packages/core/src/inbox/services/nav-badges.ts` | Khoá `finance` (016b tạo) |
| M | `packages/core/src/inbox/services/view.ts` | Chip "⚠ Nợ" theo trang (`debtOf`, không N+1) |
| M | `packages/core/src/crm/services/contact360.ts` | Ô `debt_card` |
| M | `packages/core/src/crm/services/crm-read.service.ts` | Ghép `debt_card` vào 360 theo quyền |
| M | `packages/core/src/kernel/actions/tip-owners.ts` | Chủ action mới = 032e |
| C | `packages/core/test/finance-rows.test.ts` | Unit ráp dòng / trạng thái / hoạt động |
| C | `apps/api/src/http/sales/finance.controller.ts` | `GET /v1/finance/rows` · `GET /v1/finance/customers/:contactId` |
| M | `apps/api/src/http/sales/sales.http.module.ts` | Đăng ký controller |
| C | `apps/api/test/integration/finance.test.ts` | AC1, 2, 4, 5, 8 |
| C | `apps/api/test/integration/finance-activity.test.ts` | AC3 |
| C | `apps/api/test/integration/finance-remind.test.ts` | AC6, 7 |
| M | `apps/api/test/integration/nav-badges.test.ts` | Badge `finance` theo scope (016b tạo) |
| M | `apps/api/test/integration/payments.test.ts` | Nhắc lẻ vẫn đúng sau khi tách `remindOne` |
| C | `apps/web/src/app/(app)/finance/page.tsx` | Route (chỉ routing) |
| C | `apps/web/src/features/finance/index.ts` | Barrel |
| C | `apps/web/src/features/finance/api.ts` | Query dòng / khách |
| C | `apps/web/src/features/finance/types.ts` | Kiểu web |
| C | `apps/web/src/features/finance/columns.tsx` | 11 cột theo prototype |
| C | `apps/web/src/features/finance/finance-store.ts` | Chọn nhiều, drawer, modal |
| C | `apps/web/src/features/finance/ui-commands.ts` | `filter:finance`, `open:finance.customer` |
| C | `apps/web/src/features/finance/ui-commands.test.tsx` | Lệnh Trợ lý |
| C | `apps/web/src/features/finance/screens/FinanceScreen.tsx` | Orchestrator |
| C | `apps/web/src/features/finance/components/FinanceKpis.tsx` | 4 KPI |
| C | `apps/web/src/features/finance/components/FinanceFilters.tsx` | Tìm, Nhóm, hoạt động, kỳ, đếm ngày |
| C | `apps/web/src/features/finance/components/StatusChips.tsx` | Chip trạng thái + số đếm |
| C | `apps/web/src/features/finance/components/BulkBar.tsx` | Thanh chọn nhiều (email · ZBS Coming soon · bỏ chọn) |
| C | `apps/web/src/features/finance/components/RowMenu.tsx` | Menu ⋯ dòng |
| C | `apps/web/src/features/finance/components/FinanceCustomerDrawer.tsx` | Drawer 360° · Tài chính (orchestrator tab) |
| C | `apps/web/src/features/finance/components/CustomerOverviewTab.tsx` | Tab Tổng quan |
| C | `apps/web/src/features/finance/components/CustomerTxTab.tsx` | Tab Giao dịch |
| C | `apps/web/src/features/finance/components/CustomerRemindTab.tsx` | Tab Nhắc nợ |
| C | `apps/web/src/features/finance/components/RemindModal.tsx` | Modal gửi nhắc (xem trước, người nhận, biên nhận từng dòng) |
| C | `apps/web/src/features/finance/hooks/useFinanceRows.ts` | Dòng + KPI + chip |
| C | `apps/web/src/features/finance/hooks/useFinanceFilters.ts` | Bộ lọc ↔ URL |
| C | `apps/web/src/features/finance/hooks/useBulkRemind.ts` | `useAction('invoice.bulk_remind')` + job |
| C | `apps/web/src/features/finance/styles/finance.styles.ts` | Style token |
| C | `apps/web/src/features/finance/components/FinanceScreen.test.tsx` | Unit màn / chip / chọn nhiều / ẩn quyền |
| C | `apps/web/src/shared/finance/DebtCard.tsx` | Thẻ "⚠ Công nợ · Tài chính" dùng chung 360° |
| C | `apps/web/src/shared/finance/DebtChip.tsx` | Chip "⚠ Nợ" Hộp thư |
| C | `apps/web/src/shared/finance/index.ts` | Barrel |
| M | `apps/web/src/shared/shell/nav-config.ts` | `finance` vào rail sau Khách hàng, badge `finance` |
| M | `apps/web/src/shared/shell/nav-config.test.ts` | Thứ tự rail + quyền |
| M | `apps/web/src/shared/shell/NavRail.tsx` | Badge `finance` |
| M | `apps/web/src/shared/realtime/event-invalidation.ts` | Invalidate `finance` + badge khi `invoice.*` / `payment.*` |
| M | `apps/web/src/i18n/messages.ts` | Namespace `finance` |
| C | `apps/web/messages/vi/finance.json` | Chuỗi màn Tài chính (vi) |
| C | `apps/web/messages/en/finance.json` | Chuỗi màn Tài chính (en) |
| M | `apps/web/messages/vi/shell.json` | Nhãn rail "Tài chính" |
| M | `apps/web/messages/en/shell.json` | Nhãn rail "Finance" |
| M | `apps/web/messages/vi/invoices.json` | Nút "Công nợ" |
| M | `apps/web/messages/en/invoices.json` | Như trên (en) |
| M | `apps/web/messages/vi/inbox.json` | Thẻ / chip công nợ |
| M | `apps/web/messages/en/inbox.json` | Như trên (en) |
| M | `apps/web/messages/vi/actions.json` | Tiêu đề action finance |
| M | `apps/web/messages/en/actions.json` | Như trên (en) |
| M | `apps/web/src/features/invoices/screens/InvoicesScreen.tsx` | Nút "Công nợ" → `/finance?status=overdue` |
| M | `apps/web/src/features/inbox/components/Overview360.tsx` | Mount `DebtCard` |
| M | `apps/web/src/features/inbox/components/ChatHeader.tsx` | Mount `DebtChip` |
| M | `apps/web/src/features/inbox/components/ConvRow.tsx` | Mount `DebtChip` |
| M | `apps/web/src/features/inbox/types.ts` | `debt_chip`, `debt_card` |
| M | `apps/web/src/shared/opportunities/OpportunityChain.tsx` | Bước 4 → `/finance?q=` (026c tạo) |
| C | `apps/web/src/shared/api/mock/domains/finance.ts` | Mock dòng / KPI / drawer / nhắc |
| C | `apps/web/src/shared/api/mock/finance-shape.test.ts` | Contract shape mock ↔ `@appchat/shared` |
| M | `apps/web/src/shared/api/mock/routes.ts` | Nối route mock finance |
| M | `apps/web/src/shared/api/mock/domains/inbox.ts` | Mock chip nợ |
| M | `apps/web/src/shared/api/mock/domains/customers.ts` | Mock thẻ công nợ 360 |
| C | `apps/web/e2e/finance.spec.ts` | E2E mock: lọc, chip, drawer, nhắc hàng loạt, lối vào; mobile 390 |
| C | `apps/web/e2e/http/finance.spec.ts` | E2E http cùng luồng |
| C | `fixtures/prototype-parity/finance.json` | Dữ liệu parity khớp prototype `finVals()` (mã TT-) |
| C | `tools/parity/modules/finance.ts` | Entry `finance:list`, `finance:drawer`, `finance:remind`, `customers:360-debt` + mask có mã |
| M | `tools/parity/parity.manifest.ts` | Nối module finance |
| M | `tools/parity/src/capture.ts` | Gỡ "Tài chính" khỏi `OUT_LABELS` (cùng commit thêm rail) |

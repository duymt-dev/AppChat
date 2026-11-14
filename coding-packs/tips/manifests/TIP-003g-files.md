# TIP-003g — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/core/src/channels/jobs/send.processor.ts` | Clock |
| M | `packages/core/src/channels/jobs/sessions.ts` | Clock |
| M | `packages/core/src/sales/payments/services/payment-system.ts` | Nhắc theo giờ làm việc |
| M | `packages/core/src/sales/jobs/sales.jobs.module.ts` | Lịch nhắc |
| M | `packages/core/src/ai/tasks/tasks.read.ts` | Bỏ SELECT * |
| M | `packages/core/eslint.config.mjs` | Rule Clock |
| C | `packages/core/src/kernel/time/reminder-schedule.ts` | Mốc + dời giờ làm việc |
| C | `packages/core/test/business-time-reminders.test.ts` | Unit nhắc |
| C | `packages/core/test/support/count-queries.ts` | Helper đếm query |
| C | `apps/api/test/integration/query-budget.test.ts` | Ngân sách query list |
| M | `apps/web/src/shared/time/today.ts` | useToday |
| M | `apps/web/src/features/orders/components/OrderFormModal.tsx` | useToday |
| M | `apps/web/src/features/contracts/components/ContractFormModal.tsx` | useToday |
| M | `apps/web/src/features/invoices/components/InvoiceFormModal.tsx` | useToday |
| M | `apps/web/src/features/invoices/components/PaymentModals.tsx` | useToday |
| C | `apps/web/src/shared/time/today.test.ts` | Unit qua ngày |

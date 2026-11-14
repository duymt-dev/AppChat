# TIP-028b — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/core/src/documents/jobs/documents.jobs.module.ts` | Queue doc-render |
| C | `packages/core/src/documents/jobs/doc-render.processor.ts` | Processor |
| M | `packages/core/src/documents/services/doc-renderer.ts` | Tách prepare/render |
| M | `packages/core/src/documents/actions/doc-template.handlers.ts` | Undo create |
| M | `packages/actions/src/documents.ts` | undo create |
| M | `packages/core/src/sales/payments/services/invoice-doc.ts` | template_version |
| M | `packages/core/src/sales/quotes/actions/quote-send.handlers.ts` | Checklist preview |
| M | `packages/core/src/contracts/actions/contract-send.handlers.ts` | Checklist preview |
| M | `packages/db/prisma/tenant/sales-payments.prisma` | template cols |
| C | `packages/db/prisma/tenant/migrations/20261102006500_doc_render/migration.sql` | Cột + trạng thái render |
| M | `apps/web/src/shared/actions/ConfirmActionHost.tsx` | Hiện checklist |
| C | `apps/web/src/shared/actions/ChecklistPanel.tsx` | Bảng kiểm |
| C | `apps/api/test/integration/doc-render.test.ts` | Job render |

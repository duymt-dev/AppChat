# TIP-035c — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `tools/scripts/fixtures/gen-assistant.py` | Đồng bộ |
| M | `tools/scripts/fixtures/gen-inbox.py` | Đồng bộ |
| C | `tools/scripts/fixtures/check.mjs` | So fixture |
| M | `packages/db/package.json` | --env-file |
| M | `apps/web/e2e/settings.spec.ts` | Sửa wizard + chờ |
| M | `apps/web/e2e/quotes.spec.ts` | Chờ URL |
| M | `apps/web/e2e/settings-ops.spec.ts` | Chờ dữ liệu |
| M | `packages/db/prisma/platform/ops.prisma` | workspace_due |
| C | `packages/db/prisma/platform/migrations/20261102006700_workspace_due/migration.sql` | Bảng + index (due_at, workspace_id) |
| C | `packages/core/src/kernel/jobs/due-registry.ts` | Ghi/đọc armed set |
| M | `packages/core/src/support/jobs/support.jobs.module.ts` | Quét armed |
| M | `packages/core/src/booking/jobs/booking.jobs.module.ts` | Quét armed |
| M | `packages/core/src/contracts/jobs/contracts.jobs.module.ts` | Quét armed |
| M | `packages/core/src/sales/jobs/sales.jobs.module.ts` | Quét armed |
| M | `packages/core/src/sales/jobs/payment.jobs.ts` | Quét armed |
| M | `packages/core/src/sales/jobs/order-sync.jobs.ts` | Quét armed |
| C | `apps/api/test/integration/armed-sweeps.test.ts` | Integration |

# TIP-012d — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/core/src/kernel/files/storage.ts` | Chọn storage theo workspace connector |
| M | `packages/core/src/kernel/files/s3-storage.ts` | Dùng lại adapter S3 của 045b cho bucket workspace |
| M | `packages/db/prisma/tenant/kernel.prisma` | file.storage_ref |
| C | `packages/db/prisma/tenant/migrations/20261102006150_file_storage_ref/migration.sql` | Cột storage_ref |
| C | `packages/core/src/kernel/files/storage-migrate.job.ts` | Di chuyển tệp |
| M | `packages/integrations/src/registry.ts` | Connector storage |
| C | `packages/integrations/src/ports/storage.ts` | Port storage |
| C | `packages/integrations/src/connectors/s3/manifest.ts` | Manifest connector |
| M | `packages/integrations/src/coming-soon.ts` | Bỏ "Sắp có" GCS→S3 |
| C | `packages/core/test/workspace-storage.test.ts` | Unit chọn bucket workspace + di chuyển |
| C | `apps/api/test/integration/storage-connector.test.ts` | Integration |
| C | `packages/integrations/src/ports/einvoice.ts` | Port |
| C | `packages/integrations/src/ports/esign.ts` | Port |
| C | `packages/integrations/src/ports/accounting.ts` | Port AccountingSync + SheetSync |
| C | `packages/integrations/src/ports/sms.ts` | Port |

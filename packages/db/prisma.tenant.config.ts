// Prisma CLI cho DB tenant: schema chung của mọi `ws_*`; migrate áp lên template + từng DB qua tenant-migrate (src/tenant-migrate.ts).
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/tenant',
  migrations: { path: 'prisma/tenant/migrations' },
  datasource: { url: process.env.TENANT_MIGRATE_URL ?? '' },
});

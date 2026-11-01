// Prisma CLI cho DB nền tảng: `prisma <cmd> --config prisma.platform.config.ts`. URL = PLATFORM_MIGRATE_URL (role appchat_migrator).
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/platform',
  migrations: { path: 'prisma/platform/migrations' },
  datasource: { url: process.env.PLATFORM_MIGRATE_URL ?? '' },
});

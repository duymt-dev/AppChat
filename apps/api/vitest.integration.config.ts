// Integration API: Postgres 16 + Memurai thật (TIP-003+). Tuần tự vì dùng chung cụm.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: { decorator: { legacy: true, emitDecoratorMetadata: true } },
  test: { include: ['test/integration/**/*.test.ts'], fileParallelism: false, testTimeout: 60_000, hookTimeout: 120_000 },
});

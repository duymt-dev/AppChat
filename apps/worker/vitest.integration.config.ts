// Integration worker (TIP-023b): child process ROLE=ai thật trên Postgres 16 + Memurai (DB Redis riêng của test), tuần tự.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: { decorator: { legacy: true, emitDecoratorMetadata: true } },
  test: { include: ['test/integration/**/*.test.ts'], fileParallelism: false, testTimeout: 180_000, hookTimeout: 180_000 },
});

// Integration: Postgres 16 thật (standards/code/testing.md §2 — không mock DB). Chạy tuần tự vì dùng chung cụm.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/integration/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});

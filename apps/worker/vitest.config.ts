// Decorator legacy + emitDecoratorMetadata cho DI của NestJS (oxc của Vite). Integration (process ROLE=ai thật + Postgres / Redis) chạy
// riêng: vitest.integration.config.ts.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: { decorator: { legacy: true, emitDecoratorMetadata: true } },
  test: { include: ['src/**/*.test.ts', 'test/**/*.test.ts'], exclude: ['test/integration/**', 'node_modules/**'] },
});

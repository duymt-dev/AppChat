// Decorator legacy + emitDecoratorMetadata cho DI của NestJS (oxc của Vite).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: { decorator: { legacy: true, emitDecoratorMetadata: true } },
  test: { include: ['src/**/*.test.ts', 'test/**/*.test.ts'] },
});
